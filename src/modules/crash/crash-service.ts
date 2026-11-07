import { and, desc, eq } from "drizzle-orm";
import { getDatabase, type Database } from "@/platform/db/client";
import { crashBets, crashRounds, users } from "@/platform/db/schema";
import { crashPointFromSeed, randomHex, sha256 } from "@/lib/fairness";
import { AppError } from "@/lib/errors";
import { getContainer } from "@/platform/container";
import type { Clock, IdGenerator } from "@/modules/wallet/constants";
import type { LedgerService } from "@/modules/wallet/ledger-service";
import type { UserService } from "@/modules/identity/user-service";
import { gameCatalogById } from "@/modules/games/catalog";
import { getEventBus } from "@/modules/realtime/event-bus";
import type { CrashPhase, CrashPlayer, CrashSnapshot } from "@/types/crash";

export type { CrashPhase, CrashPlayer, CrashSnapshot } from "@/types/crash";

type PlayerState = CrashPlayer & { betId: string | null };

const BETTING_MS = 7_000;
const CRASHED_MS = 4_000;
const GROWTH = 0.12;

export class CrashService {
  private started = false;
  private starting: Promise<void> | null = null;
  private phase: CrashPhase = "betting";
  private roundId = "";
  private roundNumber = 0;
  private serverSeed = "";
  private serverSeedHash = "";
  private crashPoint = 1;
  private multiplier = 1;
  private runningStart = 0;
  private phaseEndsAt = 0;
  private players = new Map<string, PlayerState>();
  private history: { roundNumber: number; crashPoint: number }[] = [];
  private listeners = new Set<(snapshot: CrashSnapshot) => void>();
  private ticker: NodeJS.Timeout | null = null;
  private botPool: { id: string; name: string }[] = [];

  constructor(
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly ledger: LedgerService,
    private readonly users: UserService,
  ) {}

  async ensureStarted() {
    if (this.started) return;
    if (this.starting) return this.starting;
    this.starting = this.start();
    await this.starting;
  }

  private async start() {
    await this.recoverInterruptedBets();
    await this.users.ensureDemoBots();
    this.botPool = await this.users.listBots();
    const database = await getDatabase();
    const previousRounds = await database
      .select({ roundNumber: crashRounds.roundNumber, crashPoint: crashRounds.crashPoint })
      .from(crashRounds)
      .orderBy(desc(crashRounds.startedAt))
      .limit(12);
    this.history = previousRounds.reverse();
    const [latest] = await database
      .select({ roundNumber: crashRounds.roundNumber })
      .from(crashRounds)
      .orderBy(desc(crashRounds.roundNumber))
      .limit(1);
    this.roundNumber = latest?.roundNumber ?? 0;
    await this.beginRound();
    this.started = true;
    this.ticker = setInterval(() => this.tick(), 100);
    this.ticker.unref?.();
  }

  subscribe(listener: (snapshot: CrashSnapshot) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  snapshot(): CrashSnapshot {
    const now = this.clock.now().getTime();
    return {
      phase: this.phase,
      roundId: this.roundId,
      roundNumber: this.roundNumber,
      serverSeedHash: this.serverSeedHash,
      serverSeed: this.phase === "crashed" ? this.serverSeed : null,
      crashPoint: this.phase === "crashed" ? this.crashPoint : null,
      multiplier: this.multiplier,
      elapsedMs: this.phase === "running" ? Math.max(0, now - this.runningStart) : 0,
      phaseEndsAt: this.phase === "betting" || this.phase === "crashed" ? new Date(this.phaseEndsAt).toISOString() : null,
      players: [...this.players.values()]
        .map((player) => ({
          userId: player.userId,
          name: player.name,
          amountCents: player.amountCents,
          autoCashout: player.autoCashout,
          status: player.status,
          cashoutMultiplier: player.cashoutMultiplier,
          payoutCents: player.payoutCents,
          isBot: player.isBot,
        }))
        .sort((left, right) => right.amountCents - left.amountCents),
      history: this.history.slice(-12),
    };
  }

  private broadcast() {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) listener(snapshot);
  }

  private async beginRound() {
    this.roundNumber += 1;
    this.serverSeed = randomHex(32);
    this.serverSeedHash = sha256(this.serverSeed);
    this.crashPoint = crashPointFromSeed(this.serverSeed, "openstake-crash", this.roundNumber);
    this.roundId = this.ids.create("crash");
    this.phase = "betting";
    this.multiplier = 1;
    this.phaseEndsAt = this.clock.now().getTime() + BETTING_MS;
    this.players.clear();
    this.addBots();
    this.broadcast();
    const database = await getDatabase();
    await database
      .insert(crashRounds)
      .values({
        id: this.roundId,
        roundNumber: this.roundNumber,
        serverSeed: this.serverSeed,
        serverSeedHash: this.serverSeedHash,
        crashPoint: this.crashPoint,
        startedAt: this.clock.now(),
      })
      .catch((error) => console.error(error));
  }

