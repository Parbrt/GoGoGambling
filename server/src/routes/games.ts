import { Router } from "express";
import { getDb } from "../db/connection.js";
import { authMiddleware, type AuthenticatedRequest } from "../auth/middleware.js";
import { broadcastJackpotWin } from "../ws/index.js";
import { updatePeakNetWorth } from "./player.js";
import type { Player } from "../types.js";

const router = Router();

// --- Slot Machine ---

function spinNumbers(): number[] {
  return Array.from({ length: 5 }, () => Math.floor(Math.random() * 10));
}

function calculateSlotReward(
  numbers: number[],
  bet: number,
  machinePoints: number
): { reward: number; winType: "similar" | "sequence" | "none"; message: string } {
  const counts = new Map<number, number>();
  for (const n of numbers) counts.set(n, (counts.get(n) ?? 0) + 1);

  let val = numbers[0];
  let maxCount = 0;
  for (const [key, count] of counts) {
    if (count > maxCount) { maxCount = count; val = key; }
  }

  const nbSim = maxCount;

  const multipliers: number[][] = [
    [0.5, 2, 5],
    [1, 5, 10],
    [5, 20, 50],
    [10, 100, 500],
  ];

  if (nbSim >= 3) {
    let multIndex: number;
    if (val === 7) multIndex = 3;
    else if (val === 8 || val === 9) multIndex = 2;
    else if (val % 2 === 1) multIndex = 1;
    else multIndex = 0;

    const reward = Math.round(bet * multipliers[multIndex][nbSim - 3]);
    const messages = [
      `Bravo ! ${nbSim} fois ${val} ! Vous gagnez ${reward} points !`,
      `Super ! ${nbSim} fois ${val} ! Vous gagnez ${reward} points !`,
      `JACKPOT ! ${val}-${val}-${val}-${val}-${val} ! Vous gagnez ${reward} points !`,
    ];
    return { reward, winType: "similar", message: messages[nbSim - 3] };
  }

  if (
    numbers[4] === numbers[3] + 1 &&
    numbers[3] === numbers[2] + 1 &&
    numbers[2] === numbers[1] + 1 &&
    numbers[1] === numbers[0] + 1
  ) {
    return {
      reward: machinePoints,
      winType: "sequence",
      message: `SEQUENCE MAGIQUE ! ${numbers.join("-")} ! Vous remportez ${machinePoints} points de la machine !`,
    };
  }

  return { reward: 0, winType: "none", message: "Perdu..." };
}

router.post("/slot/spin", authMiddleware, (req: AuthenticatedRequest, res) => {
  const { bet } = req.body as { bet: number };
  if (!bet || bet <= 0) {
    res.status(400).json({ error: "Mise invalide" });
    return;
  }

  const db = getDb();
  const player = db
    .prepare("SELECT * FROM players WHERE user_id = ?")
    .get(req.userId!) as Player | undefined;

  if (!player || bet > player.nb_point) {
    res.status(400).json({ error: "Fonds insuffisants" });
    return;
  }

  const jackpotRow = db.prepare("SELECT * FROM slot_machine LIMIT 1").get() as { nb_point: number; updated_at: string } | undefined;
  let machinePoints = jackpotRow?.nb_point ?? 10000;

  // Daily bonus
  if (jackpotRow) {
    const lastUpdate = new Date(jackpotRow.updated_at);
    const now = new Date();
    const elapsedDays = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
    if (elapsedDays > 0) {
      machinePoints += elapsedDays * 5000;
    }
  }

  const numbers = spinNumbers();
  const result = calculateSlotReward(numbers, bet, machinePoints);

  const newPlayerPoints = player.nb_point - bet + result.reward;
  const newMachinePoints = machinePoints + bet - result.reward;
  const finalMachinePoints = newMachinePoints <= 0 ? 10000 : Math.round(newMachinePoints);

  // Check if jackpot was won
  if (result.winType === "sequence" && result.reward >= machinePoints * 0.5) {
    broadcastJackpotWin(player.player_name, result.reward);
  }

  db.prepare("UPDATE players SET nb_point = ? WHERE user_id = ?")
    .run(Math.round(newPlayerPoints), req.userId!);
  db.prepare("UPDATE slot_machine SET nb_point = ?, updated_at = ? WHERE id = COALESCE((SELECT id FROM slot_machine LIMIT 1), 1)")
    .run(finalMachinePoints, new Date().toISOString());

  updatePeakNetWorth(req.userId!);

  const updated = db
    .prepare("SELECT * FROM players WHERE user_id = ?")
    .get(req.userId!) as Player;

  res.json({
    player: updated,
    numbers,
    reward: result.reward,
    winType: result.winType,
    message: result.message,
    jackpot: finalMachinePoints,
  });
});

