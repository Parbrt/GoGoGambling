import { ChickenFight } from "../components/ChickenFight";
import type { PlayerType } from "../types";

interface ChickenFightPageProps {
  userId: string;
  player: PlayerType;
  onPlayerUpdate: (player: PlayerType) => void;
}

export function ChickenFightPage({ userId, player, onPlayerUpdate }: ChickenFightPageProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">🐔 Chicken Fight</h1>
        <p className="text-gray-600">
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

      <div className="mt-8 bg-blue-50 rounded-lg p-4">
        <h3 className="font-bold text-blue-800 mb-2">Comment jouer ?</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Analysez les statistiques de chaque poulet</li>
          <li>Sélectionnez celui que vous pensez être le plus fort</li>
          <li>Choisissez votre mise</li>
          <li>La cote est calculée en fonction des mises totales</li>
          <li>Si vous gagnez, vous remportez votre mise × la cote !</li>
        </ul>
      </div>
    </div>
  );
}
