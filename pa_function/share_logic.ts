// --- MOTEUR ALÉATOIRE ---
function seededRandom(seed: number): () => number {
    return function() {
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
    
    // Variation entre -0.1% et +0.1% par seconde
    return (rng() - 0.5) * 0.002; 
}

// Calcule les prix exacts à un instant T en partant d'un snapshot
function calculatePricesAtTime(snapshot: ShareSnapshot, targetTimestamp: number): { priceA: number, priceB: number } {
    let priceA = snapshot.value_share_A;
    let priceB = snapshot.value_share_B;

    for (let t = snapshot.time_now + 1; t <= targetTimestamp; t++) {
        priceA *= (1 + getVariationForSecond(t, 'A'));
        priceB *= (1 + getVariationForSecond(t, 'B'));
    }

    return { priceA, priceB };
}
