import { supabase } from "./supabase";

const BASE_URL = import.meta.env.VITE_API_URL || "";

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function timeout<T>(ms: number, promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new DOMException("Request timed out", "TimeoutError")), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();

  const doRequest = async (): Promise<T> => {
    const token = await getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> || {}),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }

    return res.json();
  };

  try {
    return await timeout(15000, doRequest());
  } finally {
    controller.abort();
  }
}

function get<T>(path: string): Promise<T> {
  return request<T>(path);
}

function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

// --- Player API ---
import type { PlayerType } from "@/types";

export const api = {
  player: {
    me: () => get<PlayerType>("/api/player/me"),
    checkUsername: (username: string) =>
      get<{ exists: boolean }>(`/api/player/check-username/${encodeURIComponent(username)}`),
    create: (userId: string, playerName: string) =>
      post<PlayerType>("/api/player/create", { userId, playerName }),
    setOnline: () => post<{ ok: boolean }>("/api/player/online"),
    setOffline: () => post<{ ok: boolean }>("/api/player/offline"),
    heartbeat: () => post<{ ok: boolean }>("/api/player/heartbeat"),
    updatePoints: (points: number) =>
      post<PlayerType>("/api/player/update-points", { points }),
    update: (data: Partial<PlayerType>) =>
      post<PlayerType>("/api/player/update", data),
    dailyReward: () => post<PlayerType>("/api/player/daily-reward"),
    updateProfilePhoto: (photo: string | null) =>
      post<PlayerType>("/api/player/profile-photo", { photo }),
    getById: (id: number) =>
      get<PlayerType>(`/api/player/${id}`),
  },

  shares: {
    current: () => get<{ priceA: number; priceB: number; timestamp: number }>("/api/shares/current"),
    history: (limit = 50) => get<Array<{
      id: number; value_share_A: number; value_share_B: number; time_now: number; time_update: string;
    }>>(`/api/shares/history?limit=${limit}`),
    buy: (shareType: "A" | "B", quantity: number) =>
      post<{ player: PlayerType; prices: { priceA: number; priceB: number }; cost: number; fee: number }>(
        "/api/shares/buy", { shareType, quantity }
      ),
    sell: (shareType: "A" | "B", quantity: number) =>
      post<{ player: PlayerType; prices: { priceA: number; priceB: number }; revenue: number }>(
        "/api/shares/sell", { shareType, quantity }
      ),
  },

  games: {
    slotSpin: (bet: number) =>
      post<{
        player: PlayerType;
        numbers: number[];
        reward: number;
        winType: "similar" | "sequence" | "none";
        message: string;
        jackpot: number;
      }>("/api/games/slot/spin", { bet }),
    slotJackpot: () => get<{ jackpot: number }>("/api/games/slot/jackpot"),
    rouletteSpin: (bet: number, choiceType: "odd-even" | "number", choiceValue: number) =>
      post<{
        player: PlayerType;
        winningNumber: number;
        winnings: number;
        isWin: boolean;
      }>("/api/games/roulette/spin", { bet, choiceType, choiceValue }),
    chickenFight: (bet: number, selectedChicken: 1 | 2, chickenA?: number[], chickenB?: number[]) =>
      post<{
        player: PlayerType;
        chickenA: number[];
        chickenB: number[];
        fightResult: {
          winner: 1 | 2;
          stats: [number, number, number];
          statNames: [string, string, string];
          scores: { a: number; b: number };
          weights: [number, number, number];
          chickenAValues: [number, number, number];
          chickenBValues: [number, number, number];
        };
        odds: { betA: number; betB: number; oddsA: number; oddsB: number };
        isWin: boolean;
        winnings: number;
        population: [number, number][];
      }>("/api/games/chicken/fight", { bet, selectedChicken, chickenA, chickenB }),
    babyFight: {
      state: () =>
        get<{
          fight: {
            id: number;
            babyA: { name: string; stats: number[] };
            babyB: { name: string; stats: number[] };
            scheduledAt: string;
            status: string;
            winner: number | null;
            totalPotA: number;
            totalPotB: number;
            oddsA: number;
            oddsB: number;
            betCount: number;
            resolvedAt: string | null;
          } | null;
          bets: Array<{ playerName: string; amount: number; betOn: number }>;
          timeRemaining: number;
        }>("/api/games/baby-fight/state"),
      bet: (fightId: number, betOn: 1 | 2, amount: number) =>
        post<{
          player: PlayerType;
          oddsA: number;
          oddsB: number;
          potA: number;
          potB: number;
        }>("/api/games/baby-fight/bet", { fightId, betOn, amount }),
      history: (limit = 5) =>
        get<{
          fights: Array<{
            id: number;
            babyA: { name: string; stats: number[] };
            babyB: { name: string; stats: number[] };
            scheduledAt: string;
            status: string;
            winner: number | null;
            totalPotA: number;
            totalPotB: number;
            oddsA: number;
            oddsB: number;
            betCount: number;
            resolvedAt: string | null;
            bets: Array<{
              playerName: string;
              amount: number;
              betOn: number;
              won: boolean;
              winnings: number;
            }>;
          }>;
        }>(`/api/games/baby-fight/history?limit=${limit}`),
      historyDetail: (id: number) =>
        get<{
          fight: {
            id: number;
            babyA: { name: string; stats: number[] };
            babyB: { name: string; stats: number[] };
            scheduledAt: string;
            status: string;
            winner: number | null;
            totalPotA: number;
            totalPotB: number;
            oddsA: number;
            oddsB: number;
            betCount: number;
            resolvedAt: string | null;
            bets: Array<{
              playerName: string;
              amount: number;
              betOn: number;
              oddsAtBet: number;
              won: boolean;
              winnings: number;
            }>;
          };
        }>(`/api/games/baby-fight/history/${id}`),
    },
  },

  leaderboard: {
    list: () => get<PlayerType[]>("/api/leaderboard"),
  },
};
