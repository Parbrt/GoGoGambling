import { Router } from "express";
import { getDb } from "../db/connection.js";
import { authMiddleware, type AuthenticatedRequest } from "../auth/middleware.js";
import { updatePeakNetWorth } from "./player.js";
import type { Player } from "../types.js";

const router = Router();

interface LotoPrize {
  name: string;
  type: "points" | "ticket" | "nothing";
  value: number;
  probability: number;
  emoji: string;
}

const LOTTO_PRIZES: LotoPrize[] = [
  { name: "Jackpot Loto !", type: "points", value: 50000, probability: 0.01, emoji: "💰" },
  { name: "Gros lot", type: "points", value: 10000, probability: 0.03, emoji: "💎" },
  { name: "Lot moyen", type: "points", value: 1000, probability: 0.08, emoji: "🎁" },
  { name: "500 points", type: "points", value: 500, probability: 0.15, emoji: "✨" },
  { name: "100 points", type: "points", value: 100, probability: 0.25, emoji: "🎯" },
  { name: "Ticket bonus", type: "ticket", value: 1, probability: 0.23, emoji: "🎟️" },
  { name: "Perdu...", type: "nothing", value: 0, probability: 0.25, emoji: "😞" },
];

function rollPrize(): LotoPrize {
  const roll = Math.random();
  let cumulative = 0;
  for (const prize of LOTTO_PRIZES) {
    cumulative += prize.probability;
    if (roll < cumulative) {
      return prize;
    }
  }
  return LOTTO_PRIZES[LOTTO_PRIZES.length - 1];
}

// GET /api/loto/tickets
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

  res.json({ tickets: player.loto_tickets, canClaim });
});

// POST /api/loto/claim-ticket
router.post("/claim-ticket", authMiddleware, (req: AuthenticatedRequest, res) => {
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
  const lastClaim = player.last_loto_ticket_claim ? new Date(player.last_loto_ticket_claim) : null;

  if (lastClaim && lastClaim >= todayAt9) {
    res.status(400).json({ error: "Ticket deja reclame aujourd'hui" });
    return;
  }

  db.prepare("UPDATE players SET loto_tickets = loto_tickets + 1, last_loto_ticket_claim = ? WHERE user_id = ?")
    .run(now.toISOString(), req.userId!);

  const updated = db
    .prepare("SELECT loto_tickets FROM players WHERE user_id = ?")
    .get(req.userId!) as { loto_tickets: number };

  res.json({ tickets: updated.loto_tickets, canClaim: false });
});

// POST /api/loto/play
router.post("/play", authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const player = db
    .prepare("SELECT * FROM players WHERE user_id = ?")
    .get(req.userId!) as Player | undefined;

  if (!player) {
    res.status(404).json({ error: "Joueur introuvable" });
    return;
  }

  if (player.loto_tickets < 1) {
    res.status(400).json({ error: "Pas assez de tickets" });
    return;
  }

  const prize = rollPrize();
  const won = prize.type !== "nothing";

  // Apply prize
  if (prize.type === "points") {
    db.prepare("UPDATE players SET nb_point = nb_point + ? WHERE user_id = ?")
      .run(prize.value, req.userId!);
  }

  // Consume ticket
  const ticketsRemaining = player.loto_tickets - 1;

  if (prize.type === "ticket") {
    db.prepare("UPDATE players SET loto_tickets = loto_tickets + ? WHERE user_id = ?")
      .run(prize.value - 1, req.userId!); // net: -1 + bonus = ticket count change
  } else {
    db.prepare("UPDATE players SET loto_tickets = loto_tickets - 1 WHERE user_id = ?")
      .run(req.userId!);
  }

  // Record history
  db.prepare(
    "INSERT INTO loto_history (user_id, player_name, prize_name, prize_type, prize_value, won) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(req.userId!, player.player_name, prize.name, prize.type, prize.value, won ? 1 : 0);

  updatePeakNetWorth(req.userId!);

  const updated = db
    .prepare("SELECT * FROM players WHERE user_id = ?")
    .get(req.userId!) as Player;

  const actualTicketsRemaining = prize.type === "ticket" ? ticketsRemaining + prize.value : ticketsRemaining;

  res.json({
    player: updated,
    prize_name: prize.name,
    prize_type: prize.type,
    prize_value: prize.value,
    won,
    tickets_remaining: actualTicketsRemaining,
  });
});

// GET /api/loto/history
router.get("/history", (_req, res) => {
  const db = getDb();
  const history = db
    .prepare(
      "SELECT id, user_id, player_name, prize_name, prize_type, prize_value, won, created_at FROM loto_history ORDER BY created_at DESC LIMIT 10"
    )
    .all();

  res.json(history);
});

export default router;
