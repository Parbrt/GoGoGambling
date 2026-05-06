import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BabyFightBet } from "@/lib/babyFightGame";

interface BetFeedProps {
  bets: BabyFightBet[];
  babyAName: string;
  babyBName: string;
}

export function BetFeed({ bets, babyAName, babyBName }: BetFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [bets.length]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">📡 Paris en direct</CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={scrollRef} className="max-h-48 overflow-y-auto space-y-1.5">
          {bets.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun pari pour le moment. Soyez le premier !
            </p>
          )}
          {bets.map((bet, i) => (
            <div
              key={`${bet.playerName}-${i}`}
              className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-muted/50"
            >
              <span className="font-medium truncate mr-2">{bet.playerName}</span>
              <span className="text-muted-foreground">
                mise <span className="font-bold text-foreground">{bet.amount.toLocaleString()}</span> pts
                sur <span className={`font-bold ${bet.betOn === 1 ? "text-blue-600" : "text-red-600"}`}>
                  {bet.betOn === 1 ? babyAName : babyBName}
                </span>
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
