type Subscriber = (event: unknown) => void;

export type LiveBetEvent = {
  type: "live-bet";
  id: string;
  userId: string;
  name: string;
  avatarPreset: string | null;
  avatarUrl: string | null;
  gameId: string;
  gameName: string;
  amountCents: number;
  multiplier: number;
  payoutCents: number;
  win: boolean;
  createdAt: string;
};

export type RealtimeEvent =
  | LiveBetEvent
  | { type: "heartbeat"; at: string };

class EventBus {
  private subscribers = new Map<string, Set<Subscriber>>();

  subscribe(topic: string, subscriber: Subscriber) {
    const set = this.subscribers.get(topic) ?? new Set<Subscriber>();
    set.add(subscriber);
    this.subscribers.set(topic, set);
    return () => {
      set.delete(subscriber);
      if (set.size === 0) this.subscribers.delete(topic);
    };
  }

  publish(topic: string, event: RealtimeEvent) {
    const set = this.subscribers.get(topic);
    if (!set) return;
    for (const subscriber of set) subscriber(event);
  }

  publishLiveBet(event: LiveBetEvent) {
    this.publish("live", event);
  }
}

const globalEvents = globalThis as typeof globalThis & { openStakeEventBus?: EventBus };

export function getEventBus() {
  globalEvents.openStakeEventBus ??= new EventBus();
  return globalEvents.openStakeEventBus;
}
