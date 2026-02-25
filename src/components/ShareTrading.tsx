import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Minus, DollarSign } from "lucide-react";
import type { PlayerType } from "@/types";
import type { ShareSnapshot } from "@/lib/shareLogic";
import {
  getCurrentPrices,
  calculateTotalPortfolioValue,
  calculateProfitPercent,
  calculateBuyCost,
  calculateSellRevenue,
} from "@/lib/shareLogic";

interface ShareTradingProps {
  player: PlayerType;
  snapshot: ShareSnapshot;
  onPlayerUpdate: (player: PlayerType) => void;
  onSnapshotUpdate: (snapshot: ShareSnapshot) => void;
}

export function ShareTrading({
  player,
  snapshot,
  onPlayerUpdate,
  onSnapshotUpdate,
}: ShareTradingProps) {
  const [prices, setPrices] = useState(() => getCurrentPrices(snapshot));
  const [portfolio, setPortfolio] = useState({
    profitA: 0,
    profitB: 0,
    totalProfit: 0,
    totalValue: 0,
  });
  const [buyQty, setBuyQty] = useState({ A: 1, B: 1 });
  const [sellQty, setSellQty] = useState({ A: 1, B: 1 });

  // Mettre à jour les prix en temps réel
  useEffect(() => {
    const updatePrices = () => {
      const current = getCurrentPrices(snapshot);
      setPrices(current);

      const port = calculateTotalPortfolioValue(
        snapshot,
        player.nb_share_A,
        player.avg_share_A_value,
        player.nb_share_B,
        player.avg_share_B_value
      );
      setPortfolio(port);
    };

    updatePrices();
    const interval = setInterval(updatePrices, 1000);
    return () => clearInterval(interval);
  }, [snapshot, player]);

  const FEE_RATE = 0.02; // 5% de frais sur les achats

  const handleBuy = (shareType: 'A' | 'B') => {
    const qty = shareType === 'A' ? buyQty.A : buyQty.B;

    // Toujours utiliser les prix actuels calculés à partir du snapshot
    const currentPrices = getCurrentPrices(snapshot);
    const baseCost = calculateBuyCost(snapshot, shareType, qty);
    const fee = baseCost * FEE_RATE;
    const cost = baseCost + fee;

    // Bloquer l'achat si fonds insuffisants
    if (cost > player.nb_point) return;

    const newPoints = player.nb_point - cost;
    const currentQty = shareType === 'A' ? player.nb_share_A : player.nb_share_B;
    const currentAvg = shareType === 'A' ? player.avg_share_A_value : player.avg_share_B_value;
    const price = shareType === 'A' ? currentPrices.priceA : currentPrices.priceB;

    const newQty = currentQty + qty;
    const newAvg = currentQty === 0
      ? Math.round(price)
      : Math.round(((currentQty * currentAvg) + (qty * price)) / newQty);

    const updatedPlayer = {
      ...player,
      nb_point: Math.round(newPoints),
      ...(shareType === 'A'
        ? { nb_share_A: newQty, avg_share_A_value: newAvg }
        : { nb_share_B: newQty, avg_share_B_value: newAvg }
      ),
    };

    // Mise à jour du snapshot avec les prix actuels
    const now = Math.floor(Date.now() / 1000);
    const updatedSnapshot = {
      value_share_A: currentPrices.priceA,
      value_share_B: currentPrices.priceB,
      time_now: now,
    };

    onPlayerUpdate(updatedPlayer);
    onSnapshotUpdate(updatedSnapshot);
  };

  const handleSell = (shareType: 'A' | 'B') => {
    const qty = shareType === 'A' ? sellQty.A : sellQty.B;
    const currentQty = shareType === 'A' ? player.nb_share_A : player.nb_share_B;

    if (qty > currentQty) return;

    const currentPrices = getCurrentPrices(snapshot);
    const revenue = calculateSellRevenue(snapshot, shareType, qty);
    const newQty = currentQty - qty;

    const updatedPlayer = {
      ...player,
      nb_point: Math.round(player.nb_point + revenue),
      ...(shareType === 'A'
        ? { nb_share_A: newQty }
        : { nb_share_B: newQty }
      ),
    };

    // Mise à jour du snapshot avec les prix calculés (pas le state)
    const now = Math.floor(Date.now() / 1000);
    const updatedSnapshot = {
      value_share_A: currentPrices.priceA,
      value_share_B: currentPrices.priceB,
      time_now: now,
    };

    onPlayerUpdate(updatedPlayer);
    onSnapshotUpdate(updatedSnapshot);
  };

  const handleSellAll = (shareType: 'A' | 'B') => {
    const currentQty = shareType === 'A' ? player.nb_share_A : player.nb_share_B;

    if (currentQty === 0) return;

    const currentPrices = getCurrentPrices(snapshot);
    const revenue = calculateSellRevenue(snapshot, shareType, currentQty);

    const updatedPlayer = {
      ...player,
      nb_point: Math.round(player.nb_point + revenue),
      ...(shareType === 'A'
        ? { nb_share_A: 0 }
        : { nb_share_B: 0 }
      ),
    };

    // Mise à jour du snapshot avec les prix calculés (pas le state)
    const now = Math.floor(Date.now() / 1000);
    const updatedSnapshot = {
      value_share_A: currentPrices.priceA,
      value_share_B: currentPrices.priceB,
      time_now: now,
    };

    onPlayerUpdate(updatedPlayer);
    onSnapshotUpdate(updatedSnapshot);
  };

  const getProfitColor = (profit: number) => {
    if (profit > 0) return "text-green-600";
    if (profit < 0) return "text-red-600";
    return "text-gray-600";
  };

  const getProfitIcon = (profit: number) => {
    if (profit > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (profit < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-600" />;
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Trading d'Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cours en temps réel */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-blue-50">
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">GoGoCoin</div>
              <div className="text-2xl font-bold">{prices.priceA.toFixed(2)} pts</div>
              {player.nb_share_A > 0 && (
                <div className={`text-sm mt-1 ${getProfitColor(portfolio.profitA)}`}>
                  {getProfitIcon(portfolio.profitA)}
                  <span className="ml-1">
                    {portfolio.profitA >= 0 ? "+" : ""}{portfolio.profitA.toFixed(2)} pts
                    ({calculateProfitPercent(player.avg_share_A_value, prices.priceA).toFixed(1)}%)
                  </span>
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-2">
                Possédées: {player.nb_share_A} | Prix moyen: {player.avg_share_A_value.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-50">
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">GamblingCoin</div>
              <div className="text-2xl font-bold">{prices.priceB.toFixed(2)} pts</div>
              {player.nb_share_B > 0 && (
                <div className={`text-sm mt-1 ${getProfitColor(portfolio.profitB)}`}>
                  {getProfitIcon(portfolio.profitB)}
                  <span className="ml-1">
                    {portfolio.profitB >= 0 ? "+" : ""}{portfolio.profitB.toFixed(2)} pts
                    ({calculateProfitPercent(player.avg_share_B_value, prices.priceB).toFixed(1)}%)
                  </span>
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-2">
                Possédées: {player.nb_share_B} | Prix moyen: {player.avg_share_B_value.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Valeur totale du portfolio */}
        {(player.nb_share_A > 0 || player.nb_share_B > 0) && (
          <Card className={portfolio.totalProfit >= 0 ? "bg-green-50" : "bg-red-50"}>
            <CardContent className="pt-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium">Valeur totale du portfolio</div>
                  <div className="text-2xl font-bold">{portfolio.totalValue.toFixed(2)} pts</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">Profit/Perte total</div>
                  <div className={`text-2xl font-bold ${getProfitColor(portfolio.totalProfit)}`}>
                    {portfolio.totalProfit >= 0 ? "+" : ""}{portfolio.totalProfit.toFixed(2)} pts
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trading */}
        <Tabs defaultValue="buy" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy">Acheter</TabsTrigger>
            <TabsTrigger value="sell">Vendre</TabsTrigger>
          </TabsList>

          <TabsContent value="buy" className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Des frais de 5% s'appliquent sur chaque achat.
            </p>

            {/* Achat GoGoCoin */}
            {(() => {
              const baseCostA = buyQty.A * prices.priceA;
              const totalCostA = baseCostA * (1 + FEE_RATE);
              const canAffordA = player.nb_point >= totalCostA && buyQty.A > 0;
              return (
                <div className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">GoGoCoin</span>
                    <div className="text-right text-sm">
                      <span className="text-muted-foreground">
                        {baseCostA.toFixed(2)} + {(baseCostA * FEE_RATE).toFixed(2)} frais ={" "}
                      </span>
                      <span className="font-semibold">{totalCostA.toFixed(2)} pts</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={buyQty.A}
                      onChange={(e) => setBuyQty({ ...buyQty, A: parseInt(e.target.value) || 0 })}
                      className="w-20"
                    />
                    <Button
                      onClick={() => handleBuy('A')}
                      className="flex-1"
                      disabled={!canAffordA}
                    >
                      Acheter {buyQty.A} GoGoCoin(s)
                    </Button>
                  </div>
                  {!canAffordA && buyQty.A > 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      Fonds insuffisants (il vous manque {(totalCostA - player.nb_point).toFixed(2)} pts)
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Achat GamblingCoin */}
            {(() => {
              const baseCostB = buyQty.B * prices.priceB;
              const totalCostB = baseCostB * (1 + FEE_RATE);
              const canAffordB = player.nb_point >= totalCostB && buyQty.B > 0;
              return (
                <div className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">GamblingCoin</span>
                    <div className="text-right text-sm">
                      <span className="text-muted-foreground">
                        {baseCostB.toFixed(2)} + {(baseCostB * FEE_RATE).toFixed(2)} frais ={" "}
                      </span>
                      <span className="font-semibold">{totalCostB.toFixed(2)} pts</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={buyQty.B}
                      onChange={(e) => setBuyQty({ ...buyQty, B: parseInt(e.target.value) || 0 })}
                      className="w-20"
                    />
                    <Button
                      onClick={() => handleBuy('B')}
                      className="flex-1"
                      disabled={!canAffordB}
                    >
                      Acheter {buyQty.B} GamblingCoin(s)
                    </Button>
                  </div>
                  {!canAffordB && buyQty.B > 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      Fonds insuffisants (il vous manque {(totalCostB - player.nb_point).toFixed(2)} pts)
                    </p>
                  )}
                </div>
              );
            })()}
          </TabsContent>

          <TabsContent value="sell" className="space-y-4">
            {/* Vente GoGoCoin */}
            <div className="p-4 border rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">GoGoCoin</span>
                <span className="text-sm text-muted-foreground">
                  Revenu: {(sellQty.A * prices.priceA).toFixed(2)} pts
                </span>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  max={player.nb_share_A}
                  value={sellQty.A}
                  onChange={(e) => setSellQty({ ...sellQty, A: Math.min(parseInt(e.target.value) || 0, player.nb_share_A) })}
                  className="w-20"
                  disabled={player.nb_share_A === 0}
                />
                <Button
                  onClick={() => handleSell('A')}
                  className="flex-1"
                  disabled={player.nb_share_A === 0 || sellQty.A > player.nb_share_A}
                >
                  Vendre {sellQty.A} GoGoCoin(s)
                </Button>
              </div>
              <Button
                onClick={() => handleSellAll('A')}
                className="w-full mt-2"
                variant="outline"
                disabled={player.nb_share_A === 0}
              >
                Vendre tout ({player.nb_share_A} GoGoCoin(s))
              </Button>
            </div>

            {/* Vente GamblingCoin */}
            <div className="p-4 border rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">GamblingCoin</span>
                <span className="text-sm text-muted-foreground">
                  Revenu: {(sellQty.B * prices.priceB).toFixed(2)} pts
                </span>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  max={player.nb_share_B}
                  value={sellQty.B}
                  onChange={(e) => setSellQty({ ...sellQty, B: Math.min(parseInt(e.target.value) || 0, player.nb_share_B) })}
                  className="w-20"
                  disabled={player.nb_share_B === 0}
                />
                <Button
                  onClick={() => handleSell('B')}
                  className="flex-1"
                  disabled={player.nb_share_B === 0 || sellQty.B > player.nb_share_B}
                >
                  Vendre {sellQty.B} GamblingCoin(s)
                </Button>
              </div>
              <Button
                onClick={() => handleSellAll('B')}
                className="w-full mt-2"
                variant="outline"
                disabled={player.nb_share_B === 0}
              >
                Vendre tout ({player.nb_share_B} GamblingCoin(s))
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
