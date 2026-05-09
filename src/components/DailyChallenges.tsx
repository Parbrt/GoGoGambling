import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, X, Gift } from "lucide-react";
import { api } from "@/lib/api";
import type { PlayerType } from "@/types";

// ─── Types ───────────────────────────────────────────────────────

interface Challenge {
  id: number | null;
  challengeId: number;
  name: string;
  description: string;
  type: string;
  target: number;
  progress: number;
  completed: boolean;
  reward: number;
  emoji: string;
  difficulty: "easy" | "medium" | "hard";
}

interface StreakData {
  streak: number;
  lastCompletedDate: string | null;
  weeklyBoxReady: boolean;
  allDoneToday: boolean;
}

interface ClaimResult {
  item: { name: string; emoji: string; rarity: string };
  rolledRarity: string;
}

// ─── Helpers ─────────────────────────────────────────────────────

const DIFF_STYLES: Record<string, string> = {
  easy:   "bg-[#E8F5E9] text-[#2E7D32]",
  medium: "bg-[#FFF3E0] text-[#E65100]",
  hard:   "bg-[#FCE4EC] text-[#C62828]",
};
const DIFF_LABELS: Record<string, string> = {
  easy: "Facile", medium: "Moyen", hard: "Difficile",
};

function formatPoints(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

function isTodayCompleted(streak: StreakData): boolean {
  return streak.allDoneToday;
}

// ─── Sub-components ──────────────────────────────────────────────

function ChallengeCard({ challenge, index }: { challenge: Challenge; index: number }) {
  const pct = Math.min(1, challenge.progress / challenge.target);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 * index, type: "spring", stiffness: 320, damping: 26 }}
      className={`relative rounded-[24px] border p-5 flex flex-col gap-3 overflow-hidden transition-all ${
        challenge.completed
          ? "bg-[#F0FDF4] border-[#86EFAC]"
          : "bg-[#FCFBFA] border-[#D1CDC7]"
      }`}
    >
      {/* Completed overlay shimmer */}
      {challenge.completed && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-green-400/5 to-transparent pointer-events-none rounded-[24px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-2xl shrink-0">{challenge.emoji}</span>
          <div className="min-w-0">
            <p className={`text-sm font-medium tracking-[-0.01em] leading-tight truncate ${challenge.completed ? "text-[#15803D]" : "text-[#141413]"}`}>
              {challenge.name}
            </p>
            <p className="text-[11px] text-[#696969] leading-snug mt-0.5 line-clamp-2">
              {challenge.description}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {challenge.completed ? (
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
            >
              <CheckCircle2 className="w-5 h-5 text-[#15803D]" />
            </motion.div>
          ) : (
            <span className={`text-[10px] font-bold uppercase tracking-[0.04em] px-2 py-0.5 rounded-full ${DIFF_STYLES[challenge.difficulty]}`}>
              {DIFF_LABELS[challenge.difficulty]}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-1.5 bg-[#E8E4E0] rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${challenge.completed ? "bg-[#15803D]" : "bg-gradient-to-r from-[#CF4500] to-[#F37338]"}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct * 100}%` }}
            transition={{ duration: 0.6, delay: 0.1 + 0.06 * index, ease: "easeOut" }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[#696969] tabular-nums">
            {challenge.completed ? "Terminé !" : `${challenge.progress} / ${challenge.target}`}
          </span>
          <span className={`text-[10px] font-semibold tabular-nums ${challenge.completed ? "text-[#15803D]" : "text-[#CF4500]"}`}>
            +{formatPoints(challenge.reward)} pts
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function StreakDot({ filled, isToday, index }: { filled: boolean; isToday: boolean; index: number }) {
  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.04 * index, type: "spring", stiffness: 400, damping: 22 }}
      className="flex flex-col items-center gap-1"
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all relative ${
        filled
          ? "bg-[#F37338] border-[#CF4500] shadow-[0_0_12px_rgba(243,115,56,0.4)]"
          : isToday
          ? "bg-[#FCFBFA] border-[#F37338] border-dashed"
          : "bg-[#F3F0EE] border-[#D1CDC7]"
      }`}>
        {filled ? (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.05 * index + 0.1 }}>
            <CheckCircle2 className="w-4 h-4 text-white" />
          </motion.div>
        ) : (
          <span className={`text-[10px] font-bold ${isToday ? "text-[#F37338]" : "text-[#D1CDC7]"}`}>
            {index + 1}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Claim modal ─────────────────────────────────────────────────

function ClaimModal({ result, onClose }: { result: ClaimResult; onClose: () => void }) {
  const RARITY_COLORS: Record<string, string> = {
    legendary: "from-orange-400 to-orange-600",
    epic:      "from-purple-400 to-purple-600",
    rare:      "from-blue-400 to-blue-600",
    mythic:    "from-fuchsia-400 to-fuchsia-600",
    exotic:    "from-red-400 to-red-600",
    unique:    "from-yellow-300 to-amber-500",
    common:    "from-gray-300 to-gray-500",
  };
  const grad = RARITY_COLORS[result.rolledRarity] ?? RARITY_COLORS.common;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute inset-0 bg-[#141413]/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        className="relative w-full max-w-xs rounded-[40px] bg-[#FCFBFA] border border-[#D1CDC7] p-10 flex flex-col items-center text-center gap-5 shadow-[0_24px_80px_rgba(20,20,19,0.2)]"
        initial={{ scale: 0.7, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 22 }}
      >
        <button onClick={onClose} className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#F3F0EE] hover:bg-[#E8E4E0] flex items-center justify-center">
          <X className="w-4 h-4 text-[#696969]" />
        </button>

        <motion.div
          className={`w-24 h-24 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-4xl shadow-lg`}
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          {result.item.emoji}
        </motion.div>

        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.08em] text-[#F37338] font-bold">GOGOBOX ouverte !</p>
          <h3 className="text-xl font-medium tracking-[-0.02em] text-[#141413]">{result.item.name}</h3>
          <p className="text-sm text-[#696969] capitalize">{result.rolledRarity}</p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-[#141413] text-[#F3F0EE] rounded-[999px] text-sm font-medium tracking-[-0.02em] hover:bg-[#262627] transition-colors"
        >
          Super !
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────

interface DailyChallengesProps {
  player: PlayerType;
  onPlayerUpdate: (p: PlayerType) => void;
}

export function DailyChallenges({ player, onPlayerUpdate }: DailyChallengesProps) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [streak, setStreak] = useState<StreakData>({ streak: 0, lastCompletedDate: null, weeklyBoxReady: false, allDoneToday: false });
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [todayData, streakData] = await Promise.all([
        api.challenges.today(),
        api.challenges.streak(),
      ]);
      setChallenges(todayData.challenges);
      setStreak(streakData);
    } catch (err) {
      console.error("[DailyChallenges]", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => { refresh(); }, [refresh]);

  // Refresh whenever player points change (after any game action)
  useEffect(() => {
    if (!loading) refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.nb_point]);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const result = await api.challenges.claimWeekly();
      setClaimResult({ item: result.item, rolledRarity: result.rolledRarity });
      onPlayerUpdate(result.player);
      await refresh();
    } catch (err) {
      console.error("[DailyChallenges] claim error:", err);
    } finally {
      setClaiming(false);
    }
  };

  const completedCount = challenges.filter(c => c.completed).length;
  const allDone = completedCount === 3;

  // Build 7-day dots: last_completed_date tells us how far in the current streak we are
  // streak = N means N consecutive days done. Today counts if allDoneToday.
  const todayStr = new Date().toISOString().slice(0, 10);
  const streakDays = Math.min(streak.streak, 7);

  if (loading) {
    return (
      <div className="rounded-[40px] border border-[#D1CDC7] bg-[#FCFBFA] p-8 space-y-4 animate-pulse">
        <div className="h-4 bg-[#E8E4E0] rounded-full w-32" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[0, 1, 2].map(i => <div key={i} className="h-28 bg-[#E8E4E0] rounded-[24px]" />)}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-[40px] border border-[#D1CDC7] bg-[#FCFBFA] p-8 md:p-10 halo-soft space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="eyebrow">Défis</span>
            <h3 className="text-2xl md:text-3xl font-medium tracking-[-0.03em] text-[#141413]">
              Défis du jour.
            </h3>
            <p className="text-sm text-[#696969]">
              {allDone
                ? "Tous les défis sont accomplis ! Revenez demain."
                : `${completedCount}/3 défis accomplis — récompenses directement créditées.`}
            </p>
          </div>
          {allDone && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#F0FDF4] border border-[#86EFAC] rounded-[999px] text-sm font-medium text-[#15803D] shrink-0"
            >
              <CheckCircle2 className="w-4 h-4" />
              Journée complète !
            </motion.div>
          )}
        </div>

        {/* ── Challenge cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {challenges.map((c, i) => (
            <ChallengeCard key={c.challengeId} challenge={c} index={i} />
          ))}
        </div>

        {/* ── Weekly streak ── */}
        <div className="border-t border-[#E8E4E0] pt-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs uppercase tracking-[0.08em] text-[#696969] font-medium">Série hebdomadaire</p>
              <p className="text-base font-medium tracking-[-0.02em] text-[#141413]">
                {streak.weeklyBoxReady
                  ? "7 jours consécutifs — votre GOGOBOX vous attend !"
                  : streakDays === 0
                  ? "Complétez vos défis pour démarrer la série."
                  : `${streakDays} jour${streakDays > 1 ? "s" : ""} d'affilée — encore ${7 - streakDays} pour la GOGOBOX.`}
              </p>
            </div>
            {streak.weeklyBoxReady && (
              <motion.button
                onClick={handleClaim}
                disabled={claiming}
                className="inline-flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-[#CF4500] to-[#F37338] text-white rounded-[999px] text-sm font-medium tracking-[-0.02em] hover:opacity-90 transition-opacity disabled:opacity-50 shadow-[0_4px_20px_rgba(207,69,0,0.3)] shrink-0"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Gift className="w-4 h-4" />
                {claiming ? "Ouverture..." : "Réclamer la GOGOBOX"}
              </motion.button>
            )}
          </div>

          {/* 7 dots + GOGOBOX */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {Array.from({ length: 7 }).map((_, i) => {
              const filled = i < streakDays;
              const isToday = i === streakDays && !isTodayCompleted(streak) && i < 7;
              return (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <StreakDot filled={filled} isToday={isToday} index={i} />
                  {/* Connector line */}
                  {i < 6 && (
                    <div className="hidden sm:block w-full h-0 relative mt-[-16px] mb-[16px] pointer-events-none">
                      {/* lines between dots are provided by flex gap */}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Separator */}
            <div className="flex-none flex items-center px-1">
              <div className="w-3 h-0.5 bg-[#D1CDC7]" />
            </div>

            {/* GOGOBOX reward */}
            <motion.div
              className={`flex-none w-12 h-12 rounded-full flex items-center justify-center text-xl border-2 transition-all ${
                streak.weeklyBoxReady
                  ? "bg-gradient-to-br from-[#F37338] to-[#CF4500] border-[#CF4500] shadow-[0_0_20px_rgba(243,115,56,0.5)]"
                  : "bg-[#F3F0EE] border-[#D1CDC7]"
              }`}
              animate={streak.weeklyBoxReady ? { scale: [1, 1.08, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              📦
            </motion.div>
          </div>

          {/* Day labels */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-[9px] text-[#D1CDC7] uppercase tracking-[0.06em]">
            {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
              <div key={i} className="flex-1 text-center">{d}</div>
            ))}
            <div className="flex-none w-4 text-center" />
            <div className="flex-none w-12 text-center text-[8px]">Box</div>
          </div>
        </div>

      </div>

      {/* Claim result modal */}
      <AnimatePresence>
        {claimResult && (
          <ClaimModal result={claimResult} onClose={() => setClaimResult(null)} />
        )}
      </AnimatePresence>
    </>
  );
}
