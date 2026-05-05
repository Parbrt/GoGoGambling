import { TradingCard } from "@/components/TradingCard";
import type { PlayerType } from "@/types";

interface ShareTradingProps {
  player: PlayerType;
  prices: { priceA: number; priceB: number };
  onPlayerUpdate: (player: PlayerType) => void;
}

export function ShareTrading({ player, prices, onPlayerUpdate }: ShareTradingProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <TradingCard
        shareType="A"
        shareName="GoGoCoin"
        shareSymbol="GCC"
        accentColor="#3860BE"
        player={player}
        currentPrice={prices.priceA}
        onPlayerUpdate={onPlayerUpdate}
      />
      <TradingCard
        shareType="B"
        shareName="GamblingCoin"
        shareSymbol="GC"
        accentColor="#9A3A0A"
        player={player}
        currentPrice={prices.priceB}
        onPlayerUpdate={onPlayerUpdate}
      />
    </div>
  );
}
