import { Router } from "express";
import { getDb } from "../db/connection.js";
import { authMiddleware, type AuthenticatedRequest } from "../auth/middleware.js";
import { updatePeakNetWorth } from "./player.js";
import type { Player, LotoTicket, LotoDraw, LotoJackpot, LotoHistoryEntry, LotoTicketsResponse } from "../types.js";

const router = Router();

// ── Config ───────────────────────────────────────────────────────────────────
const LOTTO_TICKET_PRICE = 5000;
const MAX_TICKETS_PER_PLAYER = 10;
const DRAW_HOUR = 12; // Noon
const DRAW_MINUTE = 0;

const BASE_PRIZES = {
  grand: { points: 1_000_000, boxes: ["GAMBLINGBOX"] },
  small1: { points: 250_000, boxes: ["GOGOBOX", "XBOX"] },
  small2: { points: 50_000, boxes: ["XBOX"] },
} as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function getDrawDate(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getTodayDrawTime(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), DRAW_HOUR, DRAW_MINUTE);
}

function getTomorrowDrawTime(): Date {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), DRAW_HOUR, DRAW_MINUTE);
  today.setDate(today.getDate() + 1);
  return today;
}

function generateTicketNumber(): string {
  return String(Math.floor(Math.random() * 100000)).padStart(5, "0");
}

function getOrCreateJackpot(db: ReturnType<typeof getDb>): LotoJackpot {
  let jackpot = db.prepare("SELECT * FROM loto_jackpot WHERE id = 1").get() as LotoJackpot | undefined;
  if (!jackpot) {
    db.prepare("INSERT INTO loto_jackpot (id) VALUES (1)").run();
    jackpot = db.prepare("SELECT * FROM loto_jackpot WHERE id = 1").get() as LotoJackpot;
  }
  return jackpot;
}

