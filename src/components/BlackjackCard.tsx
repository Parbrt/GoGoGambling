import { motion } from "motion/react";
import type { Card, Suit } from "@/lib/blackjackGame";

interface BlackjackCardProps {
  card: Card;
  index?: number;
  isDealing?: boolean;
  dealDelay?: number;
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = {
  sm: { card: "w-[52px] h-[74px]", rank: "text-[13px]", suit: "text-[12px]", center: "text-[26px]" },
  md: { card: "w-[68px] h-[96px]", rank: "text-[17px]", suit: "text-[15px]", center: "text-[36px]" },
  lg: { card: "w-[84px] h-[120px]", rank: "text-[22px]", suit: "text-[19px]", center: "text-[46px]" },
};

function suitGlyph(suit: Suit): string {
  return suit;
}

export function BlackjackCard({
  card,
  index = 0,
  isDealing = false,
  dealDelay = 0,
  size = "md",
}: BlackjackCardProps) {
  const s = SIZE_MAP[size];
  const isRed = card.suit === "♥" || card.suit === "♦";
  const inkColor = isRed ? "#CF4500" : "#141413";

  const dealOrigin = { x: -180, y: -240, rotate: -22, opacity: 0, scale: 0.7 };
  const settled = { x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 };

  if (card.faceDown) {
    return (
      <motion.div
        initial={isDealing ? dealOrigin : false}
        animate={settled}
        transition={{
          type: "spring",
          stiffness: 220,
          damping: 22,
          mass: 0.9,
          delay: dealDelay + index * 0.14,
        }}
        className={`${s.card} relative rounded-2xl select-none shrink-0`}
        style={{
          background: "linear-gradient(135deg, #141413 0%, #2A2928 100%)",
          boxShadow: "0 10px 24px -8px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.06) inset",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          className="absolute inset-1.5 rounded-xl"
          style={{
            background:
              "repeating-linear-gradient(135deg, transparent 0 6px, rgba(243,115,56,0.18) 6px 7px)",
            border: "1px solid rgba(243,115,56,0.25)",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{
              background: "rgba(243,115,56,0.18)",
              border: "1px solid rgba(243,115,56,0.4)",
            }}
          >
            <span className="text-[#F37338] text-xs font-bold tracking-[-0.02em]">G</span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={isDealing ? { ...dealOrigin, rotateY: 180 } : false}
      animate={{ ...settled, rotateY: 0 }}
      transition={{
        type: "spring",
        stiffness: 220,
        damping: 22,
        mass: 0.9,
        delay: dealDelay + index * 0.14,
        rotateY: { duration: 0.5, delay: dealDelay + index * 0.14 + 0.15 },
      }}
      style={{ transformStyle: "preserve-3d", perspective: 1000 }}
      className={`${s.card} relative rounded-2xl select-none shrink-0`}
    >
      <div
        className="absolute inset-0 rounded-2xl bg-white"
        style={{
          boxShadow: "0 10px 24px -8px rgba(0,0,0,0.18), 0 1px 0 rgba(0,0,0,0.04) inset",
          border: "1px solid #E8E4E0",
        }}
      >
        {/* Top-left corner */}
        <div
          className="absolute top-1.5 left-2 leading-none flex flex-col items-start"
          style={{ color: inkColor }}
        >
          <span className={`${s.rank} font-bold tracking-[-0.04em] leading-none`}>
            {card.rank}
          </span>
          <span className={`${s.suit} leading-none mt-0.5`}>{suitGlyph(card.suit)}</span>
        </div>

        {/* Center symbol */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ color: inkColor, opacity: 0.92 }}
        >
          <span className={`${s.center} leading-none`}>{suitGlyph(card.suit)}</span>
        </div>

        {/* Bottom-right corner (rotated) */}
        <div
          className="absolute bottom-1.5 right-2 leading-none flex flex-col items-end rotate-180"
          style={{ color: inkColor }}
        >
          <span className={`${s.rank} font-bold tracking-[-0.04em] leading-none`}>
            {card.rank}
          </span>
          <span className={`${s.suit} leading-none mt-0.5`}>{suitGlyph(card.suit)}</span>
        </div>
      </div>
    </motion.div>
  );
}
