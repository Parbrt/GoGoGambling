import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactPoints } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface PlayerResult {
  playerName: string;
  won: boolean;
  winnings: number;
  betAmount: number;
}

interface FightResultData {
  winner: 1 | 2;
  babyAName: string;
  babyBName: string;
  statsUsed: [number, number, number];
  statNames: [string, string, string];
  weights: [number, number, number];
  scores: { a: number; b: number };
  babyAValues: [number, number, number];
  babyBValues: [number, number, number];
  oddsA: number;
  oddsB: number;
  potA: number;
  potB: number;
  results: PlayerResult[];
}

interface FightResultProps {
  result: FightResultData;
}

export function FightResult({ result }: FightResultProps) {
  const winnerName = result.winner === 1 ? result.babyAName : result.babyBName;

  const sortedResults = [...result.results].sort((a, b) => {
    if (a.won !== b.won) return a.won ? -1 : 1;
    return b.winnings - a.winnings;
  });

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="text-6xl">👶</div>
        <div>
          <p className="text-2xl font-bold text-[#F37338]">🏆 {winnerName} remporte le combat !</p>
        </div>
      </div>

      <Card className="bg-muted/50 text-left">
        <CardHeader>
          <CardTitle className="text-base">Details du combat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-semibold text-[#F37338]">{result.babyAName}</p>
              <p>Score: {result.scores.a.toFixed(1)}</p>
            </div>
            <div>
              <p className="font-semibold text-[#F37338]">{result.babyBName}</p>
              <p>Score: {result.scores.b.toFixed(1)}</p>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <p className="font-semibold text-sm">Stats du combat:</p>
            {result.statNames.map((name, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm py-1 px-2 bg-background rounded">
                <span className="font-medium">{name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">
                    {result.babyAName}: <span className="font-bold">{result.babyAValues[idx]}</span>
                  </span>
                  <span className="text-muted-foreground">
                    {result.babyBName}: <span className="font-bold">{result.babyBValues[idx]}</span>
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {result.weights[idx]}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Cote {result.babyAName}</p>
              <p className="font-bold">1:{result.oddsA.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Cote {result.babyBName}</p>
              <p className="font-bold">1:{result.oddsB.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {sortedResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">💰 Gains des joueurs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto space-y-1.5">
              {sortedResults.map((r, i) => (
                <div
                  key={`${r.playerName}-${i}`}
                  className={`flex items-center justify-between text-sm py-1.5 px-3 rounded ${
                    r.won ? "bg-green-50" : "bg-red-50"
                  }`}
                >
                  <span className="font-medium truncate mr-2">{r.playerName}</span>
                  <span className={r.won ? "text-green-700 font-bold" : "text-red-500"}>
                    {r.won ? `+${formatCompactPoints(r.winnings)}` : `-${formatCompactPoints(r.betAmount)}`} pts
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
