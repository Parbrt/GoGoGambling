import { ChickenFight } from "@/components/ChickenFight";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlayerType } from "@/types";

interface ChickenFightPageProps {
  userId: string;
  player: PlayerType;
  onPlayerUpdate: (player: PlayerType) => void;
}

export function ChickenFightPage({ userId, player, onPlayerUpdate }: ChickenFightPageProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">🐔 Chicken Fight</h1>
        <p className="text-muted-foreground">
          Pariez sur le meilleur poulet et gagnez des points !
        </p>
      </div>

      <ChickenFight
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
            <li>Analysez les statistiques de chaque poulet</li>
            <li>Sélectionnez celui que vous pensez être le plus fort</li>
            <li>Choisissez votre mise</li>
            <li>La cote est calculée en fonction des mises totales</li>
            <li>Si vous gagnez, vous remportez votre mise × la cote !</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
