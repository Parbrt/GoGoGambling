import { Router } from "express";
import { getDb } from "../db/connection.js";
import { getCurrentPrices } from "../engine/shareEngine.js";

const router = Router();

const HEARTBEAT_TIMEOUT_SECONDS = 60;

// GET /api/leaderboard
router.get("/", (_req, res) => {
  const db = getDb();
  const prices = getCurrentPrices();

  const rows = db
    .prepare(`
      SELECT
        p.id, p.user_id, p.player_name, p.nb_point, p.nb_debt,
        p.nb_share_A, p.avg_share_A_value, p.nb_share_B, p.avg_share_B_value,
        p.last_login, p.last_daily_reward_claim, p.profile_photo, p.last_seen,
        p.peak_net_worth,
        CAST(
          p.nb_point + COALESCE(p.nb_share_A * ?, 0) + COALESCE(p.nb_share_B * ?, 0) - p.nb_debt
          AS INTEGER
        ) AS total_capital,
        CASE
          WHEN p.is_online = 1 AND p.last_seen > datetime('now', ?) THEN 1
          ELSE 0
        END AS is_online,
        equipped_title.name AS equipped_title_name,
        equipped_title.rarity AS equipped_title_rarity,
        equipped_title.emoji AS equipped_title_emoji,
        pi_title.display_style AS equipped_title_display_style,
        pi_title.star_level AS equipped_title_star_level,
        equipped_object.name AS equipped_object_name,
        equipped_object.rarity AS equipped_object_rarity,
        equipped_object.emoji AS equipped_object_emoji,
        pi_object.display_style AS equipped_object_display_style,
        pi_object.star_level AS equipped_object_star_level
      FROM players p
      LEFT JOIN player_equipped pe ON pe.user_id = p.user_id
      LEFT JOIN player_inventory pi_title ON pi_title.id = pe.equipped_title_inventory_id
      LEFT JOIN items_catalog equipped_title ON equipped_title.id = pi_title.item_id
      LEFT JOIN player_inventory pi_object ON pi_object.id = pe.equipped_object_inventory_id
      LEFT JOIN items_catalog equipped_object ON equipped_object.id = pi_object.item_id
      ORDER BY total_capital DESC
    `)
    .all(prices.priceA, prices.priceB, `-${HEARTBEAT_TIMEOUT_SECONDS} seconds`);

  res.json(rows);
});

export default router;
