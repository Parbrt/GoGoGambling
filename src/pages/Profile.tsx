import { useState, useEffect, useMemo, useRef } from "react";
import { cacheGet } from "@/lib/cache";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Inventory } from "@/components/Inventory";
import type { PlayerType } from "@/types";
import type { User } from "@supabase/supabase-js";
import { api } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import { TrendingUp, TrendingDown, Minus, User as UserIcon, WifiOff, Banknote, Camera, Loader2, AlertTriangle, Wallet } from "lucide-react";

interface ProfileProps {
  user: User;
  player: PlayerType;
  onPlayerUpdate: (player: PlayerType) => void;
}

export function Profile({ player, onPlayerUpdate }: ProfileProps) {
  const [prices, setPrices] = useState(() =>
    cacheGet<{ priceA: number; priceB: number }>("/api/shares/current") ?? { priceA: 2000, priceB: 400 }
  );
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useWebSocket({
    onPriceUpdate: (data) => setPrices({ priceA: data.priceA, priceB: data.priceB }),
  });

  useEffect(() => {
    api.shares.current().then(setPrices).catch(() => {});
  }, []);

  const portfolio = useMemo(() => {
    const profitA = player.nb_share_A > 0 ? (prices.priceA - player.avg_share_A_value) * player.nb_share_A : 0;
    const profitB = player.nb_share_B > 0 ? (prices.priceB - player.avg_share_B_value) * player.nb_share_B : 0;
    const totalValue = player.nb_share_A * prices.priceA + player.nb_share_B * prices.priceB;
    return { profitA, profitB, totalProfit: profitA + profitB, totalValue };
  }, [prices, player]);

  const handlePlayerUpdate = async (updatedPlayer: PlayerType) => {
    try {
      await api.player.update({
        nb_point: updatedPlayer.nb_point,
        nb_debt: updatedPlayer.nb_debt,
      });
      onPlayerUpdate(updatedPlayer);
    } catch (err) {
      console.error("Erreur lors de la mise a jour du player:", err);
    }
  };

  const getProfitColor = (profit: number) =>
    profit > 0 ? "text-green-600" : profit < 0 ? "text-[#CF4500]" : "text-[#696969]";

  const getProfitIcon = (profit: number) =>
    profit > 0 ? <TrendingUp className="w-4 h-4 text-green-600" /> :
    profit < 0 ? <TrendingDown className="w-4 h-4 text-[#CF4500]" /> :
    <Minus className="w-4 h-4 text-[#696969]" />;

  const totalValue = player.nb_point + portfolio.totalValue;
  const netWorth = totalValue - player.nb_debt;

  const MAX_DEBT = 50;
  const INTEREST_RATE = 0.10;
  const [loanAmount, setLoanAmount] = useState<number>(0);
  const maxLoan = Math.max(0, MAX_DEBT - player.nb_debt);

  const [repayAmount, setRepayAmount] = useState<number>(0);

  const handleLoan = async () => {
    if (loanAmount <= 0 || loanAmount > maxLoan) return;
    await handlePlayerUpdate({
      ...player,
      nb_point: player.nb_point + loanAmount,
      nb_debt: player.nb_debt + Math.round(loanAmount * (1 + INTEREST_RATE)),
    });
    setLoanAmount(0);
  };

  const handleRepay = () => {
    if (repayAmount <= 0 || repayAmount > player.nb_debt || repayAmount > player.nb_point) return;
    onPlayerUpdate({
      ...player,
      nb_point: player.nb_point - repayAmount,
      nb_debt: player.nb_debt - repayAmount,
    });
    setRepayAmount(0);
  };

  const maxRepayable = Math.min(player.nb_debt, player.nb_point);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Jamais";
    return new Date(dateStr).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("La photo ne doit pas depasser 5 Mo");
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Veuillez selectionner une image (PNG, JPEG, GIF, WebP)");
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const updated = await api.player.updateProfilePhoto(base64);
      onPlayerUpdate(updated);
    } catch (err) {
      console.error("Erreur upload photo:", err);
      alert("Erreur lors de l'envoi de la photo");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePhotoRemove = async () => {
    setIsUploading(true);
    try {
      const updated = await api.player.updateProfilePhoto(null);
      onPlayerUpdate(updated);
    } catch (err) {
      console.error("Erreur suppression photo:", err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative max-w-5xl mx-auto px-6 py-16 md:py-24 space-y-20">
      <section className="relative">
        <div aria-hidden className="ghost-headline absolute -top-6 -right-2 text-[120px] md:text-[180px] select-none">you.</div>
        <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto] gap-10 items-end pt-8 md:pt-16">
          <div className="space-y-3 order-2 md:order-1">
            <span className="eyebrow">Profil</span>
            <h1 className="text-5xl md:text-6xl font-medium tracking-[-0.03em] text-[#141413] leading-[1.02]">{player.player_name}</h1>
            <div className="flex items-center gap-3 pt-2">
              {player.is_online ? (
                <span className="inline-flex items-center gap-2 text-sm font-medium text-[#141413] bg-white border border-[#141413]/15 rounded-[999px] px-4 py-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F37338] live-dot" />En ligne
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 text-sm font-medium text-[#696969] bg-white border border-[#696969]/15 rounded-[999px] px-4 py-1.5">
                  <WifiOff className="w-3.5 h-3.5" />Hors ligne
                </span>
              )}
              <span className="inline-flex items-center gap-2 text-sm text-[#696969] bg-white border border-[#696969]/15 rounded-[999px] px-4 py-1.5 tracking-[-0.02em]">
                Derniere connexion : {formatDate(player.last_login)}
              </span>
            </div>
          </div>
          <div className="relative order-1 md:order-2 mx-auto md:mx-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <div
              className="relative w-[200px] h-[200px] md:w-[260px] md:h-[260px] group cursor-pointer"
              onClick={() => !isUploading && fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
            >
              <div className="portrait-circle w-full h-full">
                {player.profile_photo ? (
                  <>
                    <img
                      src={player.profile_photo}
                      alt={player.player_name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      {isUploading ? (
                        <Loader2 className="w-8 h-8 text-white animate-spin opacity-0 group-hover:opacity-100 transition-opacity" />
                      ) : (
                        <Camera className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #F4E1C9 0%, #9A3A0A 100%)" }} />
                    <div className="absolute inset-0 flex items-center justify-center group-hover:opacity-90 transition-opacity">
                      <span className="text-[110px] md:text-[140px] font-medium text-white/95 tracking-[-0.04em] group-hover:scale-105 transition-transform">
                        {player.player_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      {isUploading ? (
                        <Loader2 className="w-8 h-8 text-white animate-spin opacity-0 group-hover:opacity-100 transition-opacity" />
                      ) : (
                        <Camera className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </>
                )}
              </div>
              <span className="satellite-cta pointer-events-none"><UserIcon className="w-5 h-5" /></span>
            </div>
            {player.profile_photo && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handlePhotoRemove(); }}
                className="mt-3 mx-auto block text-xs text-[#696969] hover:text-[#CF4500] transition-colors font-medium"
              >
                Supprimer la photo
              </button>
            )}
          </div>
        </div>
      </section>

      <section className={`rounded-[40px] border p-8 md:p-10 halo-soft space-y-8 ${netWorth >= 0 ? "bg-[#FCFBFA] border-[#D1CDC7]" : "bg-[#FCFBFA] border-[#CF4500]/40"}`}>
        <div>
          <div className="flex items-center justify-between mb-8"><span className="eyebrow">Resume financier</span></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6">
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-[0.08em] text-[#696969] font-medium">Points</p>
              <p className={`text-3xl md:text-4xl font-medium tracking-[-0.03em] tabular-nums ${player.nb_point >= 0 ? "text-[#141413]" : "text-[#CF4500]"}`}>{player.nb_point}</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-[0.08em] text-[#696969] font-medium">Valeur actions</p>
              <p className="text-3xl md:text-4xl font-medium tracking-[-0.03em] text-[#3860BE] tabular-nums">{portfolio.totalValue.toFixed(0)}</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-[0.08em] text-[#696969] font-medium">Dettes</p>
              <p className="text-3xl md:text-4xl font-medium tracking-[-0.03em] text-[#CF4500] tabular-nums">{player.nb_debt}</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-[0.08em] text-[#696969] font-medium">Patrimoine net</p>
              <p className={`text-3xl md:text-4xl font-medium tracking-[-0.03em] tabular-nums ${netWorth >= 0 ? "text-[#141413]" : "text-[#CF4500]"}`}>{netWorth.toFixed(0)}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-[#D1CDC7] pt-8">
          <span className="eyebrow">Portefeuille</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="p-5 bg-[#F3F0EE] rounded-[16px]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-[#3860BE] font-medium">GoGoCoin (GCC)</p>
                  <p className="text-3xl font-medium tracking-[-0.02em] text-[#141413] mt-1">{player.nb_share_A} <span className="text-lg text-[#696969]">actions</span></p>
                  {player.nb_share_A > 0 && <p className="text-sm text-[#696969] mt-1">Prix moyen: {player.avg_share_A_value.toFixed(2)} pts</p>}
                </div>
                {player.nb_share_A > 0 && (
                  <div className="text-right">
                    <div className={`flex items-center gap-1 ${getProfitColor(portfolio.profitA)}`}>
                      {getProfitIcon(portfolio.profitA)}
                      <span className="font-medium text-sm">{portfolio.profitA >= 0 ? "+" : ""}{portfolio.profitA.toFixed(2)} pts</span>
                    </div>
                    <p className="text-xs text-[#696969] mt-1">Valeur: {(player.nb_share_A * prices.priceA).toFixed(0)} pts</p>
                  </div>
                )}
              </div>
            </div>
            <div className="p-5 bg-[#F3F0EE] rounded-[16px]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-[#9A3A0A] font-medium">GamblingCoin (GC)</p>
                  <p className="text-3xl font-medium tracking-[-0.02em] text-[#141413] mt-1">{player.nb_share_B} <span className="text-lg text-[#696969]">actions</span></p>
                  {player.nb_share_B > 0 && <p className="text-sm text-[#696969] mt-1">Prix moyen: {player.avg_share_B_value.toFixed(2)} pts</p>}
                </div>
                {player.nb_share_B > 0 && (
                  <div className="text-right">
                    <div className={`flex items-center gap-1 ${getProfitColor(portfolio.profitB)}`}>
                      {getProfitIcon(portfolio.profitB)}
                      <span className="font-medium text-sm">{portfolio.profitB >= 0 ? "+" : ""}{portfolio.profitB.toFixed(2)} pts</span>
                    </div>
                    <p className="text-xs text-[#696969] mt-1">Valeur: {(player.nb_share_B * prices.priceB).toFixed(0)} pts</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          {(player.nb_share_A > 0 || player.nb_share_B > 0) && (
            <div className="flex justify-between items-center pt-2 mt-4 border-t border-[#D1CDC7]">
              <span className="font-medium text-[#141413] tracking-[-0.02em]">Profit/Perte total</span>
              <span className={`text-xl font-medium tracking-[-0.02em] tabular-nums ${getProfitColor(portfolio.totalProfit)}`}>
                {portfolio.totalProfit >= 0 ? "+" : ""}{portfolio.totalProfit.toFixed(2)} pts
              </span>
            </div>
          )}
        </div>
      </section>

      <Inventory />

      <div className="bg-[#FCFBFA] border border-[#D1CDC7] rounded-[40px] p-8 md:p-10 halo-soft space-y-8">
        <div>
          <div className="space-y-2 mb-6">
            <span className="eyebrow">Credit</span>
            <div className="flex items-center gap-3"><Banknote className="w-6 h-6 text-[#141413]" /><h3 className="text-2xl font-medium tracking-[-0.03em] text-[#141413]">Emprunter des points</h3></div>
          </div>
          <div className="flex justify-between items-center">
            <div><p className="text-sm text-[#696969]">Dette actuelle</p><p className="text-xl font-medium tracking-[-0.02em] text-[#141413]">{player.nb_debt} / {MAX_DEBT} pts</p></div>
            <div className="text-right"><p className="text-sm text-[#696969]">Disponible</p><p className="text-xl font-medium tracking-[-0.02em] text-[#141413]">{maxLoan} pts</p></div>
          </div>
          {maxLoan > 0 ? (
            <div className="space-y-3 mt-4">
              <label className="text-sm font-medium text-[#141413]">Montant (max: {maxLoan} pts, interet 10%)</label>
              <div className="flex gap-2">
                <Input type="number" min={1} max={maxLoan} value={loanAmount} onChange={(e) => setLoanAmount(Math.min(parseInt(e.target.value) || 0, maxLoan))} className="flex-1" />
                <Button variant="outline" onClick={() => setLoanAmount(maxLoan)}>Max</Button>
                <Button onClick={handleLoan} disabled={loanAmount <= 0}>Emprunter</Button>
              </div>
              {loanAmount > 0 && <p className="text-xs text-[#696969]">Vous recevrez {loanAmount} pts et devrez rembourser {Math.round(loanAmount * (1 + INTEREST_RATE))} pts</p>}
            </div>
          ) : (
            <div className="p-4 bg-[#F3F0EE] rounded-[16px] text-sm text-[#696969] mt-4">Plafond d'emprunt atteint ({MAX_DEBT} pts). Remboursez vos dettes pour pouvoir emprunter a nouveau.</div>
          )}
        </div>

        <div className="border-t border-[#D1CDC7] pt-8">
          <span className="eyebrow">Remboursement</span>
          {player.nb_debt > 0 ? (
            <div className="mt-6 space-y-6">
              <div className="flex items-center gap-3 text-[#CF4500]">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-2xl font-medium tracking-[-0.03em]">Gestion des Dettes</h3>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-[#696969]">Dette totale</p>
                  <p className="text-2xl font-medium tracking-[-0.02em] text-[#CF4500]">{player.nb_debt} pts</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[#696969]">Points disponibles</p>
                  <p className="text-xl font-medium tracking-[-0.02em] text-[#141413]">{player.nb_point} pts</p>
                </div>
              </div>
              {player.nb_point > 0 ? (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-[#141413]">Montant a rembourser (max: {maxRepayable} pts)</label>
                  <div className="flex gap-2">
                    <Input type="number" min={0} max={maxRepayable} value={repayAmount} onChange={(e) => setRepayAmount(Math.min(parseInt(e.target.value) || 0, maxRepayable))} className="flex-1" />
                    <Button variant="outline" onClick={() => setRepayAmount(maxRepayable)}>Max</Button>
                    <Button onClick={handleRepay} disabled={repayAmount <= 0 || repayAmount > player.nb_point} className="bg-[#CF4500] text-white border-[#CF4500] hover:bg-[#b53d00]">Rembourser</Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-[#CF4500]/8 rounded-[16px] text-sm text-[#CF4500]">Vous n'avez pas de points pour rembourser vos dettes. Jouez pour en gagner ou vendez vos actions.</div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 mt-6">
              <Wallet className="w-6 h-6 text-[#141413]" />
              <div>
                <h3 className="text-xl font-medium tracking-[-0.03em] text-[#141413]">Aucune dette</h3>
                <p className="text-sm text-[#696969]">Vous n'avez pas de dettes a rembourser. Continuez comme ca.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