router.get("/slot/jackpot", (_req, res) => {
  const db = getDb();
  const jackpot = db.prepare("SELECT nb_point, updated_at FROM slot_machine LIMIT 1").get() as { nb_point: number; updated_at: string } | undefined;

  let points = jackpot?.nb_point ?? 10000;
  if (jackpot) {
    const lastUpdate = new Date(jackpot.updated_at);
    const now = new Date();
    const elapsedDays = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
    if (elapsedDays > 0) points += elapsedDays * 5000;
  }

  res.json({ jackpot: points });
});

// --- Roulette ---

router.post("/roulette/spin", authMiddleware, (req: AuthenticatedRequest, res) => {
  const { bet, choiceType, choiceValue } = req.body as { bet: number; choiceType: "odd-even" | "number"; choiceValue: number };

  if (!bet || bet <= 0 || !choiceType || choiceValue === undefined) {
    res.status(400).json({ error: "Paramètres invalides" });
    return;
  }

  const db = getDb();
  const player = db
    .prepare("SELECT * FROM players WHERE user_id = ?")
    .get(req.userId!) as Player | undefined;

  if (!player || bet > player.nb_point) {
    res.status(400).json({ error: "Fonds insuffisants" });
    return;
  }

  const winningNumber = Math.floor(Math.random() * 36);
  let winnings = 0;

  if (choiceType === "odd-even") {
    const betOnEven = choiceValue === 2;
    const isWinningEven = winningNumber % 2 === 0;
    if ((betOnEven && isWinningEven) || (!betOnEven && !isWinningEven)) {
      winnings = bet * 2;
    }
  } else {
    if (choiceValue === winningNumber) {
      winnings = bet * 36;
    }
  }

  const newPoints = Math.round(player.nb_point - bet + winnings);
  db.prepare("UPDATE players SET nb_point = ? WHERE user_id = ?").run(newPoints, req.userId!);

  updatePeakNetWorth(req.userId!);

  const updated = db
    .prepare("SELECT * FROM players WHERE user_id = ?")
    .get(req.userId!) as Player;

  res.json({
    player: updated,
    winningNumber,
    winnings,
    isWin: winnings > 0,
  });
});

// --- Chicken Fight ---

const CHICKEN_CHARGE_MAX = 5;
const CHICKEN_CHARGE_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

function refillChickenCharges(player: Player): { chicken_charges: number; last_chicken_charge_refill: string | null } {
  let charges = player.chicken_charges ?? CHICKEN_CHARGE_MAX;
  let lastRefill = player.last_chicken_charge_refill;

  if (charges >= CHICKEN_CHARGE_MAX) {
    // Already full, update refill timestamp to now so it doesn't accumulate past max
    return { chicken_charges: CHICKEN_CHARGE_MAX, last_chicken_charge_refill: new Date().toISOString() };
  }

  if (!lastRefill) {
    lastRefill = new Date().toISOString();
  }

  const now = Date.now();
  const lastRefillMs = new Date(lastRefill).getTime();
  const elapsed = now - lastRefillMs;
  const recovered = Math.floor(elapsed / CHICKEN_CHARGE_COOLDOWN_MS);

  if (recovered > 0) {
    charges = Math.min(CHICKEN_CHARGE_MAX, charges + recovered);
    const newLastRefill = new Date(lastRefillMs + recovered * CHICKEN_CHARGE_COOLDOWN_MS);
    lastRefill = newLastRefill.toISOString();
  }

  if (charges >= CHICKEN_CHARGE_MAX) {
    lastRefill = new Date().toISOString();
  }

  return { chicken_charges: charges, last_chicken_charge_refill: lastRefill };
}

function getChickenNextChargeMs(charges: number, lastRefill: string | null): number {
  if (charges >= CHICKEN_CHARGE_MAX || !lastRefill) return 0;
  const now = Date.now();
  const lastRefillMs = new Date(lastRefill).getTime();
  const elapsed = now - lastRefillMs;
  const remaining = CHICKEN_CHARGE_COOLDOWN_MS - (elapsed % CHICKEN_CHARGE_COOLDOWN_MS);
  return Math.max(0, remaining);
}

