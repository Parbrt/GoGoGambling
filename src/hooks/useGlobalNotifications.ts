import { useEffect, useRef } from "react";
import { useNotifications } from "@/context/NotificationContext";
import { useWebSocket } from "@/hooks/useWebSocket";
import { api } from "@/lib/api";

interface UseGlobalNotificationsProps {
  currentUserId: string | null;
}

export function useGlobalNotifications({ currentUserId }: UseGlobalNotificationsProps) {
  const { addNotification } = useNotifications();
  const previousLowPointsRef = useRef<string[]>([]);

  // Listen for jackpot wins via WebSocket
  useWebSocket({
    onJackpotWin: (data) => {
      addNotification({
        type: "jackpot",
        title: "🎰 JACKPOT GAGNE !",
        message: `${data.winner} vient de remporter ${data.amount.toLocaleString()} points a la machine a sous ! Le jackpot est reinitialise a 10,000 points.`,
        duration: 10000,
      });
    },
  });

  // Check for low points players - only notify when someone NEW goes below 50
  useEffect(() => {
    const checkLowPoints = async () => {
      try {
        const players = await api.leaderboard.list();

        const currentLowPointsPlayers = players
          .filter(p => (p.nb_point - p.nb_debt) < 50)
          .map(p => p.user_id);

        const newLowPointsPlayers = currentLowPointsPlayers.filter(
          id => !previousLowPointsRef.current.includes(id)
        );

        if (newLowPointsPlayers.length > 0) {
          const playerToNotify = players.find(p => p.user_id === newLowPointsPlayers[0]);
          if (playerToNotify && playerToNotify.user_id !== currentUserId) {
            addNotification({
              type: "warning",
              title: "⚠️ Joueur en difficulte",
              message: `${playerToNotify.player_name} est sous la barre des 50 points. La faillite guette !`,
              duration: 6000,
            });
          }
        }

        previousLowPointsRef.current = currentLowPointsPlayers;
      } catch (error) {
        console.error("Error checking low points:", error);
      }
    };

    const interval = setInterval(checkLowPoints, 30000);
    return () => clearInterval(interval);
  }, [currentUserId, addNotification]);
}
