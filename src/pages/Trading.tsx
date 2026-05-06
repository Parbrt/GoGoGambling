import { useState, useEffect, useCallback } from "react";
import { ShareTrading } from "@/components/ShareTrading";
import { ShareChart } from "@/components/ShareChart";
import type { PlayerType, ShareStats } from "@/types";
import { api } from "@/lib/api";
import { cacheGet, cacheHas } from "@/lib/cache";
import { useWebSocket } from "@/hooks/useWebSocket";

interface TradingProps {
  player: PlayerType;
  onPlayerUpdate: (player: PlayerType) => void;
}

interface HistoryPoint {
  value_share_A: number;
  value_share_B: number;
  time_update: string;
}

export function Trading({ player, onPlayerUpdate }: TradingProps) {
  const [prices, setPrices] = useState<{ priceA: number; priceB: number }>(() =>
    cacheGet<{ priceA: number; priceB: number }>("/api/shares/current") ?? { priceA: 2000, priceB: 300 }
  );
  const [history, setHistory] = useState<HistoryPoint[]>(() => {
    const raw = cacheGet<Array<{ value_share_A: number; value_share_B: number; time_update: string }>>("/api/shares/history?limit=50");
    return raw?.map(s => ({ value_share_A: s.value_share_A, value_share_B: s.value_share_B, time_update: s.time_update })) ?? [];
  });
  const [stats, setStats] = useState<ShareStats | null>(null);
  const [isLoading, setIsLoading] = useState(() => !cacheHas("/api/shares/current"));

  useWebSocket({
    onPriceUpdate: useCallback((data: { priceA: number; priceB: number }) => {
      setPrices({ priceA: data.priceA, priceB: data.priceB });
    }, []),
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [currentPrices, shareHistory, shareStats] = await Promise.all([
          api.shares.current(),
          api.shares.history(50),
          api.shares.stats(),
        ]);
        if (cancelled) return;
        setPrices({ priceA: currentPrices.priceA, priceB: currentPrices.priceB });
        setStats(shareStats);

        if (shareHistory.length > 0) {
          setHistory(shareHistory.map(s => ({
            value_share_A: s.value_share_A,
            value_share_B: s.value_share_B,
            time_update: s.time_update,
          })));
        } else {
          const now = new Date();
          const mock: HistoryPoint[] = [];
          for (let i = 50; i >= 0; i--) {
            const time = new Date(now.getTime() - i * 60000);
            mock.push({
              value_share_A: 150 + (Math.random() - 0.5) * 10,
              value_share_B: 45 + (Math.random() - 0.5) * 5,
              time_update: time.toISOString(),
            });
          }
          setHistory(mock);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("[Trading] Erreur chargement:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setHistory(prev => {
      const now = new Date();
      const newPoint: HistoryPoint = {
        value_share_A: prices.priceA,
        value_share_B: prices.priceB,
        time_update: now.toISOString(),
      };
      return [...prev.slice(-49), newPoint];
    });
  }, [prices]);

  const handlePlayerUpdate = (updatedPlayer: PlayerType) => {
    onPlayerUpdate(updatedPlayer);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-24">
        <div className="flex justify-center items-center h-48">
          <div className="w-10 h-10 rounded-full border-2 border-[#141413] border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-16 md:py-24 space-y-20">
      <section className="relative">
        <div
          aria-hidden
          className="ghost-headline absolute -top-6 -right-2 text-[120px] md:text-[180px] select-none"
        >
          trade.
        </div>
        <div className="relative pt-12 md:pt-20 space-y-3">
          <span className="eyebrow">Trading</span>
          <h1 className="text-5xl md:text-6xl font-medium tracking-[-0.03em] text-[#141413] leading-[1.02]">
            Achetez, vendez,
            <br />
            <span className="text-[#3860BE]">anticipez.</span>
          </h1>
          <p className="text-[#555555] text-base md:text-lg max-w-md leading-relaxed pt-2">
            Suivez les cours en direct et passez vos ordres en un clic.
          </p>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="eyebrow">Marches</span>
            <h2 className="text-3xl md:text-4xl font-medium tracking-[-0.03em] text-[#141413]">
              Cours en direct.
            </h2>
          </div>
        </div>
        <ShareChart
          history={history}
          currentPriceA={prices.priceA}
          currentPriceB={prices.priceB}
          stats={stats}
          playerShares={{
            nb_share_A: player.nb_share_A,
            avg_share_A_value: player.avg_share_A_value,
            nb_share_B: player.nb_share_B,
            avg_share_B_value: player.avg_share_B_value,
          }}
        />
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <span className="eyebrow">Ordres</span>
          <h2 className="text-3xl md:text-4xl font-medium tracking-[-0.03em] text-[#141413]">
            Passez a l'action.
          </h2>
        </div>
        <ShareTrading
          player={player}
          prices={prices}
          onPlayerUpdate={handlePlayerUpdate}
        />
      </section>
    </div>
  );
}
