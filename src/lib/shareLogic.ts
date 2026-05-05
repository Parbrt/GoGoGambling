// ── TYPES ──────────────────────────────────────────────────
export interface ShareSnapshot {
  value_share_A: number;
  value_share_B: number;
  time_now: number;
}

// ── PARAMETERS (mirrors server/src/engine/shareEngine.ts) ──
const HARD_FLOOR = 5;

const A_CFG = {
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

const B_CFG = {
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

// ── Box-Muller normal ──────────────────────────────────────
function normalRandom(rng: () => number): number {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(Math.max(u1, 0.000001))) * Math.cos(2 * Math.PI * u2);
}

// ── Regime lookup ──────────────────────────────────────────
type RegimeSpec = { name: string; prob: number; sigma: number; bias: number };
type Regime = { sigma: number; bias: number };

function pickRegime(
  timestamp: number,
  cfg: { regimeWindow: number; regimeSalt: number; regimes: readonly RegimeSpec[] }
): Regime {
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
  regime: Regime,
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

// ── PUBLIC API ─────────────────────────────────────────────
export function calculatePricesAtTime(
  snapshot: ShareSnapshot,
  targetTimestamp: number
): { priceA: number; priceB: number } {
  if (!snapshot || typeof snapshot.value_share_A !== "number" || typeof snapshot.value_share_B !== "number") {
    return { priceA: 0, priceB: 0 };
  }
  let priceA = snapshot.value_share_A;
  let priceB = snapshot.value_share_B;
  if (!snapshot.time_now || typeof snapshot.time_now !== "number") {
    return { priceA, priceB };
  }
  if (targetTimestamp <= snapshot.time_now) {
    return { priceA, priceB };
  }

  const startTime = Math.max(snapshot.time_now + 1, targetTimestamp - 3600);
  for (let t = startTime; t <= targetTimestamp; t++) {
    priceA = tickShare(priceA, t, A_CFG, pickRegime(t, A_CFG), 0);
    priceB = tickShare(priceB, t, B_CFG, pickRegime(t, B_CFG), 999999);
  }

  return { priceA, priceB };
}

export function getCurrentPrices(snapshot: ShareSnapshot): { priceA: number; priceB: number } {
  return calculatePricesAtTime(snapshot, Math.floor(Date.now() / 1000));
}

export function calculateShareProfit(avgBuyPrice: number, currentPrice: number, quantity: number): number {
  return (currentPrice - avgBuyPrice) * quantity;
}

export function calculateTotalPortfolioValue(
  snapshot: ShareSnapshot,
  nbShareA: number,
  avgShareA: number,
  nbShareB: number,
  avgShareB: number
) {
  const { priceA, priceB } = getCurrentPrices(snapshot);
  const profitA = calculateShareProfit(avgShareA, priceA, nbShareA);
  const profitB = calculateShareProfit(avgShareB, priceB, nbShareB);
  return {
    currentPriceA: priceA,
    currentPriceB: priceB,
    profitA,
    profitB,
    totalProfit: profitA + profitB,
    totalValue: nbShareA * priceA + nbShareB * priceB,
  };
}

export function createInitialSnapshot(): ShareSnapshot {
  return {
    value_share_A: A_CFG.mu,
    value_share_B: B_CFG.mu,
    time_now: Math.floor(Date.now() / 1000) - 60,
  };
}

export function calculateBuyCost(snapshot: ShareSnapshot, shareType: "A" | "B", quantity: number): number {
  const { priceA, priceB } = getCurrentPrices(snapshot);
  return (shareType === "A" ? priceA : priceB) * quantity;
}

export function calculateSellRevenue(snapshot: ShareSnapshot, shareType: "A" | "B", quantity: number): number {
  const { priceA, priceB } = getCurrentPrices(snapshot);
  return (shareType === "A" ? priceA : priceB) * quantity;
}

export function calculateNewAverage(currentQty: number, currentAvg: number, buyQty: number, buyPrice: number): number {
  const newQty = currentQty + buyQty;
  return newQty === 0 ? 0 : ((currentQty * currentAvg) + (buyQty * buyPrice)) / newQty;
}

export function calculateProfitPercent(avgBuyPrice: number, currentPrice: number): number {
  return avgBuyPrice === 0 ? 0 : ((currentPrice - avgBuyPrice) / avgBuyPrice) * 100;
}

export function generateMockHistory(currentSnapshots: { priceA: number; priceB: number }): Array<{
  value_share_A: number;
  value_share_B: number;
  time_update: string;
}> {
  const now = Date.now();
  const result: Array<{ value_share_A: number; value_share_B: number; time_update: string }> = [];
  let pa = currentSnapshots.priceA;
  let pb = currentSnapshots.priceB;

  for (let i = 49; i >= 0; i--) {
    const time = new Date(now - i * 5000);
    result.push({
      value_share_A: pa,
      value_share_B: pb,
      time_update: time.toISOString(),
    });
    pa += (Math.random() - 0.5) * 8;
    pb += (Math.random() - 0.5) * 2.5;
    if (pa < HARD_FLOOR) pa = HARD_FLOOR;
    if (pb < HARD_FLOOR) pb = HARD_FLOOR;
  }

  return result;
}
