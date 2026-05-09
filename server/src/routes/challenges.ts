import { Router } from "express";
import { getDb } from "../db/connection.js";
import { authMiddleware, type AuthenticatedRequest } from "../auth/middleware.js";
import { CHALLENGES_POOL, getDailyDate, getDailyChallengeIds, ensurePlayerChallenges } from "../engine/challengeEngine.js";
import { rollBoxItem, type BoxType } from "../data/items.js";
import { updatePeakNetWorth } from "./player.js";
import type { Player } from "../types.js";

const router = Router();

const STYLE_POOLS: Record<string, [string, number][]> = {
  common:    [["default", 100]],
  rare:      [["default",50],["bold",25],["italic",25]],
  epic:      [["default",40],["bold",20],["italic",20],["tinted",20]],
  legendary: [["default",30],["bold_italic",20],["tinted",20],["glow",30]],
  mythic:    [["glow",30],["solid",25],["gradient",25],["tinted",20]],
  exotic:    [["glow",25],["gradient",25],["solid",25],["tinted_bold",25]],
  unique:    [["rainbow",30],["glow",25],["gradient",25],["solid",20]],
};

function rollDisplayStyle(rarity: string): string {
  const pool = STYLE_POOLS[rarity] ?? STYLE_POOLS.common;
  const total = pool.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [style, weight] of pool) {
    r -= weight;
    if (r <= 0) return style;
  }
  return "default";
}

// GET /api/challenges/today
router.get("/today", authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const userId = req.userId!;
  const date = getDailyDate();

  ensurePlayerChallenges(db, userId);

  const rows = db.prepare(
    `SELECT id, challenge_id, progress, completed FROM player_daily_challenges WHERE user_id = ? AND assigned_date = ? ORDER BY id ASC`
  ).all(userId, date) as Array<{ id: number; challenge_id: number; progress: number; completed: number }>;

  const ids = getDailyChallengeIds(date);
  const challenges = ids.map(challengeId => {
    const def = CHALLENGES_POOL.find(c => c.id === challengeId)!;
    const row = rows.find(r => r.challenge_id === challengeId);
    return {
      id: row?.id ?? null,
      challengeId: def.id,
      name: def.name,
      description: def.description,
      type: def.type,
      target: def.target,
      targetValue: def.targetValue,
      progress: row?.progress ?? 0,
      completed: (row?.completed ?? 0) === 1,
      reward: def.reward,
      emoji: def.emoji,
      difficulty: def.difficulty,
    };
  });

  res.json({ date, challenges });
});

// GET /api/challenges/streak
router.get("/streak", authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const userId = req.userId!;
  const date = getDailyDate();

  const streak = db.prepare(
    `SELECT current_streak, last_completed_date, weekly_box_ready FROM player_challenge_streaks WHERE user_id = ?`
  ).get(userId) as { current_streak: number; last_completed_date: string | null; weekly_box_ready: number } | undefined;

  // Check if today's challenges are all done
  ensurePlayerChallenges(db, userId);
  const { cnt } = db.prepare(
    `SELECT COUNT(*) as cnt FROM player_daily_challenges WHERE user_id = ? AND assigned_date = ? AND completed = 1`
  ).get(userId, date) as { cnt: number };
  const allDoneToday = cnt >= 3;

  res.json({
    streak: streak?.current_streak ?? 0,
    lastCompletedDate: streak?.last_completed_date ?? null,
    weeklyBoxReady: (streak?.weekly_box_ready ?? 0) === 1,
    allDoneToday,
  });
});

// POST /api/challenges/claim-weekly
router.post("/claim-weekly", authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const userId = req.userId!;

  const streak = db.prepare(
    `SELECT current_streak, weekly_box_ready FROM player_challenge_streaks WHERE user_id = ?`
  ).get(userId) as { current_streak: number; weekly_box_ready: number } | undefined;

  if (!streak || streak.weekly_box_ready !== 1) {
    res.status(400).json({ error: "Pas de GOGOBOX disponible" });
    return;
  }

  // Roll a GOGOBOX item
  const ownedUniques = db.prepare(
    `SELECT ic.name FROM player_inventory pi JOIN items_catalog ic ON pi.item_id = ic.id WHERE ic.rarity = 'unique' AND pi.quantity > 0`
  ).all() as { name: string }[];
  const excludeNames = ownedUniques.map(u => u.name);

  const { item: rolledItem, rolledRarity } = rollBoxItem("GOGOBOX" as BoxType, excludeNames);
  if (!rolledItem || rolledRarity === null) {
    res.status(500).json({ error: "Erreur lors de l'ouverture de la box" });
    return;
  }

  const catalogItem = db.prepare(
    "SELECT * FROM items_catalog WHERE name = ? AND category = ?"
  ).get(rolledItem.name, rolledItem.category) as { id: number; name: string; category: string; rarity: string; base_value: number; emoji: string } | undefined;

  if (!catalogItem) {
    res.status(500).json({ error: "Item introuvable" });
    return;
  }

  const displayStyle = rollDisplayStyle(catalogItem.rarity);
  const existing = db.prepare(
    "SELECT id FROM player_inventory WHERE user_id = ? AND item_id = ? AND star_level = 0"
  ).get(userId, catalogItem.id) as { id: number } | undefined;

  if (existing) {
    db.prepare("UPDATE player_inventory SET quantity = quantity + 1, display_style = ? WHERE id = ?")
      .run(displayStyle, existing.id);
  } else {
    db.prepare(
      "INSERT INTO player_inventory (user_id, item_id, quantity, star_level, display_style) VALUES (?, ?, 1, 0, ?)"
    ).run(userId, catalogItem.id, displayStyle);
  }

  // Reset streak after claiming
  db.prepare(
    `UPDATE player_challenge_streaks SET weekly_box_ready = 0, current_streak = 0, last_completed_date = NULL WHERE user_id = ?`
  ).run(userId);

  updatePeakNetWorth(userId);
  const updatedPlayer = db.prepare("SELECT * FROM players WHERE user_id = ?").get(userId) as Player;

  res.json({
    success: true,
    item: catalogItem,
    rolledRarity,
    displayStyle,
    player: updatedPlayer,
  });
});

export default router;
