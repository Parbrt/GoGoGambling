import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useNotifications } from "@/context/NotificationContext";

interface UseBlackjackNotificationsProps {
  currentUserId: string | null;
}

export function useBlackjackNotifications({ currentUserId }: UseBlackjackNotificationsProps) {
  const { addNotification } = useNotifications();
  const notifiedPlayersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel("blackjack-global-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "blackjack_table_players" },
        (payload) => {
          const player = payload.new as { user_id: string; player_name: string };
          if (!player || player.user_id === currentUserId) return;
          if (notifiedPlayersRef.current.has(player.user_id)) return;

          notifiedPlayersRef.current.add(player.user_id);

          addNotification({
            type: "info",
            title: "🃏 Table de Blackjack",
            message: `${player.player_name} a rejoint une table de Blackjack ! Rejoignez la partie !`,
            duration: 6000,
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "blackjack_table_players" },
        (payload) => {
          const player = payload.old as { user_id: string };
          if (player?.user_id) {
            notifiedPlayersRef.current.delete(player.user_id);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [currentUserId, addNotification]);
}
