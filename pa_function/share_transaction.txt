// --- TRANSACTIONS ---
function buyShare(shareType: 'A' | 'B', quantity: number) {
    if (!currentPlayer || !lastSnapshot) return;

    // 1. Figer le temps de la transaction
    const transactionTime = Math.floor(Date.now() / 1000);

    // 2. Calculer les prix exacts à CETTE seconde
    const { priceA, priceB } = calculatePricesAtTime(lastSnapshot, transactionTime);
    const priceToPay = shareType === 'A' ? priceA : priceB;
    const totalCost = priceToPay * quantity;

    // 3. Vérifier les fonds
    if (currentPlayer.nb_point < totalCost) {
        console.warn("Fonds insuffisants !");
        return;
    }

    // 4. Calculer la nouvelle moyenne d'achat (Average Price)
    const currentQty = shareType === 'A' ? currentPlayer.nb_share_A : currentPlayer.nb_share_B;
    const currentAvg = shareType === 'A' ? currentPlayer.avg_share_A_value : currentPlayer.avg_share_B_value;
    
    const newTotalQty = currentQty + quantity;
    const newAvgPrice = ((currentQty * currentAvg) + (quantity * priceToPay)) / newTotalQty;

    // 5. MANIPULATIONS BASE DE DONNÉES (Les logs demandés)
    console.log(`\n--- DÉBUT TRANSACTION ACHAT (${quantity} Action ${shareType}) ---`);
    
    // -> Update Player
    const newPoints = currentPlayer.nb_point - totalCost;
    console.log(`[DATABASE] UPDATE player SET 
        nb_point = ${newPoints}, 
        nb_share_${shareType} = ${newTotalQty}, 
        "avg_share_${shareType}_value" = ${newAvgPrice.toFixed(4)} 
        WHERE id = '${currentPlayer.id}';`);

    // -> Nouveau Snapshot
    console.log(`[DATABASE] INSERT INTO share ("value_share_A", "value_share_B", time_now, time_update) 
        VALUES (${priceA.toFixed(4)}, ${priceB.toFixed(4)}, to_timestamp(${transactionTime}), now());`);
    
    console.log(`--- FIN TRANSACTION ---\n`);

    // 6. Mettre à jour l'état local du client pour qu'il continue sans recharger la page
    currentPlayer.nb_point = newPoints;
    if (shareType === 'A') {
        currentPlayer.nb_share_A = newTotalQty;
        currentPlayer.avg_share_A_value = newAvgPrice;
    } else {
        currentPlayer.nb_share_B = newTotalQty;
        currentPlayer.avg_share_B_value = newAvgPrice;
    }

    lastSnapshot = {
        value_share_A: priceA,
        value_share_B: priceB,
        time_now: transactionTime
    };
}
