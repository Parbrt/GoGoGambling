import { getDb } from "../db/connection.js";
import type { PriceUpdate } from "../types.js";
import { broadcastPriceUpdate } from "../ws/index.js";

// ── Constants ──────────────────────────────────────────────

const SNAPSHOT_INTERVAL_MS = 10_000;
const PRICE_TICK_MS = 1000;
const HARD_FLOOR = 5;

// ── Share A: GoGoCoin — "Blue chip", slow mover with strong trends ──

const A = {
  mu: 2000,
  theta: 0.0006,
  floorThreshold: 200,
  floorStrength: 0.015,
  regimeWindow: 73,
  regimeSalt: 123456,
  regimes: [
    { name: "CALM",     prob: 0.38, sigma: 18,  bias: 0 },
    { name: "VOLATILE", prob: 0.28, sigma: 65,  bias: 0 },
    { name: "BULL",     prob: 0.16, sigma: 45,  bias: 10 },
    { name: "BEAR",     prob: 0.12, sigma: 90,  bias: -15 },
    { name: "CRASH",    prob: 0.06, sigma: 220, bias: -50 },
  ],
} as const;

// ── Share B: GamblingCoin — "Penny stock", nervous, high frequency ──

const B = {
  mu: 400,
  theta: 0.003,
  floorThreshold: 30,
  floorStrength: 0.04,
  regimeWindow: 29,
  regimeSalt: 654321,
  regimes: [
    { name: "CALM",     prob: 0.34, sigma: 5,   bias: 0 },
    { name: "VOLATILE", prob: 0.32, sigma: 22,  bias: 0 },
    { name: "BULL",     prob: 0.14, sigma: 14,  bias: 5 },
    { name: "BEAR",     prob: 0.12, sigma: 35,  bias: -8 },
    { name: "CRASH",    prob: 0.08, sigma: 90,  bias: -25 },
  ],
} as const;

// ── State ──────────────────────────────────────────────────

let priceA = A.mu;
let priceB = B.mu;
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

// ── Tick one share ─────────────────────────────────────────

function tickShare(
  price: number,
  timestamp: number,
  cfg: { mu: number; theta: number; floorThreshold: number; floorStrength: number },
  regime: { sigma: number; bias: number },
  salt: number,
): number {
  const reversion = cfg.theta * (cfg.mu - price);
  const rng = seededRandom(timestamp + salt);
  const shock = regime.sigma * normalRandom(rng) + regime.bias;

  let newPrice = price + reversion + shock;

  if (newPrice < cfg.floorThreshold) {
    const deficit = cfg.floorThreshold - newPrice;
    newPrice += cfg.floorStrength * deficit * deficit / cfg.floorThreshold;
  }

  if (newPrice < HARD_FLOOR) newPrice = HARD_FLOOR;

  return newPrice;
}

// ── Public API ─────────────────────────────────────────────

export function getCurrentPrices(): PriceUpdate {
  return {
    priceA,
    priceB,
    timestamp: Math.floor(Date.now() / 1000),
  };
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
    if (now > row.time_now) {
      for (let t = row.time_now + 1; t <= now; t++) {
        const rA = pickRegime(t, A);
        const rB = pickRegime(t, B);
        priceA = tickShare(priceA, t, { mu: A.mu, theta: A.theta, floorThreshold: A.floorThreshold, floorStrength: A.floorStrength }, rA, 0);
        priceB = tickShare(priceB, t, { mu: B.mu, theta: B.theta, floorThreshold: B.floorThreshold, floorStrength: B.floorStrength }, rB, 999999);
      }
    }
  }
}

function tick(): void {
  const now = Math.floor(Date.now() / 1000);
  const rA = pickRegime(now, A);
  const rB = pickRegime(now, B);
  priceA = tickShare(priceA, now, { mu: A.mu, theta: A.theta, floorThreshold: A.floorThreshold, floorStrength: A.floorStrength }, rA, 0);
  priceB = tickShare(priceB, now, { mu: B.mu, theta: B.theta, floorThreshold: B.floorThreshold, floorStrength: B.floorStrength }, rB, 999999);
  broadcastPriceUpdate({ priceA, priceB, timestamp: now });
}

function persistSnapshot(): void {
  const db = getDb();
  const now = new Date().toISOString();
  const timeNow = Math.floor(Date.now() / 1000);

  const latest = db
    .prepare("SELECT id FROM shares ORDER BY time_now DESC LIMIT 1")
    .get() as { id: number } | undefined;

  if (latest) {
    db.prepare(
      "UPDATE shares SET value_share_A = ?, value_share_B = ?, time_now = ?, time_update = ? WHERE id = ?"
    ).run(priceA, priceB, timeNow, now, latest.id);
  } else {
    db.prepare(
      "INSERT INTO shares (value_share_A, value_share_B, time_now, time_update) VALUES (?, ?, ?, ?)"
    ).run(priceA, priceB, timeNow, now);
  }
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
