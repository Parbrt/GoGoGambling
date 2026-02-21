import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift } from "lucide-react";
import { getPlayerByUserId, supabase } from "@/lib/supabase";
import type { PlayerType } from "@/types";

interface DailyRewardProps {
  userId: string;
  onRewardClaimed?: () => void;
}

export function DailyReward({ userId, onRewardClaimed }: DailyRewardProps) {
  const [player, setPlayer] = useState<PlayerType | null>(null);
  const [canClaim, setCanClaim] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [rewardClaimed, setRewardClaimed] = useState(false);

  useEffect(() => {
    loadPlayer();
  }, [userId]);

  useEffect(() => {
    if (canClaim && !rewardClaimed) {
      setShowModal(true);
    }
  }, [canClaim, rewardClaimed]);

  const loadPlayer = async () => {
    const playerData = await getPlayerByUserId(userId);
    setPlayer(playerData);

    if (playerData?.last_login) {
      checkIfCanClaim(playerData.last_login);
    } else {
      setCanClaim(true);
    }
  };

  const checkIfCanClaim = (lastLogin: string) => {
    const now = new Date();
    const lastClaimDate = new Date(lastLogin);
    
    // Heure de récompense : 9h00
    const REWARD_HOUR = 9;
    const REWARD_MINUTE = 0;
    
    // Date d'aujourd'hui à 9h00
    const todayAt9 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), REWARD_HOUR, REWARD_MINUTE);
    
    // Date de demain à 9h00
    const tomorrowAt9 = new Date(todayAt9);
    tomorrowAt9.setDate(tomorrowAt9.getDate() + 1);
    
    // Date d'hier à 9h00
    const yesterdayAt9 = new Date(todayAt9);
    yesterdayAt9.setDate(yesterdayAt9.getDate() - 1);
    
    // Vérifier si la dernière réclamation était aujourd'hui après 9h
    const claimedTodayAfter9 = lastClaimDate >= todayAt9;
    
    // Vérifier si la dernière réclamation était hier après 9h et on est avant 9h aujourd'hui
    const claimedYesterdayAfter9 = lastClaimDate >= yesterdayAt9 && lastClaimDate < todayAt9;
    const before9Today = now < todayAt9;
    
    if (claimedTodayAfter9) {
      // Déjà réclamé aujourd'hui, prochaine demain à 9h
      setCanClaim(false);
      const remaining = tomorrowAt9.getTime() - now.getTime();
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      setTimeRemaining(`${hours}h ${minutes}m`);
    } else if (claimedYesterdayAfter9 && before9Today) {
      // Réclamé hier mais il est trop tôt aujourd'hui, attendre 9h
      setCanClaim(false);
      const remaining = todayAt9.getTime() - now.getTime();
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      setTimeRemaining(`${hours}h ${minutes}m`);
    } else {
      // Récompense disponible (soit on est après 9h et pas réclamé aujourd'hui, soit nouveau joueur)
      setCanClaim(true);
    }
  };

  const claimReward = async () => {
    if (!player) return;

    const { error } = await supabase
      .from('player')
      .update({
        nb_point: player.nb_point + 50,
        last_login: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Erreur lors de la réclamation:', error);
      return;
    }

    setRewardClaimed(true);
    setShowModal(false);
    setCanClaim(false);

    if (onRewardClaimed) {
      onRewardClaimed();
    }
  };

  const closeModal = () => {
    setShowModal(false);
  };

  if (!canClaim || rewardClaimed) {
    return (
      <div className="text-sm text-muted-foreground mt-4">
        {!canClaim && timeRemaining && (
          <Badge variant="outline">Prochaine récompense à 9h00 (dans {timeRemaining})</Badge>
        )}
      </div>
    );
  }

  return (
    <>
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <Gift className="w-8 h-8 text-yellow-600" />
            </div>
            <DialogTitle className="text-2xl">Récompense Quotidienne !</DialogTitle>
            <DialogDescription>
              {player?.last_login
                ? "Vous êtes de retour ! Voici votre récompense pour aujourd'hui."
                : "Bienvenue ! Profitez de votre première récompense."}
            </DialogDescription>
          </DialogHeader>
          
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="pt-6 text-center">
              <p className="text-yellow-800 font-bold text-xl">+50 points</p>
              <p className="text-sm text-yellow-600 mt-1">Disponible tous les jours à 9h00</p>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={claimReward} className="flex-1">
              Réclamer
            </Button>
            <Button variant="outline" onClick={closeModal} className="flex-1">
              Plus tard
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {!showModal && canClaim && !rewardClaimed && (
        <Button
          onClick={() => setShowModal(true)}
          className="fixed bottom-4 right-4 gap-2"
          size="lg"
        >
          <Gift className="w-5 h-5" />
          Récompense disponible !
        </Button>
      )}
    </>
  );
}
