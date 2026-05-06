import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCompactPoints } from "@/lib/utils";

interface BetPanelProps {
  betAmount: number;
  maxPoints: number;
  onBetChange: (amount: number) => void;
  onBet: () => void;
  disabled: boolean;
  loading: boolean;
  hasBet: boolean;
}

export function BetPanel({ betAmount, maxPoints, onBetChange, onBet, disabled, loading, hasBet }: BetPanelProps) {
  return (
    <div className="space-y-4">
      {hasBet ? (
        <div className="text-center py-3 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-green-700 font-medium">✅ Votre pari est enregistre !</p>
          <p className="text-sm text-green-600">Attendez le resultat du combat.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium">Montant de votre mise:</label>
            <Input
              type="number"
              min={10}
              max={Math.min(maxPoints, 10000)}
              value={betAmount || ""}
              onChange={(e) => {
                let val = parseInt(e.target.value) || 0;
                if (val > 10000) val = 10000;
                if (val > maxPoints) val = maxPoints;
                onBetChange(val);
              }}
              placeholder={`10 - ${Math.min(maxPoints, 10000).toLocaleString()} pts`}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => onBetChange(Math.min(betAmount + 10, Math.min(maxPoints, 10000)))} className="flex-1">+10</Button>
            <Button variant="outline" size="sm" onClick={() => onBetChange(Math.min(betAmount + 50, Math.min(maxPoints, 10000)))} className="flex-1">+50</Button>
            <Button variant="outline" size="sm" onClick={() => onBetChange(Math.min(betAmount + 100, Math.min(maxPoints, 10000)))} className="flex-1">+100</Button>
            <Button variant="outline" size="sm" onClick={() => onBetChange(Math.min(betAmount + 1000, Math.min(maxPoints, 10000)))} className="flex-1">+1000</Button>
            <Button variant="secondary" size="sm" onClick={() => onBetChange(Math.min(maxPoints, 10000))} className="flex-1">Max</Button>
          </div>
          <Button
            onClick={onBet}
            disabled={disabled || loading || betAmount < 10 || betAmount > 10000 || betAmount > maxPoints}
            className="w-full bg-[#F37338] hover:bg-[#E06328]"
            size="lg"
          >
            {loading ? "Paris en cours..." : `Parier ${betAmount > 0 ? formatCompactPoints(betAmount) + " pts" : ""}`}
          </Button>
        </>
      )}
    </div>
  );
}