/** Parse JSON column or return default */
function parseJsonBoxes(raw: string): string[] {
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

/** Merge base boxes with rollover boxes */
function mergeBoxes(baseBoxes: readonly string[], rolloverJson: string): { boxes: string[]; rolloverJson: string } {
  const rollover = parseJsonBoxes(rolloverJson);
  const all = [...baseBoxes, ...rollover];
  return { boxes: all, rolloverJson: JSON.stringify(rollover) };
}

// ── Draw Engine ──────────────────────────────────────────────────────────────

function tryExecuteDraw(db: ReturnType<typeof getDb>): LotoDraw | null {
  const now = new Date();
  const drawTime = getTodayDrawTime();

  // Don't draw before noon
  if (now < drawTime) return null;

  const todayStr = getDrawDate(now);

  // Check if today's draw already exists
  const existing = db.prepare("SELECT * FROM loto_draws WHERE draw_date = ?").get(todayStr) as LotoDraw | undefined;
  if (existing) return existing;

  const jackpot = getOrCreateJackpot(db);

  // Build up to 3 winning numbers and their total prize pools
  const tiers = [
    {
      key: "grand" as const,
      winningNumber: generateTicketNumber(),
      basePoints: BASE_PRIZES.grand.points,
      rolloverPoints: jackpot.grand_rollover_points,
      baseBoxes: [...BASE_PRIZES.grand.boxes],
      rolloverBoxesJson: jackpot.grand_rollover_boxes,
      pointsField: "grand_points",
      boxesField: "grand_boxes",
      winnerField: "grand_winner_user_id",
      winnerNameField: "grand_winner_name",
    },
    {
      key: "small1" as const,
      winningNumber: generateTicketNumber(),
      basePoints: BASE_PRIZES.small1.points,
      rolloverPoints: jackpot.small1_rollover_points,
      baseBoxes: [...BASE_PRIZES.small1.boxes],
      rolloverBoxesJson: jackpot.small1_rollover_boxes,
      pointsField: "small1_points",
      boxesField: "small1_boxes",
      winnerField: "small1_winner_user_id",
      winnerNameField: "small1_winner_name",
    },
    {
      key: "small2" as const,
      winningNumber: generateTicketNumber(),
      basePoints: BASE_PRIZES.small2.points,
      rolloverPoints: jackpot.small2_rollover_points,
      baseBoxes: [...BASE_PRIZES.small2.boxes],
      rolloverBoxesJson: jackpot.small2_rollover_boxes,
      pointsField: "small2_points",
      boxesField: "small2_boxes",
      winnerField: "small2_winner_user_id",
      winnerNameField: "small2_winner_name",
    },
  ];

  const winningNumbers: string[] = [];
  const drawValues: Record<string, unknown> = {};

  // Track what rolls over to next day
  let nextGrandRollover = 0;
  let nextGrandBoxes: string[] = [];
  let nextSmall1Rollover = 0;
  let nextSmall1Boxes: string[] = [];
  let nextSmall2Rollover = 0;
  let nextSmall2Boxes: string[] = [];

  for (const tier of tiers) {
    winningNumbers.push(tier.winningNumber);
    const totalPoints = tier.basePoints + tier.rolloverPoints;
    const { boxes: allBoxes } = mergeBoxes(tier.baseBoxes, tier.rolloverBoxesJson);

    // Look for a winner
    const winner = db
      .prepare(
        "SELECT t.user_id, t.player_name FROM loto_tickets_v2 t WHERE t.ticket_number = ? AND t.draw_date = ? LIMIT 1"
      )
      .get(tier.winningNumber, todayStr) as { user_id: string; player_name: string } | undefined;

    if (winner) {
      // Award points
      db.prepare("UPDATE players SET nb_point = nb_point + ? WHERE user_id = ?").run(totalPoints, winner.user_id);

      // Award boxes — add to player inventory
      for (const boxName of allBoxes) {
        addBoxToInventory(db, winner.user_id, boxName);
      }

      // Record in legacy history
      db.prepare(
        "INSERT INTO loto_history (user_id, player_name, prize_name, prize_type, prize_value, won) VALUES (?, ?, ?, 'points', ?, 1)"
      ).run(winner.user_id, winner.player_name, `Loto - ${tier.key === "grand" ? "Grand gagnant" : "Petit gagnant"} (${tier.winningNumber})`, totalPoints);

      updatePeakNetWorth(winner.user_id);

      drawValues[tier.pointsField] = totalPoints;
      drawValues[tier.boxesField] = JSON.stringify(allBoxes);
      drawValues[tier.winnerField] = winner.user_id;
      drawValues[tier.winnerNameField] = winner.player_name;

      // No rollover for this tier
      switch (tier.key) {
        case "grand":
          nextGrandRollover = 0;
          nextGrandBoxes = [];
          break;
        case "small1":
          nextSmall1Rollover = 0;
          nextSmall1Boxes = [];
          break;
        case "small2":
          nextSmall2Rollover = 0;
          nextSmall2Boxes = [];
          break;
      }
    } else {
      // No winner — 50% of points and all boxes roll over
      const rolloverPoints = Math.floor(totalPoints / 2);
      const rolloverBoxes = [...allBoxes];

      drawValues[tier.pointsField] = 0;
      drawValues[tier.boxesField] = "[]";
      drawValues[tier.winnerField] = null;
      drawValues[tier.winnerNameField] = null;

      switch (tier.key) {
        case "grand":
          nextGrandRollover = rolloverPoints;
          nextGrandBoxes = rolloverBoxes;
          break;
        case "small1":
          nextSmall1Rollover = rolloverPoints;
          nextSmall1Boxes = rolloverBoxes;
          break;
        case "small2":
          nextSmall2Rollover = rolloverPoints;
          nextSmall2Boxes = rolloverBoxes;
          break;
      }
    }
  }

  // Insert draw record
  const nowIso = now.toISOString();
  db.prepare(
    `INSERT INTO loto_draws (draw_date, winning_numbers, grand_points, grand_boxes, grand_winner_user_id, grand_winner_name,
      small1_points, small1_boxes, small1_winner_user_id, small1_winner_name,
      small2_points, small2_boxes, small2_winner_user_id, small2_winner_name,
      status, drawn_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)`
  ).run(
    todayStr,
    JSON.stringify(winningNumbers),
    drawValues["grand_points"],
    drawValues["grand_boxes"],
    drawValues["grand_winner_user_id"],
    drawValues["grand_winner_name"],
    drawValues["small1_points"],
    drawValues["small1_boxes"],
    drawValues["small1_winner_user_id"],
    drawValues["small1_winner_name"],
    drawValues["small2_points"],
    drawValues["small2_boxes"],
    drawValues["small2_winner_user_id"],
    drawValues["small2_winner_name"],
    nowIso
  );

  // Update jackpot with rollovers for tomorrow
  db.prepare(
    `UPDATE loto_jackpot SET
      grand_rollover_points = ?, grand_rollover_boxes = ?,
      small1_rollover_points = ?, small1_rollover_boxes = ?,
      small2_rollover_points = ?, small2_rollover_boxes = ?,
      updated_at = ?
     WHERE id = 1`
  ).run(
    nextGrandRollover, JSON.stringify(nextGrandBoxes),
    nextSmall1Rollover, JSON.stringify(nextSmall1Boxes),
    nextSmall2Rollover, JSON.stringify(nextSmall2Boxes),
    nowIso
  );

  return db.prepare("SELECT * FROM loto_draws WHERE draw_date = ?").get(todayStr) as LotoDraw;
}

// ── Box Inventory Helper ─────────────────────────────────────────────────────

function addBoxToInventory(db: ReturnType<typeof getDb>, userId: string, boxName: string): void {
  // Look up box in catalog
  const boxMapping: Record<string, { emoji: string; description: string }> = {
    GAMBLINGBOX: { emoji: "🎰", description: "La box ultime pour les high-rollers. Chance de drop unique !" },
    GOGOBOX: { emoji: "📦", description: "Box intermediaire. De l'exotique au rare." },
    XBOX: { emoji: "🎁", description: "Petite box accessible. Parfaite pour debuter." },
  };

  const info = boxMapping[boxName];
  if (!info) return;

  // Find catalog item
  let catalogItem = db
    .prepare("SELECT id FROM items_catalog WHERE name = ? AND category = 'box'")
    .get(boxName) as { id: number } | undefined;

  if (!catalogItem) {
    // Insert missing catalog entry
    const result = db.prepare(
      "INSERT INTO items_catalog (name, category, rarity, base_value, qualifyable, emoji, description) VALUES (?, 'box', 'legendary', 0, 0, ?, ?)"
    ).run(boxName, info.emoji, info.description);
    catalogItem = { id: Number(result.lastInsertRowid) };
  }

  // Add to inventory (stack)
  const existing = db
    .prepare("SELECT id, quantity FROM player_inventory WHERE user_id = ? AND item_id = ? AND star_level = 0")
    .get(userId, catalogItem.id) as { id: number; quantity: number } | undefined;

  if (existing) {
    db.prepare("UPDATE player_inventory SET quantity = quantity + 1 WHERE id = ?").run(existing.id);
  } else {
    db.prepare(
      "INSERT INTO player_inventory (user_id, item_id, quantity, star_level) VALUES (?, ?, 1, 0)"
    ).run(userId, catalogItem.id);
  }
}

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /api/loto/status — full status: tickets, draw info, jackpot
router.get("/status", authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const now = new Date();
  const drawTime = getTodayDrawTime();
  const todayStr = getDrawDate(now);

  // Try to execute draw if past noon
  const todayDraw = tryExecuteDraw(db);

  // Determine which draw date is active for purchasing
  // Before noon: today's draw. After noon: tomorrow's draw.
  const activeDrawDate = now < drawTime ? todayStr : getDrawDate(new Date(now.getTime() + 86400000));

  // Get player's tickets for active draw
  const playerTickets = db
    .prepare(
      "SELECT * FROM loto_tickets_v2 WHERE user_id = ? AND draw_date = ? ORDER BY purchased_at DESC"
    )
    .all(req.userId!, activeDrawDate) as LotoTicket[];

  // Check daily free ticket — verify directly in tickets table to avoid timezone edge cases
  const existingFreeTicket = db
    .prepare("SELECT id FROM loto_tickets_v2 WHERE user_id = ? AND draw_date = ? AND is_free = 1")
    .get(req.userId!, activeDrawDate) as { id: number } | undefined;
  const canClaim = !existingFreeTicket;

  // Can buy if before draw time (noon) and under max
  const canBuy = now < drawTime && playerTickets.length < MAX_TICKETS_PER_PLAYER;

  const jackpot = getOrCreateJackpot(db);

  // Get recent draws
  const draws = db
    .prepare("SELECT * FROM loto_draws ORDER BY draw_date DESC LIMIT 10")
    .all() as LotoDraw[];

  const nextDrawTime = now < drawTime ? drawTime.toISOString() : getTomorrowDrawTime().toISOString();

  res.json({
    tickets: playerTickets,
    ticketCount: playerTickets.length,
    maxTickets: MAX_TICKETS_PER_PLAYER,
    canClaim,
    canBuy,
    todayDraw,
    jackpot,
    ticketPrice: LOTTO_TICKET_PRICE,
    nextDrawTime,
    draws,
  });
});

