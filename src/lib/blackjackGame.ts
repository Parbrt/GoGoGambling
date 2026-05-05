export type Suit = "♠" | "♥" | "♦" | "♣";
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

export interface Card {
  suit: Suit;
  rank: Rank;
  faceDown?: boolean;
}

export interface PlayerState {
  userId: string;
  playerName: string;
  seat: number;
  bet: number;
  hand: Card[];
  score: number;
  isStand: boolean;
  isBust: boolean;
  isBlackjack: boolean;
  result: string | null;
  winnings: number;
  isActive: boolean;
  lastActionAt: string;
}

export type TableStatus =
  | "waiting"
  | "betting"
  | "playing"
  | "dealer_turn"
  | "results"
  | "inter_round";

export interface TableState {
  id: number;
  status: TableStatus;
  roundNumber: number;
  dealerHand: Card[];
  dealerScore: number;
  currentPlayerSeat: number | null;
  players: PlayerState[];
  deckRemaining: number;
  turnDeadline: number;
  roundDeadline: number;
}

export function cardValue(rank: Rank): number {
  if (["J", "Q", "K"].includes(rank)) return 10;
  if (rank === "A") return 11;
  return parseInt(rank);
}

export function calculateScore(hand: Card[]): number {
  let score = 0;
  let aces = 0;

  for (const card of hand) {
    if (card.faceDown) continue;
    if (["J", "Q", "K"].includes(card.rank)) {
      score += 10;
    } else if (card.rank === "A") {
      score += 11;
      aces += 1;
    } else {
      score += parseInt(card.rank);
    }
  }

  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }

  return score;
}

export function cardColor(suit: Suit): string {
  return suit === "♥" || suit === "♦" ? "#CF4500" : "#141413";
}

export function getChipValues(points: number): number[] {
  const chips = [1, 5, 10, 25, 50, 100, 500, 1000];
  const result: number[] = [];

  for (const chip of chips) {
    if (points >= chip) {
      result.push(chip);
    }
  }

  // Always include 10 as minimum
  if (!result.includes(10)) {
    result.unshift(10);
  }

  return result.sort((a, b) => a - b);
}
