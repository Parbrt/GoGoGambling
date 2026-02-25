import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DebtManager } from "@/components/DebtManager";
import type { PlayerType } from "@/types";
import type { User } from "@supabase/supabase-js";
import type { ShareSnapshot } from "@/lib/shareLogic";
import {
  getCurrentPrices,
  calculateTotalPortfolioValue,
  createInitialSnapshot,
} from "@/lib/shareLogic";
import {
  getLatestShare,
  updatePlayerShares,
} from "@/lib/supabase";
import { TrendingUp, TrendingDown, Minus, User as UserIcon, Wifi, WifiOff } from "lucide-react";

interface ProfileProps {
  user: User;
  player: PlayerType;
  onPlayerUpdate: (player: PlayerType) => void;
}

export function Profile({ user, player, onPlayerUpdate }: ProfileProps) {
  const [snapshot, setSnapshot] = useState<ShareSnapshot | null>(null);
  const [prices, setPrices] = useState({ priceA: 0, priceB: 0 });
  const [portfolio, setPortfolio] = useState({
    profitA: 0,
    profitB: 0,
    totalProfit: 0,
    totalValue: 0,
  });

  useEffect(() => {
    const loadSnapshot = async () => {
      try {
        const latestShare = await getLatestShare();
        if (latestShare) {
          setSnapshot({
            value_share_A: Number(latestShare.value_share_A) || 150,
            value_share_B: Number(latestShare.value_share_B) || 45,
            time_now: Math.floor(new Date(latestShare.time_now || Date.now()).getTime() / 1000),
          });
        } else {
          setSnapshot(createInitialSnapshot());
        }
      } catch {
        setSnapshot(createInitialSnapshot());
      }
    };
    loadSnapshot();
  }, []);

  useEffect(() => {
    if (!snapshot) return;

    const updatePrices = () => {
      const current = getCurrentPrices(snapshot);
      setPrices(current);
      setPortfolio(
        calculateTotalPortfolioValue(
          snapshot,
          player.nb_share_A,
          player.avg_share_A_value,
          player.nb_share_B,
          player.avg_share_B_value
        )
      );
    };

    updatePrices();
    const interval = setInterval(updatePrices, 1000);
    return () => clearInterval(interval);
  }, [snapshot, player]);

  const handlePlayerUpdate = async (updatedPlayer: PlayerType) => {
    try {
      await updatePlayerShares(user.id, {
        nb_point: updatedPlayer.nb_point,
        nb_debt: updatedPlayer.nb_debt,
        nb_share_A: updatedPlayer.nb_share_A,
        avg_share_A_value: updatedPlayer.avg_share_A_value,
        nb_share_B: updatedPlayer.nb_share_B,
        avg_share_B_value: updatedPlayer.avg_share_B_value,
      });
      onPlayerUpdate(updatedPlayer);
    } catch (error) {
      console.error("Erreur lors de la mise à jour du player:", error);
    }
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

  const totalValue = player.nb_point + portfolio.totalValue;
  const netWorth = totalValue - player.nb_debt;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Jamais";
    return new Date(dateStr).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* En-tête profil */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <UserIcon className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{player.player_name}</h1>
          <div className="flex items-center gap-2 mt-1">
            {player.is_online ? (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <Wifi className="w-4 h-4" /> En ligne
              </span>
            ) : (
              <span className="flex items-center gap-1 text-sm text-gray-500">
                <WifiOff className="w-4 h-4" /> Hors ligne
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Résumé financier */}
      <Card className={netWorth >= 0 ? "bg-green-50" : "bg-red-50"}>
        <CardHeader>
          <CardTitle>Résumé financier</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Points</p>
              <p className={`text-2xl font-bold ${player.nb_point >= 0 ? "text-primary" : "text-red-600"}`}>
                {player.nb_point}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valeur actions</p>
              <p className="text-2xl font-bold text-blue-600">{portfolio.totalValue.toFixed(0)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Dettes</p>
              <p className="text-2xl font-bold text-red-600">{player.nb_debt}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Patrimoine net</p>
              <p className={`text-2xl font-bold ${netWorth >= 0 ? "text-green-600" : "text-red-600"}`}>
                {netWorth.toFixed(0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Portefeuille d'actions détaillé */}
      <Card>
        <CardHeader>
          <CardTitle>Portefeuille d'actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* GoGoCoin */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-blue-600 font-semibold">GoGoCoin</p>
                  <p className="text-3xl font-bold text-blue-700">
                    {player.nb_share_A} <span className="text-lg">actions</span>
                  </p>
                  {player.nb_share_A > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Prix moyen: {player.avg_share_A_value.toFixed(2)} pts
                    </p>
                  )}
                </div>
                {player.nb_share_A > 0 && (
                  <div className="text-right">
                    <div className={`flex items-center gap-1 ${getProfitColor(portfolio.profitA)}`}>
                      {getProfitIcon(portfolio.profitA)}
                      <span className="font-semibold">
                        {portfolio.profitA >= 0 ? "+" : ""}
                        {portfolio.profitA.toFixed(2)} pts
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Valeur: {(player.nb_share_A * prices.priceA).toFixed(0)} pts
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* GamblingCoin */}
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-purple-600 font-semibold">GamblingCoin</p>
                  <p className="text-3xl font-bold text-purple-700">
                    {player.nb_share_B} <span className="text-lg">actions</span>
                  </p>
                  {player.nb_share_B > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Prix moyen: {player.avg_share_B_value.toFixed(2)} pts
                    </p>
                  )}
                </div>
                {player.nb_share_B > 0 && (
                  <div className="text-right">
                    <div className={`flex items-center gap-1 ${getProfitColor(portfolio.profitB)}`}>
                      {getProfitIcon(portfolio.profitB)}
                      <span className="font-semibold">
                        {portfolio.profitB >= 0 ? "+" : ""}
                        {portfolio.profitB.toFixed(2)} pts
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Valeur: {(player.nb_share_B * prices.priceB).toFixed(0)} pts
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Profit/Perte total */}
          {(player.nb_share_A > 0 || player.nb_share_B > 0) && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Profit/Perte total:</span>
                <span className={`text-xl font-bold ${getProfitColor(portfolio.totalProfit)}`}>
                  {portfolio.totalProfit >= 0 ? "+" : ""}
                  {portfolio.totalProfit.toFixed(2)} pts
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gestionnaire de dettes */}
      <DebtManager player={player} onPlayerUpdate={handlePlayerUpdate} />

      {/* Infos compte */}
      <Card>
        <CardHeader>
          <CardTitle>Informations du compte</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Dernière connexion</p>
              <p className="font-medium">{formatDate(player.last_login)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Statut</p>
              <p className="font-medium">
                {player.is_online ? "En ligne" : "Hors ligne"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
