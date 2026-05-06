import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { cacheGet, cacheHas } from "@/lib/cache";
import { getRankInfo } from "@/lib/ranks";
import { PlayerCard } from "@/components/PlayerCard";
import type { PlayerType } from "@/types";

interface LeaderboardPlayer extends PlayerType {
  equipped_title_name: string | null;
  equipped_title_rarity: string | null;
  equipped_title_emoji: string | null;
  equipped_object_name: string | null;
  equipped_object_rarity: string | null;
  equipped_object_emoji: string | null;
}

const RARITY_TEXT: Record<string, string> = {
  unique: "text-yellow-400",
  exotic: "text-red-500",
  mythic: "text-fuchsia-500",
  legendary: "text-orange-500",
  epic: "text-purple-500",
  rare: "text-blue-500",
  common: "text-gray-400",
};

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const POLL_INTERVAL = 10000;

function useLeaderboardData() {
  const [players, setPlayers] = useState<LeaderboardPlayer[]>(() =>
    cacheGet<LeaderboardPlayer[]>("/api/leaderboard") ?? []
  );
  const [loading, setLoading] = useState(() => !cacheHas("/api/leaderboard"));
  const [error, setError] = useState<string | null>(null);
  const previousRef = useRef<string>("");
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    try {
      const data = await api.leaderboard.list() as LeaderboardPlayer[];
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
    let active = true;
    const initialLoad = async () => {
      await load();
      if (active) setLoading(false);
    };
    initialLoad();
    const id = setInterval(load, POLL_INTERVAL);
    return () => {
      active = false;
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
            <h1 className="text-5xl md:text-6xl font-medium tracking-[-0.03em] text-[#141413] leading-[1.02]">
              Les meilleurs<br /><span className="text-[#9A3A0A]">a la barre.</span>
            </h1>
            <p className="text-[#555555] text-base md:text-lg max-w-md leading-relaxed pt-2">
              {players.length} joueur{players.length > 1 ? "s" : ""} classe{players.length > 1 ? "s" : ""} par leur magot. Mise a jour en temps reel.
            </p>
          </div>
        </section>

        {podium.length > 0 && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 pt-8">
            {podium.map((p, i) => (
              <PodiumCard
                key={p.id}
                player={p}
                rank={i + 1}
                onNameClick={() => setSelectedPlayerId(p.id)}
              />
            ))}
          </section>
        )}

        {rest.length > 0 && (
          <section className="space-y-6">
            <span className="eyebrow">Suivants</span>
            <div className="rounded-[40px] border border-[#D1CDC7] bg-[#FCFBFA] divide-y divide-[#D1CDC7] overflow-hidden halo-soft">
              {rest.map((p, i) => {
                const rankInfo = getRankInfo(p.peak_net_worth ?? 0);
                const rowDelay = i * 0.04;
                return (
                  <motion.div
                    key={p.id}
                    className="flex items-center justify-between px-6 md:px-8 py-5 hover:bg-[#F3F0EE] transition-colors"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: rowDelay, duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
                  >
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
                          className="block font-medium text-[#141413] tracking-[-0.02em] truncate hover:text-[#9A3A0A] transition-colors cursor-pointer text-left"
                        >
                          {p.player_name}
                        </button>
                        <div className="flex flex-col items-start gap-0.5 mt-1">
                          {p.equipped_title_name && (
                            <motion.div
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: rowDelay + 0.15, duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
                            >
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[999px] bg-white border border-[#D1CDC7]/50 text-[10px] font-bold uppercase tracking-[0.03em] max-w-[140px] truncate ${RARITY_TEXT[p.equipped_title_rarity || ""] || "text-gray-400"}`}
                                title={p.equipped_title_name}
                              >
                                {p.equipped_title_emoji && <span className="text-sm leading-none">{p.equipped_title_emoji}</span>}
                                {p.equipped_title_name}
                              </span>
                            </motion.div>
                          )}
                          {p.equipped_object_emoji && (
                            <motion.div
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: rowDelay + 0.25, duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
                            >
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[999px] bg-white border border-[#D1CDC7]/50 text-[10px] font-medium text-[#141413] tracking-[-0.01em] max-w-[140px] truncate"
                                title={p.equipped_object_name ?? ""}
                              >
                                <span className="text-sm leading-none">{p.equipped_object_emoji}</span>
                                {p.equipped_object_name}
                              </span>
                            </motion.div>
                          )}
                          <p className="text-[11px] text-[#696969] tracking-[-0.01em]">{rankInfo.title} — Niv.{rankInfo.level}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {p.nb_share_A > 0 && <span className="inline-flex text-xs font-medium text-[#3860BE] bg-white border border-[#3860BE]/30 rounded-[999px] px-3 py-1 tracking-[-0.02em]">{p.nb_share_A} GCC</span>}
                      {p.nb_share_B > 0 && <span className="inline-flex text-xs font-medium text-[#9A3A0A] bg-white border border-[#9A3A0A]/30 rounded-[999px] px-3 py-1 tracking-[-0.02em]">{p.nb_share_B} GC</span>}
                      <span className="text-xl font-medium text-[#141413] tracking-[-0.03em] tabular-nums">{p.nb_point.toLocaleString()}</span>
                      <span className="text-xs uppercase tracking-[0.08em] text-[#696969] hidden sm:inline">pts</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function SatelliteBadge({
  emoji,
  name,
  rarity,
  type,
}: {
  emoji: string;
  name: string;
  rarity: string | null;
  type: "title" | "object";
}) {
  const color = type === "title" ? (RARITY_TEXT[rarity || ""] || "text-gray-400") : "text-[#141413]";
  return (
    <motion.div
      className="flex items-center gap-1 px-2.5 py-1 rounded-[999px] shadow-md border border-[#D1CDC7]/50 bg-white cursor-default"
      title={name}
      whileHover={{ scale: 1.06 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      <span className="text-sm leading-none">{emoji}</span>
      <span className={`text-[10px] font-bold uppercase tracking-[0.03em] ${color}`}>{name}</span>
    </motion.div>
  );
}

function PodiumCard({
  player,
  rank,
  onNameClick,
}: {
  player: LeaderboardPlayer;
  rank: number;
  onNameClick: () => void;
}) {
  const tones = [
    { gradient: "linear-gradient(135deg, #F4E1C9 0%, #CF4500 100%)", label: "Or" },
    { gradient: "linear-gradient(135deg, #E5DCD2 0%, #9A3A0A 100%)", label: "Argent" },
    { gradient: "linear-gradient(135deg, #FCE3CC 0%, #F37338 100%)", label: "Bronze" },
  ];
  const tone = tones[rank - 1];
  const offset = rank === 1 ? "" : rank === 2 ? "md:translate-y-8" : "md:translate-y-4";
  const rankInfo = getRankInfo(player.peak_net_worth ?? 0);

  const hasTitle = !!player.equipped_title_emoji && !!player.equipped_title_name;
  const hasObject = !!player.equipped_object_emoji && !!player.equipped_object_name;

  // Base delay staggered by rank order: 0 / 120 / 240ms
  const delay = (rank - 1) * 0.12;

  return (
    <div className={`relative ${offset}`}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.55, ease: EASE_OUT_EXPO }}
      >
        {/* Title replaces rank label, or falls back to Or/Argent/Bronze */}
        <motion.div
          className="flex items-center justify-center mb-3"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + 0.2, duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
        >
          {hasTitle ? (
            <SatelliteBadge
              emoji={player.equipped_title_emoji!}
              name={player.equipped_title_name!}
              rarity={player.equipped_title_rarity}
              type="title"
            />
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[999px] bg-white text-[#141413] text-[11px] font-bold tracking-[0.08em] uppercase shadow-sm">
              {tone.label}
            </span>
          )}
        </motion.div>

        {/*
          Portrait orbit zone.
          No overflow:hidden here — satellites must escape the container bounds.
          The visual circle is created by the gradient ring + rounded photo inside.
          Extra bottom margin accounts for the object satellite extending below.
        */}
        <div
          className="relative mx-auto max-w-[260px]"
          style={{ aspectRatio: "1 / 1", marginBottom: hasObject ? "44px" : "0" }}
        >
          {/* Gradient ring — 4px outside the container on each side */}
          <div
            className="absolute inset-[-4px] rounded-full"
            style={{
              background: tone.gradient,
              boxShadow: "rgba(0,0,0,0.08) 0px 24px 48px 0px",
            }}
          />

          {/* Photo — clipped to circle */}
          {player.profile_photo ? (
            <motion.img
              src={player.profile_photo}
              alt={player.player_name}
              className="absolute inset-[4px] w-[calc(100%-8px)] h-[calc(100%-8px)] rounded-full object-cover"
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: delay + 0.08, duration: 0.5, ease: EASE_OUT_EXPO }}
            />
          ) : (
            <motion.div
              className="absolute inset-[4px] w-[calc(100%-8px)] h-[calc(100%-8px)] rounded-full overflow-hidden bg-[#141413] flex items-center justify-center"
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: delay + 0.08, duration: 0.5, ease: EASE_OUT_EXPO }}
            >
              <span className="text-[120px] font-medium text-white/95 tracking-[-0.04em]">
                {player.player_name.charAt(0).toUpperCase()}
              </span>
            </motion.div>
          )}

          {/* En ligne — bottom-right of portrait, floats above the circle edge */}
          {!!player.is_online && (
            <div className="absolute z-20" style={{ bottom: "10%", right: "-4px" }}>
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: delay + 0.3, type: "spring", stiffness: 360, damping: 24 }}
              >
                <motion.span
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[999px] bg-white text-[#141413] text-[11px] font-medium shadow-md border border-[#D1CDC7]/50"
                  animate={{ y: [0, -3, 0] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F37338] live-dot" />En ligne
                </motion.span>
              </motion.div>
            </div>
          )}

          {/* Object satellite — bottom-center, docked below circle */}
          {hasObject && (
            <div
              className="absolute z-10"
              style={{ bottom: 0, left: "50%", transform: "translate(-50%, 50%)" }}
            >
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: delay + 0.52,
                  type: "spring",
                  stiffness: 360,
                  damping: 24,
                }}
              >
                <SatelliteBadge
                  emoji={player.equipped_object_emoji!}
                  name={player.equipped_object_name!}
                  rarity={null}
                  type="object"
                />
              </motion.div>
            </div>
          )}
        </div>

        {/* Player info */}
        <div className="mt-6 text-center space-y-2 max-w-[260px] mx-auto">
          <span className="eyebrow justify-center">Rang #{rank}</span>
          <button
            onClick={onNameClick}
            className="block text-2xl font-medium tracking-[-0.02em] text-[#141413] truncate hover:text-[#9A3A0A] transition-colors cursor-pointer mx-auto"
          >
            {player.player_name}
          </button>
          <p className="text-xs text-[#696969] tracking-[-0.01em]">{rankInfo.title} — Niv.{rankInfo.level}</p>
          {(player.nb_share_A > 0 || player.nb_share_B > 0) && (
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {player.nb_share_A > 0 && (
                <span className="inline-flex text-[10px] font-medium text-[#3860BE] bg-white border border-[#3860BE]/30 rounded-[999px] px-2.5 py-0.5 tracking-[-0.02em]">
                  {player.nb_share_A} GCC
                </span>
              )}
              {player.nb_share_B > 0 && (
                <span className="inline-flex text-[10px] font-medium text-[#9A3A0A] bg-white border border-[#9A3A0A]/30 rounded-[999px] px-2.5 py-0.5 tracking-[-0.02em]">
                  {player.nb_share_B} GC
                </span>
              )}
            </div>
          )}
          <p className="text-3xl font-medium tracking-[-0.03em] text-[#9A3A0A] tabular-nums">
            {player.nb_point.toLocaleString()}
            <span className="text-sm text-[#696969] tracking-[0.08em] uppercase ml-2 align-middle">pts</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
