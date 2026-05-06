import { useEffect, useState, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { getRankInfo } from "@/lib/ranks";
import { PlayerCard } from "@/components/PlayerCard";
import type { PlayerType } from "@/types";

const POLL_INTERVAL = 10000;

function useLeaderboardData() {
  const [players, setPlayers] = useState<PlayerType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previousRef = useRef<string>("");
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    try {
      const data = await api.leaderboard.list();
      if (!mountedRef.current) return;
      const key = JSON.stringify(data);
      if (key !== previousRef.current) {
        previousRef.current = key;
        setPlayers(data);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setError("Erreur lors du chargement du classement");
      console.error(err);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    let ignore = false;
    const doInitialLoad = async () => {
      await load();
      if (!ignore) setLoading(false);
    };
    doInitialLoad();
    const id = setInterval(load, POLL_INTERVAL);
    return () => {
      ignore = true;
      clearInterval(id);
    };
  }, [load]);

  return { players, loading, error };
}

export function Leaderboard() {
  const { players, loading, error } = useLeaderboardData();
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-24">
        <div className="flex justify-center items-center h-48">
          <Loader2 className="h-10 w-10 animate-spin text-[#141413]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-24">
        <div className="rounded-[40px] border border-[#CF4500]/30 p-8 text-[#CF4500]">{error}</div>
      </div>
    );
  }

  const podium = players.slice(0, 3);
  const rest = players.slice(3);

  return (
    <>
    {selectedPlayerId !== null && (
      <PlayerCard playerId={selectedPlayerId} onClose={() => setSelectedPlayerId(null)} />
    )}
    <div className="relative max-w-5xl mx-auto px-6 py-16 md:py-24 space-y-20">
      <section className="relative">
        <div aria-hidden className="ghost-headline absolute -top-6 -right-2 text-[120px] md:text-[180px] select-none">rank.</div>
        <div className="relative pt-12 md:pt-20 space-y-3">
          <span className="eyebrow">Classement</span>
          <h1 className="text-5xl md:text-6xl font-medium tracking-[-0.03em] text-[#141413] leading-[1.02]">Les meilleurs<br /><span className="text-[#9A3A0A]">a la barre.</span></h1>
          <p className="text-[#555555] text-base md:text-lg max-w-md leading-relaxed pt-2">{players.length} joueur{players.length > 1 ? "s" : ""} classe{players.length > 1 ? "s" : ""} par leur magot. Mise a jour en temps reel.</p>
        </div>
      </section>

      {podium.length > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {podium.map((p, i) => <PodiumCard key={p.id} player={p} rank={i + 1} onNameClick={() => setSelectedPlayerId(p.id)} />)}
        </section>
      )}

      {rest.length > 0 && (
        <section className="space-y-6">
          <span className="eyebrow">Suivants</span>
          <div className="rounded-[40px] border border-[#D1CDC7] bg-[#FCFBFA] divide-y divide-[#D1CDC7] overflow-hidden halo-soft">
            {rest.map((p, i) => {
              const rankInfo = getRankInfo(p.peak_net_worth ?? 0);
              return (
              <div key={p.id} className="flex items-center justify-between px-6 md:px-8 py-5 hover:bg-[#F3F0EE] transition-colors">
                <div className="flex items-center gap-5 min-w-0">
                  <span className="text-2xl font-medium tracking-[-0.03em] text-[#696969] tabular-nums w-10">#{i + 4}</span>
                  <div className="flex flex-col items-center shrink-0">
                    {!!p.is_online && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 mb-1 rounded-[999px] bg-[#F37338]/10 text-[#F37338] text-[10px] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F37338] live-dot" />En ligne
                      </span>
                    )}
                    <div className="w-11 h-11 rounded-full bg-[#141413] text-[#F3F0EE] flex items-center justify-center font-medium overflow-hidden">
                      {p.profile_photo ? (
                        <img src={p.profile_photo} alt={p.player_name} className="w-full h-full object-cover" />
                      ) : (
                        p.player_name.charAt(0).toUpperCase()
                      )}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <button
                      onClick={() => setSelectedPlayerId(p.id)}
                      className="font-medium text-[#141413] tracking-[-0.02em] truncate hover:text-[#9A3A0A] transition-colors cursor-pointer"
                    >
                      {p.player_name}
                    </button>
                    <p className="text-[11px] text-[#696969] tracking-[-0.01em]">{rankInfo.title} — Niv.{rankInfo.level}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {p.nb_share_A > 0 && <span className="inline-flex text-xs font-medium text-[#3860BE] bg-white border border-[#3860BE]/30 rounded-[999px] px-3 py-1 tracking-[-0.02em]">{p.nb_share_A} GCC</span>}
                  {p.nb_share_B > 0 && <span className="inline-flex text-xs font-medium text-[#9A3A0A] bg-white border border-[#9A3A0A]/30 rounded-[999px] px-3 py-1 tracking-[-0.02em]">{p.nb_share_B} GC</span>}
                  <span className="text-xl font-medium text-[#141413] tracking-[-0.03em] tabular-nums">{p.nb_point.toLocaleString()}</span>
                  <span className="text-xs uppercase tracking-[0.08em] text-[#696969] hidden sm:inline">pts</span>
                </div>
              </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
    </>);
}

function PodiumCard({ player, rank, onNameClick }: { player: PlayerType; rank: number; onNameClick: () => void }) {
  const tones = [
    { gradient: "linear-gradient(135deg, #F4E1C9 0%, #CF4500 100%)", label: "Or" },
    { gradient: "linear-gradient(135deg, #E5DCD2 0%, #9A3A0A 100%)", label: "Argent" },
    { gradient: "linear-gradient(135deg, #FCE3CC 0%, #F37338 100%)", label: "Bronze" },
  ];
  const tone = tones[rank - 1];
  const offset = rank === 1 ? "" : rank === 2 ? "md:translate-y-8" : "md:translate-y-4";
  const rankInfo = getRankInfo(player.peak_net_worth ?? 0);

  return (
    <div className={`relative ${offset}`}>
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[999px] bg-white text-[#141413] text-[11px] font-bold tracking-[0.08em] uppercase shadow-sm">{tone.label}</span>
        {!!player.is_online && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[999px] bg-white text-[#141413] text-[11px] font-medium shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F37338] live-dot" />En ligne
          </span>
        )}
      </div>
      <div className="portrait-circle relative mx-auto max-w-[260px] overflow-hidden">
        <div className="absolute inset-0" style={{ background: tone.gradient }} />
        {player.profile_photo ? (
          <img
            src={player.profile_photo}
            alt={player.player_name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[120px] font-medium text-white/95 tracking-[-0.04em]">{player.player_name.charAt(0).toUpperCase()}</span>
          </div>
        )}
      </div>
      <div className="mt-6 text-center space-y-2 max-w-[260px] mx-auto">
        <span className="eyebrow justify-center">Rang #{rank}</span>
        <button
          onClick={onNameClick}
          className="text-2xl font-medium tracking-[-0.02em] text-[#141413] truncate hover:text-[#9A3A0A] transition-colors cursor-pointer block w-full"
        >
          {player.player_name}
        </button>
        <p className="text-xs text-[#696969] tracking-[-0.01em]">{rankInfo.title} — Niv.{rankInfo.level}</p>
        {(player.nb_share_A > 0 || player.nb_share_B > 0) && (
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {player.nb_share_A > 0 && <span className="inline-flex text-[10px] font-medium text-[#3860BE] bg-white border border-[#3860BE]/30 rounded-[999px] px-2.5 py-0.5 tracking-[-0.02em]">{player.nb_share_A} GCC</span>}
            {player.nb_share_B > 0 && <span className="inline-flex text-[10px] font-medium text-[#9A3A0A] bg-white border border-[#9A3A0A]/30 rounded-[999px] px-2.5 py-0.5 tracking-[-0.02em]">{player.nb_share_B} GC</span>}
          </div>
        )}
        <p className="text-3xl font-medium tracking-[-0.03em] text-[#9A3A0A] tabular-nums">{player.nb_point.toLocaleString()}<span className="text-sm text-[#696969] tracking-[0.08em] uppercase ml-2 align-middle">pts</span></p>
      </div>
    </div>
  );
}