  private addBots() {
    if (this.botPool.length === 0) return;
    const count = 6 + Math.floor(Math.random() * 8);
    for (let index = 0; index < count; index += 1) {
      const bot = this.botPool[Math.floor(Math.random() * this.botPool.length)];
      if (this.players.has(bot.id)) continue;
      const amountCents = 50 + Math.floor(Math.random() * 5_000);
      const autoCashout = Math.random() > 0.35 ? Math.floor((1.2 + Math.random() * 6) * 100) / 100 : null;
      this.players.set(bot.id, {
        userId: bot.id,
        name: bot.name,
        amountCents,
        autoCashout,
        status: "active",
        cashoutMultiplier: null,
        payoutCents: 0,
        isBot: true,
        betId: null,
      });
    }
  }

  private tick() {
    const now = this.clock.now().getTime();
    if (this.phase === "betting") {
      if (now >= this.phaseEndsAt) {
        this.phase = "running";
        this.runningStart = now;
        this.multiplier = 1;
      }
      this.broadcast();
      return;
    }
    if (this.phase === "running") {
      const elapsed = Math.max(0, now - this.runningStart);
      const rawMultiplier = Math.exp((GROWTH * elapsed) / 1000);
      if (rawMultiplier >= this.crashPoint) {
        this.crash();
        return;
      }
      this.multiplier = Math.floor(rawMultiplier * 100) / 100;
      this.checkAutoCashouts();
      this.broadcast();
      return;
    }
    if (now >= this.phaseEndsAt) {
      this.beginRound().catch((error) => console.error(error));
    }
  }

  private checkAutoCashouts() {
    for (const player of this.players.values()) {
      if (player.status !== "active" || !player.autoCashout || this.multiplier < player.autoCashout) continue;
      if (player.isBot) {
        this.markCashout(player, this.multiplier);
      } else {
        this.cashout(player.userId).catch(() => undefined);
      }
    }
  }

  private markCashout(player: PlayerState, multiplier: number) {
    player.status = "cashed";
    player.cashoutMultiplier = multiplier;
    player.payoutCents = Math.floor(player.amountCents * multiplier);
  }

  private async crash() {
    this.phase = "crashed";
    this.multiplier = this.crashPoint;
    this.phaseEndsAt = this.clock.now().getTime() + CRASHED_MS;
    this.history = [...this.history, { roundNumber: this.roundNumber, crashPoint: this.crashPoint }].slice(-12);
    for (const player of this.players.values()) {
      if (player.status === "active") player.status = "lost";
    }
    this.broadcast();
    const database = await getDatabase();
    database
      .update(crashRounds)
      .set({ endedAt: this.clock.now() })
      .where(eq(crashRounds.id, this.roundId))
      .catch((error) => console.error(error));
    this.settleLosses().catch((error) => console.error(error));
  }

  async placeBet(userId: string, amountCents: number, autoCashout: number | null) {
    await this.ensureStarted();
    if (this.phase !== "betting") throw new AppError("GAME_STATE", "Betting is closed for this round", 400);
    if (this.players.has(userId)) throw new AppError("GAME_STATE", "You already have a bet in this round", 400);
    const metadata = gameCatalogById.get("crash")!;
    if (!Number.isInteger(amountCents) || amountCents < metadata.minBetCents || amountCents > metadata.maxBetCents) {
      throw new AppError("BET_LIMIT", "Bet amount is outside the table limits", 400);
    }
    if (autoCashout !== null && (autoCashout < 1.01 || autoCashout > 1_000_000)) {
      throw new AppError("INVALID_INPUT", "Auto cashout must be between 1.01x and 1,000,000x", 400);
    }
    const database = await getDatabase();
    const betId = this.ids.create("crashbet");
    const roundId = this.roundId;
    const result = await database.transaction(async (transaction) => {
      const tx = transaction as unknown as Database;
      const wallet = await this.ledger.lockWallet(tx, userId);
      if (wallet.balanceCents < amountCents) throw new AppError("INSUFFICIENT_FUNDS", "Your balance is too low for this bet", 400);
      const [user] = await tx.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
      await tx.insert(crashBets).values({
        id: betId,
        roundId,
        userId,
        amountCents,
        autoCashout,
        status: "active",
        createdAt: this.clock.now(),
      });
      const balance = await this.ledger.move(tx, {
        userId,
        amountCents: -amountCents,
        type: "bet",
        metadata: { gameId: "crash", roundId },
      });
      await this.ledger.recordPlacement(tx, userId, amountCents);
      return { name: user?.name ?? "Player", balance };
    });
    if (this.phase !== "betting" || this.roundId !== roundId) {
      await this.refundBet(betId, userId, amountCents);
      throw new AppError("GAME_STATE", "Betting closed before the bet was accepted", 400);
    }
    this.players.set(userId, {
      userId,
      name: result.name,
      amountCents,
      autoCashout,
      status: "active",
      cashoutMultiplier: null,
      payoutCents: 0,
      isBot: false,
      betId,
    });
    this.broadcast();
    return { betId, balance: result.balance, snapshot: this.snapshot() };
  }

