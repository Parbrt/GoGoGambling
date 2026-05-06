import { getDb } from "../db/connection.js";
import type { PriceUpdate } from "../types.js";
import { broadcastPriceUpdate } from "../ws/index.js";

// ── Constants ──────────────────────────────────────────────
const SNAPSHOT_INTERVAL_MS = 10_000;
const PRICE_TICK_MS = 1000;
const HARD_FLOOR = 5;
const SNAPSHOT_RETENTION = 8640; // 24h at 10s intervals

// Log-space means (computed once)
const LOG_MU_A = Math.log(2000);
const LOG_MU_B = Math.log(300);

// ── Share A: GoGoCoin — Blue chip, slow trends ─────────────
const A = {
  mu: 2000,
  theta: 0.00005,       // half-life ≈ 4 hours
  regimeWindow: 600,    // 10 min per regime
  regimeSalt: 123456,
  regimes: [
    { name: "CALM",     prob: 0.40, sigma: 0.0012, bias:  0       },
    { name: "VOLATILE", prob: 0.26, sigma: 0.0040, bias:  0       },
    { name: "BULL",     prob: 0.18, sigma: 0.0025, bias:  0.00020 },
    { name: "BEAR",     prob: 0.12, sigma: 0.0030, bias: -0.00025 },
    { name: "CRASH",    prob: 0.04, sigma: 0.0080, bias: -0.00080 },
  ],
} as const;

// ── Share B: GamblingCoin — Nervous penny stock ────────────
const B = {
  mu: 300,
  theta: 0.0002,        // faster reversion
  regimeWindow: 240,    // 4 min per regime
  regimeSalt: 654321,
  regimes: [
    { name: "CALM",     prob: 0.34, sigma: 0.0020, bias:  0       },
    { name: "VOLATILE", prob: 0.30, sigma: 0.0075, bias:  0       },
    { name: "BULL",     prob: 0.14, sigma: 0.0045, bias:  0.00045 },
    { name: "BEAR",     prob: 0.13, sigma: 0.0055, bias: -0.00055 },
    { name: "CRASH",    prob: 0.09, sigma: 0.0150, bias: -0.00180 },
  ],
} as const;

// ── State ──────────────────────────────────────────────────
let priceA: number = A.mu;
let priceB: number = B.mu;
let athA: number = A.mu;
let atlA: number = A.mu;
let athB: number = B.mu;
let atlB: number = B.mu;
let intervalId: ReturnType<typeof setInterval> | null = null;
let snapshotIntervalId: ReturnType<typeof setInterval> | null = null;

// ── Seeded PRNG ────────────────────────────────────────────
function seededRandom(seed: number): () => number {
  let s = seed;
  return function () {
    s += 0x6D2B79F5;
    s = Math.imul(s ^ s >>> 15, s | 1);
    s ^= s + Math.imul(s ^ s >>> 7, s | 61);
    return ((s ^ s >>> 14) >>> 0) / 4294967296;
  };
}

// ── Normal from uniform (Box-Muller) ───────────────────────
function normalRandom(rng: () => number): number {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(Math.max(u1, 0.000001))) * Math.cos(2 * Math.PI * u2);
}

// ── Regime lookup (deterministic, O(1) per timestamp) ──────
function pickRegime(
  timestamp: number,
  cfg: { regimeWindow: number; regimeSalt: number; regimes: readonly { name: string; prob: number; sigma: number; bias: number }[] }
) {
  const epoch = Math.floor(timestamp / cfg.regimeWindow) * cfg.regimeWindow;
  const rng = seededRandom(epoch + cfg.regimeSalt);
  const rand = rng();
  let cumulative = 0;
  for (const spec of cfg.regimes) {
    cumulative += spec.prob;
    if (rand < cumulative) return spec;
  }
  return cfg.regimes[0];
}

// ── Tick one share (log-space OU model) ────────────────────
// Works in log-price: shocks are % of price, not absolute values.
// This keeps the curve realistic across any price level.
function tickShare(
  price: number,
  timestamp: number,
  logMu: number,
  theta: number,
  regime: { sigma: number; bias: number },
  salt: number,
): number {
  const logPrice = Math.log(Math.max(price, HARD_FLOOR));
  const reversion = theta * (logMu - logPrice);
  const rng = seededRandom(timestamp + salt);
  const shock = regime.sigma * normalRandom(rng) + regime.bias;

  const newLogPrice = logPrice + reversion + shock;
  return Math.max(Math.exp(newLogPrice), HARD_FLOOR);
}

