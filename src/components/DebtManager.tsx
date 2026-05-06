import { useState } from "react";
import { formatCompactPoints } from "@/lib/utils";
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
    if (repayAmount <= 0 || repayAmount > player.nb_debt || repayAmount > player.nb_point) return;
    onPlayerUpdate({
      ...player,
      nb_point: player.nb_point - repayAmount,
      nb_debt: player.nb_debt - repayAmount,
    });
    setRepayAmount(0);
  };

  const maxRepayable = Math.min(player.nb_debt, player.nb_point);

  if (player.nb_debt <= 0) {
    return (
      <div className="bg-[#FCFBFA] border border-[#D1CDC7] rounded-[40px] p-8 halo-soft">
        <div className="space-y-2">
          <span className="eyebrow">Crédit sain</span>
          <div className="flex items-center gap-3">
            <Wallet className="w-6 h-6 text-[#141413]" />
            <h3 className="text-2xl font-medium tracking-[-0.03em] text-[#141413]">Aucune dette</h3>
          </div>
          <p className="text-sm text-[#696969]">
            Vous n'avez pas de dettes à rembourser. Continuez comme ça.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FCFBFA] border border-[#CF4500]/40 rounded-[40px] p-8 space-y-6 halo-soft">
      <div className="space-y-2">
        <span className="eyebrow">Remboursement</span>
        <div className="flex items-center gap-3 text-[#CF4500]">
          <AlertTriangle className="w-6 h-6" />
          <h3 className="text-2xl font-medium tracking-[-0.03em]">Gestion des Dettes</h3>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-[#696969]">Dette totale</p>
          <p className="text-2xl font-medium tracking-[-0.02em] text-[#CF4500]">{formatCompactPoints(player.nb_debt)} pts</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-[#696969]">Points disponibles</p>
          <p className="text-xl font-medium tracking-[-0.02em] text-[#141413]">{formatCompactPoints(player.nb_point)} pts</p>
        </div>
      </div>

      {player.nb_point > 0 ? (
        <div className="space-y-3">
          <label className="text-sm font-medium text-[#141413]">
            Montant à rembourser (max: {formatCompactPoints(maxRepayable)} pts)
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
            <Button variant="outline" onClick={() => setRepayAmount(maxRepayable)}>
              Max
            </Button>
            <Button
              onClick={handleRepay}
              disabled={repayAmount <= 0 || repayAmount > player.nb_point}
              className="bg-[#CF4500] text-white border-[#CF4500] hover:bg-[#b53d00]"
            >
              Rembourser
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-[#CF4500]/8 rounded-[16px] text-sm text-[#CF4500]">
          Vous n'avez pas de points pour rembourser vos dettes. Jouez pour en gagner ou vendez vos actions.
        </div>
      )}
    </div>
  );
}
