import { Router } from "express";
import { getDb } from "../db/connection.js";
import type { Player } from "../types.js";

const router = Router();

const HEARTBEAT_TIMEOUT_SECONDS = 60;

// GET /api/leaderboard
router.get("/", (_req, res) => {
  const db = getDb();
  const players = db
    .prepare(`
      SELECT
        id, user_id, player_name, nb_point, nb_debt,
        nb_share_A, avg_share_A_value, nb_share_B, avg_share_B_value,
        last_login, last_daily_reward_claim, profile_photo, last_seen,
        CASE
          WHEN is_online = 1 AND last_seen > datetime('now', ?) THEN 1
          ELSE 0
        END AS is_online
      FROM players
      ORDER BY (nb_point - nb_debt) DESC
    `)
    .all(`-${HEARTBEAT_TIMEOUT_SECONDS} seconds`) as Player[];

  res.json(players);
});

export default router;
