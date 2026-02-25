import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Wallet } from "lucide-react";
import type { PlayerType } from "@/types";

interface DebtManagerProps {
  player: PlayerType;
  onPlayerUpdate: (player: PlayerType) => void;
}

export function DebtManager({ player, onPlayerUpdate }: DebtManagerProps) {
  const [repayAmount, setRepayAmount] = useState<number>(0);

  const handleRepay = () => {
    if (repayAmount <= 0 || repayAmount > player.nb_debt) return;
    if (repayAmount > player.nb_point) return;

    const updatedPlayer = {
      ...player,
      nb_point: player.nb_point - repayAmount,
      nb_debt: player.nb_debt - repayAmount,
    };

    onPlayerUpdate(updatedPlayer);
    setRepayAmount(0);
  };

  const maxRepayable = Math.min(player.nb_debt, player.nb_point);

  if (player.nb_debt <= 0) {
    return (
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-green-700">
            <Wallet className="w-5 h-5" />
            <span className="font-semibold">Aucune dette</span>
          </div>
          <p className="text-sm text-green-600 mt-1">
            Vous n'avez pas de dettes à rembourser.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-red-50 border-red-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          Gestion des Dettes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-red-600">Dette totale</p>
            <p className="text-2xl font-bold text-red-700">{player.nb_debt} points</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-red-600">Points disponibles</p>
            <p className="text-xl font-semibold text-red-700">{player.nb_point} points</p>
          </div>
        </div>

        {player.nb_point > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-red-700">
              Montant à rembourser (max: {maxRepayable} pts):
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                max={maxRepayable}
                value={repayAmount}
                onChange={(e) => setRepayAmount(Math.min(parseInt(e.target.value) || 0, maxRepayable))}
                className="flex-1"
              />
              <Button
                onClick={() => setRepayAmount(maxRepayable)}
                variant="outline"
              >
                Max
              </Button>
              <Button
                onClick={handleRepay}
                disabled={repayAmount <= 0 || repayAmount > player.nb_point}
                variant="destructive"
              >
                Rembourser
              </Button>
            </div>
          </div>
        )}

        {player.nb_point <= 0 && (
          <div className="p-3 bg-red-100 rounded text-red-700 text-sm">
            Vous n'avez pas de points pour rembourser vos dettes. 
            Jouez aux jeux pour gagner des points ou vendez vos actions.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
