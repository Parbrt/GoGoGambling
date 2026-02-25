import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  Line,
  ComposedChart,
} from "recharts";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import type { ShareData } from "@/lib/supabase";

interface ShareChartProps {
  history: ShareData[];
  currentPriceA: number;
  currentPriceB: number;
  playerShares: {
    nb_share_A: number;
    avg_share_A_value: number;
    nb_share_B: number;
    avg_share_B_value: number;
  };
}

interface ChartDataPoint {
  time: string;
  priceA: number;
  priceB: number;
}

export function ShareChart({
  history,
  currentPriceA,
  currentPriceB,
  playerShares,
}: ShareChartProps) {
  const [selectedShare, setSelectedShare] = useState<"A" | "B">("A");

  // Préparer les données pour le graphique
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];

    // Trier par date croissante
    const sortedHistory = [...history].sort(
      (a, b) => new Date(a.time_update).getTime() - new Date(b.time_update).getTime()
    );

    return sortedHistory.map((item) => {
      const time = new Date(item.time_update).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      return {
        time,
        priceA: item.value_share_A,
        priceB: item.value_share_B,
      };
    });
  }, [history]);

  const currentPrice = selectedShare === "A" ? currentPriceA : currentPriceB;
  const avgBuyPrice =
    selectedShare === "A"
      ? playerShares.avg_share_A_value
      : playerShares.avg_share_B_value;
  const nbShares =
    selectedShare === "A" ? playerShares.nb_share_A : playerShares.nb_share_B;

  const profit = nbShares > 0 ? (currentPrice - avgBuyPrice) * nbShares : 0;
  const profitPercent =
    avgBuyPrice > 0 ? ((currentPrice - avgBuyPrice) / avgBuyPrice) * 100 : 0;

  // Déterminer la tendance globale
  const isUp =
    chartData.length > 1
      ? (selectedShare === "A"
          ? chartData[chartData.length - 1].priceA
          : chartData[chartData.length - 1].priceB) >=
        (selectedShare === "A"
          ? chartData[0].priceA
          : chartData[0].priceB)
      : true;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Cours des Actions
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={selectedShare === "A" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedShare("A")}
              className={
                selectedShare === "A" ? "bg-blue-600 hover:bg-blue-700" : ""
              }
            >
              GoGoCoin
            </Button>
            <Button
              variant={selectedShare === "B" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedShare("B")}
              className={
                selectedShare === "B" ? "bg-purple-600 hover:bg-purple-700" : ""
              }
            >
              GamblingCoin
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info cours actuel */}
        <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">
              {selectedShare === "A" ? "GoGoCoin" : "GamblingCoin"} - Cours actuel
            </p>
            <p
              className={`text-3xl font-bold ${
                nbShares > 0 && profit >= 0
                  ? "text-green-600"
                  : nbShares > 0 && profit < 0
                  ? "text-red-600"
                  : "text-primary"
              }`}
            >
              {currentPrice.toFixed(2)} pts
            </p>
          </div>

          {nbShares > 0 && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Votre position</p>
              <p className="text-lg font-semibold">{nbShares} actions</p>
              <div
                className={`flex items-center gap-1 ${
                  profit >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {profit >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span className="font-semibold">
                  {profit >= 0 ? "+" : ""}
                  {profit.toFixed(2)} pts ({profitPercent >= 0 ? "+" : ""}
                  {profitPercent.toFixed(1)}%)
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Prix moyen: {avgBuyPrice.toFixed(2)} pts
              </p>
            </div>
          )}
        </div>

        {/* Graphique */}
        <div className="h-[300px] w-full min-h-[300px] bg-background rounded-lg border p-2">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-muted-foreground">Chargement des données...</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
              >
                <defs>
                  <linearGradient id="colorUp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDown" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                  minTickGap={30}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => `${value.toFixed(1)}`}
                  width={60}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as ChartDataPoint;
                      const price =
                        selectedShare === "A" ? data.priceA : data.priceB;

                      return (
                        <div className="bg-background border rounded-lg p-2 shadow-lg">
                          <p className="text-sm font-medium">{label}</p>
                          <p className="text-lg font-bold">{price.toFixed(2)} pts</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {nbShares > 0 && (
                  <ReferenceLine
                    y={avgBuyPrice}
                    stroke="#8884d8"
                    strokeDasharray="3 3"
                    label={{
                      value: "Prix d'achat",
                      position: "right",
                      fill: "#8884d8",
                      fontSize: 11,
                    }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey={selectedShare === "A" ? "priceA" : "priceB"}
                  stroke={selectedShare === "A" ? "#3b82f6" : "#9333ea"}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#${isUp ? "colorUp" : "colorDown"})`}
                />
                <Line
                  type="monotone"
                  dataKey={selectedShare === "A" ? "priceA" : "priceB"}
                  stroke={selectedShare === "A" ? "#1d4ed8" : "#7e22ce"}
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Légende */}
        <div className="flex justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-muted-foreground">Tendance haussière</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-muted-foreground">Tendance baissière</span>
          </div>
          {nbShares > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded"></div>
              <span className="text-muted-foreground">Prix d'achat</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