function randint(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createChicken(): number[] {
  return Array.from({ length: 5 }, () => randint(0, 100));
}

const CHICKEN_STATS = ["Intelligence", "Strenght", "Speed", "Stamina", "Luck"];

function fight(chickenA: number[], chickenB: number[]) {
  const statA = randint(0, 4);
  let statB = statA;
  while (statB === statA) statB = randint(0, 4);
  let statC = statB;
  while (statC === statA || statC === statB) statC = randint(0, 4);

  const stats: [number, number, number] = [statA, statB, statC];
  const statNames: [string, string, string] = [CHICKEN_STATS[statA], CHICKEN_STATS[statB], CHICKEN_STATS[statC]];

  const ponderA = randint(10, 80) / 100;
  const maxPonderB = Math.min(90, Math.floor((1 - ponderA - 0.01) * 100));
  const ponderB = randint(0, Math.max(0, maxPonderB)) / 100;
  const ponderC = 1 - (ponderA + ponderB);

  const scoreA = ponderA * chickenA[statA] + ponderB * chickenA[statB] + ponderC * chickenA[statC];
  const scoreB = ponderA * chickenB[statA] + ponderB * chickenB[statB] + ponderC * chickenB[statC];

  return {
    winner: (scoreA >= scoreB ? 1 : 2) as 1 | 2,
    stats, statNames,
    scores: { a: scoreA, b: scoreB },
    weights: [ponderA, ponderB, ponderC] as [number, number, number],
    chickenAValues: [chickenA[statA], chickenA[statB], chickenA[statC]] as [number, number, number],
    chickenBValues: [chickenB[statA], chickenB[statB], chickenB[statC]] as [number, number, number],
  };
}

function generatePopulation(): [number, number][] {
  const sizePop = randint(5, 20);
  const pop: [number, number][] = [[0, randint(50, 1000)], [1, randint(50, 1000)]];
  for (let i = 2; i < sizePop; i++) pop.push([randint(0, 1) as 0 | 1, randint(20, 5000)]);
  return pop;
}

function calculateOdds(population: [number, number][], userBet: number, userChoice: 1 | 2) {
  let betA = 0, betB = 0;
  for (const [choice, amount] of population) {
    if (choice === 0) betA += amount;
    else betB += amount;
  }
  if (userChoice === 1) betA += userBet;
  else betB += userBet;

  const safeBetA = Math.max(betA, 1), safeBetB = Math.max(betB, 1);
  const oddsA = Math.min((safeBetA + safeBetB) / safeBetA, 10);
  const oddsB = Math.min((safeBetB + safeBetA) / safeBetB, 10);
  return { betA, betB, oddsA, oddsB };
}

router.post("/chicken/fight", authMiddleware, (req: AuthenticatedRequest, res) => {
  const { bet, selectedChicken, chickenA: clientA, chickenB: clientB } = req.body as { bet: number; selectedChicken: 1 | 2; chickenA?: number[]; chickenB?: number[] };

  if (!bet || bet <= 0 || !selectedChicken) {
    res.status(400).json({ error: "Paramètres invalides" });
    return;
  }

  const db = getDb();
  const player = db
    .prepare("SELECT * FROM players WHERE user_id = ?")
    .get(req.userId!) as Player | undefined;

  if (!player || bet > player.nb_point) {
    res.status(400).json({ error: "Fonds insuffisants" });
    return;
  }

  // Refill charges
  const refillResult = refillChickenCharges(player);
  player.chicken_charges = refillResult.chicken_charges;
  player.last_chicken_charge_refill = refillResult.last_chicken_charge_refill;

  if (player.chicken_charges <= 0) {
    const nextChargeMs = getChickenNextChargeMs(player.chicken_charges, player.last_chicken_charge_refill);
    res.status(429).json({
      error: "Plus de charges disponibles",
      chicken_charges: player.chicken_charges,
      next_charge_in_ms: nextChargeMs,
    });
    return;
  }

  const chickenA = clientA?.length === 5 ? clientA : createChicken();
  const chickenB = clientB?.length === 5 ? clientB : createChicken();
  const population = generatePopulation();
  const odds = calculateOdds(population, bet, selectedChicken);
  const result = fight(chickenA, chickenB);

  const isWin = selectedChicken === result.winner;
  const selectedOdds = selectedChicken === 1 ? odds.oddsA : odds.oddsB;
  const winnings = isWin ? Math.round(bet * selectedOdds) : 0;
  const newPoints = Math.round(player.nb_point - bet + winnings);

  // Consume one charge
  const newCharges = player.chicken_charges - 1;
  const nextChargeMs = getChickenNextChargeMs(newCharges, player.last_chicken_charge_refill);

  db.prepare("UPDATE players SET nb_point = ?, chicken_charges = ?, last_chicken_charge_refill = ? WHERE user_id = ?")
    .run(newPoints, newCharges, player.last_chicken_charge_refill, req.userId!);

  updatePeakNetWorth(req.userId!);

  const updated = db
    .prepare("SELECT * FROM players WHERE user_id = ?")
    .get(req.userId!) as Player;

  res.json({
    player: updated,
    chickenA, chickenB,
    fightResult: result,
    odds,
    isWin,
    winnings,
    population,
    chicken_charges: updated.chicken_charges,
    next_charge_in_ms: nextChargeMs,
  });
});

export default router;
