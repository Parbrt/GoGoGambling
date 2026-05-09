import { Router } from "express";
import { getDb } from "../db/connection.js";
import { authMiddleware, type AuthenticatedRequest } from "../auth/middleware.js";
import { getCurrentFight, placeBet, getFightHistory, getFightById } from "../engine/babyFightEngine.js";
import { trackEvent } from "../engine/challengeEngine.js";
import type { Player } from "../types.js";

const router = Router();

router.get("/state", (_req, res) => {
  try {
    const state = getCurrentFight();
    res.json(state);
  } catch (err) {
    console.error("[baby-fight] state error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/bet", authMiddleware, (req: AuthenticatedRequest, res) => {
  const { fightId, betOn, amount } = req.body as { fightId: number; betOn: 1 | 2; amount: number };

  if (!fightId || !betOn || !amount || (betOn !== 1 && betOn !== 2)) {
    res.status(400).json({ error: "Parametres invalides" });
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

  const result = placeBet(req.userId!, player.player_name, fightId, betOn, amount, player.nb_point);

  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  trackEvent(db, req.userId!, "baby_fight_bet");

  const updated = db
    .prepare("SELECT * FROM players WHERE user_id = ?")
    .get(req.userId!) as Player;

  res.json({
    player: updated,
    oddsA: result.oddsA,
    oddsB: result.oddsB,
    potA: result.potA,
    potB: result.potB,
  });
});

router.get("/history", (_req, res) => {
  try {
    const limit = parseInt(_req.query.limit as string, 10) || 5;
    const history = getFightHistory(Math.min(limit, 50));
    res.json({ fights: history });
  } catch (err) {
    console.error("[baby-fight] history error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/history/:id", (req, res) => {
  try {
    const fightId = parseInt(req.params.id, 10);
    if (isNaN(fightId)) {
      res.status(400).json({ error: "ID invalide" });
      return;
    }

    const fight = getFightById(fightId);
    if (!fight) {
      res.status(404).json({ error: "Combat introuvable" });
      return;
    }

    res.json({ fight });
  } catch (err) {
    console.error("[baby-fight] history detail error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
