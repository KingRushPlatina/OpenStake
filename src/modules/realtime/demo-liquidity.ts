import { env } from "@/platform/env";
import { getEventBus, type LiveBetEvent } from "@/modules/realtime/event-bus";
import { gameCatalog } from "@/modules/games/catalog";
import type { GameId } from "@/modules/games/types";
import type { UserService } from "@/modules/identity/user-service";

type DemoBot = { id: string; name: string };

const globalDemo = globalThis as typeof globalThis & {
  openStakeDemoLiquidity?: { started: boolean; interval?: NodeJS.Timeout; bots?: DemoBot[] };
};

const rareCaps: Record<GameId, number> = {
  blackjack: 2.5,
  dice: 49.5,
  limbo: 500,
  plinko: 1_000,
  mines: 25,
  keno: 500,
  wheel: 50,
  hilo: 25,
  "dragon-tower": 40,
  "chicken-cross": 25,
};

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function randomMultiplier(gameId: GameId) {
  const roll = Math.random();
  if (gameId === "blackjack") {
    if (roll < 0.48) return 0;
    if (roll < 0.56) return 1;
    if (roll < 0.94) return 2;
    return 2.5;
  }
  if (roll < 0.5) return 0;
  if (roll < 0.8) return round(1 + Math.random() * 0.9);
  if (roll < 0.95) return round(2 + Math.random() * 3);
  if (roll < 0.995) return round(5 + Math.random() * 15);
  return round(Math.max(20, 20 + Math.random() * (rareCaps[gameId] - 20)));
}

function createEvent(bots: DemoBot[]): LiveBetEvent {
  const bot = bots[randomBetween(0, bots.length - 1)];
  const game = gameCatalog[randomBetween(0, gameCatalog.length - 1)];
  const amountCents = randomBetween(25, 7_500);
  const multiplier = randomMultiplier(game.id);
  const payoutCents = Math.floor(amountCents * multiplier);
  return {
    type: "live-bet",
    id: `demo_${crypto.randomUUID()}`,
    userId: bot.id,
    name: bot.name,
    gameId: game.id,
    gameName: game.name,
    amountCents,
    multiplier,
    payoutCents,
    win: payoutCents > amountCents,
    createdAt: new Date().toISOString(),
  };
}

export async function startDemoLiquidity(users: UserService) {
  if (!env.DEMO_LIQUIDITY) return;
  await users.ensureDemoBots();
  const bots = await users.listBots();
  if (bots.length === 0) return;
  globalDemo.openStakeDemoLiquidity ??= { started: false, bots };
  const state = globalDemo.openStakeDemoLiquidity;
  state.bots = bots;
  const bus = getEventBus();
  for (let index = 0; index < 8; index += 1) {
    bus.publishLiveBet(createEvent(bots));
  }
  if (state.started) return;
  state.started = true;
  state.interval = setInterval(() => {
    const currentBots = globalDemo.openStakeDemoLiquidity?.bots ?? bots;
    bus.publishLiveBet(createEvent(currentBots));
    if (Math.random() > 0.72) bus.publishLiveBet(createEvent(currentBots));
  }, 1_800);
}