// ── Public API ─────────────────────────────────────────────
export function getCurrentPrices(): PriceUpdate {
  return {
    priceA,
    priceB,
    timestamp: Math.floor(Date.now() / 1000),
  };
}

export function getShareStats() {
  return { athA, atlA, athB, atlB };
}

export function loadPricesFromDb(): void {
  const db = getDb();
  const row = db
    .prepare("SELECT value_share_A, value_share_B, time_now FROM shares ORDER BY time_now DESC LIMIT 1")
    .get() as { value_share_A: number; value_share_B: number; time_now: number } | undefined;

  if (row) {
    priceA = row.value_share_A;
    priceB = row.value_share_B;

    const now = Math.floor(Date.now() / 1000);
    // Cap replay to avoid blocking startup after long downtime
    const startT = Math.max(row.time_now + 1, now - 86400);
    for (let t = startT; t <= now; t++) {
      const rA = pickRegime(t, A);
      const rB = pickRegime(t, B);
      priceA = tickShare(priceA, t, LOG_MU_A, A.theta, rA, 0);
      priceB = tickShare(priceB, t, LOG_MU_B, B.theta, rB, 999999);
    }
  }

  // Load persisted ATH/ATL
  const stats = db
    .prepare("SELECT ath_A, atl_A, ath_B, atl_B FROM share_stats WHERE id = 1")
    .get() as { ath_A: number; atl_A: number; ath_B: number; atl_B: number } | undefined;

  if (stats) {
    athA = Math.max(stats.ath_A, priceA);
    atlA = Math.min(stats.atl_A, priceA);
    athB = Math.max(stats.ath_B, priceB);
    atlB = Math.min(stats.atl_B, priceB);
  } else {
    athA = priceA;
    atlA = priceA;
    athB = priceB;
    atlB = priceB;
  }
}

function tick(): void {
  const now = Math.floor(Date.now() / 1000);
  const rA = pickRegime(now, A);
  const rB = pickRegime(now, B);
  priceA = tickShare(priceA, now, LOG_MU_A, A.theta, rA, 0);
  priceB = tickShare(priceB, now, LOG_MU_B, B.theta, rB, 999999);

  if (priceA > athA) athA = priceA;
  if (priceA < atlA) atlA = priceA;
  if (priceB > athB) athB = priceB;
  if (priceB < atlB) atlB = priceB;

  broadcastPriceUpdate({ priceA, priceB, timestamp: now });
}

function persistSnapshot(): void {
  const db = getDb();
  const now = new Date().toISOString();
  const timeNow = Math.floor(Date.now() / 1000);

  db.prepare(
    "INSERT INTO shares (value_share_A, value_share_B, time_now, time_update) VALUES (?, ?, ?, ?)"
  ).run(priceA, priceB, timeNow, now);

  db.prepare(
    "DELETE FROM shares WHERE id NOT IN (SELECT id FROM shares ORDER BY time_now DESC LIMIT ?)"
  ).run(SNAPSHOT_RETENTION);

  db.prepare(`
    INSERT OR REPLACE INTO share_stats (id, ath_A, atl_A, ath_B, atl_B)
    VALUES (1, ?, ?, ?, ?)
  `).run(athA, atlA, athB, atlB);
}

export function startShareEngine(): void {
  loadPricesFromDb();
  intervalId = setInterval(tick, PRICE_TICK_MS);
  snapshotIntervalId = setInterval(persistSnapshot, SNAPSHOT_INTERVAL_MS);
}

export function stopShareEngine(): void {
  if (intervalId) clearInterval(intervalId);
  if (snapshotIntervalId) clearInterval(snapshotIntervalId);
}

export function insertTransactionSnapshot(priceATx: number, priceBTx: number): void {
  const db = getDb();
  const now = new Date().toISOString();
  const timeNow = Math.floor(Date.now() / 1000);
  db.prepare(
    "INSERT INTO shares (value_share_A, value_share_B, time_now, time_update) VALUES (?, ?, ?, ?)"
  ).run(priceATx, priceBTx, timeNow, now);
}
