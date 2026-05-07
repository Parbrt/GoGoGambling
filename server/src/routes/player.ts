import { Router } from "express";
import { getDb } from "../db/connection.js";
import { authMiddleware, type AuthenticatedRequest } from "../auth/middleware.js";
import { getCurrentPrices } from "../engine/shareEngine.js";
import type { Player } from "../types.js";

const router = Router();

const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB

export function updatePeakNetWorth(userId: string): void {
  const db = getDb();
  const player = db
    .prepare("SELECT * FROM players WHERE user_id = ?")
    .get(userId) as Player | undefined;
  if (!player) return;

  const prices = getCurrentPrices();
  const netWorth =
    player.nb_point +
    player.nb_share_A * prices.priceA +
    player.nb_share_B * prices.priceB -
    player.nb_debt;

  if (netWorth > (player.peak_net_worth ?? 0)) {
    db.prepare("UPDATE players SET peak_net_worth = ? WHERE user_id = ?").run(
      Math.floor(netWorth),
      userId
    );
  }
}

// GET /api/player/me
router.get("/me", authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();

  updatePeakNetWorth(req.userId!);

  const player = db
    .prepare("SELECT * FROM players WHERE user_id = ?")
    .get(req.userId!) as Player | undefined;

  if (!player) {
    res.status(404).json({ error: "Joueur introuvable" });
    return;
  }

  res.json(player);
});

// GET /api/player/:id
router.get("/:id", (req, res) => {
  const db = getDb();
  const numericId = parseInt(req.params.id, 10);
  if (isNaN(numericId)) { res.status(400).json({ error: "ID invalide" }); return; }

  const row = db
    .prepare(
      "SELECT id, user_id, player_name, nb_point, nb_debt, nb_share_A, nb_share_B, is_online, last_seen, profile_photo, peak_net_worth FROM players WHERE id = ?"
    )
    .get(numericId) as {
      id: number; user_id: string; player_name: string;
      nb_point: number; nb_debt: number; nb_share_A: number; nb_share_B: number;
      is_online: number; last_seen: string | null; profile_photo: string | null;
      peak_net_worth: number;
    } | undefined;

  if (!row) { res.status(404).json({ error: "Joueur introuvable" }); return; }

  // Equipped items
  const equipped = db.prepare(`
    SELECT
      tc.name  AS equipped_title_name,  tc.emoji AS equipped_title_emoji,
      tc.rarity AS equipped_title_rarity, ti.display_style AS equipped_title_display_style,
      ti.star_level AS equipped_title_star_level,
      oc.name  AS equipped_object_name, oc.emoji AS equipped_object_emoji,
      oc.rarity AS equipped_object_rarity, oi.display_style AS equipped_object_display_style,
      oi.star_level AS equipped_object_star_level
    FROM player_equipped pe
    LEFT JOIN player_inventory ti ON pe.equipped_title_inventory_id  = ti.id
    LEFT JOIN items_catalog    tc ON ti.item_id = tc.id
    LEFT JOIN player_inventory oi ON pe.equipped_object_inventory_id = oi.id
    LEFT JOIN items_catalog    oc ON oi.item_id = oc.id
    WHERE pe.user_id = ?
  `).get(row.user_id) as Record<string, unknown> | undefined;

  // Collection stats for this player
  const TRACKED = [
    { key: "fruit",  label: "Fruits",      emoji: "🍎" },
    { key: "burger", label: "Burgers",     emoji: "🍔" },
    { key: "title",  label: "Titres",      emoji: "🏅" },
    { key: "people", label: "Personnages", emoji: "👤" },
  ] as const;

  const categories = TRACKED.map(({ key, label, emoji }) => {
    const { total } = db.prepare("SELECT COUNT(*) as total FROM items_catalog WHERE category = ?").get(key) as { total: number };
    const { owned } = db.prepare(
      `SELECT COUNT(DISTINCT pi.item_id) as owned FROM player_inventory pi
       JOIN items_catalog ic ON pi.item_id = ic.id
       WHERE pi.user_id = ? AND pi.quantity > 0 AND ic.category = ?`
    ).get(row.user_id, key) as { owned: number };
    return { key, label, emoji, owned, total };
  });

  const { uniqueTotal } = db.prepare("SELECT COUNT(*) as uniqueTotal FROM items_catalog WHERE rarity = 'unique'").get() as { uniqueTotal: number };
  const { uniqueOwned } = db.prepare(
    `SELECT COUNT(DISTINCT pi.item_id) as uniqueOwned FROM player_inventory pi
     JOIN items_catalog ic ON pi.item_id = ic.id
     WHERE ic.rarity = 'unique' AND pi.quantity > 0`
  ).get() as { uniqueOwned: number };

  const { id, player_name, nb_point, nb_debt, nb_share_A, nb_share_B, is_online, last_seen, profile_photo, peak_net_worth } = row;
  res.json({
    id, player_name, nb_point, nb_debt, nb_share_A, nb_share_B,
    is_online: is_online === 1,
    last_seen, profile_photo, peak_net_worth,
    ...(equipped ?? {}),
    collection: { categories, uniqueGlobal: { owned: uniqueOwned, total: uniqueTotal } },
  });
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

  updatePeakNetWorth(req.userId!);

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

  updatePeakNetWorth(req.userId!);

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

  updatePeakNetWorth(req.userId!);

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
