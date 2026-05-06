import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactPoints } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { BabyFightHistoryEntryLocal } from "@/hooks/useBabyFight";

interface FightHistoryProps {
  history: BabyFightHistoryEntryLocal[];
}

export function FightHistory({ history }: FightHistoryProps) {
  if (history.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">📋 Derniers combats</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {history.map((fight) => {
            const winnerName = fight.winner === 1 ? fight.babyA.name : fight.babyB.name;
            const date = new Date(fight.scheduledAt);
            const timeStr = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

            return (
              <div key={fight.id} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{timeStr}</span>
                  <Badge variant="outline" className="text-xs">Combat #{fight.id}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className={fight.winner === 1 ? "font-bold text-[#F37338]" : "text-muted-foreground"}>
                    {fight.babyA.name}
                  </span>
                  <span className="text-xs text-muted-foreground">VS</span>
                  <span className={fight.winner === 2 ? "font-bold text-[#F37338]" : "text-muted-foreground"}>
                    {fight.babyB.name}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>🏆 {winnerName}</span>
                  <span>
                    Pot: {formatCompactPoints(fight.totalPotA + fight.totalPotB)} pts
                  </span>
                  <span>{fight.betCount} parieurs</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
