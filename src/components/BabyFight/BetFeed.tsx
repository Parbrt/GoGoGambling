import { useEffect, useRef } from "react";
import { formatCompactPoints } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { BabyFightBet } from "@/lib/babyFightGame";

interface BetFeedProps {
  bets: BabyFightBet[];
  babyAName: string;
  babyBName: string;
}

export function BetFeed({ bets, babyAName, babyBName }: BetFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const realBets = bets.filter((b) => !b.isBot);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [realBets.length]);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F37338] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F37338]" />
        </span>
        <span className="text-sm font-semibold">Paris en direct</span>
        {realBets.length > 0 && (
          <Badge variant="secondary" className="ml-auto text-xs">
            {realBets.length} pari{realBets.length > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <div ref={scrollRef} className="max-h-48 overflow-y-auto divide-y divide-border/50">
        {realBets.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Aucun pari pour le moment — soyez le premier !
          </p>
        ) : (
          realBets.map((bet, i) => (
            <div
              key={`${bet.playerName}-${i}`}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
            >
              <span className="font-semibold text-sm truncate min-w-0 flex-1">
                {bet.playerName}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">
                <span className="font-bold text-foreground">{formatCompactPoints(bet.amount)}</span>
                {" pts sur "}
              </span>
              <Badge
                className={`text-xs shrink-0 ${
                  bet.betOn === 1
                    ? "bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200"
                    : "bg-red-100 text-red-700 hover:bg-red-100 border-red-200"
                }`}
                variant="outline"
              >
                {bet.betOn === 1 ? babyAName : babyBName}
              </Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
