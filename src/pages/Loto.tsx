import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Ticket, Gift, Clock, Hash, Coins, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/lib/api";
import type { PlayerType, LotoStatusResponse, LotoDraw } from "@/types";
import type { User } from "@supabase/supabase-js";

interface LotoProps {
  user: User;
  player: PlayerType;
  onPlayerUpdate: (player: PlayerType) => void;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Tirage en cours...";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function formatTimeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "a l'instant";
  const min = Math.floor(sec / 60);
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

function parseBoxes(raw: string): string[] {
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

const BOX_EMOJIS: Record<string, string> = {
  GAMBLINGBOX: "🎰",
  GOGOBOX: "📦",
  XBOX: "🎁",
};

const TIER_INFO = {
  grand: { label: "Grand Gagnant", emoji: "👑", color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-300" },
  small1: { label: "Gagnant Argent", emoji: "🥈", color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-300" },
  small2: { label: "Gagnant Bronze", emoji: "🥉", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-300" },
} as const;

export function Loto({ player, onPlayerUpdate }: LotoProps) {
  const [status, setStatus] = useState<LotoStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuying, setIsBuying] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showBuyConfirm, setShowBuyConfirm] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const data = await api.loto.status();
      setStatus(data);

      // Update countdown
      const next = new Date(data.nextDrawTime).getTime();
      const remaining = next - Date.now();
      setCountdown(formatCountdown(remaining));
    } catch (err) {
      console.error("Erreur chargement loto:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 15000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  // Countdown tick
  useEffect(() => {
    if (!status) return;
    const ticker = setInterval(() => {
      const next = new Date(status.nextDrawTime).getTime();
      const remaining = next - Date.now();
      setCountdown(formatCountdown(remaining));
      if (remaining <= 0) loadStatus();
    }, 1000);
    return () => clearInterval(ticker);
  }, [status, loadStatus]);

  const handleBuyTicket = async () => {
    setIsBuying(true);
    setError(null);
    try {
      const data = await api.loto.buy();
      onPlayerUpdate(data.player);
      await loadStatus();
      setShowBuyConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'achat");
    } finally {
      setIsBuying(false);
    }
  };

  const handleClaimFree = async () => {
    setIsClaiming(true);
    setError(null);
    try {
      await api.loto.claimFreeTicket();
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la reclamation");
    } finally {
      setIsClaiming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-24">
        <div className="flex justify-center items-center h-48">
          <div className="w-10 h-10 rounded-full border-2 border-[#141413] border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-24 text-center">
        <p className="text-[#696969]">Impossible de charger le loto.</p>
      </div>
    );
  }

  const totalRollover = status.jackpot.grand_rollover_points + status.jackpot.small1_rollover_points + status.jackpot.small2_rollover_points;

  return (
    <div className="max-w-5xl mx-auto px-6 py-16 md:py-24 space-y-20">
      {/* Header */}
      <section className="relative">
        <div aria-hidden className="ghost-headline absolute -top-6 -right-2 text-[120px] md:text-[180px] select-none">
          loto.
        </div>
        <div className="relative pt-16 md:pt-24 space-y-3">
          <span className="eyebrow">Loto quotidien</span>
          <h1 className="text-5xl md:text-6xl font-medium tracking-[-0.03em] text-[#141413] leading-[1.02]">
            Decrochez le
            <br />
            <span className="text-[#9A3A0A]">jackpot.</span>
          </h1>
          <p className="text-[#555555] text-base md:text-lg max-w-md leading-relaxed pt-2">
            Achetez des tickets avec un numero a 5 chiffres. Tirage chaque jour a midi.
            {totalRollover > 0 && (
              <span className="block mt-1 text-[#F37338] font-medium">
                +{totalRollover.toLocaleString()} pts en cagnotte !
              </span>
            )}
          </p>
        </div>
      </section>

      {/* Countdown + Jackpot */}
      <section className="rounded-[40px] border border-[#1a1a1a] bg-[#141413] p-8 md:p-10 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <span className="text-sm uppercase tracking-[0.15em] text-[#999999]">Prochain tirage</span>
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-[#F37338]" />
              <span className="text-3xl md:text-4xl font-medium tracking-[-0.03em] tabular-nums">
                {countdown}
              </span>
            </div>
            {status.todayDraw && (
              <p className="text-sm text-[#999999] mt-1">
                Tirage du {formatDate(status.todayDraw.draw_date)} termine
              </p>
            )}
          </div>
          <div className="space-y-1 text-right">
            <span className="text-sm uppercase tracking-[0.15em] text-[#999999]">Jackpot total</span>
            <div className="flex items-center justify-end gap-1.5">
              <Coins className="w-5 h-5 text-[#F37338]" />
              <span className="text-3xl md:text-4xl font-medium tracking-[-0.03em]">
                {(1_000_000 + 250_000 + 50_000 + totalRollover).toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-[#696969]">pts</p>
          </div>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="rounded-[20px] border border-red-200 bg-red-50 p-4 text-sm text-red-700 text-center">
          {error}
        </div>
      )}

      {/* My Tickets */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="eyebrow">Mes tickets</span>
            <h2 className="text-3xl md:text-4xl font-medium tracking-[-0.03em] text-[#141413]">
              {status.ticketCount} / {status.maxTickets}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {status.canClaim && (
              <button
                onClick={handleClaimFree}
                disabled={isClaiming}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#141413] text-[#F3F0EE] rounded-[999px] font-medium text-sm tracking-[-0.02em] hover:bg-[#262627] transition-colors active:scale-[0.98] disabled:opacity-50"
              >
                <Gift className="w-4 h-4 text-[#F37338]" />
                {isClaiming ? "..." : "Ticket gratuit"}
              </button>
            )}
            {status.canBuy && (
              <button
                onClick={() => setShowBuyConfirm(true)}
                disabled={player.nb_point < status.ticketPrice}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#F37338] hover:bg-[#E06528] text-white font-semibold text-sm rounded-[999px] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Ticket className="w-4 h-4" />
                Acheter ({status.ticketPrice.toLocaleString()} pts)
              </button>
            )}
          </div>
        </div>

        {status.tickets.length === 0 ? (
          <div className="rounded-[40px] border border-[#D1CDC7] bg-[#FCFBFA] p-12 text-center halo-soft">
            <Hash className="w-8 h-8 text-[#696969] mx-auto mb-3" />
            <p className="text-[#696969] font-medium">Aucun ticket pour le prochain tirage.</p>
            <p className="text-sm text-[#999999] mt-1">
              {status.canBuy
                ? `Achetez jusqu'a ${status.maxTickets} tickets a ${status.ticketPrice.toLocaleString()} pts chacun.`
                : "Revenez apres le tirage de midi pour le prochain."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {status.tickets.map((ticket) => (
              <div
                key={ticket.id}
                className={`rounded-[20px] border p-4 text-center space-y-1.5 transition-colors ${
                  ticket.is_free
                    ? "border-green-300 bg-green-50"
                    : "border-[#D1CDC7] bg-[#FCFBFA] hover:border-[#141413]/30"
                }`}
              >
                <Hash className="w-4 h-4 mx-auto text-[#696969]" />
                <p className="text-xl font-mono font-bold tracking-[0.1em] text-[#141413]">
                  {ticket.ticket_number}
                </p>
                <p className="text-[10px] uppercase tracking-[0.1em] text-[#999999]">
                  {ticket.is_free ? "Gratuit" : `${status.ticketPrice.toLocaleString()} pts`}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Today's Draw Result */}
      {status.todayDraw && (
        <DrawResult draw={status.todayDraw} />
      )}

      {/* Prize Tiers */}
      <PrizeTiers jackpot={status.jackpot} totalRollover={totalRollover} />

      {/* Past Draws */}
      <PastDraws draws={status.draws} />

      {/* Buy Confirmation Dialog */}
      <BuyConfirmDialog
        open={showBuyConfirm}
        onOpenChange={setShowBuyConfirm}
        onConfirm={handleBuyTicket}
        isBuying={isBuying}
        price={status.ticketPrice}
        points={player.nb_point}
      />
    </div>
  );
}

// ── Draw Result Component ────────────────────────────────────────────────────

function DrawResult({ draw }: { draw: LotoDraw }) {
  const winningNumbers: string[] = JSON.parse(draw.winning_numbers);

  const tiers = [
    { key: "grand" as const, number: winningNumbers[0] ?? "", points: draw.grand_points, boxes: parseBoxes(draw.grand_boxes), winnerId: draw.grand_winner_user_id, winnerName: draw.grand_winner_name, info: TIER_INFO.grand },
    { key: "small1" as const, number: winningNumbers[1] ?? "", points: draw.small1_points, boxes: parseBoxes(draw.small1_boxes), winnerId: draw.small1_winner_user_id, winnerName: draw.small1_winner_name, info: TIER_INFO.small1 },
    { key: "small2" as const, number: winningNumbers[2] ?? "", points: draw.small2_points, boxes: parseBoxes(draw.small2_boxes), winnerId: draw.small2_winner_user_id, winnerName: draw.small2_winner_name, info: TIER_INFO.small2 },
  ];

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <span className="eyebrow">Resultats du jour</span>
        <h2 className="text-3xl md:text-4xl font-medium tracking-[-0.03em] text-[#141413]">
          Tirage du {formatDate(draw.draw_date)}.
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers.map((tier) => (
          <div
            key={tier.key}
            className={`rounded-[24px] border ${tier.info.border} ${tier.info.bg} p-6 space-y-3`}
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">{tier.info.emoji}</span>
              <span className={`text-sm font-semibold uppercase tracking-[0.05em] ${tier.info.color}`}>
                {tier.info.label}
              </span>
            </div>
            <div className="font-mono text-2xl font-bold tracking-[0.1em] text-[#141413]">
              {tier.number}
            </div>
            {tier.winnerId ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-[#141413]">
                  Gagne par <span className="text-[#F37338]">{tier.winnerName}</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#141413] text-white text-xs rounded-full">
                    <Coins className="w-3 h-3" />
                    +{tier.points.toLocaleString()} pts
                  </span>
                  {tier.boxes.map((box) => (
                    <span
                      key={box}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-[#D1CDC7] text-[#141413] text-xs rounded-full"
                    >
                      {BOX_EMOJIS[box] ?? "📦"} {box}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-[#696969] italic">Aucun gagnant</p>
                <p className="text-xs text-[#999999]">
                  {Math.floor(tier.points / 2).toLocaleString()} pts et {tier.boxes.length > 0 ? "les coffres" : "le coffre"} reportes a demain
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Prize Tiers Component ────────────────────────────────────────────────────

function PrizeTiers({ jackpot, totalRollover }: { jackpot: LotoStatusResponse["jackpot"]; totalRollover: number }) {
  const tiers = [
    {
      label: "Grand Gagnant",
      emoji: "👑",
      basePoints: 1_000_000,
      boxes: ["GAMBLINGBOX"],
      rolloverPoints: jackpot.grand_rollover_points,
      color: "text-yellow-600",
      bg: "bg-yellow-50/50",
    },
    {
      label: "Gagnant Argent",
      emoji: "🥈",
      basePoints: 250_000,
      boxes: ["GOGOBOX", "XBOX"],
      rolloverPoints: jackpot.small1_rollover_points,
      color: "text-slate-600",
      bg: "bg-slate-50/50",
    },
    {
      label: "Gagnant Bronze",
      emoji: "🥉",
      basePoints: 50_000,
      boxes: ["XBOX"],
      rolloverPoints: jackpot.small2_rollover_points,
      color: "text-amber-700",
      bg: "bg-amber-50/50",
    },
  ];

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <span className="eyebrow">Lots</span>
        <h2 className="text-3xl md:text-4xl font-medium tracking-[-0.03em] text-[#141413]">
          Ce que vous pouvez gagner.
        </h2>
        {totalRollover > 0 && (
          <p className="text-sm text-[#F37338] font-medium flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" />
            +{totalRollover.toLocaleString()} pts en cagnotte accumulee
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers.map((tier) => (
          <div
            key={tier.label}
            className={`rounded-[24px] border border-[#D1CDC7] ${tier.bg} p-6 space-y-3 hover:border-[#141413]/30 transition-colors`}
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">{tier.emoji}</span>
              <span className={`text-sm font-semibold uppercase tracking-[0.05em] ${tier.color}`}>
                {tier.label}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-1">
                <Coins className="w-4 h-4 text-[#F37338]" />
                <span className="text-2xl font-medium tracking-[-0.03em] text-[#141413]">
                  {(tier.basePoints + tier.rolloverPoints).toLocaleString()}
                </span>
                <span className="text-sm text-[#696969]">pts</span>
              </div>
              {tier.rolloverPoints > 0 && (
                <p className="text-xs text-[#F37338]">dont {tier.rolloverPoints.toLocaleString()} pts de report</p>
              )}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tier.boxes.map((box) => (
                  <span
                    key={box}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#141413] text-white text-xs rounded-full"
                  >
                    {BOX_EMOJIS[box] ?? "📦"} {box}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Past Draws Component ─────────────────────────────────────────────────────

function PastDraws({ draws }: { draws: LotoDraw[] }) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? draws : draws.slice(0, 5);

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <span className="eyebrow">Historique</span>
        <h2 className="text-3xl md:text-4xl font-medium tracking-[-0.03em] text-[#141413]">
          Derniers tirages.
        </h2>
      </div>

      {draws.length === 0 ? (
        <div className="rounded-[40px] border border-[#D1CDC7] bg-[#FCFBFA] p-12 text-center halo-soft">
          <Clock className="w-8 h-8 text-[#696969] mx-auto mb-3" />
          <p className="text-[#696969] font-medium">Aucun tirage pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((draw) => {
            const winningNumbers: string[] = JSON.parse(draw.winning_numbers);
            const allWinners = [
              { name: draw.grand_winner_name, tier: "👑", number: winningNumbers[0] },
              { name: draw.small1_winner_name, tier: "🥈", number: winningNumbers[1] },
              { name: draw.small2_winner_name, tier: "🥉", number: winningNumbers[2] },
            ].filter((w) => w.name);

            return (
              <div
                key={draw.id}
                className="rounded-[24px] border border-[#D1CDC7] bg-[#FCFBFA] p-5 halo-soft hover:border-[#141413]/20 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-[#141413] tracking-[-0.02em]">
                    {formatDate(draw.draw_date)}
                  </span>
                  <span className="text-xs text-[#696969]">
                    {formatTimeAgo(draw.drawn_at)}
                  </span>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  {winningNumbers.map((num, i) => (
                    <span key={i} className="font-mono text-sm font-bold tracking-[0.1em] text-[#696969] bg-[#F3F0EE] px-3 py-1 rounded-full">
                      {num}
                    </span>
                  ))}
                </div>
                {allWinners.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {allWinners.map((w, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#F37338] bg-[#FFF3EC] px-2.5 py-1 rounded-full"
                      >
                        {w.tier} {w.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {draws.length > 5 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm text-[#696969] hover:text-[#141413] transition-colors"
            >
              {showAll ? (
                <>
                  <ChevronUp className="w-4 h-4" /> Voir moins
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" /> Voir tout ({draws.length} tirages)
                </>
              )}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

// ── Buy Confirmation Dialog ──────────────────────────────────────────────────

function BuyConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isBuying,
  price,
  points,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isBuying: boolean;
  price: number;
  points: number;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-[40px] bg-[#FCFBFA] border-[#D1CDC7]">
        <DialogHeader className="text-center items-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-[#F3F0EE] flex items-center justify-center mb-4">
            <Ticket className="w-8 h-8 text-[#F37338]" />
          </div>
          <DialogTitle className="text-2xl font-medium tracking-[-0.02em]">
            Acheter un ticket
          </DialogTitle>
          <DialogDescription className="text-[#696969]">
            Un numero aleatoire a 5 chiffres vous sera attribue. Tirage a midi.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-[20px] bg-[#F3F0EE] p-4 text-center space-y-1 my-2">
          <div className="flex items-center justify-center gap-2">
            <Coins className="w-5 h-5 text-[#F37338]" />
            <span className="text-2xl font-medium tracking-[-0.02em] text-[#141413]">
              {price.toLocaleString()} pts
            </span>
          </div>
          <p className="text-xs text-[#696969]">
            Votre solde : {points.toLocaleString()} pts
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 rounded-[999px]">
            Annuler
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isBuying || points < price}
            className="flex-1 rounded-[999px] bg-[#F37338] hover:bg-[#E06528]"
          >
            {isBuying ? "Achat..." : "Confirmer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
