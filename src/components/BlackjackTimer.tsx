import { motion } from "motion/react";

interface BlackjackTimerProps {
  remaining: number;
  total: number;
  label?: string;
  variant?: "default" | "compact";
}

export function BlackjackTimer({
  remaining,
  total,
  label,
  variant = "default",
}: BlackjackTimerProps) {
  const progress = total > 0 ? Math.min(1, Math.max(0, remaining / total)) : 0;
  const isUrgent = remaining <= 3;

  const barColor = isUrgent ? "#CF4500" : "#F37338";
  const isCompact = variant === "compact";

  return (
    <motion.div
      layout
      className="flex flex-col items-center gap-1.5"
    >
      {label && (
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#696969]">
          {label}
        </span>
      )}

      <div
        className={`relative ${isCompact ? "w-[180px]" : "w-[260px]"} h-1.5 rounded-full overflow-hidden bg-[#E8E4E0]`}
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: barColor, originX: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ type: "spring", stiffness: 140, damping: 22, mass: 0.5 }}
        />
        {isUrgent && (
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            animate={{ opacity: [0, 0.6, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
            style={{ boxShadow: `0 0 10px 2px ${barColor}` }}
          />
        )}
      </div>

      <motion.span
        layout
        className={`text-xs font-bold tabular-nums tracking-[-0.02em] ${
          isUrgent ? "text-[#CF4500]" : "text-[#141413]"
        }`}
        animate={isUrgent ? { scale: [1, 1.12, 1] } : { scale: 1 }}
        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
      >
        {remaining}s
      </motion.span>
    </motion.div>
  );
}
