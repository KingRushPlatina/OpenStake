export type HandStatus = "active" | "stood" | "bust";

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
  payouts?: { betCents: number; payoutCents: number; outcome: string }[];
  totalPayout?: number;
};

export type BlackjackAction =
  | "hit"
  | "stand"
  | "double"
  | "split"
  | "take-insurance"
  | "decline-insurance";
