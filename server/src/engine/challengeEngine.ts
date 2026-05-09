import type { Database } from "better-sqlite3";

// ─── Types ───────────────────────────────────────────────────────

export type ChallengeEventType =
  | "slot_play"
  | "slot_win"
  | "roulette_play"
  | "roulette_win"
  | "chicken_bet"
  | "chicken_win"
  | "baby_fight_bet"
  | "trade"
  | "box_open"
  | "daily_claim"
  | "big_bet";

export interface ChallengeDefinition {
  id: number;
  name: string;
  description: string;
  type: ChallengeEventType | "any_win";
  target: number;
  targetValue: number;
  reward: number;
  emoji: string;
  difficulty: "easy" | "medium" | "hard";
}

// ─── Pool of 20 challenges ───────────────────────────────────────

export const CHALLENGES_POOL: ChallengeDefinition[] = [
  { id: 1,  name: "Bras chaud",           description: "Jouer 3 fois à la machine à sous",      type: "slot_play",      target: 3,  targetValue: 0,     reward: 1500,  emoji: "🎰", difficulty: "easy"   },
  { id: 2,  name: "Jackpot !",             description: "Gagner à la machine à sous",             type: "slot_win",       target: 1,  targetValue: 0,     reward: 4000,  emoji: "🎰", difficulty: "medium" },
  { id: 3,  name: "Infatigable",           description: "Jouer 5 fois à la machine à sous",      type: "slot_play",      target: 5,  targetValue: 0,     reward: 3000,  emoji: "🎰", difficulty: "medium" },
  { id: 4,  name: "Parieur de poulets",    description: "Parier sur 1 combat de poulet",         type: "chicken_bet",    target: 1,  targetValue: 0,     reward: 1000,  emoji: "🐔", difficulty: "easy"   },
  { id: 5,  name: "Éleveur confirmé",      description: "Parier sur 3 combats de poulets",       type: "chicken_bet",    target: 3,  targetValue: 0,     reward: 4000,  emoji: "🐔", difficulty: "medium" },
  { id: 6,  name: "Coq gagnant",           description: "Gagner 1 combat de poulet",             type: "chicken_win",    target: 1,  targetValue: 0,     reward: 3500,  emoji: "🐔", difficulty: "medium" },
  { id: 7,  name: "Supporter de bébés",   description: "Parier sur 1 Baby Fight",               type: "baby_fight_bet", target: 1,  targetValue: 0,     reward: 1000,  emoji: "👶", difficulty: "easy"   },
  { id: 8,  name: "Fan hardcore",          description: "Parier sur 3 Baby Fights",              type: "baby_fight_bet", target: 3,  targetValue: 0,     reward: 4000,  emoji: "👶", difficulty: "medium" },
  { id: 9,  name: "Rouletteur",            description: "Jouer 2 fois à la roulette",            type: "roulette_play",  target: 2,  targetValue: 0,     reward: 1500,  emoji: "🎡", difficulty: "easy"   },
  { id: 10, name: "Chance à la roulette", description: "Gagner à la roulette",                  type: "roulette_win",   target: 1,  targetValue: 0,     reward: 3500,  emoji: "🎡", difficulty: "medium" },
  { id: 11, name: "Flambeur",             description: "Miser 1 000 pts en une seule mise",     type: "big_bet",        target: 1,  targetValue: 1000,  reward: 2500,  emoji: "💸", difficulty: "easy"   },
  { id: 12, name: "Gros flambeur",        description: "Miser 5 000 pts en une seule mise",     type: "big_bet",        target: 1,  targetValue: 5000,  reward: 8000,  emoji: "💸", difficulty: "hard"   },
  { id: 13, name: "Trader du jour",       description: "Acheter ou vendre des actions",         type: "trade",          target: 1,  targetValue: 0,     reward: 1500,  emoji: "📈", difficulty: "easy"   },
  { id: 14, name: "Collectionneur",       description: "Ouvrir 1 box dans le Shop",             type: "box_open",       target: 1,  targetValue: 0,     reward: 2500,  emoji: "📦", difficulty: "easy"   },
  { id: 15, name: "Fidèle",               description: "Réclamer la récompense quotidienne",    type: "daily_claim",    target: 1,  targetValue: 0,     reward: 1000,  emoji: "🎁", difficulty: "easy"   },
  { id: 16, name: "Tout terrain",         description: "Remporter 2 gains (tous jeux)",         type: "any_win",        target: 2,  targetValue: 0,     reward: 6000,  emoji: "🏆", difficulty: "medium" },
  { id: 17, name: "Série jackpot",        description: "Gagner 5 fois à la machine à sous",     type: "slot_win",       target: 5,  targetValue: 0,     reward: 15000, emoji: "🎰", difficulty: "hard"   },
  { id: 18, name: "Poulet intensif",      description: "Parier sur 5 combats de poulets",       type: "chicken_bet",    target: 5,  targetValue: 0,     reward: 10000, emoji: "🐔", difficulty: "hard"   },
  { id: 19, name: "Millionnaire",         description: "Miser 10 000 pts en une seule mise",   type: "big_bet",        target: 1,  targetValue: 10000, reward: 20000, emoji: "💎", difficulty: "hard"   },
  { id: 20, name: "Roulette intensive",   description: "Jouer 5 fois à la roulette",            type: "roulette_play",  target: 5,  targetValue: 0,     reward: 8000,  emoji: "🎡", difficulty: "hard"   },
];

