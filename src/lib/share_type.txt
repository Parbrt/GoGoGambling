// --- TYPES ---
interface Player {
    id: string;
    player_name: string;
    nb_point: number;
    nb_debt: number;
    avg_share_A_value: number;
    nb_share_A: number;
    avg_share_B_value: number;
    nb_share_B: number;
}

interface ShareSnapshot {
    value_share_A: number;
    value_share_B: number;
    time_now: number; // Timestamp Unix en secondes
}

// État local du client
let currentPlayer: Player | null = null;
let lastSnapshot: ShareSnapshot | null = null;
