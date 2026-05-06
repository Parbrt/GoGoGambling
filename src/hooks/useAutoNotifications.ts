import { useEffect, useRef } from "react";
import { useNotifications } from "@/context/NotificationContext";
import { api } from "@/lib/api";
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
  const currentPlayerRef = useRef(currentPlayer);

  useEffect(() => {
    currentPlayerRef.current = currentPlayer;
  });

  useEffect(() => {
    if (!currentUserId) return;

    const checkInterval = setInterval(async () => {
      try {
        const player = currentPlayerRef.current;
        if (!player) return;

        const players = await api.leaderboard.list();
        const sortedPlayers = players.sort((a, b) => {
          const netA = a.nb_point - a.nb_debt;
          const netB = b.nb_point - b.nb_debt;
          return netB - netA;
        });

        const currentRank = sortedPlayers.findIndex(p => p.user_id === currentUserId) + 1;
        const previousRank = previousRankRef.current;

        if (previousRank > 0 && currentRank > previousRank) {
          const overtakenBy = sortedPlayers[previousRank - 1];
          if (overtakenBy && overtakenBy.is_online) {
            addNotification({
              type: "ranking",
              title: "📉 Vous avez ete depasse !",
              message: `${overtakenBy.player_name} vous a depasse au classement. Reprenez votre place !`,
              duration: 8000,
            });
          }
        }

        if (previousRank > 0 && currentRank < previousRank) {
          const overtook = sortedPlayers[currentRank];
          if (overtook && overtook.is_online) {
            addNotification({
              type: "success",
              title: "📈 Vous avez depasse quelqu'un !",
              message: `Vous avez depasse ${overtook.player_name} au classement. Continuez comme ca !`,
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
  }, [currentUserId, addNotification]);

  useEffect(() => {
    const player = currentPlayerRef.current;
    if (!player) return;

    const currentNetWorth = player.nb_point - player.nb_debt;
    const previousNetWorth = previousNetWorthRef.current;

    if (previousNetWorth >= 50 && currentNetWorth < 50) {
      addNotification({
        type: "warning",
        title: "⚠️ Fonds insuffisants",
        message: "Vous etes sous la barre des 50 points. Attention a la faillite !",
        duration: 10000,
      });
    }

    previousNetWorthRef.current = currentNetWorth;
  }, [currentPlayer, addNotification]);
}