// ─── Daily selection (deterministic from date) ───────────────────

function seededNext(seed: number): number {
  return ((seed * 1664525 + 1013904223) & 0x7fffffff);
}

export function getDailyDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getDailyChallengeIds(date: string): [number, number, number] {
  let seed = 0;
  for (let i = 0; i < date.length; i++) {
    seed = ((seed << 5) - seed + date.charCodeAt(i)) | 0;
  }
  seed = Math.abs(seed) || 1;

  const available = CHALLENGES_POOL.map(c => c.id);
  const selected: number[] = [];

  while (selected.length < 3) {
    seed = seededNext(seed);
    const idx = seed % available.length;
    selected.push(available[idx]);
    available.splice(idx, 1);
  }
  return selected as [number, number, number];
}

// ─── Ensure today's challenges exist for player ───────────────────

export function ensurePlayerChallenges(db: Database, userId: string): void {
  const date = getDailyDate();
  const ids = getDailyChallengeIds(date);
  const insert = db.prepare(
    `INSERT OR IGNORE INTO player_daily_challenges (user_id, challenge_id, assigned_date) VALUES (?, ?, ?)`
  );
  const tx = db.transaction(() => { for (const id of ids) insert.run(userId, id, date); });
  tx();
}

// ─── Event tracking ───────────────────────────────────────────────

interface PlayerChallengeRow { id: number; challenge_id: number; progress: number; completed: number }

const WIN_EVENTS = new Set<ChallengeEventType>(["slot_win", "roulette_win", "chicken_win"]);

export function trackEvent(db: Database, userId: string, eventType: ChallengeEventType, betAmount = 0): void {
  const date = getDailyDate();
  ensurePlayerChallenges(db, userId);

  const active = db.prepare(
    `SELECT id, challenge_id, progress, completed FROM player_daily_challenges WHERE user_id = ? AND assigned_date = ? AND completed = 0`
  ).all(userId, date) as PlayerChallengeRow[];

  for (const row of active) {
    const def = CHALLENGES_POOL.find(c => c.id === row.challenge_id);
    if (!def) continue;

    let matches = false;
    if (def.type === "any_win") {
      matches = WIN_EVENTS.has(eventType);
    } else if (def.type === eventType) {
      matches = def.type === "big_bet" ? betAmount >= def.targetValue : true;
    }
    if (!matches) continue;

    const newProgress = row.progress + 1;
    const nowCompleted = newProgress >= def.target;

    db.prepare(
      `UPDATE player_daily_challenges SET progress = ?, completed = ?, completed_at = ? WHERE id = ?`
    ).run(newProgress, nowCompleted ? 1 : 0, nowCompleted ? new Date().toISOString() : null, row.id);

    if (nowCompleted) {
      db.prepare("UPDATE players SET nb_point = nb_point + ? WHERE user_id = ?").run(def.reward, userId);
    }
  }

  checkAndUpdateStreak(db, userId, date);
}

// ─── Streak management ────────────────────────────────────────────

function checkAndUpdateStreak(db: Database, userId: string, date: string): void {
  const { cnt } = db.prepare(
    `SELECT COUNT(*) as cnt FROM player_daily_challenges WHERE user_id = ? AND assigned_date = ? AND completed = 1`
  ).get(userId, date) as { cnt: number };

  if (cnt < 3) return;

  const existing = db.prepare(
    `SELECT current_streak, last_completed_date, weekly_box_ready FROM player_challenge_streaks WHERE user_id = ?`
  ).get(userId) as { current_streak: number; last_completed_date: string | null; weekly_box_ready: number } | undefined;

  if (!existing) {
    db.prepare(
      `INSERT INTO player_challenge_streaks (user_id, current_streak, last_completed_date, weekly_box_ready) VALUES (?, 1, ?, 0)`
    ).run(userId, date);
    return;
  }

  if (existing.last_completed_date === date) return;

  const yesterday = new Date(date + "T00:00:00Z");
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const newStreak = existing.last_completed_date === yesterdayStr ? existing.current_streak + 1 : 1;
  const weeklyBoxReady = newStreak >= 7 ? 1 : existing.weekly_box_ready;

  db.prepare(
    `UPDATE player_challenge_streaks SET current_streak = ?, last_completed_date = ?, weekly_box_ready = ? WHERE user_id = ?`
  ).run(newStreak, date, weeklyBoxReady, userId);
}
