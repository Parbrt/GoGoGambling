export const BABY_STATS = ["Bave", "Colere", "Odeur", "Gaz", "Chance"];

export type Baby = number[];

export interface BabyFightResult {
  winner: 1 | 2;
  stats: [number, number, number];
  statNames: [string, string, string];
  scores: { a: number; b: number };
  weights: [number, number, number];
  babyAValues: [number, number, number];
  babyBValues: [number, number, number];
}

export interface BabyFightData {
  id: number;
  babyA: { name: string; stats: number[] };
  babyB: { name: string; stats: number[] };
  scheduledAt: string;
  status: "betting" | "fighting" | "resolved";
  winner: number | null;
  totalPotA: number;
  totalPotB: number;
  oddsA: number;
  oddsB: number;
  betCount: number;
  resolvedAt: string | null;
}

export interface BabyFightBet {
  playerName: string;
  amount: number;
  betOn: number;
  isBot?: boolean;
}

export interface BabyFightState {
  fight: BabyFightData | null;
  bets: BabyFightBet[];
  timeRemaining: number;
}

export interface BabyFightHistoryEntry extends BabyFightData {
  bets: Array<{
    playerName: string;
    amount: number;
    betOn: number;
    won: boolean;
    winnings: number;
  }>;
}

export interface BabyFightDetail extends BabyFightData {
  bets: Array<{
    playerName: string;
    amount: number;
    betOn: number;
    oddsAtBet: number;
    won: boolean;
    winnings: number;
  }>;
}

export function getScoreColor(score: number): string {
  if (score > 66) return "bg-green-500";
  if (score > 33) return "bg-yellow-500";
  return "bg-red-500";
}

export function getScoreLabel(score: number): string {
  if (score > 66) return "HIGH";
  if (score > 33) return "MID";
  return "LOW";
}

export function formatOdds(odds: number): string {
  return `1:${odds.toFixed(2)}`;
}
