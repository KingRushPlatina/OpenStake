import { nanoid } from "nanoid";

export function createId(prefix: string) {
  return `${prefix}_${nanoid(20)}`;
}

export function createToken() {
  return nanoid(48);
}
