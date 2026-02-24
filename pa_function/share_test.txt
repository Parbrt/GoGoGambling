// Initialisation fictive
initGame();

setTimeout(() => {
    // 10 secondes plus tard, le joueur achète 5 actions A
    buyShare('A', 5);
}, 10000);

setTimeout(() => {
    // 25 secondes plus tard, le joueur achète 10 actions B
    buyShare('B', 10);
}, 25000);