// POST /api/loto/buy — buy a ticket
router.post("/buy", authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const now = new Date();
  const drawTime = getTodayDrawTime();

  if (now >= drawTime) {
    res.status(400).json({ error: "Les achats sont fermes. Revenez apres le tirage de midi." });
    return;
  }

  const todayStr = getDrawDate(now);
  const player = db
    .prepare("SELECT * FROM players WHERE user_id = ?")
    .get(req.userId!) as Player | undefined;

  if (!player) {
    res.status(404).json({ error: "Joueur introuvable" });
    return;
  }

  // Check ticket count
  const ticketCount = (db
    .prepare("SELECT COUNT(*) as cnt FROM loto_tickets_v2 WHERE user_id = ? AND draw_date = ?")
    .get(req.userId!, todayStr) as { cnt: number }).cnt;

  if (ticketCount >= MAX_TICKETS_PER_PLAYER) {
    res.status(400).json({ error: `Maximum ${MAX_TICKETS_PER_PLAYER} tickets par tirage` });
    return;
  }

  if (player.nb_point < LOTTO_TICKET_PRICE) {
    res.status(400).json({ error: "Pas assez de points" });
    return;
  }

  // Generate unique ticket number for this draw
  let ticketNumber: string;
  let attempts = 0;
  do {
    ticketNumber = generateTicketNumber();
    const exists = db
      .prepare("SELECT id FROM loto_tickets_v2 WHERE ticket_number = ? AND draw_date = ?")
      .get(ticketNumber, todayStr);
    if (!exists) break;
    attempts++;
  } while (attempts < 50);

  if (attempts >= 50) {
    res.status(500).json({ error: "Impossible de generer un numero unique. Reessayez." });
    return;
  }

  // Deduct points
  db.prepare("UPDATE players SET nb_point = nb_point - ? WHERE user_id = ?").run(LOTTO_TICKET_PRICE, req.userId!);

  // Insert ticket
  db.prepare(
    "INSERT INTO loto_tickets_v2 (user_id, player_name, ticket_number, draw_date) VALUES (?, ?, ?, ?)"
  ).run(req.userId!, player.player_name, ticketNumber, todayStr);

  const tickets = db
    .prepare("SELECT * FROM loto_tickets_v2 WHERE user_id = ? AND draw_date = ? ORDER BY purchased_at DESC")
    .all(req.userId!, todayStr) as LotoTicket[];

  const updatedPlayer = db
    .prepare("SELECT * FROM players WHERE user_id = ?")
    .get(req.userId!) as Player;

  res.json({ tickets, ticketCount: tickets.length, player: updatedPlayer });
});

