import { useEffect, useState } from "react";
import { getPlayerByUserId, supabase } from "../lib/supabase";
import type { PlayerType } from "../types";

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

  // Afficher automatiquement la popup si on peut claim
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
      // Nouvel utilisateur - peut claim immédiatement
      setCanClaim(true);
    }
  };

  const checkIfCanClaim = (lastLogin: string) => {
    const lastLoginDate = new Date(lastLogin);
    const now = new Date();
    const diffTime = now.getTime() - lastLoginDate.getTime();
    const diffHours = diffTime / (1000 * 3600);

    if (diffHours >= 24) {
      setCanClaim(true);
    } else {
      setCanClaim(false);

      const nextClaim = new Date(lastLoginDate.getTime() + 24 * 60 * 60 * 1000);
      const remaining = nextClaim.getTime() - now.getTime();
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      setTimeRemaining(`${hours}h ${minutes}m`);
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

    // Notifier le parent pour rafraîchir les données
    if (onRewardClaimed) {
      onRewardClaimed();
    }
  };

  const closeModal = () => {
    setShowModal(false);
  };

  // Si on ne peut pas claim ou que la récompense a déjà été prise, ne rien afficher
  if (!canClaim || rewardClaimed) {
    return (
      <div className="text-sm text-gray-500 mt-4">
        {!canClaim && timeRemaining && (
          <p>Prochaine récompense dans : {timeRemaining}</p>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-[0_20px_60px_rgba(0,0,0,0.3)] transform transition-all">
            <div className="text-center">
              {/* Icône cadeau */}
              <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-4xl">🎁</span>
              </div>

              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Récompense Quotidienne !
              </h2>

              <p className="text-gray-600 mb-6">
                {player?.last_login
                  ? "Vous êtes de retour ! Voici votre récompense pour aujourd'hui."
                  : "Bienvenue ! Profitez de votre première récompense."}
              </p>

              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-yellow-800 font-semibold text-lg">
                  +50 points
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={claimReward}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  Réclamer
                </button>
                <button
                  onClick={closeModal}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  Plus tard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bouton pour ouvrir manuellement la modal (optionnel) */}
      {!showModal && canClaim && !rewardClaimed && (
        <button
          onClick={() => setShowModal(true)}
          className="fixed bottom-4 right-4 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-all duration-200 hover:scale-105 flex items-center gap-2"
        >
          <span>🎁</span>
          <span>Récompense disponible !</span>
        </button>
      )}
    </>
  );
}
