import { useMemo } from "react";
import { getRankInfo } from "@/lib/ranks";

interface RankBadgeProps {
  peakNetWorth: number;
}

export function RankBadge({ peakNetWorth }: RankBadgeProps) {
  const rank = useMemo(() => getRankInfo(peakNetWorth), [peakNetWorth]);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium tracking-[-0.02em] text-[#141413]">
            {rank.title}
          </p>
          <p className="text-xs text-[#696969] font-medium">
            Niveau {rank.level}
          </p>
        </div>
        {rank.nextThreshold !== null && (
          <p className="text-xs text-[#696969] tabular-nums">
            {peakNetWorth.toLocaleString()} / {rank.nextThreshold.toLocaleString()} pts
          </p>
        )}
      </div>
      <div className="relative w-full h-2.5 bg-[#E8E4E0] rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${rank.progress * 100}%`,
            background: "linear-gradient(90deg, #CF4500, #F37338)",
          }}
        />
      </div>
      {rank.nextThreshold === null && (
        <p className="text-xs text-[#9A3A0A] font-medium">
          Rang maximum atteint !
        </p>
      )}
    </div>
  );
}
