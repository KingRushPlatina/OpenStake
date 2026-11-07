export type HandStatus = "active" | "stood" | "bust";

export const BLACKJACK_CHIPS_CENTS = [100, 500, 2_500, 10_000, 50_000, 100_000] as const;

export const BLACKJACK_MAX_SPOTS = 4;
export const BLACKJACK_MAX_HANDS = 8;
export const BLACKJACK_MAX_HAND_BET_CENTS = 100_000;
export const BLACKJACK_MIN_HAND_BET_CENTS = 100;

export type PublicHand = {
  cards: string[];
  total: number;
  soft: boolean;
  status: HandStatus;
  betCents: number;
  fromSplit: boolean;
  doubled: boolean;
  active: boolean;
};

export type BlackjackHandOutcome = {
  betCents: number;
  payoutCents: number;
  outcome: string;
};

export type BlackjackState = {
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
  dealerBlackjack?: boolean;
  insurancePayout?: number;
  payouts?: BlackjackHandOutcome[];
  totalPayout?: number;
};

export type BlackjackAction =
  | "hit"
  | "stand"
  | "double"
  | "split"
  | "take-insurance"
  | "decline-insurance";
