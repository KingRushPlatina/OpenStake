import { env } from "@/platform/env";
import { getEventBus, type LiveBetEvent } from "@/modules/realtime/event-bus";
import { gameCatalog } from "@/modules/games/catalog";
import type { UserService } from "@/modules/identity/user-service";

type DemoBot = { id: string; name: string };

const globalDemo = globalThis as typeof globalThis & {
  openStakeDemoLiquidity?: { started: boolean; interval?: NodeJS.Timeout; bots?: DemoBot[] };
};

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomMultiplier() {
  const roll = Math.random();
  if (roll > 0.985) return randomBetween(2000, 25_000) / 100;
  if (roll > 0.9) return randomBetween(250, 1_500) / 100;
  if (roll > 0.55) return randomBetween(110, 400) / 100;
  return 0;
}

function createEvent(bots: DemoBot[]): LiveBetEvent {
  const bot = bots[randomBetween(0, bots.length - 1)];
  const game = gameCatalog[randomBetween(0, Math.min(13, gameCatalog.length - 1))];
  const amountCents = randomBetween(25, 7_500);
  const multiplier = randomMultiplier();
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
  if (state.started) return;
  state.started = true;
  const bus = getEventBus();
  for (let index = 0; index < 10; index += 1) {
    bus.publishLiveBet(createEvent(bots));
  }
  state.interval = setInterval(() => {
    const currentBots = globalDemo.openStakeDemoLiquidity?.bots ?? bots;
    bus.publishLiveBet(createEvent(currentBots));
    if (Math.random() > 0.72) bus.publishLiveBet(createEvent(currentBots));
  }, 1_800);
}
