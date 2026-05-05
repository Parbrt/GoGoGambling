import { motion } from "motion/react";
import { getChipValues } from "@/lib/blackjackGame";

interface BlackjackBetChipsProps {
  currentPoints: number;
  currentBet: number;
  onBetChange: (amount: number) => void;
  onConfirmBet: () => void;
  disabled: boolean;
}

const CHIP_STYLE: Record<number, { bg: string; ring: string }> = {
  10:   { bg: "#3860BE", ring: "#1f3d85" },
  25:   { bg: "#1f7a45", ring: "#0f5530" },
  50:   { bg: "#F37338", ring: "#9A3A0A" },
  100:  { bg: "#141413", ring: "#000000" },
  500:  { bg: "#7c3aed", ring: "#4c1d95" },
  1000: { bg: "#facc15", ring: "#a16207" },
};

export function BlackjackBetChips({
  currentPoints,
  currentBet,
  onBetChange,
  onConfirmBet,
  disabled,
}: BlackjackBetChipsProps) {
  const chipValues = getChipValues(currentPoints);

  const handleChipClick = (val: number) => {
    const newBet = currentBet + val;
    if (newBet <= currentPoints) onBetChange(newBet);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto bg-white rounded-[28px] border border-[#D1CDC7] shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-5 flex flex-col items-center gap-4"
    >
      {/* Title + bet amount */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="eyebrow">Place ta mise</span>
        <div className="flex items-baseline gap-1.5 mt-1">
          <span className="text-3xl font-medium text-[#141413] tabular-nums tracking-[-0.03em]">
            {currentBet}
          </span>
          <span className="text-sm text-[#696969]">pts</span>
        </div>
        {currentPoints > 0 && (
          <span className="text-[11px] text-[#696969]">
            Solde · <span className="font-semibold tabular-nums text-[#141413]">{currentPoints.toLocaleString()}</span> pts
          </span>
        )}
      </div>

      {/* Chips */}
      <div className="flex flex-wrap justify-center gap-2.5">
        {chipValues.map((val) => {
          const style = CHIP_STYLE[val] || { bg: "#CF4500", ring: "#7a2900" };
          const cantAfford = currentBet + val > currentPoints;
          return (
            <motion.button
              key={val}
              whileHover={cantAfford ? undefined : { scale: 1.08, y: -3 }}
              whileTap={cantAfford ? undefined : { scale: 0.92 }}
              onClick={() => handleChipClick(val)}
              disabled={disabled || cantAfford}
              className={`relative w-12 h-12 rounded-full font-bold text-xs text-white shadow-[0_4px_10px_rgba(0,0,0,0.2)] disabled:opacity-30 disabled:cursor-not-allowed`}
              style={{
                background: style.bg,
                border: `2px dashed ${style.ring}`,
              }}
            >
              <span className="absolute inset-1.5 rounded-full border border-white/30" />
              <span className="relative z-10 tabular-nums tracking-[-0.02em]">
                {val}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onBetChange(0)}
          disabled={disabled || currentBet <= 0}
          className="px-3 py-1 rounded-full bg-[#F3F0EE] text-[#141413] text-[11px] font-semibold hover:bg-[#E8E4E0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Effacer
        </button>
        <button
          onClick={() => onBetChange(Math.max(0, currentBet - 50))}
          disabled={disabled || currentBet <= 0}
          className="px-3 py-1 rounded-full bg-[#F3F0EE] text-[#141413] text-[11px] font-semibold hover:bg-[#E8E4E0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          -50
        </button>
        <button
          onClick={() => onBetChange(currentPoints)}
          disabled={disabled || currentPoints <= 0}
          className="px-3 py-1 rounded-full bg-[#CF4500] text-white text-[11px] font-bold hover:bg-[#a83800] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          All-in
        </button>
      </div>

      {/* Confirm */}
      <motion.button
        whileHover={currentBet >= 10 ? { scale: 1.02 } : undefined}
        whileTap={currentBet >= 10 ? { scale: 0.98 } : undefined}
        onClick={onConfirmBet}
        disabled={disabled || currentBet < 10}
        className={`w-full py-3 rounded-full font-bold text-sm tracking-[-0.01em] transition-colors ${
          currentBet >= 10
            ? "bg-[#141413] text-white hover:bg-[#2A2928]"
            : "bg-[#E8E4E0] text-[#696969] cursor-not-allowed"
        }`}
      >
        {currentBet >= 10 ? `Miser ${currentBet} pts` : "Mise minimum 10 pts"}
      </motion.button>
    </motion.div>
  );
}
