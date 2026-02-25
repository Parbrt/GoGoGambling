import { SlotMachine } from "@/components/SlotMachine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlayerType } from "@/types";

interface SlotMachinePageProps {
  userId: string;
  player: PlayerType;
  onPlayerUpdate: (player: PlayerType) => void;
}

export function SlotMachinePage({ userId, player, onPlayerUpdate }: SlotMachinePageProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">🎰 Machine à Sous</h1>
        <p className="text-muted-foreground">
          Faites tourner les rouleaux et tentez votre chance pour gagner gros !
        </p>
      </div>

      <SlotMachine
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
            <li>Choisissez votre mise</li>
            <li>Lancez les rouleaux</li>
            <li>Alignez 3, 4 ou 5 numéros identiques pour gagner</li>
            <li>Le numéro 7 est le jackpot (x10 à x500)</li>
            <li>Une séquence croissante (0-1-2-3-4, etc.) remporte tous les points de la machine !</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