// POST /api/loto/claim-ticket — daily free ticket (kept for backward compat + new system)
router.post("/claim-ticket", authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const now = new Date();
  const drawTime = getTodayDrawTime();

  const player = db
    .prepare("SELECT * FROM players WHERE user_id = ?")
    .get(req.userId!) as Player | undefined;

  if (!player) {
    res.status(404).json({ error: "Joueur introuvable" });
    return;
  }

  // Determine draw date: if before noon, today; if after noon, tomorrow
  const activeDrawDate = now < drawTime
    ? getDrawDate(now)
    : getDrawDate(new Date(now.getTime() + 86400000));

  // Check if already claimed for this draw (robust check regardless of time-of-day edge cases)
  const existingFreeTicket = db
    .prepare("SELECT id FROM loto_tickets_v2 WHERE user_id = ? AND draw_date = ? AND is_free = 1")
    .get(req.userId!, activeDrawDate) as { id: number } | undefined;
  if (existingFreeTicket) {
    res.status(400).json({ error: "Ticket gratuit deja reclame pour ce tirage" });
    return;
  }

  // Check ticket count for this draw
  const ticketCount = (db
    .prepare("SELECT COUNT(*) as cnt FROM loto_tickets_v2 WHERE user_id = ? AND draw_date = ?")
    .get(req.userId!, activeDrawDate) as { cnt: number }).cnt;

  if (ticketCount >= MAX_TICKETS_PER_PLAYER) {
    res.status(400).json({ error: `Maximum ${MAX_TICKETS_PER_PLAYER} tickets deja atteint pour ce tirage` });
    return;
  }

  // Generate unique number
  let ticketNumber: string;
  let attempts = 0;
  do {
    ticketNumber = generateTicketNumber();
    const exists = db
      .prepare("SELECT id FROM loto_tickets_v2 WHERE ticket_number = ? AND draw_date = ?")
      .get(ticketNumber, activeDrawDate);
    if (!exists) break;
    attempts++;
  } while (attempts < 50);

  if (attempts >= 50) {
    res.status(500).json({ error: "Impossible de generer un numero. Reessayez." });
    return;
  }

  // Mark claim time and give free ticket
  db.prepare("UPDATE players SET last_loto_ticket_claim = ? WHERE user_id = ?").run(now.toISOString(), req.userId!);
  db.prepare(
    "INSERT INTO loto_tickets_v2 (user_id, player_name, ticket_number, draw_date, is_free) VALUES (?, ?, ?, ?, 1)"
  ).run(req.userId!, player.player_name, ticketNumber, activeDrawDate);

  const tickets = db
    .prepare("SELECT * FROM loto_tickets_v2 WHERE user_id = ? AND draw_date = ? ORDER BY purchased_at DESC")
    .all(req.userId!, activeDrawDate) as LotoTicket[];

  res.json({ tickets, ticketCount: tickets.length, canClaim: false });
});

