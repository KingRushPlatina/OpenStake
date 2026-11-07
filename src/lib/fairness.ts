import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@/platform/env";

function encryptionKey() {
  return createHash("sha256").update(env.SEED_ENCRYPTION_KEY).digest();
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptSecret(value: string) {
  const payload = Buffer.from(value, "base64");
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function hmacSha256(key: string, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

export function randomHex(bytes = 32) {
  return randomBytes(bytes).toString("hex");
}

export function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export class FairRandom {
  private cursor = 0;
  private digest = Buffer.alloc(0);
  private digestCursor = 8;

  constructor(
    private readonly serverSeed: string,
    private readonly clientSeed: string,
    private readonly nonce: number,
  ) {}

  next() {
    if (this.digestCursor >= 8) {
      this.digest = hmacSha256(this.serverSeed, `${this.clientSeed}:${this.nonce}:${this.cursor}`);
      this.cursor += 1;
      this.digestCursor = 0;
    }
    const offset = this.digestCursor * 4;
    this.digestCursor += 1;
    return this.digest.readUInt32BE(offset) / 0x1_0000_0000;
  }

  int(maxExclusive: number) {
    return Math.floor(this.next() * maxExclusive);
  }

  pick<T>(items: readonly T[]) {
    return items[this.int(items.length)];
  }

  shuffle<T>(items: readonly T[]) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = this.int(index + 1);
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  }
}

export function crashPointFromSeed(serverSeed: string, clientSeed: string, nonce: number) {
  const random = new FairRandom(serverSeed, clientSeed, nonce);
  const value = random.next();
  if (value < 0.01) return 1;
  return Math.max(1, Math.floor((0.99 / (1 - value)) * 100) / 100);
}
