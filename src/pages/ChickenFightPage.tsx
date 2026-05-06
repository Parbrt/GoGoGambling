import { useState, useEffect } from "react";
import { ChickenFight } from "@/components/ChickenFight";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { PlayerType } from "@/types";

interface ChickenFightPageProps {
  userId: string;
  player: PlayerType;
  onPlayerUpdate: (player: PlayerType) => void;
}

export function ChickenFightPage({ userId, player, onPlayerUpdate }: ChickenFightPageProps) {
  const [chickenRecharges, setChickenRecharges] = useState<Array<{ id: number; quantity: number }>>([]);

  useEffect(() => {
    async function loadRecharges() {
      try {
        const inv = await api.shop.inventory();
        const recharges = (inv as Array<{ id: number; item_id: number; quantity: number; name: string; category: string }>)
          .filter((i) => i.name === "Recharge de Poulets")
          .map((i) => ({ id: i.id, quantity: i.quantity }));
        setChickenRecharges(recharges);
      } catch {
        // Silently fail — recharges simply won't show
      }
    }
    loadRecharges();
  }, []);

  async function handleUseRecharge(inventoryId: number) {
    try {
      const result = await api.shop.useConsumable(inventoryId);
      onPlayerUpdate(result.player);
      // Refresh recharge list
      const inv = await api.shop.inventory();
      const recharges = (inv as Array<{ id: number; quantity: number; name: string }>)
        .filter((i) => i.name === "Recharge de Poulets")
        .map((i) => ({ id: i.id, quantity: i.quantity }));
      setChickenRecharges(recharges);
    } catch {
      // Handled by ChickenFight
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">🐔 Chicken Fight</h1>
        <p className="text-muted-foreground">
          Pariez sur le meilleur poulet et gagnez des points !
        </p>
      </div>

      <ChickenFight
        userId={userId}
        currentPoints={player.nb_point}
        initialCharges={player.chicken_charges ?? 5}
        initialLastChargeRefill={player.last_chicken_charge_refill ?? null}
        chickenRecharges={chickenRecharges}
        onUseRecharge={handleUseRecharge}
        onPlayerUpdate={(updated) => onPlayerUpdate({ ...player, ...updated })}
      />

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-base">Comment jouer ?</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>Analysez les statistiques de chaque poulet</li>
            <li>Selectionnez celui que vous pensez etre le plus fort</li>
            <li>Choisissez votre mise</li>
            <li>La cote est calculee en fonction des mises totales</li>
            <li>Si vous gagnez, vous remportez votre mise × la cote !</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
