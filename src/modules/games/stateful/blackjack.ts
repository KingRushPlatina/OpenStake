import { z } from "zod";
import type { ProgressionEngine, ProgressionSnapshot } from "./types";
import { gameCatalogById } from "../catalog";
import {
  blackjackValue,
  createDeck,
  rankOf,
  shuffleDeck,
} from "../cards";

export const blackjackStartSchema = z.object({}).strict();

export const blackjackActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("hit") }),
  z.object({ type: z.literal("stand") }),
  z.object({ type: z.literal("double") }),
  z.object({ type: z.literal("split") }),
  z.object({ type: z.literal("take-insurance") }),
  z.object({ type: z.literal("decline-insurance") }),
]);

type HandStatus = "active" | "stood" | "bust";

type BlackjackHand = {
  cards: string[];
  betCents: number;
  status: HandStatus;
  fromSplit: boolean;
  doubled: boolean;
};

type BlackjackSecret = {
  shoe: string[];
  cursor: number;
  dealer: string[];
  hands: BlackjackHand[];
  activeHand: number;
  phase: "insurance" | "player" | "settled";
  insuranceBet: number;
  originalBet: number;
  totalStake: number;
};

type PublicHand = {
  cards: string[];
  total: number;
  soft: boolean;
  status: HandStatus;
  betCents: number;
  fromSplit: boolean;
  doubled: boolean;
  active: boolean;
};

type BlackjackPublic = {
  phase: "insurance" | "player" | "settled";
  dealerCards: string[];
  dealerHidden: boolean;
  dealerTotal: number | null;
  hands: PublicHand[];
  activeHand: number;
  insuranceOffered: boolean;
  insuranceBet: number;
  totalStake: number;
  availableActions: string[];
  message: string;
};

function drawCard(secret: BlackjackSecret) {
  return secret.shoe[secret.cursor++];
}

function isNatural(hand: BlackjackHand) {
  return !hand.fromSplit && hand.cards.length === 2 && blackjackValue(hand.cards).total === 21;
}

function publicHand(hand: BlackjackHand, activeHand: number, index: number): PublicHand {
  const value = blackjackValue(hand.cards);
  return {
    cards: [...hand.cards],
    total: value.total,
    soft: value.soft,
    status: hand.status,
    betCents: hand.betCents,
    fromSplit: hand.fromSplit,
    doubled: hand.doubled,
    active: index === activeHand && hand.status === "active",
  };
}

function activeActions(secret: BlackjackSecret): string[] {
  if (secret.phase === "insurance") return ["take-insurance", "decline-insurance"];
  if (secret.phase === "settled") return [];
  const hand = secret.hands[secret.activeHand];
  if (!hand) return [];
  const actions = ["hit", "stand"];
  if (hand.cards.length === 2) actions.push("double");
  if (hand.cards.length === 2 && hand.cards.every((card) => rankOf(card) === rankOf(hand.cards[0])) && secret.hands.length < 4) {
    actions.push("split");
  }
  return actions;
}

function publicState(secret: BlackjackSecret, settled = false): BlackjackPublic {
  const dealerValue = blackjackValue(secret.dealer);
  return {
    phase: secret.phase,
    dealerCards: settled ? [...secret.dealer] : [secret.dealer[0]],
    dealerHidden: !settled,
    dealerTotal: settled ? dealerValue.total : null,
    hands: secret.hands.map((hand, index) => publicHand(hand, secret.activeHand, index)),
    activeHand: secret.activeHand,
    insuranceOffered: secret.dealer.length > 0 && rankOf(secret.dealer[0]) === "A",
    insuranceBet: secret.insuranceBet,
    totalStake: secret.totalStake,
    availableActions: settled ? [] : activeActions(secret),
    message: settled
      ? "Round settled"
      : secret.phase === "insurance"
        ? "Insurance is available"
        : secret.hands[secret.activeHand]?.status === "active"
          ? "Your move"
          : "Dealer plays",
  };
}

