import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gift } from "lucide-react";
import { api } from "@/lib/api";
import type { PlayerType } from "@/types";

interface DailyRewardProps {
  userId: string;
  onRewardClaimed?: () => void;
}

export function DailyReward({ onRewardClaimed }: DailyRewardProps) {
  const [player, setPlayer] = useState<PlayerType | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [canClaim, setCanClaim] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkRewardStatus = useCallback((playerData: PlayerType) => {
    const now = new Date();
    const todayAt9 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0);
    const yesterdayAt9 = new Date(todayAt9);
    yesterdayAt9.setDate(yesterdayAt9.getDate() - 1);
    const currentWindowStart = now >= todayAt9 ? todayAt9 : yesterdayAt9;

    const lastClaimDate = playerData.last_daily_reward_claim ? new Date(playerData.last_daily_reward_claim) : null;

    if (!lastClaimDate || lastClaimDate < currentWindowStart) {
      setCanClaim(true);
    } else {
      setCanClaim(false);
      const tomorrowAt9 = new Date(todayAt9);
      tomorrowAt9.setDate(tomorrowAt9.getDate() + 1);
      const nextWindowStart = now >= todayAt9 ? tomorrowAt9 : todayAt9;
      const remaining = nextWindowStart.getTime() - now.getTime();
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      setTimeRemaining(`${hours}h ${minutes}m`);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    api.player.me().then((data) => {
      if (mounted) {
        setPlayer(data);
        checkRewardStatus(data);
      }
    }).catch(() => {}).finally(() => {
      if (mounted) setIsLoading(false);
    });
    return () => { mounted = false; };
  }, [checkRewardStatus]);

  const handleClaimReward = async () => {
    if (!player) return;
    try {
      const updated = await api.player.dailyReward();
      setPlayer(updated);
      checkRewardStatus(updated);
      setShowModal(false);
      if (onRewardClaimed) onRewardClaimed();
    } catch (err) {
      console.error("Erreur lors de la reclamation:", err);
    }
  };

  if (isLoading) return null;

  return (
    <>
      <div className="rounded-[40px] border border-[#D1CDC7] bg-[#FCFBFA] p-8 halo-soft flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-2">
          <span className="eyebrow">Bonus</span>
          <h3 className="text-2xl md:text-3xl font-medium tracking-[-0.03em] text-[#141413]">Recompense quotidienne</h3>
          <p className="text-sm text-[#696969] max-w-md">
            +50 points chaque jour a partir de 9h00. Connectez-vous pour les
            reclamer avant que la fenetre ne se referme.
          </p>
        </div>
        {canClaim ? (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2.5 px-7 py-3 bg-[#141413] text-[#F3F0EE] rounded-[999px] font-medium text-sm tracking-[-0.02em] hover:bg-[#262627] transition-colors active:scale-[0.98] shrink-0"
          >
            <Gift className="w-4 h-4 text-[#F37338]" />
            Reclamer maintenant
          </button>
        ) : timeRemaining ? (
          <span className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-white border border-[#D1CDC7] rounded-[999px] text-sm text-[#696969] tracking-[-0.02em] shrink-0">
            <Gift className="w-4 h-4" />
            Dans {timeRemaining}
          </span>
        ) : null}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md rounded-[40px] bg-[#FCFBFA] border-[#D1CDC7]">
          <DialogHeader className="text-center items-center">
            <div className="mx-auto w-16 h-16 bg-[#141413] rounded-full flex items-center justify-center mb-4">
              <Gift className="w-8 h-8 text-[#F37338]" />
            </div>
            <DialogTitle className="text-2xl font-medium tracking-[-0.02em]">Recompense Quotidienne !</DialogTitle>
            <DialogDescription className="text-[#696969]">
              {player?.last_daily_reward_claim ? "Vous etes de retour ! Voici votre recompense pour aujourd'hui." : "Bienvenue ! Profitez de votre premiere recompense."}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-[#F3F0EE] rounded-[20px] p-6 text-center my-2">
            <p className="text-3xl font-medium tracking-[-0.02em] text-[#141413]">+50 points</p>
            <p className="text-sm text-[#696969] mt-1">Disponible tous les jours a 9h00</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleClaimReward} className="flex-1">Reclamer</Button>
            <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">Plus tard</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
