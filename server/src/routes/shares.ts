import { Router } from "express";
import { getDb } from "../db/connection.js";
import { authMiddleware, type AuthenticatedRequest } from "../auth/middleware.js";
import { getCurrentPrices, insertTransactionSnapshot, getShareStats } from "../engine/shareEngine.js";
import { updatePeakNetWorth } from "./player.js";
import { trackEvent } from "../engine/challengeEngine.js";
import type { Player, ShareSnapshot } from "../types.js";

const router = Router();
const FEE_RATE = 0.02;

// GET /api/shares/current
router.get("/current", (_req, res) => {
  const prices = getCurrentPrices();
  res.json(prices);
});

// GET /api/shares/stats
router.get("/stats", (_req, res) => {
  const db = getDb();
  const dayAgo = Math.floor(Date.now() / 1000) - 86400;

  const daily = db
    .prepare(`
      SELECT
        MAX(value_share_A) as daily_high_A, MIN(value_share_A) as daily_low_A,
        MAX(value_share_B) as daily_high_B, MIN(value_share_B) as daily_low_B
      FROM shares WHERE time_now >= ?
    `)
    .get(dayAgo) as {
      daily_high_A: number | null; daily_low_A: number | null;
      daily_high_B: number | null; daily_low_B: number | null;
    };

  const { athA, atlA, athB, atlB } = getShareStats();

  res.json({
    dailyHighA: daily.daily_high_A,
    dailyLowA: daily.daily_low_A,
    dailyHighB: daily.daily_high_B,
    dailyLowB: daily.daily_low_B,
    athA,
    atlA,
    athB,
    atlB,
  });
});

// GET /api/shares/history
router.get("/history", (req, res) => {
  const db = getDb();
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const rows = db
    .prepare("SELECT * FROM shares ORDER BY time_now DESC LIMIT ?")
    .all(limit) as ShareSnapshot[];
  res.json(rows.reverse());
});

// POST /api/shares/buy
router.post("/buy", authMiddleware, (req: AuthenticatedRequest, res) => {
  const { shareType, quantity } = req.body as { shareType: "A" | "B"; quantity: number };

  if (!shareType || quantity <= 0) {
    res.status(400).json({ error: "shareType et quantity > 0 requis" });
    return;
  }

  const db = getDb();
  const player = db
    .prepare("SELECT * FROM players WHERE user_id = ?")
    .get(req.userId!) as Player | undefined;

  if (!player) {
    res.status(404).json({ error: "Joueur introuvable" });
    return;
  }

  const prices = getCurrentPrices();
  const price = shareType === "A" ? prices.priceA : prices.priceB;
  const baseCost = price * quantity;
  const fee = baseCost * FEE_RATE;
  const totalCost = baseCost + fee;

  if (totalCost > player.nb_point) {
    res.status(400).json({ error: "Fonds insuffisants", missing: totalCost - player.nb_point });
    return;
  }

  const currentQty = shareType === "A" ? player.nb_share_A : player.nb_share_B;
  const currentAvg = shareType === "A" ? player.avg_share_A_value : player.avg_share_B_value;
  const newQty = currentQty + quantity;
  const newAvg = currentQty === 0
    ? price
    : ((currentQty * currentAvg) + (quantity * price)) / newQty;

  const newPoints = player.nb_point - totalCost;

  if (shareType === "A") {
    db.prepare("UPDATE players SET nb_point = ?, nb_share_A = ?, avg_share_A_value = ? WHERE user_id = ?")
      .run(Math.round(newPoints), newQty, newAvg, req.userId!);
  } else {
    db.prepare("UPDATE players SET nb_point = ?, nb_share_B = ?, avg_share_B_value = ? WHERE user_id = ?")
      .run(Math.round(newPoints), newQty, newAvg, req.userId!);
  }

  insertTransactionSnapshot(prices.priceA, prices.priceB);

  updatePeakNetWorth(req.userId!);
  trackEvent(db, req.userId!, "trade");

  const updated = db
    .prepare("SELECT * FROM players WHERE user_id = ?")
    .get(req.userId!) as Player;

  res.json({
    player: updated,
    prices,
    cost: totalCost,
    fee,
  });
});

// POST /api/shares/sell
router.post("/sell", authMiddleware, (req: AuthenticatedRequest, res) => {
  const { shareType, quantity } = req.body as { shareType: "A" | "B"; quantity: number };

  if (!shareType || quantity <= 0) {
    res.status(400).json({ error: "shareType et quantity > 0 requis" });
    return;
  }

  const db = getDb();
  const player = db
    .prepare("SELECT * FROM players WHERE user_id = ?")
    .get(req.userId!) as Player | undefined;

  if (!player) {
    res.status(404).json({ error: "Joueur introuvable" });
    return;
  }

  const currentQty = shareType === "A" ? player.nb_share_A : player.nb_share_B;

  if (quantity > currentQty) {
    res.status(400).json({ error: "Quantité insuffisante" });
    return;
  }

  const prices = getCurrentPrices();
  const price = shareType === "A" ? prices.priceA : prices.priceB;
  const revenue = price * quantity;
  const newQty = currentQty - quantity;
  const newPoints = player.nb_point + revenue;

  if (shareType === "A") {
    db.prepare("UPDATE players SET nb_point = ?, nb_share_A = ? WHERE user_id = ?")
      .run(Math.round(newPoints), newQty, req.userId!);
  } else {
    db.prepare("UPDATE players SET nb_point = ?, nb_share_B = ? WHERE user_id = ?")
      .run(Math.round(newPoints), newQty, req.userId!);
  }

  insertTransactionSnapshot(prices.priceA, prices.priceB);

  updatePeakNetWorth(req.userId!);
  trackEvent(db, req.userId!, "trade");

  const updated = db
    .prepare("SELECT * FROM players WHERE user_id = ?")
    .get(req.userId!) as Player;

  res.json({
    player: updated,
    prices,
    revenue,
  });
});

export default router;