function settleRound(secret: BlackjackSecret, snapshot: ProgressionSnapshot): ProgressionSnapshot {
  const dealerValueBefore = blackjackValue(secret.dealer);
  const dealerNatural = secret.dealer.length === 2 && dealerValueBefore.total === 21;
  const hasLiveHand = secret.hands.some((hand) => hand.status !== "bust");
  if (!dealerNatural && hasLiveHand) {
    while (blackjackValue(secret.dealer).total < 17) {
      secret.dealer.push(drawCard(secret));
    }
  }
  const dealerValue = blackjackValue(secret.dealer);
  const dealerBlackjack = secret.dealer.length === 2 && dealerValue.total === 21;
  const payouts = secret.hands.map((hand) => {
    const value = blackjackValue(hand.cards);
    const natural = isNatural(hand);
    if (value.total > 21) return { betCents: hand.betCents, payoutCents: 0, outcome: "bust" };
    if (dealerBlackjack) {
      if (natural) return { betCents: hand.betCents, payoutCents: hand.betCents, outcome: "push" };
      return { betCents: hand.betCents, payoutCents: 0, outcome: "lose" };
    }
    if (natural) return { betCents: hand.betCents, payoutCents: Math.floor(hand.betCents * 2.5), outcome: "blackjack" };
    if (dealerValue.total > 21) return { betCents: hand.betCents, payoutCents: hand.betCents * 2, outcome: "win" };
    if (value.total > dealerValue.total) return { betCents: hand.betCents, payoutCents: hand.betCents * 2, outcome: "win" };
    if (value.total === dealerValue.total) return { betCents: hand.betCents, payoutCents: hand.betCents, outcome: "push" };
    return { betCents: hand.betCents, payoutCents: 0, outcome: "lose" };
  });
  const insurancePayout = dealerBlackjack && secret.insuranceBet > 0 ? secret.insuranceBet * 3 : 0;
  const totalPayout = payouts.reduce((sum, payout) => sum + payout.payoutCents, 0) + insurancePayout;
  const multiplier = secret.totalStake === 0 ? 0 : totalPayout / secret.totalStake;
  secret.phase = "settled";
  secret.activeHand = -1;
  secret.hands = secret.hands.map((hand) => ({ ...hand, status: hand.status === "active" ? "stood" : hand.status }));
  const settled = { ...publicState(secret, true), dealerBlackjack, insurancePayout, payouts, totalPayout };
  return {
    ...snapshot,
    secret,
    publicState: publicState(secret, true),
    multiplier,
    status: "settled",
    settledResult: settled,
  };
}

function advance(secret: BlackjackSecret, snapshot: ProgressionSnapshot): ProgressionSnapshot {
  const next = secret.hands.findIndex((hand, index) => index > secret.activeHand && hand.status === "active");
  const anyActive = secret.hands.some((hand) => hand.status === "active");
  if (!anyActive) return settleRound(secret, snapshot);
  if (next >= 0) {
    secret.activeHand = next;
    return { ...snapshot, secret, publicState: publicState(secret), multiplier: 0, status: "active" };
  }
  const firstActive = secret.hands.findIndex((hand) => hand.status === "active");
  secret.activeHand = firstActive >= 0 ? firstActive : 0;
  return { ...snapshot, secret, publicState: publicState(secret), multiplier: 0, status: "active" };
}

function prepareAfterInsurance(secret: BlackjackSecret, snapshot: ProgressionSnapshot): ProgressionSnapshot {
  const dealerBlackjack = secret.dealer.length === 2 && blackjackValue(secret.dealer).total === 21;
  if (dealerBlackjack) return settleRound(secret, snapshot);
  const onlyHand = secret.hands.length === 1 ? secret.hands[0] : null;
  if (onlyHand && isNatural(onlyHand)) return settleRound(secret, snapshot);
  secret.phase = "player";
  secret.activeHand = 0;
  return { ...snapshot, secret, publicState: publicState(secret), multiplier: 0, status: "active" };
}

