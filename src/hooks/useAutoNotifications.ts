import { useEffect, useRef } from "react";
import { useNotifications } from "@/context/NotificationContext";
import { getPlayersInfo } from "@/lib/supabase";
import type { PlayerType } from "@/types";

interface UseAutoNotificationsProps {
  currentUserId: string | null;
  currentPlayer: PlayerType | null;
}

export function useAutoNotifications({ currentUserId, currentPlayer }: UseAutoNotificationsProps) {
  const { addNotification } = useNotifications();
  const previousPlayersRef = useRef<PlayerType[]>([]);
  const previousRankRef = useRef<number>(0);
  const previousNetWorthRef = useRef<number>(0);

  useEffect(() => {
    if (!currentUserId || !currentPlayer) return;

    // Check for ranking changes every 10 seconds
    const checkInterval = setInterval(async () => {
      try {
        const players = await getPlayersInfo();
        
        // Sort by net worth (points - debt)
        const sortedPlayers = players.sort((a, b) => {
          const netA = a.nb_point - a.nb_debt;
          const netB = b.nb_point - b.nb_debt;
          return netB - netA;
        });

        // Find current player's rank
        const currentRank = sortedPlayers.findIndex(p => p.user_id === currentUserId) + 1;
        const previousRank = previousRankRef.current;

        // Check if player was overtaken (rank went down)
        if (previousRank > 0 && currentRank > previousRank) {
          const overtakenBy = sortedPlayers[previousRank - 1];
          if (overtakenBy) {
            addNotification({
              type: "ranking",
              title: "📉 Vous avez été dépassé !",
              message: `${overtakenBy.player_name} vous a dépassé au classement. Reprenez votre place !`,
              duration: 8000,
            });
          }
        }

        // Check if player overtook someone (rank went up)
        if (previousRank > 0 && currentRank < previousRank) {
          const overtook = sortedPlayers[currentRank];
          if (overtook) {
            addNotification({
              type: "success",
              title: "📈 Vous avez dépassé quelqu'un !",
              message: `Vous avez dépassé ${overtook.player_name} au classement. Continuez comme ça !`,
              duration: 5000,
            });
          }
        }

        previousRankRef.current = currentRank;
        previousPlayersRef.current = sortedPlayers;
      } catch (error) {
        console.error("Error checking rankings:", error);
      }
    }, 10000);

    return () => clearInterval(checkInterval);
  }, [currentUserId, currentPlayer, addNotification]);

  // Check for low points - only when crossing below 50
  useEffect(() => {
    if (!currentPlayer) return;

    const currentNetWorth = currentPlayer.nb_point - currentPlayer.nb_debt;
    const previousNetWorth = previousNetWorthRef.current;

    // Show notification only when crossing below 50 (was >= 50, now < 50)
    if (previousNetWorth >= 50 && currentNetWorth < 50) {
      addNotification({
        type: "warning",
        title: "⚠️ Fonds insuffisants",
        message: "Vous êtes sous la barre des 50 points. Attention à la faillite !",
        duration: 10000,
      });
    }

    previousNetWorthRef.current = currentNetWorth;
  }, [currentPlayer, addNotification]);
}
