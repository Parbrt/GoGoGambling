import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { api } from "@/lib/api";
import { getRankInfo } from "@/lib/ranks";
import type { PlayerType } from "@/types";
import type { RankInfo } from "@/lib/ranks";

interface PlayerCardProps {
  playerId: number;
  onClose: () => void;
}

export function PlayerCard({ playerId, onClose }: PlayerCardProps) {
  const [player, setPlayer] = useState<PlayerType | null>(null);
  const [rank, setRank] = useState<RankInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api.player.getById(playerId);
      setPlayer(data);
      setRank(getRankInfo(data.peak_net_worth));
    } catch (err) {
      console.error("[PlayerCard] Erreur chargement:", err);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div
        className="absolute inset-0 bg-[#141413]/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm bg-[#FCFBFA] rounded-[40px] border border-[#D1CDC7] halo-soft p-8 space-y-6">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 rounded-full flex items-center justify-center bg-[#F3F0EE] hover:bg-[#E8E4E0] transition-colors"
          aria-label="Fermer"
        >
          <X className="w-4 h-4 text-[#696969]" />
        </button>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-[#141413] border-t-transparent animate-spin" />
          </div>
        ) : player && rank ? (
          <div className="flex flex-col items-center text-center space-y-5">
            <div className="w-24 h-24 rounded-full bg-[#141413] text-[#F3F0EE] flex items-center justify-center font-medium text-4xl overflow-hidden halo">
              {player.profile_photo ? (
                <img
                  src={player.profile_photo}
                  alt={player.player_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                player.player_name.charAt(0).toUpperCase()
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-xl font-medium tracking-[-0.02em] text-[#141413]">
                {player.player_name}
              </p>
              <p className="text-sm font-medium text-[#9A3A0A]">
                {rank.title} — Niveau {rank.level}
              </p>
            </div>

            <p className="text-sm text-[#696969] leading-relaxed max-w-xs">
              {rank.description}
            </p>

            <div className="w-full space-y-2">
              <div className="flex items-baseline justify-between text-xs text-[#696969] tabular-nums">
                <span>Progression</span>
                <span>
                  {player.peak_net_worth.toLocaleString()}
                  {rank.nextThreshold !== null && ` / ${rank.nextThreshold.toLocaleString()}`}
                </span>
              </div>
              <div className="relative w-full h-2 bg-[#E8E4E0] rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${rank.progress * 100}%`,
                    background: "linear-gradient(90deg, #CF4500, #F37338)",
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1">
              {player.is_online && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[999px] bg-[#F37338]/10 text-[#F37338] text-[10px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F37338] live-dot" />
                  En ligne
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-center text-[#696969] py-8">Joueur introuvable</p>
        )}
      </div>
    </div>
  );
}
