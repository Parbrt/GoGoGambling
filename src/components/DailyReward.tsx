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

// Clé localStorage pour stocker la dernière réclamation
const getStorageKey = (userId: string) => `dailyReward_${userId}`;

export function DailyReward({ userId, onRewardClaimed }: DailyRewardProps) {
  const [player, setPlayer] = useState<PlayerType | null>(null);
  const [canClaim, setCanClaim] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    loadPlayer();
  }, [userId]);

  useEffect(() => {
    if (canClaim) {
      setShowModal(true);
    }
  }, [canClaim]);

  const loadPlayer = async () => {
    const playerData = await getPlayerByUserId(userId);
    setPlayer(playerData);
    checkIfCanClaim();
  };

  const checkIfCanClaim = () => {
    const now = new Date();
    
    // Heure de récompense : 9h00
    const REWARD_HOUR = 9;
    const REWARD_MINUTE = 0;
    
    // Date d'aujourd'hui à 9h00
    const todayAt9 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), REWARD_HOUR, REWARD_MINUTE);
    
    // Date de demain à 9h00
    const tomorrowAt9 = new Date(todayAt9);
    tomorrowAt9.setDate(tomorrowAt9.getDate() + 1);
    
    // Récupérer la dernière réclamation depuis localStorage
    const storageKey = getStorageKey(userId);
    const lastClaimStr = localStorage.getItem(storageKey);
    const lastClaimDate = lastClaimStr ? new Date(lastClaimStr) : null;
    
    // Vérifier si on peut réclamer
    let canClaimReward = false;
    
    if (!lastClaimDate) {
      // Jamais réclamé
      canClaimReward = true;
    } else {
      // Vérifier si la dernière réclamation était avant aujourd'hui à 9h
      const lastClaimWasBeforeToday9 = lastClaimDate < todayAt9;
      
      if (lastClaimWasBeforeToday9) {
        canClaimReward = true;
      } else {
        // Déjà réclamé aujourd'hui après 9h
        canClaimReward = false;
        const remaining = tomorrowAt9.getTime() - now.getTime();
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemaining(`${hours}h ${minutes}m`);
      }
    }
    
    setCanClaim(canClaimReward);
  };

  const claimReward = async () => {
    if (!player) return;

    const { error } = await supabase
      .from('player')
      .update({
        nb_point: player.nb_point + 50,
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Erreur lors de la réclamation:', error);
      return;
    }

    // Sauvegarder la date de réclamation dans localStorage
    const storageKey = getStorageKey(userId);
    localStorage.setItem(storageKey, new Date().toISOString());

    setShowModal(false);
    setCanClaim(false);

    if (onRewardClaimed) {
      onRewardClaimed();
    }
  };

  const closeModal = () => {
    setShowModal(false);
  };

  if (!canClaim) {
    return (
      <div className="text-sm text-muted-foreground mt-4">
        {timeRemaining && (
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
              {localStorage.getItem(getStorageKey(userId))
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

      {!showModal && canClaim && (
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
