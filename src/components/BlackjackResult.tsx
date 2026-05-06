import { motion, AnimatePresence } from "motion/react";
import { formatCompactPoints } from "@/lib/utils";
import type { PlayerState } from "@/lib/blackjackGame";

interface BlackjackResultProps {
  players: PlayerState[];
  dealerScore: number;
  isVisible: boolean;
  localUserId: string;
}

const TONE: Record<string, { bg: string; text: string; label: string }> = {
  win:       { bg: "bg-[#1f7a45]",   text: "text-white",        label: "Tu gagnes" },
  blackjack: { bg: "bg-[#F37338]",   text: "text-white",        label: "Blackjack" },
  push:      { bg: "bg-[#E8E4E0]",   text: "text-[#141413]",    label: "Égalité" },
  lose:      { bg: "bg-[#CF4500]",   text: "text-white",        label: "Tu perds" },
  none:      { bg: "bg-white",       text: "text-[#141413]",    label: "Manche terminée" },
};

export function BlackjackResult({
  players,
  dealerScore,
  isVisible,
  localUserId,
}: BlackjackResultProps) {
  const localPlayer = players.find((p) => p.userId === localUserId);
  const otherPlayers = players.filter(
    (p) => p.userId !== localUserId && p.result && p.result !== "left"
  );

  const localResult = localPlayer?.result;
  const tone = TONE[localResult || "none"] || TONE.none;

  const localDelta =
    localResult === "win" || localResult === "blackjack"
      ? `+${formatCompactPoints(localPlayer?.winnings ?? 0)}`
      : localResult === "push"
      ? `±0`
      : localResult === "lose"
      ? `-${formatCompactPoints(localPlayer?.bet ?? 0)}`
      : null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          className="fixed top-[68px] left-1/2 -translate-x-1/2 z-40 pointer-events-none"
        >
          <div
            className="flex flex-col gap-2 bg-white/95 backdrop-blur-md border border-[#D1CDC7] rounded-3xl px-4 py-3 shadow-[0_12px_32px_rgba(20,20,19,0.12)] min-w-[280px] max-w-[400px]"
          >
            {/* Local result row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`px-2.5 py-1 rounded-full ${tone.bg} ${tone.text} text-[10px] font-bold uppercase tracking-[0.1em]`}
                >
                  {tone.label}
                </span>
                <span className="text-[11px] text-[#696969]">
                  Croupier : <span className="font-bold text-[#141413] tabular-nums">{dealerScore}</span>
                </span>
              </div>
              {localDelta && (
                <motion.span
                  initial={{ scale: 0.6 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 360, damping: 18, delay: 0.1 }}
                  className={`text-base font-bold tabular-nums tracking-[-0.02em] ${
                    localResult === "win" || localResult === "blackjack"
                      ? "text-[#1f7a45]"
                      : localResult === "push"
                      ? "text-[#696969]"
                      : "text-[#CF4500]"
                  }`}
                >
                  {localDelta} pts
                </motion.span>
              )}
            </div>

            {/* Other players row */}
            {otherPlayers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#E8E4E0]">
                {otherPlayers.map((p) => {
                  const won = p.result === "win" || p.result === "blackjack";
                  const push = p.result === "push";
                  const dotColor = won
                    ? "bg-[#1f7a45]"
                    : push
                    ? "bg-[#696969]"
                    : "bg-[#CF4500]";
                  const delta = won
                    ? `+${formatCompactPoints(p.winnings)}`
                    : push
                    ? `±0`
                    : `-${formatCompactPoints(p.bet)}`;
                  return (
                    <div
                      key={p.userId}
                      className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#F3F0EE]"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                      <span className="text-[10px] font-medium text-[#141413] truncate max-w-[80px]">
                        {p.playerName}
                      </span>
                      <span
                        className={`text-[10px] font-bold tabular-nums ${
                          won ? "text-[#1f7a45]" : push ? "text-[#696969]" : "text-[#CF4500]"
                        }`}
                      >
                        {delta}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
