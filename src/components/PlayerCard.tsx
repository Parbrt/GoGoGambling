import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { X, Star } from "lucide-react";
import { api } from "@/lib/api";
import { getRankInfo } from "@/lib/ranks";
import { RARITY_HEX, getStyleDef } from "@/lib/displayStyles";
import { formatCompactPoints } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────

interface PlayerCardData {
  id: number;
  player_name: string;
  nb_point: number;
  nb_debt: number;
  nb_share_A: number;
  nb_share_B: number;
  is_online: boolean;
  last_seen: string | null;
  profile_photo: string | null;
  peak_net_worth: number;
  equipped_title_name?: string | null;
  equipped_title_emoji?: string | null;
  equipped_title_rarity?: string | null;
  equipped_title_display_style?: string | null;
  equipped_title_star_level?: number | null;
  equipped_object_name?: string | null;
  equipped_object_emoji?: string | null;
  equipped_object_rarity?: string | null;
  equipped_object_display_style?: string | null;
  equipped_object_star_level?: number | null;
  collection?: {
    categories: Array<{ key: string; label: string; emoji: string; owned: number; total: number }>;
    uniqueGlobal: { owned: number; total: number };
  };
}

export interface PlayerCardProps {
  playerId: number;
  /** hover = no backdrop, click = dark backdrop */
  mode: "hover" | "click";
  onClose: () => void;
  /** Called when mouse enters the card panel (used to cancel close timer) */
  onCardMouseEnter?: () => void;
  /** Called when mouse leaves the card panel */
  onCardMouseLeave?: () => void;
}

// ─── Constants ───────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  fruit:  "from-orange-400 to-orange-600",
  burger: "from-purple-400 to-purple-600",
  title:  "from-blue-400 to-indigo-600",
  people: "from-yellow-300 to-amber-500",
};

const springCard = { type: "spring" as const, stiffness: 380, damping: 28 };

// ─── Sub-components ──────────────────────────────────────────────

function StarBadge({ level }: { level: number }) {
  if (level <= 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5 ml-0.5">
      {Array.from({ length: level }).map((_, i) => (
        <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
      ))}
    </span>
  );
}

function EquipBadge({
  name, emoji, rarity, displayStyle, starLevel, showEmoji,
}: {
  name: string; emoji?: string | null; rarity?: string | null;
  displayStyle?: string | null; starLevel?: number | null; showEmoji?: boolean;
}) {
  const hex = RARITY_HEX[rarity || ""] ?? RARITY_HEX.common;
  const sd = getStyleDef(displayStyle);
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[999px] text-xs max-w-[160px] truncate"
      style={sd.container(hex)}
      title={name}
    >
      {showEmoji && emoji && <span className="leading-none shrink-0">{emoji}</span>}
      <span className={`${sd.textClass} truncate`} style={sd.textStyle(hex)}>{name}</span>
      <StarBadge level={starLevel ?? 0} />
    </span>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="p-7 space-y-5 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-[#E8E4E0] shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-[#E8E4E0] rounded-full w-32" />
          <div className="h-3 bg-[#E8E4E0] rounded-full w-20" />
        </div>
      </div>
      <div className="h-1.5 bg-[#E8E4E0] rounded-full" />
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map(i => <div key={i} className="h-10 bg-[#E8E4E0] rounded-[16px]" />)}
      </div>
      <div className="space-y-2">
        {[0, 1, 2, 3].map(i => <div key={i} className="h-4 bg-[#E8E4E0] rounded-full" />)}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────

