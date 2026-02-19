export const CHICKEN_STATS = ["Intelligence", "Strenght", "Speed", "Stamina", "Luck"];

export type Chicken = number[];

export function randint(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function createChicken(): Chicken {
  const chicken: Chicken = [];
  for (let i = 0; i < CHICKEN_STATS.length; i++) {
    chicken.push(randint(0, 100));
  }
  return chicken;
}

export function getScale(stat: number): string {
  return stat > 66 ? "HIGH" : (stat > 33 ? "MID" : "LOW");
}

export interface FightResult {
  winner: 1 | 2;
  chickenAStats: [number, number, number];
  chickenBStats: [number, number, number];
  statNames: [string, string, string];
  scores: {
    a: number;
    b: number;
  };
}

export function fight(chickenA: Chicken, chickenB: Chicken): FightResult {
  let statA = randint(0, 4);
  let statB = statA;
  while (statB === statA) {
    statB = randint(0, 4);
  }
  let statC = statB;
  while (statC === statA || statC === statB) {
    statC = randint(0, 4);
  }

  const stats: [number, number, number] = [statA, statB, statC];
  const statNames: [string, string, string] = [
    CHICKEN_STATS[statA],
    CHICKEN_STATS[statB],
    CHICKEN_STATS[statC]
  ];

  let ponderA = randint(10, 80) / 100;
  let ponderB = 1;
  while ((ponderA + ponderB) >= 1) {
    ponderB = randint(0, 90) / 100;
  }
  let ponderC = 1 - (ponderA + ponderB);

  const scoreA = ponderA * chickenA[statA] + ponderB * chickenA[statB] + ponderC * chickenA[statC];
  const scoreB = ponderA * chickenB[statA] + ponderB * chickenB[statB] + ponderC * chickenB[statC];

  return {
    winner: scoreA >= scoreB ? 1 : 2,
    chickenAStats: stats,
    chickenBStats: stats,
    statNames,
    scores: {
      a: scoreA,
      b: scoreB
    }
  };
}

export function generatePopulation(): [number, number][] {
  const sizePop = randint(5, 20);
  const population: [number, number][] = [];
  for (let i = 0; i < sizePop; i++) {
    population.push([randint(0, 1), randint(20, 5000)]);
  }
  return population;
}

export interface BetInfo {
  betA: number;
  betB: number;
  multiplier: number;
  display: string;
}

export function calculateBets(population: [number, number][], userBet: number = 0, userChoice: 1 | 2 | null = null): BetInfo {
  let betA = 0;
  let betB = 0;

  for (const element of population) {
    if (element[0] === 0) {
      betA += element[1];
    } else {
      betB += element[1];
    }
  }

  if (userChoice === 1) {
    betA += userBet;
  } else if (userChoice === 2) {
    betB += userBet;
  }

  let multiplier: number;
  let display: string;

  if (betA > betB) {
    multiplier = betA / betB;
    display = `${multiplier.toFixed(2)}:1`;
  } else {
    multiplier = betB / betA;
    display = `1:${multiplier.toFixed(2)}`;
  }

  return { betA, betB, multiplier, display };
}

export function calculateWinnings(bet: number, multiplier: number): number {
  return Math.round(bet * multiplier);
}
