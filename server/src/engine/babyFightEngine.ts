import { getDb } from "../db/connection.js";
import { broadcastBabyFight } from "../ws/index.js";

const BABY_NAMES = [
  "Bebe Tornade", "Bebe Bulldozer", "Bebe Morveux", "Bebe Tsunami",
  "Bebe Rottweiler", "Bebe Cataclysme", "Bebe Kraken", "Bebe Ouragan",
  "Bebe Volcan", "Bebe Glouton", "Bebe Sismique", "Bebe Furax",
  "Bebe Mastodonte", "Bebe Bazooka", "Bebe Grizzli", "Bebe Rasoir",
  "Bebe Roquet", "Bebe Puncheur", "Bebe Molaire", "Bebe Flammeche",
  "Bebe Catapulte", "Bebe Ravageur", "Bebe Colosse", "Bebe Bourrasque",
  "Bebe Dobermann", "Bebe Braillard", "Bebe Pitbull", "Bebe Carnage",
  "Bebe Triceratops", "Bebe Mammouth",
];

const BABY_STATS = ["Bave", "Colere", "Odeur", "Gaz", "Chance"];

const SEED_POT = 10000;
const MAX_BET = 20000;
const BOT_COUNT_MIN = 6;
const BOT_COUNT_MAX = 15;

const BOT_NAMES = [
  "Bebe Ninja", "Bebe Samourai", "Bebe Pirate", "Bebe Magicien",
  "Bebe Robot", "Bebe Zombie", "Bebe Vampire", "Bebe Loup-Garou",
  "Bebe Astronaute", "Bebe Detector", "Bebe Champion", "Bebe Legende",
  "Bebe Titan", "Bebe Dragon", "Bebe Phoenix",
];

interface BabyFightRow {
  id: number;
  baby_a_name: string;
  baby_b_name: string;
  baby_a_stats: string;
  baby_b_stats: string;
  scheduled_at: string;
  status: string;
  winner: number | null;
  total_pot_a: number;
  total_pot_b: number;
  odds_a: number;
  odds_b: number;
  bet_count: number;
  created_at: string;
  resolved_at: string | null;
}

interface BabyFightBetRow {
  id: number;
  fight_id: number;
  user_id: string;
  player_name: string;
  bet_on: number;
  amount: number;
  odds_at_bet: number;
  won: number | null;
  winnings: number | null;
  created_at: string;
}

