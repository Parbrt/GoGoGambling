import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyReward } from "@/components/DailyReward";
import { ShareTrading } from "@/components/ShareTrading";
import { ShareChart } from "@/components/ShareChart";
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
  getShareHistory,
  insertShare,
  updateLatestSnapshot,
  updatePlayerShares,
  type ShareData,
} from "@/lib/supabase";

interface HomeProps {
  user: User;
  player: PlayerType;
  onPlayerUpdate: (player: PlayerType) => void;
}

export function Home({ user, player, onPlayerUpdate }: HomeProps) {
  // État pour le snapshot des actions
  const [snapshot, setSnapshot] = useState<ShareSnapshot | null>(null);
  const [shareHistory, setShareHistory] = useState<ShareData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [prices, setPrices] = useState(() => snapshot ? getCurrentPrices(snapshot) : { priceA: 0, priceB: 0 });
  const [portfolio, setPortfolio] = useState({
    profitA: 0,
    profitB: 0,
    totalProfit: 0,
    totalValue: 0,
  });

  // Charger les données depuis Supabase au montage
  useEffect(() => {
    const loadShareData = async () => {
      try {
        // Récupérer le dernier snapshot
        const latestShare = await getLatestShare();

        if (latestShare) {
          const newSnapshot: ShareSnapshot = {
            value_share_A: Number(latestShare.value_share_A) || 150,
            value_share_B: Number(latestShare.value_share_B) || 45,
            time_now: Math.floor(new Date(latestShare.time_now || Date.now()).getTime() / 1000),
          };
          setSnapshot(newSnapshot);
        } else {
          // Créer un snapshot initial si aucun n'existe
          const initialSnapshot = createInitialSnapshot();
          setSnapshot(initialSnapshot);

          // L'insérer dans la base de données
          await insertShare({
            value_share_A: initialSnapshot.value_share_A,
            value_share_B: initialSnapshot.value_share_B,
            time_update: new Date().toISOString(),
            time_now: new Date().toISOString(),
          });
        }

        // Récupérer l'historique pour le graphique
        let history = await getShareHistory(50);
        
        // Si l'historique est vide, générer des données historiques factices
        if (history.length === 0) {
          const now = new Date();
          const basePriceA = latestShare ? latestShare.value_share_A : 150;
          const basePriceB = latestShare ? latestShare.value_share_B : 45;
          
          // Générer 50 points de données historiques
          const mockHistory: ShareData[] = [];
          for (let i = 50; i >= 0; i--) {
            const time = new Date(now.getTime() - i * 60000); // -i minutes
            mockHistory.push({
              value_share_A: basePriceA + (Math.random() - 0.5) * 10,
              value_share_B: basePriceB + (Math.random() - 0.5) * 5,
              time_update: time.toISOString(),
              time_now: time.toISOString(),
            });
          }
          history = mockHistory;
        }
        
        setShareHistory(history);
      } catch (error) {
        console.error("[Home] Erreur lors du chargement des données:", error);
        // Fallback sur un snapshot local
        setSnapshot(createInitialSnapshot());
      } finally {
        setIsLoading(false);
      }
    };

    loadShareData();
  }, []);

  // Mettre à jour les prix en temps réel
  useEffect(() => {
    if (!snapshot) return;

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

      // Mettre à jour l'historique avec le prix en temps réel
      setShareHistory((prev) => {
        const now = new Date();
        const newPoint: ShareData = {
          value_share_A: current.priceA,
          value_share_B: current.priceB,
          time_update: now.toISOString(),
          time_now: now.toISOString(),
        };
        
        // Garder seulement les 50 derniers points + le nouveau
        const updated = [...prev.slice(-49), newPoint];
        return updated;
      });
    };

    updatePrices();
    const interval = setInterval(updatePrices, 1000);
    return () => clearInterval(interval);
  }, [snapshot, player]);

  // Snapshot périodique toutes les 10s : met à jour la dernière ligne en DB.
  // Les prix étant déterministes (seeded RNG), tous les clients calculent les mêmes valeurs,
  // donc même si plusieurs clients écrivent en parallèle, les valeurs sont identiques.
  useEffect(() => {
    if (!snapshot) return;

    const saveSnapshot = async () => {
      const current = getCurrentPrices(snapshot);
      const now = new Date();
      const updated = await updateLatestSnapshot({
        value_share_A: current.priceA,
        value_share_B: current.priceB,
        time_update: now.toISOString(),
        time_now: now.toISOString(),
      });

      if (updated) {
        setSnapshot({
          value_share_A: current.priceA,
          value_share_B: current.priceB,
          time_now: Math.floor(now.getTime() / 1000),
        });
      }
    };

    const interval = setInterval(saveSnapshot, 10_000);
    return () => clearInterval(interval);
  }, [snapshot]);

  // Synchroniser avec Supabase lors des transactions
  const handleSnapshotUpdate = async (newSnapshot: ShareSnapshot) => {
    // Protection : ne jamais écrire des prix à 0, NaN ou négatifs
    if (!newSnapshot.value_share_A || !isFinite(newSnapshot.value_share_A) || newSnapshot.value_share_A <= 0) {
      newSnapshot.value_share_A = snapshot?.value_share_A || 150;
    }
    if (!newSnapshot.value_share_B || !isFinite(newSnapshot.value_share_B) || newSnapshot.value_share_B <= 0) {
      newSnapshot.value_share_B = snapshot?.value_share_B || 45.5;
    }

    setSnapshot(newSnapshot);

    try {
      // Insérer le nouveau snapshot dans la base de données
      await insertShare({
        value_share_A: newSnapshot.value_share_A,
        value_share_B: newSnapshot.value_share_B,
        time_update: new Date().toISOString(),
        time_now: new Date(newSnapshot.time_now * 1000).toISOString(),
      });

      // Rafraîchir l'historique
      const history = await getShareHistory(50);
      setShareHistory(history);
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
    }
  };

  const handlePlayerUpdate = async (updatedPlayer: PlayerType) => {
    try {
      // Mettre à jour le player dans Supabase
      await updatePlayerShares(user.id, {
        nb_point: updatedPlayer.nb_point,
        nb_debt: updatedPlayer.nb_debt,
        nb_share_A: updatedPlayer.nb_share_A,
        avg_share_A_value: updatedPlayer.avg_share_A_value,
        nb_share_B: updatedPlayer.nb_share_B,
        avg_share_B_value: updatedPlayer.avg_share_B_value,
      });

      // Mettre à jour l'état local immédiatement
      onPlayerUpdate(updatedPlayer);
      
      // Forcer le recalcul immédiat du portfolio
      if (snapshot) {
        const port = calculateTotalPortfolioValue(
          snapshot,
          updatedPlayer.nb_share_A,
          updatedPlayer.avg_share_A_value,
          updatedPlayer.nb_share_B,
          updatedPlayer.avg_share_B_value
        );
        setPortfolio(port);
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du player:", error);
    }
  };

  // Calculer la valeur totale (points + actions) - réactif
  const totalValue = useMemo(() => player.nb_point + portfolio.totalValue, [player.nb_point, portfolio.totalValue]);
  const netWorth = useMemo(() => totalValue - player.nb_debt, [totalValue, player.nb_debt]);

  if (isLoading || !snapshot) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Résumé financier */}
      <Card className={netWorth >= 0 ? "bg-green-50" : "bg-red-50"}>
        <CardHeader>
          <CardTitle>Résumé financier</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Points</p>
              <p
                className={`text-2xl font-bold ${
                  player.nb_point >= 0 ? "text-primary" : "text-red-600"
                }`}
              >
                {player.nb_point}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valeur actions</p>
              <p className="text-2xl font-bold text-blue-600">
                {portfolio.totalValue.toFixed(0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Dettes</p>
              <p className="text-2xl font-bold text-red-600">
                {player.nb_debt}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Patrimoine net</p>
              <p
                className={`text-2xl font-bold ${
                  netWorth >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {netWorth.toFixed(0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Graphique des actions */}
      <ShareChart
        history={shareHistory}
        currentPriceA={prices.priceA}
        currentPriceB={prices.priceB}
        playerShares={{
          nb_share_A: player.nb_share_A,
          avg_share_A_value: player.avg_share_A_value,
          nb_share_B: player.nb_share_B,
          avg_share_B_value: player.avg_share_B_value,
        }}
      />

      {/* Trading d'actions */}
      <ShareTrading
        player={player}
        snapshot={snapshot}
        onPlayerUpdate={handlePlayerUpdate}
        onSnapshotUpdate={handleSnapshotUpdate}
      />

      <DailyReward
        userId={user.id}
        onRewardClaimed={async () => {
          const { getPlayerByUserId } = await import("@/lib/supabase");
          const updatedPlayer = await getPlayerByUserId(user.id);
          if (updatedPlayer) {
            onPlayerUpdate(updatedPlayer);
          }
        }}
      />
    </div>
  );
}
