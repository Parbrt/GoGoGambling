import { Router } from "express";
import { getDb } from "../db/connection.js";
import { authMiddleware, type AuthenticatedRequest } from "../auth/middleware.js";
import type { Player } from "../types.js";

const router = Router();

const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB

// GET /api/player/me
router.get("/me", authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const player = db
    .prepare("SELECT * FROM players WHERE user_id = ?")
    .get(req.userId!) as Player | undefined;

  if (!player) {
    res.status(404).json({ error: "Joueur introuvable" });
    return;
  }

  res.json(player);
});

// GET /api/player/check-username/:username
router.get("/check-username/:username", async (req, res) => {
  const db = getDb();
  const player = db
    .prepare("SELECT id FROM players WHERE player_name = ?")
    .get(req.params.username);

  res.json({ exists: !!player });
});

// POST /api/player/create
router.post("/create", async (req, res) => {
  try {
    const { userId, playerName } = req.body;
    if (!userId || !playerName) {
      res.status(400).json({ error: "userId et playerName requis" });
      return;
    }

    const db = getDb();
    const existing = db
      .prepare("SELECT id FROM players WHERE player_name = ?")
      .get(playerName);
    if (existing) {
      res.status(409).json({ error: "Nom d'utilisateur deja pris" });
      return;
    }

    const result = db
      .prepare(
        "INSERT INTO players (user_id, player_name, nb_point, nb_debt, nb_share_A, avg_share_A_value, nb_share_B, avg_share_B_value) VALUES (?, ?, 0, 0, 0, 0, 0, 0)"
      )
      .run(userId, playerName);

    const player = db
      .prepare("SELECT * FROM players WHERE id = ?")
      .get(result.lastInsertRowid) as Player;

    res.status(201).json(player);
  } catch (err) {
    console.error("[player] Erreur create:", err);
    res.status(500).json({ error: "Erreur serveur lors de la creation du joueur" });
  }
});

// POST /api/player/online
router.post("/online", authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  db.prepare("UPDATE players SET is_online = 1, last_seen = datetime('now') WHERE user_id = ?").run(req.userId!);
  res.json({ ok: true });
});

// POST /api/player/offline
router.post("/offline", authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  db.prepare("UPDATE players SET is_online = 0, last_seen = datetime('now') WHERE user_id = ?").run(req.userId!);
  res.json({ ok: true });
});

// POST /api/player/heartbeat
router.post("/heartbeat", authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  db.prepare("UPDATE players SET is_online = 1, last_seen = datetime('now') WHERE user_id = ?").run(req.userId!);
  res.json({ ok: true });
});

// POST /api/player/update-points
router.post("/update-points", authMiddleware, (req: AuthenticatedRequest, res) => {
  const { points } = req.body;
  if (typeof points !== "number") {
    res.status(400).json({ error: "points requis" });
    return;
  }

  const db = getDb();
  db.prepare("UPDATE players SET nb_point = ? WHERE user_id = ?").run(Math.round(points), req.userId!);

  const player = db
    .prepare("SELECT * FROM players WHERE user_id = ?")
    .get(req.userId!) as Player;

  res.json(player);
});

// POST /api/player/update
router.post("/update", authMiddleware, (req: AuthenticatedRequest, res) => {
  const { nb_point, nb_debt, nb_share_A, avg_share_A_value, nb_share_B, avg_share_B_value } = req.body;
  const db = getDb();

  db.prepare(
    `UPDATE players SET
      nb_point = COALESCE(?, nb_point),
      nb_debt = COALESCE(?, nb_debt),
      nb_share_A = COALESCE(?, nb_share_A),
      avg_share_A_value = COALESCE(?, avg_share_A_value),
      nb_share_B = COALESCE(?, nb_share_B),
      avg_share_B_value = COALESCE(?, avg_share_B_value)
    WHERE user_id = ?`
  ).run(
    nb_point !== undefined ? Math.round(nb_point) : null,
    nb_debt !== undefined ? Math.round(nb_debt) : null,
    nb_share_A !== undefined ? Math.round(nb_share_A) : null,
    avg_share_A_value !== undefined ? Math.round(avg_share_A_value) : null,
    nb_share_B !== undefined ? Math.round(nb_share_B) : null,
    avg_share_B_value !== undefined ? Math.round(avg_share_B_value) : null,
    req.userId!
  );

  const player = db
    .prepare("SELECT * FROM players WHERE user_id = ?")
    .get(req.userId!) as Player;

  res.json(player);
});

// POST /api/player/daily-reward
router.post("/daily-reward", authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const player = db
    .prepare("SELECT * FROM players WHERE user_id = ?")
    .get(req.userId!) as Player | undefined;

  if (!player) {
    res.status(404).json({ error: "Joueur introuvable" });
    return;
  }

  const now = new Date();
  const todayAt9 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0);
  const lastClaim = player.last_daily_reward_claim ? new Date(player.last_daily_reward_claim) : null;

  if (lastClaim && lastClaim >= todayAt9) {
    res.status(400).json({ error: "Récompense déjà réclamée aujourd'hui" });
    return;
  }

  const newPoints = player.nb_point + 50;
  db.prepare("UPDATE players SET nb_point = ?, last_daily_reward_claim = ? WHERE user_id = ?")
    .run(newPoints, now.toISOString(), req.userId!);

  const updated = db
    .prepare("SELECT * FROM players WHERE user_id = ?")
    .get(req.userId!) as Player;

  res.json(updated);
});

// POST /api/player/profile-photo
router.post("/profile-photo", authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const { photo } = req.body;

    if (photo === null || photo === "") {
      const db = getDb();
      db.prepare("UPDATE players SET profile_photo = NULL WHERE user_id = ?").run(req.userId!);
      const player = db.prepare("SELECT * FROM players WHERE user_id = ?").get(req.userId!) as Player;
      res.json(player);
      return;
    }

    if (typeof photo !== "string") {
      res.status(400).json({ error: "Photo invalide" });
      return;
    }

    // Validate it's a data URI
    if (!photo.startsWith("data:image/")) {
      res.status(400).json({ error: "Format d'image non supporte. Utilisez PNG, JPEG, GIF ou WebP." });
      return;
    }

    // Check size of the base64 data (allow some overhead for the data URI prefix)
    const base64Data = photo.includes(";base64,") ? photo.split(";base64,")[1] : null;
    if (!base64Data) {
      res.status(400).json({ error: "Format de donnees invalide" });
      return;
    }

    // Rough check: base64 is ~33% larger than binary, so ~6.7MB base64 = ~5MB binary
    const binarySize = Math.ceil((base64Data.length * 3) / 4);
    if (binarySize > MAX_PHOTO_SIZE) {
      res.status(400).json({ error: "La photo ne doit pas depasser 5 Mo" });
      return;
    }

    const db = getDb();
    db.prepare("UPDATE players SET profile_photo = ? WHERE user_id = ?").run(photo, req.userId!);

    const player = db.prepare("SELECT * FROM players WHERE user_id = ?").get(req.userId!) as Player;
    res.json(player);
  } catch (err) {
    console.error("[player] Erreur profile-photo:", err);
    res.status(500).json({ error: "Erreur serveur lors de la mise a jour de la photo" });
  }
});

export default router;
