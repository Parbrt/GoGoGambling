import { motion, AnimatePresence } from "motion/react";
import { BlackjackCard } from "@/components/BlackjackCard";
import type { Card } from "@/lib/blackjackGame";

interface BlackjackHandProps {
  cards: Card[];
  isDealing?: boolean;
  size?: "sm" | "md" | "lg";
  label?: string;
  score?: number | string;
  showScore?: boolean;
  scoreTone?: "ink" | "alert" | "warn" | "muted" | "success";
  align?: "center" | "start";
}

const SCORE_TONE: Record<NonNullable<BlackjackHandProps["scoreTone"]>, string> = {
  ink: "bg-[#141413] text-white",
  alert: "bg-[#CF4500] text-white",
  warn: "bg-[#F37338] text-white",
  muted: "bg-[#E8E4E0] text-[#141413]",
  success: "bg-[#1f7a45] text-white",
};

export function BlackjackHand({
  cards,
  isDealing = false,
  size = "md",
  label,
  score,
  showScore = true,
  scoreTone = "ink",
  align = "center",
}: BlackjackHandProps) {
  const overlap = size === "sm" ? "-ml-[34px]" : size === "md" ? "-ml-[44px]" : "-ml-[52px]";
  const minH = size === "sm" ? "h-[78px]" : size === "md" ? "h-[100px]" : "h-[124px]";

  return (
    <div
      className={`flex flex-col gap-1.5 ${
        align === "center" ? "items-center" : "items-start"
      }`}
    >
      {label && (
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#696969]">
          {label}
        </span>
      )}

      <div className="relative flex items-end">
        <div className={`flex items-end ${minH}`}>
          <AnimatePresence mode="popLayout">
            {cards.map((card, i) => {
              const total = Math.max(cards.length, 1);
              const center = (total - 1) / 2;
              const offset = i - center;
              const tilt = offset * 3;
              const lift = -Math.abs(offset) * 1.5;

              return (
                <motion.div
                  key={`${card.suit}-${card.rank}-${i}`}
                  layout
                  className={i === 0 ? "" : overlap}
                  style={{ zIndex: i + 1 }}
                  animate={{ rotate: tilt, y: lift }}
                  transition={{ type: "spring", stiffness: 220, damping: 22 }}
                >
                  <BlackjackCard
                    card={card}
                    index={i}
                    isDealing={isDealing}
                    size={size}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Always-visible score badge */}
        {showScore && score !== undefined && score !== "" && (
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.7, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className={`ml-2 px-2.5 py-1 rounded-full ${SCORE_TONE[scoreTone]} text-xs font-bold tabular-nums tracking-[-0.02em] shadow-[0_2px_8px_rgba(0,0,0,0.12)]`}
          >
            {score}
          </motion.div>
        )}
      </div>
    </div>
  );
}