export function PlayerCard({ playerId, mode, onClose, onCardMouseEnter, onCardMouseLeave }: PlayerCardProps) {
  const [player, setPlayer] = useState<PlayerCardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.player.getById(playerId) as PlayerCardData;
      setPlayer(data);
    } catch (err) {
      console.error("[PlayerCard]", err);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => { load(); }, [load]);

  const rankInfo = player ? getRankInfo(player.peak_net_worth) : null;

  return (
    <>
      {/* Backdrop — click mode only */}
      {mode === "click" && (
        <motion.div
          className="fixed inset-0 z-40 bg-[#141413]/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        />
      )}

      {/* Card wrapper — pointer-events-none so it doesn't block hover tracking */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
      >
          <motion.div
            className="relative w-full max-w-sm pointer-events-auto"
            style={{
              background: "#FCFBFA",
              borderRadius: "40px",
              border: "1px solid #D1CDC7",
              boxShadow: "0 24px 80px rgba(20,20,19,0.18), 0 4px 16px rgba(20,20,19,0.08)",
              overflow: "hidden",
            }}
            initial={{ scale: 0.92, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 10 }}
            transition={springCard}
            onMouseEnter={onCardMouseEnter}
            onMouseLeave={onCardMouseLeave}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-[#F3F0EE] hover:bg-[#E8E4E0] transition-colors"
              aria-label="Fermer"
            >
              <X className="w-4 h-4 text-[#696969]" />
            </button>

            {loading ? <CardSkeleton /> : player && rankInfo ? (
              <div className="p-7 space-y-5">

                {/* ── Avatar + name ── */}
                <div className="flex items-center gap-4">
                  <motion.div
                    className="relative shrink-0"
                    initial={{ scale: 0.75, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 360, damping: 22, delay: 0.04 }}
                  >
                    <div className="w-16 h-16 rounded-full bg-[#141413] text-[#F3F0EE] flex items-center justify-center font-medium text-2xl overflow-hidden">
                      {player.profile_photo ? (
                        <img src={player.profile_photo} alt={player.player_name} className="w-full h-full object-cover" />
                      ) : (
                        player.player_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    {/* Online dot */}
                    {player.is_online && (
                      <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#F37338] border-2 border-[#FCFBFA]" />
                    )}
                  </motion.div>

                  <div className="min-w-0">
                    <p className="text-lg font-medium tracking-[-0.02em] text-[#141413] truncate">
                      {player.player_name}
                    </p>
                    <p className="text-xs text-[#696969]">
                      {rankInfo.title} · Niv.{rankInfo.level}
                    </p>
                    {player.is_online && (
                      <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-medium text-[#F37338]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F37338] live-dot" />
                        En ligne
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Equipped items ── */}
                {(player.equipped_title_name || player.equipped_object_name) && (
                  <motion.div
                    className="flex flex-wrap gap-1.5"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.25 }}
                  >
                    {player.equipped_title_name && (
                      <EquipBadge
                        name={player.equipped_title_name}
                        rarity={player.equipped_title_rarity}
                        displayStyle={player.equipped_title_display_style}
                        starLevel={player.equipped_title_star_level}
                        showEmoji={false}
                      />
                    )}
                    {player.equipped_object_name && (
                      <EquipBadge
                        name={player.equipped_object_name}
                        emoji={player.equipped_object_emoji}
                        rarity={player.equipped_object_rarity}
                        displayStyle={player.equipped_object_display_style}
                        starLevel={player.equipped_object_star_level}
                        showEmoji
                      />
                    )}
                  </motion.div>
                )}

                {/* ── Rank progression ── */}
                <div className="space-y-1.5 pt-1 border-t border-[#E8E4E0]">
                  <div className="flex justify-between text-[10px] text-[#696969] uppercase tracking-[0.06em]">
                    <span>Progression rang</span>
                    <span className="tabular-nums">
                      {formatCompactPoints(player.peak_net_worth)}
                      {rankInfo.nextThreshold !== null && ` / ${formatCompactPoints(rankInfo.nextThreshold)}`}
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#E8E4E0] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: "linear-gradient(90deg, #CF4500, #F37338)" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${rankInfo.progress * 100}%` }}
                      transition={{ duration: 0.55, delay: 0.08 }}
                    />
                  </div>
                </div>

                {/* ── Stats ── */}
                <div className="grid grid-cols-3 gap-2 border-t border-[#E8E4E0] pt-1">
                  {[
                    { label: "Points", value: formatCompactPoints(player.nb_point), color: "text-[#141413]" },
                    { label: "GCC", value: player.nb_share_A > 0 ? String(player.nb_share_A) : "—", color: "text-[#3860BE]" },
                    { label: "GC", value: player.nb_share_B > 0 ? String(player.nb_share_B) : "—", color: "text-[#9A3A0A]" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="text-center bg-[#F3F0EE] rounded-[16px] py-2.5 px-1">
                      <p className="text-[9px] uppercase tracking-[0.08em] text-[#696969] mb-0.5">{label}</p>
                      <p className={`text-sm font-medium tabular-nums ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* ── Collection ── */}
                {player.collection && (
                  <div className="space-y-2 border-t border-[#E8E4E0] pt-1">
                    <p className="text-[10px] uppercase tracking-[0.08em] text-[#696969]">Collection</p>

                    {player.collection.categories.map((cat, i) => {
                      const pct = cat.total > 0 ? (cat.owned / cat.total) * 100 : 0;
                      const bar = CATEGORY_COLORS[cat.key] ?? "from-gray-400 to-gray-600";
                      return (
                        <div key={cat.key} className="flex items-center gap-2">
                          <span className="text-sm w-5 text-center shrink-0">{cat.emoji}</span>
                          <div className="flex-1 h-1.5 bg-[#E8E4E0] rounded-full overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full bg-gradient-to-r ${bar}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.5, delay: 0.12 + i * 0.06 }}
                            />
                          </div>
                          <span className="text-[10px] tabular-nums text-[#696969] w-9 text-right shrink-0">
                            {cat.owned}/{cat.total}
                          </span>
                        </div>
                      );
                    })}

                    {/* Unique global bar */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm w-5 text-center shrink-0">💎</span>
                      <div className="flex-1 h-1.5 bg-[#E8E4E0] rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-amber-500"
                          initial={{ width: 0 }}
                          animate={{
                            width: `${
                              player.collection.uniqueGlobal.total > 0
                                ? (player.collection.uniqueGlobal.owned / player.collection.uniqueGlobal.total) * 100
                                : 0
                            }%`,
                          }}
                          transition={{ duration: 0.5, delay: 0.36 }}
                        />
                      </div>
                      <span className="text-[10px] tabular-nums text-[#696969] w-9 text-right shrink-0">
                        {player.collection.uniqueGlobal.owned}/{player.collection.uniqueGlobal.total}
                      </span>
                    </div>
                    <p className="text-[9px] text-[#D1CDC7] text-right">💎 compteur mondial</p>
                  </div>
                )}

              </div>
            ) : (
              <p className="text-center text-[#696969] py-10 px-7">Joueur introuvable</p>
            )}
          </motion.div>
        </div>
    </>
  );
}
