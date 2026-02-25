import { useEffect, useRef } from "react";
import { useNotifications } from "@/context/NotificationContext";
import { supabase } from "@/lib/supabase";

interface UseGlobalNotificationsProps {
  currentUserId: string | null;
}

export function useGlobalNotifications({ currentUserId }: UseGlobalNotificationsProps) {
  const { addNotification } = useNotifications();
  const lastJackpotRef = useRef<number>(0);
  const previousLowPointsRef = useRef<string[]>([]);

  useEffect(() => {
    // Subscribe to slot machine changes for jackpot notifications
    const subscription = supabase
      .channel("slot_machine_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "slot_machine",
        },
        (payload) => {
          const newJackpot = payload.new?.nb_point;
          const oldJackpot = payload.old?.nb_point;
          
          // If jackpot dropped significantly (someone won it)
          if (oldJackpot > 10000 && newJackpot <= 10000) {
            // Someone won the jackpot!
            addNotification({
              type: "jackpot",
              title: "🎰 JACKPOT GAGNÉ !",
              message: `Quelqu'un vient de remporter ${oldJackpot.toLocaleString()} points à la machine à sous ! Le jackpot est réinitialisé à 10,000 points.`,
              duration: 10000,
            });
          }
          
          lastJackpotRef.current = newJackpot;
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [addNotification]);

  // Check for low points players - only notify when someone NEW goes below 50
  useEffect(() => {
    const checkLowPoints = async () => {
      try {
        const { data: players } = await supabase
          .from("player")
          .select("player_name, nb_point, nb_debt, user_id");

        if (!players) return;

        // Find players currently below 50
        const currentLowPointsPlayers = players
          .filter(p => (p.nb_point - p.nb_debt) < 50)
          .map(p => p.user_id);

        // Find NEW players who just went below 50 (weren't in the previous check)
        const newLowPointsPlayers = currentLowPointsPlayers.filter(
          id => !previousLowPointsRef.current.includes(id)
        );

        // Notify about one new player (if any)
        if (newLowPointsPlayers.length > 0) {
          // Pick the first new player
          const playerToNotify = players.find(p => p.user_id === newLowPointsPlayers[0]);
          
          if (playerToNotify && playerToNotify.user_id !== currentUserId) {
            addNotification({
              type: "warning",
              title: "⚠️ Joueur en difficulté",
              message: `${playerToNotify.player_name} est sous la barre des 50 points. La faillite guette !`,
              duration: 6000,
            });
          }
        }

        // Update the list of previously low points players
        // Keep only players still below 50, remove those who recovered
        previousLowPointsRef.current = currentLowPointsPlayers;
      } catch (error) {
        console.error("Error checking low points:", error);
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkLowPoints, 30000);

    return () => clearInterval(interval);
  }, [currentUserId, addNotification]);
}
