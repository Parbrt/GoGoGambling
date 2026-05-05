import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PlayerType } from "@/types";
import { api } from "@/lib/api";

interface TradingCardProps {
  shareType: "A" | "B";
  shareName: string;
  shareSymbol: string;
  accentColor: string;
  player: PlayerType;
  currentPrice: number;
  onPlayerUpdate: (player: PlayerType) => void;
}

const FEE_RATE = 0.02;

const QUICK_PERCENTS = [25, 50, 75, 100] as const;

function pctLabel(pct: number): string {
  if (pct === 100) return "MAX";
  return `${pct}%`;
}

export function TradingCard({
  shareType,
  shareName,
  shareSymbol,
  accentColor,
  player,
  currentPrice,
  onPlayerUpdate,
}: TradingCardProps) {
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState(1);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nbHeld = shareType === "A" ? player.nb_share_A : player.nb_share_B;
  const avgPrice = shareType === "A" ? player.avg_share_A_value : player.avg_share_B_value;

  const profit = useMemo(() => nbHeld > 0 ? (currentPrice - avgPrice) * nbHeld : 0, [currentPrice, avgPrice, nbHeld]);
  const profitPct = useMemo(() => avgPrice === 0 ? 0 : ((currentPrice - avgPrice) / avgPrice) * 100, [currentPrice, avgPrice]);
  const positionValue = useMemo(() => nbHeld * currentPrice, [nbHeld, currentPrice]);

  const maxAffordable = useMemo(() => {
    const unitCost = currentPrice * (1 + FEE_RATE);
    return unitCost > 0 ? Math.floor(player.nb_point / unitCost) : 0;
  }, [player.nb_point, currentPrice]);

  const orderCost = mode === "buy" ? quantity * currentPrice : 0;
  const orderFee = mode === "buy" ? orderCost * FEE_RATE : 0;
  const orderTotal = mode === "buy" ? orderCost + orderFee : quantity * currentPrice;
  const canExecute = mode === "buy"
    ? quantity > 0 && orderTotal <= player.nb_point
    : quantity > 0 && quantity <= nbHeld;

  const handleQuickAmount = useCallback((pct: number) => {
    if (mode === "buy") {
      const max = maxAffordable;
      setQuantity(Math.max(1, Math.floor(max * pct / 100)));
    } else {
      const max = nbHeld;
      setQuantity(Math.max(1, Math.floor(max * pct / 100)));
    }
  }, [mode, maxAffordable, nbHeld]);

  const handleToggleMode = useCallback((newMode: "buy" | "sell") => {
    setMode(newMode);
    setQuantity(1);
    setError(null);
  }, []);

  const handleExecute = useCallback(async () => {
    setError(null);
    setIsExecuting(true);
    try {
      const result = mode === "buy"
        ? await api.shares.buy(shareType, quantity)
        : await api.shares.sell(shareType, quantity);
      onPlayerUpdate(result.player);
      setQuantity(1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setIsExecuting(false);
    }
  }, [mode, shareType, quantity, onPlayerUpdate]);

  const profitColor =
    profit > 0 ? "text-[#3860BE]" :
    profit < 0 ? "text-[#CF4500]" :
    "text-[#696969]";

  const profitBg =
    profit > 0 ? "bg-[#3860BE]/8" :
    profit < 0 ? "bg-[#CF4500]/8" :
    "bg-[#D1CDC7]/30";

  return (
    <div className="rounded-[40px] border border-[#D1CDC7] bg-[#FCFBFA] overflow-hidden halo-soft">
      <div className="p-6 md:p-8 space-y-6">
        {/* Header: name + price */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
              <span className="eyebrow">{shareName}</span>
              <span className="text-xs font-medium text-[#696969] tracking-[-0.02em]">
                {shareSymbol}
              </span>
            </div>
            <p className="text-4xl md:text-5xl font-medium tracking-[-0.03em] text-[#141413] tabular-nums">
              {currentPrice.toFixed(2)}
              <span className="text-base font-normal text-[#696969] ml-1">pts</span>
            </p>
          </div>
        </div>

        {/* Position summary */}
        {nbHeld > 0 && (
          <div className={`rounded-[20px] ${profitBg} p-4 space-y-2`}>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.08em] text-[#696969] font-medium">
                Votre position
              </span>
              <span className={`text-sm font-semibold tracking-[-0.02em] tabular-nums ${profitColor}`}>
                {profit >= 0 ? "+" : ""}{profit.toFixed(2)} pts ({profitPct >= 0 ? "+" : ""}{profitPct.toFixed(1)}%)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-xs text-[#696969]">Detenus</p>
                <p className="font-semibold text-[#141413] tabular-nums">
                  {nbHeld} {shareSymbol}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#696969]">Prix moyen</p>
                <p className="font-semibold text-[#141413] tabular-nums">
                  {avgPrice.toFixed(2)} pts
                </p>
              </div>
              <div>
                <p className="text-xs text-[#696969]">Valeur</p>
                <p className="font-semibold text-[#141413] tabular-nums">
                  {positionValue.toFixed(0)} pts
                </p>
              </div>
            </div>
          </div>
        )}

        {/* No position / empty hint for sell mode */}
        {nbHeld === 0 && mode === "sell" && (
          <div className="rounded-[20px] bg-[#D1CDC7]/20 p-4 text-center">
            <p className="text-sm text-[#696969]">
              Vous ne possedez pas de {shareName}.
            </p>
            <button
              type="button"
              onClick={() => handleToggleMode("buy")}
              className="text-sm font-medium text-[#3860BE] hover:underline mt-1"
            >
              Passer en mode achat
            </button>
          </div>
        )}

        {/* Buy / Sell toggle */}
        <div className="flex rounded-[999px] bg-[#F3F0EE] p-1">
          <button
            type="button"
            onClick={() => handleToggleMode("buy")}
            className={`flex-1 rounded-[999px] py-2 text-sm font-semibold tracking-[-0.02em] transition-all ${
              mode === "buy"
                ? "bg-white text-[#141413] shadow-sm"
                : "text-[#696969] hover:text-[#141413]"
            }`}
          >
            Acheter
          </button>
          <button
            type="button"
            onClick={() => handleToggleMode("sell")}
            className={`flex-1 rounded-[999px] py-2 text-sm font-semibold tracking-[-0.02em] transition-all ${
              mode === "sell"
                ? "bg-white text-[#141413] shadow-sm"
                : "text-[#696969] hover:text-[#141413]"
            }`}
          >
            Vendre
          </button>
        </div>

        {/* Quick amounts + quantity input */}
        <div className="space-y-3">
          <div className="flex gap-1.5">
            {QUICK_PERCENTS.map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => handleQuickAmount(pct)}
                className="flex-1 rounded-[999px] border border-[#D1CDC7] bg-white py-2 text-xs font-semibold text-[#141413] tracking-[-0.02em] hover:bg-[#F3F0EE] hover:border-[#141413]/30 transition-colors"
              >
                {pctLabel(pct)}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type="number"
                min={1}
                max={mode === "buy" ? maxAffordable : nbHeld}
                value={quantity}
                onChange={(e) => {
                  const v = parseInt(e.target.value) || 0;
                  setQuantity(Math.max(0, v));
                }}
                className="w-full pr-12"
                disabled={mode === "sell" && nbHeld === 0}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#696969] pointer-events-none">
                {shareSymbol}
              </span>
            </div>
          </div>
        </div>

        {/* Order summary */}
        <div className="rounded-[20px] bg-[#F3F0EE] p-4 space-y-1.5 text-sm">
          {mode === "buy" ? (
            <>
              <div className="flex justify-between">
                <span className="text-[#696969]">Prix unitaire</span>
                <span className="font-medium text-[#141413] tabular-nums">{currentPrice.toFixed(2)} pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#696969]">Sous-total ({quantity} {shareSymbol})</span>
                <span className="font-medium text-[#141413] tabular-nums">{orderCost.toFixed(2)} pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#696969]">Frais (2%)</span>
                <span className="font-medium text-[#141413] tabular-nums">{orderFee.toFixed(2)} pts</span>
              </div>
              <div className="flex justify-between border-t border-[#D1CDC7] pt-1.5 mt-1">
                <span className="font-semibold text-[#141413]">Total</span>
                <span className="font-semibold text-[#141413] tabular-nums">{orderTotal.toFixed(2)} pts</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between">
              <span className="text-[#696969]">Revenu estime ({quantity} {shareSymbol})</span>
              <span className="font-semibold text-[#141413] tabular-nums">{orderTotal.toFixed(2)} pts</span>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-[#CF4500]/8 border border-[#CF4500]/20 rounded-[20px]">
            <p className="text-sm text-[#CF4500] font-medium">{error}</p>
          </div>
        )}

        {/* Execute button */}
        <Button
          onClick={handleExecute}
          disabled={!canExecute || isExecuting}
          className="w-full h-12 text-base font-semibold tracking-[-0.02em] rounded-[999px]"
          style={{
            backgroundColor: canExecute ? accentColor : undefined,
            borderColor: canExecute ? accentColor : undefined,
          }}
        >
          {isExecuting ? "En cours..." : (
            mode === "buy"
              ? `Acheter ${quantity} ${shareSymbol}`
              : `Vendre ${quantity} ${shareSymbol}`
          )}
        </Button>

        {/* Insufficient funds warning */}
        {mode === "buy" && !canExecute && quantity > 0 && (
          <p className="text-xs text-[#CF4500] text-center">
            Fonds insuffisants — il vous manque {(orderTotal - player.nb_point).toFixed(2)} pts
          </p>
        )}
      </div>
    </div>
  );
}
