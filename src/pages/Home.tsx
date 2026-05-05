import { useState, useEffect, useMemo, useCallback } from "react";
import { DailyReward } from "@/components/DailyReward";
import { ShareChart } from "@/components/ShareChart";
import type { PlayerType } from "@/types";
import type { User } from "@supabase/supabase-js";
import { api } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import { generateMockHistory } from "@/lib/shareLogic";

interface HomeProps {
  user: User;
  player: PlayerType;
  onPlayerUpdate: (player: PlayerType) => void;
}

interface HistoryPoint {
  value_share_A: number;
  value_share_B: number;
  time_update: string;
}

type StatTone = "ink" | "alert" | "link";

function Stat({ label, value, tone }: { label: string; value: string; tone: StatTone }) {
  const color =
    tone === "alert" ? "text-[#CF4500]" :
    tone === "link" ? "text-[#3860BE]" :
    "text-[#141413]";
  return (
    <div className="space-y-1.5">
      <p className="text-xs uppercase tracking-[0.08em] text-[#696969] font-medium">
        {label}
      </p>
      <p className={`text-3xl md:text-4xl font-medium tracking-[-0.03em] tabular-nums ${color}`}>
        {value}
      </p>
    </div>
  );
}

function calculateTotalPortfolioValue(
  priceA: number,
  priceB: number,
  nbShareA: number,
  avgShareA: number,
  nbShareB: number,
  avgShareB: number
) {
  const profitA = nbShareA > 0 ? (priceA - avgShareA) * nbShareA : 0;
  const profitB = nbShareB > 0 ? (priceB - avgShareB) * nbShareB : 0;
  const totalValue = nbShareA * priceA + nbShareB * priceB;
  return {
    profitA, profitB,
    totalProfit: profitA + profitB,
    totalValue,
  };
}

export function Home({ player, onPlayerUpdate }: HomeProps) {
  const [prices, setPrices] = useState({ priceA: 2000, priceB: 400 });
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [portfolio, setPortfolio] = useState({
    profitA: 0, profitB: 0, totalProfit: 0, totalValue: 0,
  });

  // WebSocket for real-time prices
  useWebSocket({
    onPriceUpdate: useCallback((data: { priceA: number; priceB: number }) => {
      setPrices({ priceA: data.priceA, priceB: data.priceB });
    }, []),
  });

  // Load history on mount + poll current prices
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [currentPrices, shareHistory] = await Promise.all([
          api.shares.current(),
          api.shares.history(50),
        ]);
        if (cancelled) return;
        setPrices({ priceA: currentPrices.priceA, priceB: currentPrices.priceB });

        if (shareHistory.length > 0) {
          setHistory(shareHistory.map(s => ({
            value_share_A: s.value_share_A,
            value_share_B: s.value_share_B,
            time_update: s.time_update,
          })));
        } else {
          const mock = generateMockHistory(currentPrices);
          setHistory(mock);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("[Home] Erreur chargement:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Update portfolio when prices or player changes
  useEffect(() => {
    const port = calculateTotalPortfolioValue(
      prices.priceA, prices.priceB,
      player.nb_share_A, player.avg_share_A_value,
      player.nb_share_B, player.avg_share_B_value
    );
    setPortfolio(port);

    // Append new point to history
    setHistory(prev => {
      const now = new Date();
      const newPoint: HistoryPoint = {
        value_share_A: prices.priceA,
        value_share_B: prices.priceB,
        time_update: now.toISOString(),
      };
      return [...prev.slice(-49), newPoint];
    });
  }, [prices, player]);

  const totalValue = useMemo(() => player.nb_point + portfolio.totalValue, [player.nb_point, portfolio.totalValue]);
  const netWorth = useMemo(() => totalValue - player.nb_debt, [totalValue, player.nb_debt]);

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
          hello.
        </div>
        <div className="relative pt-16 md:pt-24 space-y-3">
          <span className="eyebrow">Tableau de bord</span>
          <h1 className="text-5xl md:text-6xl font-medium tracking-[-0.03em] text-[#141413] leading-[1.02]">
            Bonjour,
            <br />
            <span className="text-[#9A3A0A]">{player.player_name}.</span>
          </h1>
          <p className="text-[#555555] text-base md:text-lg max-w-md leading-relaxed pt-2">
            Voici votre patrimoine en direct. Les marches bougent a chaque
            seconde — restez a l'affut.
          </p>
        </div>
      </section>

      <section className={`relative rounded-[40px] border p-8 md:p-10 halo-soft ${
        netWorth >= 0
          ? "bg-[#FCFBFA] border-[#D1CDC7]"
          : "bg-[#FCFBFA] border-[#CF4500]/40"
      }`}>
        <div className="flex items-center justify-between mb-8">
          <span className="eyebrow">Resume financier</span>
          <span className="hidden md:inline-flex items-center gap-2 text-xs text-[#696969]">
            <span className="live-dot w-1.5 h-1.5 rounded-full bg-[#F37338]" />
            En direct
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6">
          <Stat label="Points" value={player.nb_point.toLocaleString()} tone={player.nb_point >= 0 ? "ink" : "alert"} />
          <Stat label="Valeur actions" value={portfolio.totalValue.toFixed(0)} tone="link" />
          <Stat label="Dettes" value={player.nb_debt.toLocaleString()} tone="alert" />
          <Stat label="Patrimoine net" value={netWorth.toFixed(0)} tone={netWorth >= 0 ? "ink" : "alert"} />
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
          <span className="eyebrow">Recompense</span>
          <h2 className="text-3xl md:text-4xl font-medium tracking-[-0.03em] text-[#141413]">
            Bonus quotidien.
          </h2>
        </div>
        <DailyReward
          userId=""
          onRewardClaimed={async () => {
            try {
              const updated = await api.player.me();
              onPlayerUpdate(updated);
            } catch (err) {
              console.error(err);
            }
          }}
        />
      </section>
    </div>
  );
}