export const blackjackGame: ProgressionEngine = {
  metadata: gameCatalogById.get("blackjack")!,
  startSchema: blackjackStartSchema,
  actionSchema: blackjackActionSchema,
  start: (_input, context) => {
    const shoe = shuffleDeck(createDeck(6), context.random);
    const secret: BlackjackSecret = {
      shoe,
      cursor: 0,
      dealer: [],
      hands: [],
      activeHand: 0,
      phase: "player",
      insuranceBet: 0,
      originalBet: context.betCents,
      totalStake: context.betCents,
    };
    secret.hands = [
      {
        cards: [drawCard(secret), drawCard(secret)],
        betCents: context.betCents,
        status: "active",
        fromSplit: false,
        doubled: false,
      },
    ];
    secret.dealer = [drawCard(secret), drawCard(secret)];
    const dealerUpcardAce = rankOf(secret.dealer[0]) === "A";
    const dealerBlackjack = secret.dealer.length === 2 && blackjackValue(secret.dealer).total === 21;
    const playerBlackjack = isNatural(secret.hands[0]);
    const snapshot: ProgressionSnapshot = {
      secret,
      publicState: publicState(secret),
      multiplier: 0,
      status: "active",
    };
    if (dealerUpcardAce) {
      secret.phase = "insurance";
      return { ...snapshot, publicState: publicState(secret) };
    }
    if (dealerBlackjack) return settleRound(secret, snapshot);
    if (playerBlackjack) return settleRound(secret, snapshot);
    return snapshot;
  },
  act: (snapshot, action) => {
    const parsed = blackjackActionSchema.parse(action);
    const secret = structuredClone(snapshot.secret as BlackjackSecret);
    const current = { ...snapshot, secret };

    if (secret.phase === "insurance") {
      if (parsed.type === "take-insurance") {
        secret.insuranceBet = Math.max(1, Math.floor(secret.originalBet / 2));
        secret.totalStake += secret.insuranceBet;
        const after = prepareAfterInsurance(secret, { ...current, additionalStakeCents: secret.insuranceBet });
        return after;
      }
      if (parsed.type === "decline-insurance") return prepareAfterInsurance(secret, current);
      throw new Error("Choose whether to take insurance");
    }

    if (secret.phase !== "player") throw new Error("The round is already settled");
    const hand = secret.hands[secret.activeHand];
    if (!hand || hand.status !== "active") throw new Error("No active hand");

    if (parsed.type === "hit") {
      hand.cards.push(drawCard(secret));
      const value = blackjackValue(hand.cards);
      if (value.total > 21) hand.status = "bust";
      else if (value.total === 21) hand.status = "stood";
      return advance(secret, current);
    }

    if (parsed.type === "stand") {
      hand.status = "stood";
      return advance(secret, current);
    }

    if (parsed.type === "double") {
      if (hand.cards.length !== 2) throw new Error("Double is only available on the first two cards");
      hand.betCents *= 2;
      hand.doubled = true;
      secret.totalStake += hand.betCents / 2;
      hand.cards.push(drawCard(secret));
      hand.status = blackjackValue(hand.cards).total > 21 ? "bust" : "stood";
      return advance(secret, { ...current, additionalStakeCents: hand.betCents / 2 });
    }

    if (parsed.type === "split") {
      if (hand.cards.length !== 2) throw new Error("Split is only available on the first two cards");
      if (rankOf(hand.cards[0]) !== rankOf(hand.cards[1])) throw new Error("The cards must match");
      if (secret.hands.length >= 4) throw new Error("Maximum four hands");
      const movedCard = hand.cards.pop()!;
      const newHand: BlackjackHand = {
        cards: [movedCard, drawCard(secret)],
        betCents: hand.betCents,
        status: "active",
        fromSplit: true,
        doubled: false,
      };
      hand.cards.push(drawCard(secret));
      hand.fromSplit = true;
      secret.totalStake += hand.betCents;
      secret.hands.push(newHand);
      if (rankOf(movedCard) === "A") {
        hand.status = "stood";
        newHand.status = "stood";
      } else {
        if (blackjackValue(hand.cards).total === 21) hand.status = "stood";
        if (blackjackValue(newHand.cards).total === 21) newHand.status = "stood";
      }
      return advance(secret, { ...current, additionalStakeCents: hand.betCents });
    }

    throw new Error("That action is not available");
  },
};

export type BlackjackPublicState = BlackjackPublic;
