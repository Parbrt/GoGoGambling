import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BABY_STATS, getScoreLabel, formatOdds } from "@/lib/babyFightGame";

interface BabyCardProps {
  name: string;
  stats: number[];
  odds: number;
  pot: number;
  betOn: 1 | 2;
  selected: boolean;
  onSelect: (betOn: 1 | 2) => void;
  disabled?: boolean;
}

export function BabyCard({ name, stats, odds, pot, betOn, selected, onSelect, disabled }: BabyCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        selected
          ? "border-[#F37338] ring-2 ring-[#F37338]/30 bg-[#F37338]/5"
          : "hover:border-[#F37338]/50"
      } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      onClick={() => onSelect(betOn)}
    >
      <CardHeader className="pb-2 text-center">
        <CardTitle className="text-xl flex items-center justify-center gap-2">
          <span>👶</span>
          <span>{name}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {BABY_STATS.map((statName, idx) => {
            const value = stats[idx];
            const label = getScoreLabel(value);
            return (
              <div key={statName} className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{statName}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        value > 66 ? "bg-green-500" : value > 33 ? "bg-yellow-500" : "bg-red-500"
                      }`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                  <Badge
                    variant="secondary"
                    className={`text-xs ${
                      value > 66
                        ? "bg-green-100 text-green-700 hover:bg-green-100"
                        : value > 33
                          ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                          : "bg-red-100 text-red-700 hover:bg-red-100"
                    }`}
                  >
                    {label}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
        <Separator />
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Cote</span>
            <Badge variant="default" className="font-bold text-base bg-[#F37338] hover:bg-[#F37338]">
              {formatOdds(odds)}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground text-center">
            Pot: {pot.toLocaleString()} pts
          </div>
        </div>
        {selected && (
          <div className="text-center">
            <Badge variant="outline" className="border-[#F37338] text-[#F37338]">
              ✓ Selectionne
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
