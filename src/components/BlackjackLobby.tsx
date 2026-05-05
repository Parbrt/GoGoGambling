import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { supabase } from "@/lib/supabase";
import { Users, ArrowRight } from "lucide-react";
import type { TableStatus } from "@/lib/blackjackGame";

interface TableInfo {
  id: number;
  status: TableStatus;
  playerCount: number;
  roundNumber: number;
  players: Array<{ name: string; seat: number }>;
}

interface BlackjackLobbyProps {
  onJoinTable: (tableId: number) => void;
  onSpectateTable: (tableId: number) => void;
}

function statusLabel(status: TableStatus): string {
  switch (status) {
    case "waiting": return "En attente";
    case "betting": return "Mises en cours";
    case "playing": return "En jeu";
    case "dealer_turn": return "Tour du croupier";
    case "results": return "Resultats";
    case "inter_round": return "Pause";
    default: return status;
  }
}

function statusColor(status: TableStatus): string {
  switch (status) {
    case "waiting": return "text-[#696969]";
    case "betting": return "text-[#F37338]";
    case "playing": return "text-green-500";
    case "dealer_turn": return "text-[#F37338]";
    case "results": return "text-[#CF4500]";
    case "inter_round": return "text-[#696969]";
    default: return "text-[#696969]";
  }
}

export function BlackjackLobby({ onJoinTable, onSpectateTable }: BlackjackLobbyProps) {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTables = async () => {
    try {
      const { data: rawTables } = await supabase
        .from("blackjack_tables")
        .select("*")
        .order("id");

      const tablesWithPlayers = await Promise.all(
        (rawTables || []).map(async (table) => {
          const { data: players } = await supabase
            .from("blackjack_table_players")
            .select("*")
            .eq("table_id", table.id);

          return {
            id: table.id,
            status: table.status as TableStatus,
            playerCount: (players || []).filter((p) => p.result !== "left").length,
            roundNumber: table.round_number,
            players: (players || [])
              .filter((p) => p.result !== "left")
              .map((p) => ({ name: p.player_name, seat: p.seat })),
          };
        })
      );

      setTables(tablesWithPlayers);
    } catch (err) {
      console.error("Error fetching tables:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();

    const channel = supabase
      .channel("blackjack-lobby")
      .on("postgres_changes", { event: "*", schema: "public", table: "blackjack_tables" }, () => {
        fetchTables();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "blackjack_table_players" }, () => {
        fetchTables();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-[#F3F0EE]">
      <div className="max-w-4xl w-full mx-auto px-4 py-8 flex-1 min-h-0 overflow-y-auto">
      {/* Header */}
      <div className="text-center mb-12 space-y-3">
        <span className="eyebrow">Blackjack</span>
        <h1 className="text-4xl md:text-5xl font-medium tracking-[-0.03em] text-[#141413] leading-[1.02]">
          Choisis ta
          <br />
          <span className="text-[#9A3A0A]">table.</span>
        </h1>
        <p className="text-[#555555] text-sm max-w-sm mx-auto">
          Jusqu'à 4 joueurs par table. Rejoins une partie en un clic, elle demarre automatiquement.
        </p>
      </div>

      {/* Tables grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-2 border-[#F37338] border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tables.map((table, i) => {
            const isFull = table.playerCount >= 4;
            const canJoin = !isFull && (table.status === "waiting" || table.status === "betting" || table.status === "inter_round");
            const canSpectate = table.playerCount > 0 && table.status !== "waiting";

            return (
              <motion.div
                key={table.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-[32px] border border-[#D1CDC7] shadow-[rgba(0,0,0,0.04)_0px_4px_24px_0px] p-6 flex flex-col"
              >
                {/* Table header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-[#141413] tracking-[-0.02em]">
                      Table {table.id}
                    </span>
                    <span className={`text-xs font-medium ${statusColor(table.status)}`}>
                      · {statusLabel(table.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {table.playerCount > 0 && table.status !== "waiting" && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F37338] opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#CF4500]" />
                      </span>
                    )}
                    {table.roundNumber > 0 && (
                      <span className="text-xs text-[#696969]">
                        Manche #{table.roundNumber}
                      </span>
                    )}
                  </div>
                </div>

                {/* Players */}
                <div className="flex-1 mb-4">
                  <div className="flex items-center gap-2 text-xs text-[#696969] mb-2">
                    <Users className="w-3.5 h-3.5" />
                    <span>
                      {table.playerCount}/4 joueurs
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {table.players.map((player) => (
                      <span
                        key={`${player.seat}-${player.name}`}
                        className="px-2.5 py-1 rounded-full bg-[#F3F0EE] text-[#141413] text-xs font-medium"
                      >
                        {player.name}
                      </span>
                    ))}
                    {table.playerCount === 0 && (
                      <span className="text-xs text-[#D1CDC7] italic">
                        Table vide
                      </span>
                    )}
                  </div>
                </div>

                {/* Action */}
                <div className="flex gap-2">
                  {canJoin && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onJoinTable(table.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full bg-[#141413] text-white text-sm font-bold hover:bg-[#2A2928] transition-colors"
                    >
                      {table.playerCount === 0 ? "Jouer" : "Rejoindre"}
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  )}
                  {canSpectate && !canJoin && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onSpectateTable(table.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full border border-[#D1CDC7] text-[#141413] text-sm font-bold hover:bg-[#F3F0EE] transition-colors"
                    >
                      Observer
                    </motion.button>
                  )}
                  {isFull && table.status !== "waiting" && (
                    <div className="flex-1 py-2.5 rounded-full bg-[#E8E4E0] text-[#696969] text-sm font-medium text-center">
                      Table pleine
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Rules */}
      <div className="mt-12 p-6 bg-white/60 rounded-[32px] border border-[#D1CDC7]">
        <h3 className="text-sm font-bold text-[#141413] mb-3">Regles du Blackjack</h3>
        <ul className="text-xs text-[#696969] space-y-1.5">
          <li>· Le but est d'approcher 21 sans le depasser</li>
          <li>· Les figures valent 10, l'As vaut 1 ou 11</li>
          <li>· Blackjack (21 en 2 cartes) paie 3:2</li>
          <li>· Le croupier tire jusqu'a 17</li>
          <li>· Temps de decision : 10 secondes par joueur</li>
          <li>· Mise minimum : 10 points</li>
        </ul>
      </div>
      </div>
    </div>
  );
}
