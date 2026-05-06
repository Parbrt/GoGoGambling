import { supabase } from "./supabase";
import { cacheGet, cacheSet, cacheHas, cacheIsFresh } from "./cache";

const BASE_URL = import.meta.env.VITE_API_URL || "";

let tokenRefreshPromise: Promise<string | null> | null = null;

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;

  const expiresAt = data.session.expires_at;
  const now = Math.floor(Date.now() / 1000);
  const refreshThreshold = 5 * 60; // 5 minutes before expiry

  if (expiresAt && expiresAt - now < refreshThreshold) {
    if (tokenRefreshPromise) {
      return tokenRefreshPromise;
    }
    tokenRefreshPromise = supabase.auth.refreshSession().then(({ data: refreshed }) => {
      return refreshed.session?.access_token ?? data.session!.access_token;
    }).finally(() => {
      tokenRefreshPromise = null;
    });
    return tokenRefreshPromise;
  }

  return data.session.access_token;
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

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const controller = new AbortController();

  const doRequest = async (forceFresh = false): Promise<T> => {
    const token = forceFresh
      ? await supabase.auth.refreshSession().then(({ data }) => data.session?.access_token ?? null).catch(() => null)
      : await getToken();
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

    if (res.status === 401 && retry && !forceFresh) {
      return doRequest(true);
    }

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

// Returns cached data instantly if available, triggers background refresh when stale
function cachedGet<T>(path: string, ttl: number): Promise<T> {
  if (cacheHas(path)) {
    const cached = cacheGet<T>(path)!;
    if (!cacheIsFresh(path)) {
      get<T>(path).then(fresh => cacheSet(path, fresh, ttl)).catch(() => {});
    }
    return Promise.resolve(cached);
  }
  return get<T>(path).then(data => {
    cacheSet(path, data, ttl);
    return data;
  });
}

// --- Player API ---
import type { PlayerType, LotoHistoryEntry, LotoPlayResult } from "@/types";

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
    current: () => cachedGet<{ priceA: number; priceB: number; timestamp: number }>("/api/shares/current", 15_000),
    history: (limit = 50) => cachedGet<Array<{
      id: number; value_share_A: number; value_share_B: number; time_now: number; time_update: string;
    }>>(`/api/shares/history?limit=${limit}`, 60_000),
    buy: (shareType: "A" | "B", quantity: number) =>
      post<{ player: PlayerType; prices: { priceA: number; priceB: number }; cost: number; fee: number }>(
        "/api/shares/buy", { shareType, quantity }
      ),
    sell: (shareType: "A" | "B", quantity: number) =>
      post<{ player: PlayerType; prices: { priceA: number; priceB: number }; revenue: number }>(
        "/api/shares/sell", { shareType, quantity }
      ),
    stats: () => get<{
      dailyHighA: number | null; dailyLowA: number | null;
      dailyHighB: number | null; dailyLowB: number | null;
      athA: number; atlA: number; athB: number; atlB: number;
    }>("/api/shares/stats"),
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
        chicken_charges: number;
        next_charge_in_ms: number;
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
    list: () => cachedGet<PlayerType[]>("/api/leaderboard", 15_000),
  },

  loto: {
    tickets: () =>
      get<{ tickets: number; canClaim: boolean }>("/api/loto/tickets"),
    claimTicket: () =>
      post<{ tickets: number; canClaim: boolean }>("/api/loto/claim-ticket"),
    play: () => post<LotoPlayResult>("/api/loto/play"),
    history: () => get<LotoHistoryEntry[]>("/api/loto/history"),
    // v2
    status: () =>
      get<import("@/types").LotoStatusResponse>("/api/loto/status"),
    buy: () =>
      post<{ tickets: import("@/types").LotoTicket[]; ticketCount: number; player: PlayerType }>("/api/loto/buy"),
    claimFreeTicket: () =>
      post<{ tickets: import("@/types").LotoTicket[]; ticketCount: number; canClaim: boolean }>("/api/loto/claim-ticket"),
    draws: () =>
      get<import("@/types").LotoDraw[]>("/api/loto/draws"),
    drawByDate: (date: string) =>
      get<{ draw: import("@/types").LotoDraw; tickets: import("@/types").LotoTicket[] }>(`/api/loto/draws/${date}`),
  },

  shop: {
    catalog: () => cachedGet<Array<{
      id: number;
      name: string;
      category: string;
      rarity: string;
      base_value: number;
      qualifyable: number;
      emoji: string;
      description: string;
    }>>("/api/shop/catalog", 300_000),
    boxes: () => cachedGet<{
      boxes: Array<{
        key: string;
        name: string;
        cost: number;
        emoji: string;
        description: string;
        probabilities: Record<string, number>;
      }>;
      rarities: Record<string, {
        key: string;
        label: string;
        color: string;
      }>;
    }>("/api/shop/boxes", 300_000),
    openBox: (boxType: string) =>
      post<{
        item: {
          id: number;
          name: string;
          category: string;
          rarity: string;
          base_value: number;
          emoji: string;
          description: string;
          qualifyable: number;
        };
        rolledRarity: string;
        rarityColor: string;
        player: PlayerType;
      }>("/api/shop/open-box", { boxType }),
    inventory: () => get<Array<{
      id: number;
      user_id: string;
      item_id: number;
      quantity: number;
      star_level: number;
      acquired_at: string;
      name: string;
      category: string;
      rarity: string;
      base_value: number;
      qualifyable: number;
      emoji: string;
      description: string;
    }>>("/api/shop/inventory"),
    equip: (inventoryId: number | null, slot: "title" | "object") =>
      post<{
        id: number;
        user_id: string;
        equipped_title_inventory_id: number | null;
        equipped_object_inventory_id: number | null;
      }>("/api/shop/equip", { inventoryId, slot }),
    equipped: (userId?: string) =>
      get<{
        equipped_title: Record<string, unknown> | null;
        equipped_object: Record<string, unknown> | null;
      }>(`/api/shop/equipped${userId ? `/${userId}` : ""}`),
    fuse: (inventoryId: number) =>
      post<{ success: boolean; item_name: string; new_star_level: number; base_value: number }>(
        "/api/shop/fuse",
        { inventoryId }
      ),
    boxHistory: () => get<Array<Record<string, unknown>>>("/api/shop/box-history"),
    dailyFreeBox: () =>
      post<{
        item: Record<string, unknown>;
        rolledRarity: string;
        rarityColor: string;
        player: PlayerType;
        free: boolean;
      }>("/api/shop/daily-free-box"),
    useConsumable: (inventoryId: number) =>
      post<{
        success: boolean;
        effect: string;
        player: PlayerType;
        item_name: string;
      }>("/api/shop/use-consumable", { inventoryId }),
    dailyDeals: () =>
      get<{
        deals: Array<{
          id: number;
          deal_date: string;
          slot: number;
          item_id: number;
          price: number;
          name: string;
          category: string;
          rarity: string;
          base_value: number;
          emoji: string;
          description: string;
          purchased: boolean;
        }>;
        nextRefreshMs: number;
      }>("/api/shop/daily-deals"),
    buyDailyDeal: (dealId: number) =>
      post<{
        success: boolean;
        player: PlayerType;
        deal: { id: number; name: string; price: number; emoji: string; rarity: string };
      }>("/api/shop/buy-daily-deal", { dealId }),
    marketplace: {
      list: (inventoryId: number, quantity: number, price: number) =>
        post<{ success: boolean; listingId: number }>("/api/shop/marketplace/list", {
          inventoryId,
          quantity,
          price,
        }),
      listings: () =>
        get<
          Array<{
            id: number;
            seller_user_id: string;
            inventory_id: number;
            item_id: number;
            star_level: number;
            quantity: number;
            price: number;
            created_at: string;
            seller_name: string;
            item_name: string;
            item_rarity: string;
            item_emoji: string;
            item_category: string;
          }>
        >("/api/shop/marketplace/listings"),
      buy: (listingId: number) =>
        post<{ success: boolean; price: number }>("/api/shop/marketplace/buy", { listingId }),
      cancel: (listingId: number) =>
        post<{ success: boolean }>("/api/shop/marketplace/cancel", { listingId }),
      transactions: () =>
        get<Array<Record<string, unknown>>>("/api/shop/marketplace/transactions"),
    },
  },
};
