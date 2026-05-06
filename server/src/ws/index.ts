import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "node:http";
import type { Server } from "node:http";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { PriceUpdate } from "../types.js";

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabase) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
    supabase = createClient(url, key);
  }
  return supabase;
}

interface ConnectedClient {
  ws: WebSocket;
  userId: string;
}

const connectedClients = new Map<WebSocket, ConnectedClient>();

export function setupWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");

    if (!token) {
      ws.close(4001, "Token manquant");
      return;
    }

    getSupabase()
      .auth.getUser(token)
      .then(({ data, error }) => {
        if (error || !data.user) {
          ws.close(4002, "Token invalide");
          return;
        }

        const client: ConnectedClient = { ws, userId: data.user.id };
        connectedClients.set(ws, client);

        import("../engine/shareEngine.js").then(({ getCurrentPrices }) => {
          const prices = getCurrentPrices();
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "price_update", data: prices }));
          }
        });

        ws.on("close", () => {
          connectedClients.delete(ws);
        });

        ws.on("message", (raw) => {
          try {
            const msg = JSON.parse(raw.toString());
            if (msg.type === "ping") {
              ws.send(JSON.stringify({ type: "pong" }));
            } else if (msg.type === "baby_fight:get_state") {
              import("../engine/babyFightEngine.js").then(({ getCurrentFight }) => {
                const state = getCurrentFight();
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: "baby_fight:state", data: state }));
                }
              });
            }
          } catch {
            // Ignore invalid messages
          }
        });
      })
      .catch(() => {
        ws.close(4002, "Erreur d'authentification");
      });
  });

  return wss;
}

export function broadcastPriceUpdate(update: PriceUpdate): void {
  const message = JSON.stringify({ type: "price_update", data: update });
  for (const [, client] of connectedClients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  }
}

export function broadcastJackpotWin(winner: string, amount: number): void {
  const message = JSON.stringify({
    type: "jackpot_win",
    data: { winner, amount, timestamp: Date.now() },
  });
  for (const [, client] of connectedClients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  }
}

export function broadcastBabyFight(type: string, data: unknown): void {
  const message = JSON.stringify({ type, data });
  for (const [, client] of connectedClients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  }
}
