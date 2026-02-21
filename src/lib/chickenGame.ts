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
  weights: [number, number, number];
  statIndices: [number, number, number];
  chickenAValues: [number, number, number];
  chickenBValues: [number, number, number];
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

  // Calcul direct sans boucle infinie
  const ponderA = randint(10, 80) / 100;
  // ponderB doit être < (1 - ponderA) pour laisser de la place à ponderC
  const maxPonderB = Math.min(90, Math.floor((1 - ponderA - 0.01) * 100));
  const ponderB = randint(0, Math.max(0, maxPonderB)) / 100;
  const ponderC = 1 - (ponderA + ponderB);

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
    },
    weights: [ponderA, ponderB, ponderC],
    statIndices: stats,
    chickenAValues: [chickenA[statA], chickenA[statB], chickenA[statC]],
    chickenBValues: [chickenB[statA], chickenB[statB], chickenB[statC]]
  };
}

export function generatePopulation(): [number, number][] {
  const sizePop = randint(5, 20);
  const population: [number, number][] = [];

  // Garantir qu'il y a au moins un pari sur chaque poulet
  population.push([0, randint(50, 1000)]); // Au moins un pari sur A
  population.push([1, randint(50, 1000)]); // Au moins un pari sur B

  // Remplir le reste de la population aléatoirement
  for (let i = 2; i < sizePop; i++) {
    population.push([randint(0, 1), randint(20, 5000)]);
  }

  return population;
}

export interface BetInfo {
  betA: number;
  betB: number;
  oddsA: number;
  oddsB: number;
  displayA: string;
  displayB: string;
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

  // Ajouter la mise de l'utilisateur
  if (userChoice === 1) {
    betA += userBet;
  } else if (userChoice === 2) {
    betB += userBet;
  }

  // Vérification anti-division par zéro
  const MIN_BET = 1;
  const safeBetA = Math.max(betA, MIN_BET);
  const safeBetB = Math.max(betB, MIN_BET);

  // Calcul des cotes selon la formule demandée:
  // pour poulet a: 1 : (safeBetA + safeBetB) / safeBetA
  // pour poulet b: 1 : (safeBetB + safeBetA) / safeBetB
  const oddsA = (safeBetA + safeBetB) / safeBetA;
  const oddsB = (safeBetB + safeBetA) / safeBetB;

  // Limiter les cotes maximum à 10.0
  const finalOddsA = Math.min(oddsA, 10.0);
  const finalOddsB = Math.min(oddsB, 10.0);

  return { 
    betA, 
    betB, 
    oddsA: finalOddsA, 
    oddsB: finalOddsB,
    displayA: `1:${finalOddsA.toFixed(2)}`,
    displayB: `1:${finalOddsB.toFixed(2)}`
  };
}

export function calculateWinnings(bet: number, multiplier: number): number {
  // Validation des entrées
  if (!isFinite(bet) || bet < 0) {
    console.error('Valeur de mise invalide:', bet);
    return 0;
  }
  if (!isFinite(multiplier) || multiplier < 0) {
    console.error('Multiplicateur invalide:', multiplier);
    return bet; // Retourner au moins la mise en cas d'erreur
  }

  const winnings = Math.round(bet * multiplier);

  // S'assurer que le résultat est un nombre valide
  if (!isFinite(winnings) || winnings < 0) {
    console.error('Gains calculés invalides:', winnings);
    return bet;
  }

  return winnings;
}
