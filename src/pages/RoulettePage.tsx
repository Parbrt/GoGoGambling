import { Roulette } from "@/components/Roulette";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlayerType } from "@/types";

interface RoulettePageProps {
  userId: string;
  player: PlayerType;
  onPlayerUpdate: (player: PlayerType) => void;
}

export function RoulettePage({ userId, player, onPlayerUpdate }: RoulettePageProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">🎰 Roulette</h1>
        <p className="text-muted-foreground">
          Tentez votre chance à la roulette et gagnez gros !
        </p>
      </div>

      <Roulette
        userId={userId}
        currentPoints={player.nb_point}
        onPointsUpdate={(newPoints) => {
          onPlayerUpdate({ ...player, nb_point: newPoints });
        }}
      />

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-base">Comment jouer ?</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li><strong>Impair/Pair (x2):</strong> Pariez sur la parité du numéro gagnant</li>
            <li><strong>Numéro (x36):</strong> Pariez sur un numéro spécifique entre 0 et 35</li>
            <li>Si vous gagnez, vous remportez votre mise multipliée par le coefficient !</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