function randint(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateBabyName(): string {
  return BABY_NAMES[randint(0, BABY_NAMES.length - 1)];
}

function generateBabyStats(): number[] {
  return Array.from({ length: BABY_STATS.length }, () => randint(0, 100));
}

function generateBotBets(): Array<{ playerName: string; amount: number; betOn: 1 | 2 }> {
  const count = randint(BOT_COUNT_MIN, BOT_COUNT_MAX);
  const usedNames = new Set<string>();
  const bots: Array<{ playerName: string; amount: number; betOn: 1 | 2 }> = [];

  const pickName = (): string => {
    let name: string;
    let attempts = 0;
    do {
      name = BOT_NAMES[randint(0, BOT_NAMES.length - 1)];
      attempts++;
    } while (usedNames.has(name) && attempts < 20);
    usedNames.add(name);
    return name;
  };

  bots.push({ playerName: pickName(), amount: randint(200, 2000), betOn: 1 });
  bots.push({ playerName: pickName(), amount: randint(200, 2000), betOn: 2 });

  for (let i = 2; i < count; i++) {
    bots.push({
      playerName: pickName(),
      amount: randint(100, 5000),
      betOn: (randint(1, 2) as 1 | 2),
    });
  }

  return bots;
}

function isBotUserId(userId: string): boolean {
  return userId.startsWith("bot_");
}

function runFight(babyA: number[], babyB: number[]) {
  const statA = randint(0, 4);
  let statB = statA;
  while (statB === statA) statB = randint(0, 4);
  let statC = statB;
  while (statC === statA || statC === statB) statC = randint(0, 4);

  const stats: [number, number, number] = [statA, statB, statC];
  const statNames: [string, string, string] = [BABY_STATS[statA], BABY_STATS[statB], BABY_STATS[statC]];

  const weightA = randint(10, 80) / 100;
  const maxWeightB = Math.min(90, Math.floor((1 - weightA - 0.01) * 100));
  const weightB = randint(0, Math.max(0, maxWeightB)) / 100;
  const weightC = 1 - (weightA + weightB);

  const scoreA = weightA * babyA[statA] + weightB * babyA[statB] + weightC * babyA[statC];
  const scoreB = weightA * babyB[statA] + weightB * babyB[statB] + weightC * babyB[statC];

  return {
    winner: (scoreA >= scoreB ? 1 : 2) as 1 | 2,
    stats, statNames,
    scores: { a: Math.round(scoreA * 100) / 100, b: Math.round(scoreB * 100) / 100 },
    weights: [Math.round(weightA * 100), Math.round(weightB * 100), Math.round(weightC * 100)] as [number, number, number],
    babyAValues: [babyA[statA], babyA[statB], babyA[statC]] as [number, number, number],
    babyBValues: [babyB[statA], babyB[statB], babyB[statC]] as [number, number, number],
  };
}

function calculateOdds(potA: number, potB: number) {
  const safePotA = Math.max(potA, 1);
  const safePotB = Math.max(potB, 1);
  const oddsA = Math.min(Math.max((safePotA + safePotB) / safePotA, 1.1), 50);
  const oddsB = Math.min(Math.max((safePotB + safePotA) / safePotB, 1.1), 50);
  return { oddsA, oddsB };
}

export function startNewFight(): BabyFightRow | null {
  const db = getDb();

  const existing = db.prepare(
    "SELECT * FROM baby_fights WHERE status != 'resolved' ORDER BY id DESC LIMIT 1"
  ).get() as BabyFightRow | undefined;

  if (existing) {
    const now = new Date();
    const scheduledAt = new Date(existing.scheduled_at);
    if (now < scheduledAt) return existing;
  }

  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setMinutes(0, 0, 0);
  nextHour.setHours(nextHour.getHours() + 1);

  const babyAStats = generateBabyStats();
  const babyBStats = generateBabyStats();
  const nameA = generateBabyName();
  let nameB = generateBabyName();
  while (nameB === nameA) nameB = generateBabyName();

  const botBets = generateBotBets();
  let botPotA = 0;
  let botPotB = 0;
  for (const bot of botBets) {
    if (bot.betOn === 1) botPotA += bot.amount;
    else botPotB += bot.amount;
  }

  const initialPotA = SEED_POT + botPotA;
  const initialPotB = SEED_POT + botPotB;
  const initialOdds = calculateOdds(initialPotA, initialPotB);

  db.prepare(
    `INSERT INTO baby_fights (baby_a_name, baby_b_name, baby_a_stats, baby_b_stats, scheduled_at, status, created_at, total_pot_a, total_pot_b, odds_a, odds_b, bet_count)
     VALUES (?, ?, ?, ?, ?, 'betting', ?, ?, ?, ?, ?, ?)`
  ).run(
    nameA, nameB,
    JSON.stringify(babyAStats), JSON.stringify(babyBStats),
    nextHour.toISOString(),
    now.toISOString(),
    initialPotA, initialPotB,
    initialOdds.oddsA, initialOdds.oddsB,
    botBets.length
  );

  const fight = db.prepare(
    "SELECT * FROM baby_fights ORDER BY id DESC LIMIT 1"
  ).get() as BabyFightRow | undefined;

  if (!fight) return null;

  const insertBet = db.prepare(
    `INSERT INTO baby_fight_bets (fight_id, user_id, player_name, bet_on, amount, odds_at_bet, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const createdAt = now.toISOString();
  let botIdx = 0;
  for (const bot of botBets) {
    insertBet.run(
      fight.id, `bot_${botIdx}`, bot.playerName,
      bot.betOn, bot.amount,
      bot.betOn === 1 ? initialOdds.oddsA : initialOdds.oddsB,
      createdAt
    );
    botIdx++;
  }

  const allBets = db.prepare(
    "SELECT player_name, amount, bet_on, user_id FROM baby_fight_bets WHERE fight_id = ? ORDER BY created_at DESC"
  ).all(fight.id) as Array<{ player_name: string; amount: number; bet_on: number; user_id: string }>;

  broadcastBabyFight("baby_fight:new", {
    fight: formatFightForClient(fight),
    bets: allBets.map(b => ({ playerName: b.player_name, amount: b.amount, betOn: b.bet_on, isBot: isBotUserId(b.user_id) })),
    timeRemaining: getTimeRemaining(fight.scheduled_at),
  });

  return fight;
}

function formatFightForClient(fight: BabyFightRow) {
  return {
    id: fight.id,
    babyA: { name: fight.baby_a_name, stats: JSON.parse(fight.baby_a_stats) as number[] },
    babyB: { name: fight.baby_b_name, stats: JSON.parse(fight.baby_b_stats) as number[] },
    scheduledAt: fight.scheduled_at,
    status: fight.status,
    winner: fight.winner,
    totalPotA: fight.total_pot_a,
    totalPotB: fight.total_pot_b,
    oddsA: fight.odds_a,
    oddsB: fight.odds_b,
    betCount: fight.bet_count,
    resolvedAt: fight.resolved_at,
  };
}

export function getCurrentFight(): {
  fight: ReturnType<typeof formatFightForClient> | null;
  bets: Array<{ playerName: string; amount: number; betOn: number }>;
  timeRemaining: number;
} {
  const db = getDb();

  const fight = db.prepare(
    "SELECT * FROM baby_fights WHERE status != 'resolved' ORDER BY id DESC LIMIT 1"
  ).get() as BabyFightRow | undefined;

  if (!fight) {
    const newFight = startNewFight();
    if (!newFight) return { fight: null, bets: [], timeRemaining: 0 };

    const bets = db.prepare(
      "SELECT player_name, amount, bet_on, user_id FROM baby_fight_bets WHERE fight_id = ? ORDER BY created_at DESC"
    ).all(newFight.id) as Array<{ player_name: string; amount: number; bet_on: number; user_id: string }>;

    return {
      fight: formatFightForClient(newFight),
      bets: bets.map(b => ({ playerName: b.player_name, amount: b.amount, betOn: b.bet_on, isBot: isBotUserId(b.user_id) })),
      timeRemaining: getTimeRemaining(newFight.scheduled_at),
    };
  }

  const bets = db.prepare(
    "SELECT player_name, amount, bet_on, user_id FROM baby_fight_bets WHERE fight_id = ? ORDER BY created_at DESC"
  ).all(fight.id) as Array<{ player_name: string; amount: number; bet_on: number; user_id: string }>;

  return {
    fight: formatFightForClient(fight),
    bets: bets.map(b => ({ playerName: b.player_name, amount: b.amount, betOn: b.bet_on, isBot: isBotUserId(b.user_id) })),
    timeRemaining: getTimeRemaining(fight.scheduled_at),
  };
}

export function resolveCurrentFight(): void {
  const db = getDb();

  const fight = db.prepare(
    "SELECT * FROM baby_fights WHERE status = 'betting' ORDER BY id DESC LIMIT 1"
  ).get() as BabyFightRow | undefined;

  if (!fight) return;

  const now = new Date();
  const scheduledAt = new Date(fight.scheduled_at);
  if (now < scheduledAt) return;

  const babyAStats = JSON.parse(fight.baby_a_stats) as number[];
  const babyBStats = JSON.parse(fight.baby_b_stats) as number[];

  const result = runFight(babyAStats, babyBStats);

  db.prepare(
    "UPDATE baby_fights SET status = 'fighting', winner = ? WHERE id = ?"
  ).run(result.winner, fight.id);

  broadcastBabyFight("baby_fight:fight_start", {
    fightId: fight.id,
    babyA: { name: fight.baby_a_name, stats: babyAStats },
    babyB: { name: fight.baby_b_name, stats: babyBStats },
  });

  const bets = db.prepare(
    "SELECT * FROM baby_fight_bets WHERE fight_id = ?"
  ).all(fight.id) as BabyFightBetRow[];

  const results: Array<{ playerName: string; won: boolean; winnings: number; betAmount: number; isBot: boolean }> = [];

  for (const bet of bets) {
    const isBot = isBotUserId(bet.user_id);
    const won = bet.bet_on === result.winner;
    const winnings = won ? Math.round(bet.amount * bet.odds_at_bet) : 0;

    if (isBot) {
      db.prepare(
        "UPDATE baby_fight_bets SET won = ?, winnings = ? WHERE id = ?"
      ).run(won ? 1 : 0, winnings, bet.id);
    } else {
      db.prepare(
        "UPDATE baby_fight_bets SET won = ?, winnings = ? WHERE id = ?"
      ).run(won ? 1 : 0, winnings, bet.id);

      if (won) {
        db.prepare("UPDATE players SET nb_point = nb_point + ? WHERE user_id = ?")
          .run(winnings, bet.user_id);
      }
    }

    results.push({
      playerName: bet.player_name,
      won,
      winnings,
      betAmount: bet.amount,
      isBot,
    });
  }

  const finalOdds = calculateOdds(fight.total_pot_a, fight.total_pot_b);

  db.prepare(
    `UPDATE baby_fights SET status = 'resolved', odds_a = ?, odds_b = ?, resolved_at = ? WHERE id = ?`
  ).run(finalOdds.oddsA, finalOdds.oddsB, new Date().toISOString(), fight.id);

  broadcastBabyFight("baby_fight:result", {
    fightId: fight.id,
    winner: result.winner,
    babyAName: fight.baby_a_name,
    babyBName: fight.baby_b_name,
    statsUsed: result.stats,
    statNames: result.statNames,
    weights: result.weights,
    scores: result.scores,
    babyAValues: result.babyAValues,
    babyBValues: result.babyBValues,
    oddsA: finalOdds.oddsA,
    oddsB: finalOdds.oddsB,
    potA: fight.total_pot_a,
    potB: fight.total_pot_b,
    results,
  });
}

export function scheduleFights(): void {
  startNewFight();

  setInterval(() => {
    const now = new Date();
    const db = getDb();

    const currentFight = db.prepare(
      "SELECT * FROM baby_fights WHERE status != 'resolved' ORDER BY id DESC LIMIT 1"
    ).get() as BabyFightRow | undefined;

    if (currentFight) {
      const scheduledAt = new Date(currentFight.scheduled_at);
      const msUntilFight = scheduledAt.getTime() - now.getTime();
      const minutesUntilFight = msUntilFight / 60000;

      if (currentFight.status === "betting" && minutesUntilFight <= 0 && minutesUntilFight > -5) {
        resolveCurrentFight();
      } else if (currentFight.status === "resolved" || minutesUntilFight <= -5) {
        startNewFight();
      }
    } else {
      startNewFight();
    }
  }, 15000);
}

function getTimeRemaining(scheduledAt: string): number {
  return new Date(scheduledAt).getTime() - Date.now();
}

export function placeBet(
  userId: string,
  playerName: string,
  fightId: number,
  betOn: 1 | 2,
  amount: number,
  currentPoints: number
): { success: boolean; error?: string; oddsA?: number; oddsB?: number; potA?: number; potB?: number } {
  const db = getDb();

  const fight = db.prepare("SELECT * FROM baby_fights WHERE id = ?").get(fightId) as BabyFightRow | undefined;
  if (!fight) return { success: false, error: "Combat introuvable" };
  if (fight.status !== "betting") return { success: false, error: "Les paris sont fermes" };
  if (amount < 10 || amount > MAX_BET) return { success: false, error: `Mise entre 10 et ${MAX_BET} points` };
  if (amount > currentPoints) return { success: false, error: "Fonds insuffisants" };

  const existingBet = db.prepare(
    "SELECT id FROM baby_fight_bets WHERE fight_id = ? AND user_id = ?"
  ).get(fightId, userId);

  if (existingBet) return { success: false, error: "Vous avez deja parie sur ce combat" };

  const newPotA = betOn === 1 ? fight.total_pot_a + amount : fight.total_pot_a;
  const newPotB = betOn === 2 ? fight.total_pot_b + amount : fight.total_pot_b;
  const { oddsA, oddsB } = calculateOdds(newPotA, newPotB);

  db.prepare("UPDATE players SET nb_point = nb_point - ? WHERE user_id = ?").run(amount, userId);

  db.prepare(
    `INSERT INTO baby_fight_bets (fight_id, user_id, player_name, bet_on, amount, odds_at_bet, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(fightId, userId, playerName, betOn, amount, betOn === 1 ? oddsA : oddsB, new Date().toISOString());

  db.prepare(
    "UPDATE baby_fights SET total_pot_a = ?, total_pot_b = ?, odds_a = ?, odds_b = ?, bet_count = bet_count + 1 WHERE id = ?"
  ).run(newPotA, newPotB, oddsA, oddsB, fightId);

  broadcastBabyFight("baby_fight:bet", {
    fightId,
    playerName,
    amount,
    betOn,
    babyAName: fight.baby_a_name,
    babyBName: fight.baby_b_name,
    oddsA,
    oddsB,
    potA: newPotA,
    potB: newPotB,
    betCount: fight.bet_count + 1,
  });

  return { success: true, oddsA, oddsB, potA: newPotA, potB: newPotB };
}

export function getFightHistory(limit = 5) {
  const db = getDb();

  const fights = db.prepare(
    "SELECT * FROM baby_fights WHERE status = 'resolved' ORDER BY resolved_at DESC LIMIT ?"
  ).all(limit) as BabyFightRow[];

  return fights.map(f => {
    const bets = db.prepare(
      "SELECT * FROM baby_fight_bets WHERE fight_id = ? AND user_id NOT LIKE 'bot_%' ORDER BY created_at ASC"
    ).all(f.id) as BabyFightBetRow[];

    return {
      ...formatFightForClient(f),
      bets: bets.map(b => ({
        playerName: b.player_name,
        amount: b.amount,
        betOn: b.bet_on,
        won: b.won === 1,
        winnings: b.winnings || 0,
      })),
    };
  });
}

export function getFightById(fightId: number) {
  const db = getDb();

  const fight = db.prepare("SELECT * FROM baby_fights WHERE id = ?").get(fightId) as BabyFightRow | undefined;
  if (!fight) return null;

  const bets = db.prepare(
    "SELECT * FROM baby_fight_bets WHERE fight_id = ? AND user_id NOT LIKE 'bot_%' ORDER BY created_at ASC"
  ).all(fight.id) as BabyFightBetRow[];

  return {
    ...formatFightForClient(fight),
    bets: bets.map(b => ({
      playerName: b.player_name,
      amount: b.amount,
      betOn: b.bet_on,
      oddsAtBet: b.odds_at_bet,
      won: b.won === 1,
      winnings: b.winnings || 0,
    })),
  };
}
