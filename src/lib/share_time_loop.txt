// --- INITIALISATION ---
function initGame() {
    console.log("[DATABASE] SELECT * FROM player WHERE user_id = 'mon-uuid' LIMIT 1;");
    // Simulation du retour DB
    currentPlayer = {
        id: "player-123", player_name: "TraderFou", nb_point: 10000, nb_debt: 0,
        avg_share_A_value: 0, nb_share_A: 0, avg_share_B_value: 0, nb_share_B: 0
    };

    console.log("[DATABASE] SELECT value_share_A, value_share_B, extract(epoch from time_now) as time_now FROM share ORDER BY time_now DESC LIMIT 1;");
    // Simulation du retour DB (Snapshot d'il y a 60 secondes)
    const now = Math.floor(Date.now() / 1000);
    lastSnapshot = {
        value_share_A: 150.00,
        value_share_B: 45.50,
        time_now: now - 60 
    };

    startLiveTicker();
}

// --- AFFICHAGE TEMPS RÉEL (Visuel uniquement) ---
function startLiveTicker() {
    setInterval(() => {
        if (!lastSnapshot) return;
        
        const now = Math.floor(Date.now() / 1000);
        const { priceA, priceB } = calculatePricesAtTime(lastSnapshot, now);
        
        // C'est ici que tu mettrais à jour ton interface (DOM, React, Vue...)
        // console.log(`[UI] Prix A: ${priceA.toFixed(2)} | Prix B: ${priceB.toFixed(2)}`);
    }, 1000);
}
