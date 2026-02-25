// --- TYPES ---
export interface ShareSnapshot {
  value_share_A: number;
  value_share_B: number;
  time_now: number; // Timestamp Unix en secondes
}

// --- MOTEUR ALÉATOIRE ---
function seededRandom(seed: number): () => number {
  return function () {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Calcule la variation pour une seconde précise
function getVariationForSecond(timestamp: number, shareType: 'A' | 'B'): number {
  // On sépare les graines pour que A et B aient des courbes différentes
  const salt = shareType === 'A' ? 0 : 999999;
  const rng = seededRandom(timestamp + salt);

  const factor = shareType === 'A' ? 0.01 : 0.015;

  // Variation dépendente du type d'action
  return (rng() - 0.5) * factor;
}

// Calcule les prix exacts à un instant T en partant d'un snapshot
export function calculatePricesAtTime(
  snapshot: ShareSnapshot,
  targetTimestamp: number
): { priceA: number; priceB: number } {
  // Vérifier que le snapshot a des valeurs valides
  if (!snapshot || typeof snapshot.value_share_A !== 'number' || typeof snapshot.value_share_B !== 'number') {
    console.error("[shareLogic] Invalid snapshot:", snapshot);
    return { priceA: 0, priceB: 0 };
  }

  let priceA = snapshot.value_share_A;
  let priceB = snapshot.value_share_B;

  // Vérifier que time_now est valide
  if (!snapshot.time_now || typeof snapshot.time_now !== 'number') {
    console.error("[shareLogic] Invalid time_now in snapshot:", snapshot.time_now);
    return { priceA, priceB };
  }

  // Si le target est avant le snapshot, retourner les valeurs du snapshot
  if (targetTimestamp <= snapshot.time_now) {
    return { priceA, priceB };
  }

  // Limiter à 3600 secondes (1h) max pour éviter des boucles trop longues
  const startTime = Math.max(snapshot.time_now + 1, targetTimestamp - 3600);

  for (let t = startTime; t <= targetTimestamp; t++) {
    priceA *= (1 + getVariationForSecond(t, 'A'));
    priceB *= (1 + getVariationForSecond(t, 'B'));
  }

  return { priceA, priceB };
}

// Calcule les prix actuels
export function getCurrentPrices(snapshot: ShareSnapshot): { priceA: number; priceB: number } {
  const now = Math.floor(Date.now() / 1000);
  return calculatePricesAtTime(snapshot, now);
}

// Calcule le profit/perte d'une action
export function calculateShareProfit(
  avgBuyPrice: number,
  currentPrice: number,
  quantity: number
): number {
  return (currentPrice - avgBuyPrice) * quantity;
}

// Calcule le profit/perte total pour toutes les actions
export function calculateTotalPortfolioValue(
  snapshot: ShareSnapshot,
  nbShareA: number,
  avgShareA: number,
  nbShareB: number,
  avgShareB: number
): {
  currentPriceA: number;
  currentPriceB: number;
  profitA: number;
  profitB: number;
  totalProfit: number;
  totalValue: number;
} {
  const { priceA, priceB } = getCurrentPrices(snapshot);

  const profitA = calculateShareProfit(avgShareA, priceA, nbShareA);
  const profitB = calculateShareProfit(avgShareB, priceB, nbShareB);
  const totalProfit = profitA + profitB;
  const totalValue = nbShareA * priceA + nbShareB * priceB;

  return {
    currentPriceA: priceA,
    currentPriceB: priceB,
    profitA,
    profitB,
    totalProfit,
    totalValue,
  };
}

// Initialise un snapshot avec des valeurs par défaut
export function createInitialSnapshot(): ShareSnapshot {
  const now = Math.floor(Date.now() / 1000);
  return {
    value_share_A: 150.0,
    value_share_B: 45.5,
    time_now: now - 60, // Il y a 60 secondes
  };
}

// Calcule le coût total d'achat
export function calculateBuyCost(
  snapshot: ShareSnapshot,
  shareType: 'A' | 'B',
  quantity: number
): number {
  const { priceA, priceB } = getCurrentPrices(snapshot);
  const price = shareType === 'A' ? priceA : priceB;
  return price * quantity;
}

// Calcule le revenu total de vente
export function calculateSellRevenue(
  snapshot: ShareSnapshot,
  shareType: 'A' | 'B',
  quantity: number
): number {
  const { priceA, priceB } = getCurrentPrices(snapshot);
  const price = shareType === 'A' ? priceA : priceB;
  return price * quantity;
}

// Calcule la nouvelle moyenne après achat
export function calculateNewAverage(
  currentQty: number,
  currentAvg: number,
  buyQty: number,
  buyPrice: number
): number {
  const newTotalQty = currentQty + buyQty;
  if (newTotalQty === 0) return 0;
  return ((currentQty * currentAvg) + (buyQty * buyPrice)) / newTotalQty;
}

// Calcule le profit/perte en pourcentage
export function calculateProfitPercent(
  avgBuyPrice: number,
  currentPrice: number
): number {
  if (avgBuyPrice === 0) return 0;
  return ((currentPrice - avgBuyPrice) / avgBuyPrice) * 100;
}
