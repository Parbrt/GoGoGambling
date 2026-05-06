import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

interface PriceUpdate {
  priceA: number;
  priceB: number;
  timestamp: number;
}

interface JackpotUpdate {
  amount: number;
  timestamp: number;
}

interface JackpotWin {
  winner: string;
  amount: number;
  timestamp: number;
}

interface BabyFightWSMessage {
  fightId?: number;
  playerName?: string;
  amount?: number;
  betOn?: number;
  oddsA?: number;
  oddsB?: number;
  potA?: number;
  potB?: number;
  betCount?: number;
  [key: string]: unknown;
}

type WSCallback = {
  onPriceUpdate?: (data: PriceUpdate) => void;
  onJackpotUpdate?: (data: JackpotUpdate) => void;
  onJackpotWin?: (data: JackpotWin) => void;
  onBabyFight?: (type: string, data: BabyFightWSMessage) => void;
};

// Singleton WebSocket manager
let globalWs: WebSocket | null = null;
let globalReconnectTimer: ReturnType<typeof setTimeout> | null = null;
const globalCallbacks = new Set<WSCallback>();

function connectWebSocket() {
  if (globalReconnectTimer) {
    clearTimeout(globalReconnectTimer);
    globalReconnectTimer = null;
  }

  supabase.auth.getSession().then(({ data }) => {
    const token = data.session?.access_token;
    if (!token) return;

    const wsUrl = (import.meta.env.VITE_API_URL || "").replace(/^http/, "ws");
    const url = `${wsUrl}/ws?token=${token}`;

    try {
      const ws = new WebSocket(url);
      globalWs = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          for (const cb of globalCallbacks) {
            switch (msg.type) {
              case "price_update":
                cb.onPriceUpdate?.(msg.data);
                break;
              case "jackpot_update":
                cb.onJackpotUpdate?.(msg.data);
                break;
              case "jackpot_win":
                cb.onJackpotWin?.(msg.data);
                break;
              case "baby_fight:bet":
              case "baby_fight:new":
              case "baby_fight:fight_start":
              case "baby_fight:result":
              case "baby_fight:state":
                cb.onBabyFight?.(msg.type, msg.data);
                break;
            }
          }
        } catch { /* ignore */ }
      };

      ws.onclose = () => {
        globalWs = null;
        globalReconnectTimer = setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = () => ws.close();
    } catch {
      globalReconnectTimer = setTimeout(connectWebSocket, 5000);
    }
  });
}

export function useWebSocket(callbacks: WSCallback = {}) {
  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  useEffect(() => {
    const proxy: WSCallback = {
      onPriceUpdate: (data) => callbacksRef.current.onPriceUpdate?.(data),
      onJackpotUpdate: (data) => callbacksRef.current.onJackpotUpdate?.(data),
      onJackpotWin: (data) => callbacksRef.current.onJackpotWin?.(data),
      onBabyFight: (type, data) => callbacksRef.current.onBabyFight?.(type, data),
    };

    globalCallbacks.add(proxy);

    if (!globalWs) {
      connectWebSocket();
    }

    return () => {
      globalCallbacks.delete(proxy);
    };
  }, []);
}