  async cashout(userId: string) {
    await this.ensureStarted();
    if (this.phase !== "running") throw new AppError("GAME_STATE", "Cashout is only available while the round is running", 400);
    const player = this.players.get(userId);
    if (!player || player.isBot || player.status !== "active") throw new AppError("GAME_STATE", "No active crash bet", 400);
    const multiplier = this.multiplier;
    const payoutCents = Math.floor(player.amountCents * multiplier);
    this.markCashout(player, multiplier);
    this.broadcast();
    try {
      const database = await getDatabase();
      const balance = await database.transaction(async (transaction) => {
        const tx = transaction as unknown as Database;
        const [row] = await tx
          .select()
          .from(crashBets)
          .where(and(eq(crashBets.id, player.betId ?? ""), eq(crashBets.userId, userId)))
          .for("update")
          .limit(1);
        if (!row || row.status !== "active") throw new AppError("GAME_STATE", "Bet already settled", 400);
        await tx
          .update(crashBets)
          .set({ status: "cashed", cashoutMultiplier: multiplier, payoutCents, settledAt: this.clock.now() })
          .where(eq(crashBets.id, row.id));
        const nextBalance = await this.ledger.move(tx, {
          userId,
          amountCents: payoutCents,
          type: "payout",
          betId: row.id,
          metadata: { gameId: "crash", multiplier },
        });
        await this.ledger.recordSettlement(tx, userId, payoutCents, multiplier);
        return nextBalance;
      });
      getEventBus().publishLiveBet({
        type: "live-bet",
        id: player.betId ?? this.ids.create("live"),
        userId,
        name: player.name,
        gameId: "crash",
        gameName: "Crash",
        amountCents: player.amountCents,
        multiplier,
        payoutCents,
        win: true,
        createdAt: this.clock.now().toISOString(),
      });
      return { multiplier, payoutCents, balanceCents: balance };
    } catch (error) {
      player.status = "active";
      player.cashoutMultiplier = null;
      player.payoutCents = 0;
      this.broadcast();
      throw error;
    }
  }

  private async settleLosses() {
    const database = await getDatabase();
    for (const player of this.players.values()) {
      if (player.isBot || !player.betId || player.status !== "lost") continue;
      await database
        .update(crashBets)
        .set({ status: "lost", payoutCents: 0, settledAt: this.clock.now() })
        .where(eq(crashBets.id, player.betId));
      await database.transaction(async (transaction) => {
        const tx = transaction as unknown as Database;
        await this.ledger.recordSettlement(tx, player.userId, 0, 0);
      });
      getEventBus().publishLiveBet({
        type: "live-bet",
        id: player.betId,
        userId: player.userId,
        name: player.name,
        gameId: "crash",
        gameName: "Crash",
        amountCents: player.amountCents,
        multiplier: 0,
        payoutCents: 0,
        win: false,
        createdAt: this.clock.now().toISOString(),
      });
    }
  }

  private async refundBet(betId: string, userId: string, amountCents: number) {
    const database = await getDatabase();
    await database.transaction(async (transaction) => {
      const tx = transaction as unknown as Database;
      await tx.update(crashBets).set({ status: "cancelled", settledAt: this.clock.now() }).where(eq(crashBets.id, betId));
      await this.ledger.move(tx, {
        userId,
        amountCents,
        type: "refund",
        betId,
        metadata: { gameId: "crash", reason: "betting-closed" },
      });
      await this.ledger.recordRefund(tx, userId, amountCents);
    });
  }

  private async recoverInterruptedBets() {
    const database = await getDatabase();
    const stale = await database.select().from(crashBets).where(eq(crashBets.status, "active"));
    for (const bet of stale) {
      await database.transaction(async (transaction) => {
        const tx = transaction as unknown as Database;
        await tx.update(crashBets).set({ status: "cancelled", settledAt: this.clock.now() }).where(eq(crashBets.id, bet.id));
        await this.ledger.move(tx, {
          userId: bet.userId,
          amountCents: bet.amountCents,
          type: "refund",
          betId: bet.id,
          metadata: { gameId: "crash", reason: "interrupted-round" },
        });
        await this.ledger.recordRefund(tx, bet.userId, bet.amountCents);
      });
    }
  }
}

const globalCrash = globalThis as typeof globalThis & { openStakeCrashService?: CrashService };

export function getCrashService() {
  if (!globalCrash.openStakeCrashService) {
    const container = getContainer();
    globalCrash.openStakeCrashService = new CrashService(container.ids, container.clock, container.ledger, container.users);
  }
  return globalCrash.openStakeCrashService;
}
