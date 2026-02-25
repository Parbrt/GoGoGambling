import { useEffect, useState, useCallback } from "react";
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
import { getPlayerByUserId, claimDailyReward } from "@/lib/supabase";
import type { PlayerType } from "@/types";

interface DailyRewardProps {
  userId: string;
  onRewardClaimed?: () => void;
}

export function DailyReward({ userId, onRewardClaimed }: DailyRewardProps) {
  const [player, setPlayer] = useState<PlayerType | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [canClaim, setCanClaim] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkRewardStatus = useCallback((playerData: PlayerType) => {
    const now = new Date();
    
    // Heure de récompense : 9h00
    const REWARD_HOUR = 9;
    const REWARD_MINUTE = 0;
    
    // Date d'aujourd'hui à 9h00
    const todayAt9 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), REWARD_HOUR, REWARD_MINUTE);
    
    // Date de demain à 9h00
    const tomorrowAt9 = new Date(todayAt9);
    tomorrowAt9.setDate(tomorrowAt9.getDate() + 1);
    
    // Récupérer la dernière réclamation depuis la base de données
    const lastClaimDate = playerData.last_daily_reward_claim 
      ? new Date(playerData.last_daily_reward_claim) 
      : null;
    
    // Vérifier si on peut réclamer
    let claimable = false;
    
    if (!lastClaimDate) {
      // Jamais réclamé
      claimable = true;
    } else {
      // Vérifier si la dernière réclamation était avant aujourd'hui à 9h
      const lastClaimWasBeforeToday9 = lastClaimDate < todayAt9;
      
      if (lastClaimWasBeforeToday9) {
        claimable = true;
      } else {
        // Déjà réclamé aujourd'hui après 9h
        claimable = false;
        const remaining = tomorrowAt9.getTime() - now.getTime();
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemaining(`${hours}h ${minutes}m`);
      }
    }
    
    setCanClaim(claimable);
  }, []);

  useEffect(() => {
    let mounted = true;
    
    const loadPlayer = async () => {
      try {
        const playerData = await getPlayerByUserId(userId);
        if (mounted && playerData) {
          setPlayer(playerData);
          checkRewardStatus(playerData);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadPlayer();
    
    return () => {
      mounted = false;
    };
  }, [userId, checkRewardStatus]);

  const handleClaimReward = async () => {
    if (!player) return;

    try {
      await claimDailyReward(userId, player.nb_point);

      // Recharger les données du player pour avoir la nouvelle date de réclamation
      const updatedPlayer = await getPlayerByUserId(userId);
      if (updatedPlayer) {
        setPlayer(updatedPlayer);
        checkRewardStatus(updatedPlayer);
      }

      setShowModal(false);

      if (onRewardClaimed) {
        onRewardClaimed();
      }
    } catch (error) {
      console.error('Erreur lors de la réclamation:', error);
    }
  };

  const openModal = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  if (isLoading) {
    return null;
  }

  return (
    <>
      {/* Badge du timer ou bouton de réclamation */}
      <div className="text-sm text-muted-foreground mt-4">
        {canClaim ? (
          <Button 
            onClick={openModal} 
            variant="outline" 
            className="gap-2 bg-yellow-50 border-yellow-300 hover:bg-yellow-100 text-yellow-800"
          >
            <Gift className="w-4 h-4" />
            Récompense disponible !
          </Button>
        ) : timeRemaining ? (
          <Badge variant="outline">Prochaine récompense à 9h00 (dans {timeRemaining})</Badge>
        ) : null}
      </div>

      {/* Modal - ne s'affiche que quand on clique sur le bouton */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <Gift className="w-8 h-8 text-yellow-600" />
            </div>
            <DialogTitle className="text-2xl">Récompense Quotidienne !</DialogTitle>
            <DialogDescription>
              {player?.last_daily_reward_claim
                ? "Vous êtes de retour ! Voici votre récompense pour aujourd'hui."
                : "Bienvenue ! Profitez de votre première récompense."}
            </DialogDescription>
          </DialogHeader>
          
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4 text-center">
              <p className="text-yellow-800 font-bold text-xl">+50 points</p>
              <p className="text-sm text-yellow-600 mt-1">Disponible tous les jours à 9h00</p>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={handleClaimReward} className="flex-1">
              Réclamer
            </Button>
            <Button variant="outline" onClick={closeModal} className="flex-1">
              Plus tard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