// GET /api/loto/draws — list past draws
router.get("/draws", (_req, res) => {
  const db = getDb();
  const draws = db
    .prepare("SELECT * FROM loto_draws ORDER BY draw_date DESC LIMIT 20")
    .all() as LotoDraw[];
  res.json(draws);
});

// GET /api/loto/draws/:date — get specific draw
router.get("/draws/:date", (req, res) => {
  const db = getDb();
  const draw = db
    .prepare("SELECT * FROM loto_draws WHERE draw_date = ?")
    .get(req.params.date) as LotoDraw | undefined;

  if (!draw) {
    res.status(404).json({ error: "Tirage introuvable" });
    return;
  }

  // Include ticket details for this draw
  const tickets = db
    .prepare("SELECT * FROM loto_tickets_v2 WHERE draw_date = ?")
    .all(req.params.date) as LotoTicket[];

  res.json({ draw, tickets });
});

// ── Legacy endpoints (backward compat) ───────────────────────────────────────

// GET /api/loto/tickets — legacy
router.get("/tickets", authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const player = db
    .prepare("SELECT loto_tickets, last_loto_ticket_claim FROM players WHERE user_id = ?")
    .get(req.userId!) as { loto_tickets: number; last_loto_ticket_claim: string | null } | undefined;

  if (!player) {
    res.status(404).json({ error: "Joueur introuvable" });
    return;
  }

  const now = new Date();
  const todayAt9 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0);
  const lastClaim = player.last_loto_ticket_claim ? new Date(player.last_loto_ticket_claim) : null;
  const canClaim = !lastClaim || lastClaim < todayAt9;

  res.json({ tickets: player.loto_tickets, canClaim } as LotoTicketsResponse);
});

// GET /api/loto/history — legacy
router.get("/history", (_req, res) => {
  const db = getDb();
  const history = db
    .prepare(
      "SELECT id, user_id, player_name, prize_name, prize_type, prize_value, won, created_at FROM loto_history ORDER BY created_at DESC LIMIT 10"
    )
    .all() as LotoHistoryEntry[];

  res.json(history);
});

export default router;
