import { useEffect, useRef } from "react";
import { formatCompactPoints } from "@/lib/utils";
import { useNotifications } from "@/context/NotificationContext";
import { api } from "@/lib/api";

interface UseMarketplaceNotificationsProps {
  currentUserId: string | null;
}

export function useMarketplaceNotifications({ currentUserId }: UseMarketplaceNotificationsProps) {
  const { addNotification } = useNotifications();
  const seenTransactionsRef = useRef<Set<number>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!currentUserId) return;

    let cancelled = false;

    const pollTransactions = async () => {
      try {
        const txs = await api.shop.marketplace.transactions();

        if (!Array.isArray(txs) || cancelled) return;

        const mySales = txs.filter(
          (tx) => tx.seller_user_id === currentUserId
        );

        if (!initializedRef.current) {
          for (const tx of mySales) {
            seenTransactionsRef.current.add(tx.id as number);
          }
          initializedRef.current = true;
          return;
        }

        for (const tx of mySales) {
          const txId = tx.id as number;
          if (!seenTransactionsRef.current.has(txId)) {
            seenTransactionsRef.current.add(txId);
            addNotification({
              type: "marketplace",
              title: "Nouvelle vente !",
              message: `${tx.buyer_name} a achete ${tx.item_emoji} ${tx.item_name} pour ${formatCompactPoints(tx.price as number)} pts`,
              duration: 8000,
            });
          }
        }
      } catch {
        // Silently fail — notifications are non-critical
      }
    };

    pollTransactions();
    const interval = setInterval(pollTransactions, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [currentUserId, addNotification]);
}
