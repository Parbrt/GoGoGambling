import { motion } from "motion/react";
import { formatCompactPoints } from "@/lib/utils";
import { BlackjackHand } from "@/components/BlackjackHand";
import type { PlayerState } from "@/lib/blackjackGame";

interface BlackjackPlayerSpotProps {
  player: PlayerState;
  isCurrentPlayer: boolean;
  isLocalPlayer: boolean;
  phase: string;
  timerRemaining: number | null;
  hasChosen?: boolean;
  showActions?: boolean;
  onHit?: () => void;
  onStand?: () => void;
}

export function BlackjackPlayerSpot({
  player,
  isCurrentPlayer,
  isLocalPlayer,
  phase,
  timerRemaining,
  hasChosen = false,
  showActions = false,
  onHit,
  onStand,
}: BlackjackPlayerSpotProps) {
  const canStillPlay =
    !player.isStand && !player.isBust && !player.isBlackjack && player.bet > 0;

  // turn-based mode (legacy server) → only when it's their turn
  const turnBasedActive = phase === "playing" && isCurrentPlayer && canStillPlay;
  // simultaneous mode (future server) → all eligible players act at once
  const renderActions = isLocalPlayer && canStillPlay && showActions;

  const scoreTone =
    player.isBust ? "alert" :
    player.isBlackjack ? "warn" :
    player.score === 21 ? "success" :
    player.isStand ? "muted" :
    "ink";

  const ringClass =
    isLocalPlayer
      ? "ring-2 ring-[#F37338]"
      : turnBasedActive
      ? "ring-2 ring-[#141413]"
      : hasChosen
      ? "ring-1 ring-[#1f7a45]/50"
      : "ring-1 ring-[#D1CDC7]";

  const result = (() => {
    if (!player.result) return null;
    switch (player.result) {
      case "win":       return { text: `+${formatCompactPoints(player.winnings)}`, tone: "win" };
      case "blackjack": return { text: `BJ +${formatCompactPoints(player.winnings)}`, tone: "bj" };
      case "lose":      return { text: `-${formatCompactPoints(player.bet)}`, tone: "lose" };
      case "push":      return { text: "égalité", tone: "push" };
      case "left":      return { text: "parti", tone: "muted" };
      default:          return null;
    }
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      layout
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className={`relative flex flex-col items-center gap-3 px-4 pt-4 pb-4 rounded-3xl bg-white ${ringClass} min-w-[170px] max-w-[210px] shadow-[0_4px_20px_rgba(20,20,19,0.06)]`}
    >
      {/* Pulse halo when current player (turn-based) */}
      {turnBasedActive && (
        <motion.div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          animate={{ opacity: [0.35, 0.85, 0.35] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          style={{ boxShadow: "0 0 0 4px rgba(243,115,56,0.18)" }}
        />
      )}

      {/* Header: name + you-tag + chosen indicator */}
      <div className="w-full flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${
              isLocalPlayer ? "bg-[#F37338]" : "bg-[#D1CDC7]"
            }`}
          />
          <span className="text-xs font-semibold text-[#141413] truncate tracking-[-0.01em]">
            {player.playerName}
          </span>
          {isLocalPlayer && (
            <span className="text-[9px] font-bold text-[#F37338] uppercase tracking-[0.08em] shrink-0">
              toi
            </span>
          )}
        </div>

        {hasChosen && canStillPlay && phase === "playing" && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-[9px] font-bold text-[#1f7a45] uppercase tracking-[0.08em] shrink-0"
          >
            ✓ prêt
          </motion.span>
        )}
        {turnBasedActive && timerRemaining !== null && (
          <span
            className={`text-[10px] font-bold tabular-nums shrink-0 ${
              timerRemaining <= 3 ? "text-[#CF4500]" : "text-[#F37338]"
            }`}
          >
            {timerRemaining}s
          </span>
        )}
      </div>

      {/* Bet */}
      {player.bet > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F3F0EE] border border-[#E8E4E0]"
        >
          <span className="text-[11px] font-bold text-[#141413] tabular-nums">{formatCompactPoints(player.bet)}</span>
          <span className="text-[9px] text-[#696969] font-medium">pts</span>
        </motion.div>
      )}

      {/* Cards + score */}
      {player.hand.length > 0 && player.result !== "left" && (
        <BlackjackHand
          cards={player.hand}
          size="md"
          score={player.score || undefined}
          scoreTone={scoreTone}
        />
      )}

      {/* Status badges */}
      <div className="flex gap-1 flex-wrap justify-center min-h-[18px]">
        {player.isBlackjack && (
          <motion.span
            initial={{ scale: 0, y: 6 }}
            animate={{ scale: 1, y: 0 }}
            className="px-2 py-0.5 rounded-full bg-[#F37338] text-white text-[9px] font-bold uppercase tracking-[0.08em]"
          >
            blackjack
          </motion.span>
        )}
        {player.isBust && (
          <motion.span
            initial={{ scale: 0, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            className="px-2 py-0.5 rounded-full bg-[#CF4500] text-white text-[9px] font-bold uppercase tracking-[0.08em]"
          >
            bust
          </motion.span>
        )}
        {player.isStand && !player.isBlackjack && !player.isBust && (
          <span className="px-2 py-0.5 rounded-full bg-[#141413] text-white text-[9px] font-bold uppercase tracking-[0.08em]">
            stand
          </span>
        )}
        {result && (
          <motion.span
            initial={{ scale: 0, y: 6 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums uppercase tracking-[0.06em] ${
              result.tone === "win" ? "bg-[#1f7a45] text-white" :
              result.tone === "bj"  ? "bg-[#F37338] text-white" :
              result.tone === "lose" ? "bg-[#CF4500] text-white" :
              result.tone === "push" ? "bg-[#E8E4E0] text-[#141413]" :
              "bg-[#E8E4E0] text-[#696969]"
            }`}
          >
            {result.text}
          </motion.span>
        )}
      </div>

      {/* Action buttons (works for both turn-based and simultaneous flows) */}
      {(turnBasedActive && isLocalPlayer) || renderActions ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-2 mt-1 z-10"
        >
          <button
            onClick={onHit}
            className="px-4 py-1.5 rounded-full bg-[#141413] text-white text-xs font-bold tracking-[-0.01em] hover:bg-[#2A2928] transition-colors active:scale-95"
          >
            Carte
          </button>
          <button
            onClick={onStand}
            className="px-4 py-1.5 rounded-full bg-[#CF4500] text-white text-xs font-bold tracking-[-0.01em] hover:bg-[#a83800] transition-colors active:scale-95"
          >
            Stop
          </button>
        </motion.div>
      ) : null}

      {/* Waiting hints */}
      {isLocalPlayer && phase === "betting" && player.bet === 0 && (
        <span className="text-[10px] text-[#F37338] animate-pulse font-semibold uppercase tracking-[0.08em]">
          place ta mise
        </span>
      )}
    </motion.div>
  );
}
