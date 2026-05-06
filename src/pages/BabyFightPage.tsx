import { BabyFight } from "@/components/BabyFight";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlayerType } from "@/types";

interface BabyFightPageProps {
  userId: string;
  player: PlayerType;
  onPlayerUpdate: (player: PlayerType) => void;
}

export function BabyFightPage({ player, onPlayerUpdate }: BabyFightPageProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">👶 Baby Fight</h1>
        <p className="text-muted-foreground">
          Pariez sur le meilleur bebe ! Un combat chaque heure, gains jusqu&apos;a 50x.
        </p>
      </div>

      <BabyFight player={player} onPlayerUpdate={onPlayerUpdate} />

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-base">Comment jouer ?</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>Un nouveau combat est genere toutes les heures</li>
            <li>Analysez les statistiques de chaque bebe (Bave, Colere, Odeur, Gaz, Chance)</li>
            <li>Selectionnez le bebe que vous pensez etre le plus fort</li>
            <li>Placez votre mise (10 - 10 000 points)</li>
            <li>Les cotes evoluent en temps reel en fonction des mises de tous les joueurs</li>
            <li>Un seul pari par joueur et par combat</li>
            <li>Les gains peuvent atteindre jusqu&apos;a 50x votre mise !</li>
            <li>Le combat se deroule automatiquement a la fin de l&apos;heure</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="bg-amber-50 border-amber-200">
        <CardHeader>
          <CardTitle className="text-base">⚠️ Important</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
            <li>Vous ne pouvez parier qu&apos;une seule fois par combat</li>
            <li>Le pot minimum est garanti a 500 points par le systeme</li>
            <li>Les cotes sont plafonnees a 50x maximum</li>
            <li>Les paris sont definitifs et ne peuvent pas etre modifies</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
