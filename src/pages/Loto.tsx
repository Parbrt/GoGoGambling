import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Ticket, Gift, DollarSign, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import type { PlayerType, LotoHistoryEntry, LotoPlayResult } from "@/types";
import type { User } from "@supabase/supabase-js";

interface LotoProps {
  user: User;
  player: PlayerType;
  onPlayerUpdate: (player: PlayerType) => void;
}

interface PrizeInfo {
  name: string;
  value: number;
  probability: number;
  emoji: string;
}

const PRIZES: PrizeInfo[] = [
  { name: "Jackpot", value: 50000, probability: 1, emoji: "💰" },
  { name: "Gros lot", value: 10000, probability: 3, emoji: "💎" },
  { name: "Lot moyen", value: 1000, probability: 8, emoji: "🎁" },
  { name: "Petit lot", value: 500, probability: 15, emoji: "✨" },
  { name: "Points", value: 100, probability: 25, emoji: "🎯" },
  { name: "Ticket bonus", value: 1, probability: 23, emoji: "🎟️" },
  { name: "Perdu", value: 0, probability: 25, emoji: "😞" },
];

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "a l'instant";
  const min = Math.floor(sec / 60);
  if (min < 60) return `il y a ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

export function Loto({ player, onPlayerUpdate }: LotoProps) {
  const [tickets, setTickets] = useState(player.loto_tickets ?? 0);
  const [canClaim, setCanClaim] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [history, setHistory] = useState<LotoHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [result, setResult] = useState<LotoPlayResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const [ticketData, historyData] = await Promise.all([
        api.loto.tickets(),
        api.loto.history(),
      ]);
      setTickets(ticketData.tickets);
      setCanClaim(ticketData.canClaim);
      setHistory(historyData);

      if (!ticketData.canClaim) {
        const now = new Date();
        const todayAt9 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0);
        const tomorrowAt9 = new Date(todayAt9);
        tomorrowAt9.setDate(tomorrowAt9.getDate() + 1);
        const remaining = tomorrowAt9.getTime() - now.getTime();
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemaining(`${hours}h ${minutes}m`);
      }
    } catch (err) {
      console.error("Erreur chargement loto:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  const handleClaimTicket = async () => {
    setIsClaiming(true);
    try {
      const data = await api.loto.claimTicket();
      setTickets(data.tickets);
      setCanClaim(data.canClaim);
    } catch (err) {
      console.error("Erreur reclamation ticket:", err);
    } finally {
      setIsClaiming(false);
    }
  };

  const handlePlay = async () => {
    if (tickets < 1) return;
    setIsPlaying(true);
    try {
      const data = await api.loto.play();
      setResult(data);
      setTickets(data.tickets_remaining);
      setShowResult(true);
      onPlayerUpdate(data.player);

      // Refresh history
      const historyData = await api.loto.history();
      setHistory(historyData);
    } catch (err) {
      console.error("Erreur tirage loto:", err);
    } finally {
      setIsPlaying(false);
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

  return (
    <div className="max-w-5xl mx-auto px-6 py-16 md:py-24 space-y-20">
      <section className="relative">
        <div
          aria-hidden
          className="ghost-headline absolute -top-6 -right-2 text-[120px] md:text-[180px] select-none"
        >
          loto.
        </div>
        <div className="relative pt-16 md:pt-24 space-y-3">
          <span className="eyebrow">Loto quotidien</span>
          <h1 className="text-5xl md:text-6xl font-medium tracking-[-0.03em] text-[#141413] leading-[1.02]">
            Tentez votre
            <br />
            <span className="text-[#9A3A0A]">chance.</span>
          </h1>
          <p className="text-[#555555] text-base md:text-lg max-w-md leading-relaxed pt-2">
            Un ticket gratuit chaque jour. Utilisez-le pour tenter de gagner des
            points, des tickets bonus, ou le jackpot.
          </p>
        </div>
      </section>

      {/* Tickets + Claim section */}
      <section className="rounded-[40px] border border-[#D1CDC7] bg-[#FCFBFA] p-8 md:p-10 halo-soft">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <span className="eyebrow">Mes tickets</span>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl md:text-5xl font-medium tracking-[-0.03em] text-[#141413] tabular-nums">
                {tickets}
              </span>
              <span className="text-lg text-[#696969]">
                ticket{tickets !== 1 ? "s" : ""} disponible{tickets !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          {canClaim ? (
            <button
              onClick={handleClaimTicket}
              disabled={isClaiming}
              className="inline-flex items-center gap-2.5 px-7 py-3 bg-[#141413] text-[#F3F0EE] rounded-[999px] font-medium text-sm tracking-[-0.02em] hover:bg-[#262627] transition-colors active:scale-[0.98] shrink-0 disabled:opacity-50"
            >
              <Gift className="w-4 h-4 text-[#F37338]" />
              {isClaiming ? "Reclamation..." : "Ticket gratuit"}
            </button>
          ) : (
            <span className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-white border border-[#D1CDC7] rounded-[999px] text-sm text-[#696969] tracking-[-0.02em] shrink-0">
              <Gift className="w-4 h-4" />
              Prochain ticket dans {timeRemaining}
            </span>
          )}
        </div>

        <div className="mt-8">
          <button
            onClick={handlePlay}
            disabled={tickets < 1 || isPlaying}
            className="w-full group relative inline-flex items-center justify-center gap-3 px-10 py-5 bg-[#F37338] hover:bg-[#E06528] text-white font-semibold text-lg tracking-[-0.02em] rounded-[999px] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Ticket className="w-5 h-5" />
            {isPlaying ? "Tirage en cours..." : tickets < 1 ? "Pas de ticket disponible" : "Tenter ma chance (1 ticket)"}
            {tickets >= 1 && !isPlaying && (
              <span className="absolute right-4 text-sm bg-white/20 px-3 py-1 rounded-full">
                {tickets}
              </span>
            )}
          </button>
        </div>
      </section>

      {/* Prize grid */}
      <section className="space-y-6">
        <div className="space-y-2">
          <span className="eyebrow">Gains</span>
          <h2 className="text-3xl md:text-4xl font-medium tracking-[-0.03em] text-[#141413]">
            Ce que vous pouvez gagner.
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PRIZES.map((prize, i) => (
            <div
              key={i}
              className="rounded-[24px] border border-[#D1CDC7] bg-[#FCFBFA] p-5 text-center space-y-2 hover:border-[#141413]/30 transition-colors"
            >
              <div className="text-3xl">{prize.emoji}</div>
              <p className="text-sm font-medium text-[#141413] tracking-[-0.02em]">
                {prize.name === "Perdu" ? "Perdu..." : prize.name === "Ticket bonus" ? "+1 ticket" : `+${prize.value.toLocaleString()} pts`}
              </p>
              <p className="text-xs text-[#696969]">{prize.probability}% de chance</p>
            </div>
          ))}
        </div>
      </section>

      {/* History */}
      <section className="space-y-6">
        <div className="space-y-2">
          <span className="eyebrow">Historique</span>
          <h2 className="text-3xl md:text-4xl font-medium tracking-[-0.03em] text-[#141413]">
            Derniers tirages.
          </h2>
          <p className="text-[#555555] text-base max-w-md leading-relaxed">
            Les 10 derniers joueurs a avoir tente leur chance.
          </p>
        </div>

        {history.length === 0 ? (
          <div className="rounded-[40px] border border-[#D1CDC7] bg-[#FCFBFA] p-12 text-center halo-soft">
            <AlertCircle className="w-8 h-8 text-[#696969] mx-auto mb-3" />
            <p className="text-[#696969] font-medium">Aucun tirage pour le moment. Soyez le premier !</p>
          </div>
        ) : (
          <div className="rounded-[40px] border border-[#D1CDC7] bg-[#FCFBFA] overflow-hidden halo-soft">
            <div className="divide-y divide-[#D1CDC7]/50">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-[#F3F0EE]/50 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#F3F0EE] flex items-center justify-center text-lg shrink-0">
                      {entry.won ? "🎉" : "😞"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#141413] tracking-[-0.02em] truncate">
                        {entry.player_name}
                      </p>
                      <p className="text-xs text-[#696969]">
                        {entry.won ? entry.prize_name : "Perdu..."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {entry.won && entry.prize_type === "points" && (
                      <span className="flex items-center gap-1 text-sm font-medium text-[#3860BE]">
                        <DollarSign className="w-3.5 h-3.5" />
                        +{entry.prize_value.toLocaleString()}
                      </span>
                    )}
                    {entry.won && entry.prize_type === "ticket" && (
                      <span className="flex items-center gap-1 text-sm font-medium text-[#F37338]">
                        <Ticket className="w-3.5 h-3.5" />
                        +{entry.prize_value}
                      </span>
                    )}
                    <span className="text-xs text-[#696969] whitespace-nowrap">
                      {formatTimeAgo(entry.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Result Modal */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="sm:max-w-md rounded-[40px] bg-[#FCFBFA] border-[#D1CDC7]">
          <DialogHeader className="text-center items-center">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${result?.won ? "bg-[#141413]" : "bg-[#F3F0EE]"}`}>
              <span className="text-3xl">
                {result?.won ? "🎉" : "😞"}
              </span>
            </div>
            <DialogTitle className="text-2xl font-medium tracking-[-0.02em]">
              {result?.won ? "Vous avez gagne !" : "Pas de chance..."}
            </DialogTitle>
            <DialogDescription className="text-[#696969]">
              {result?.won
                ? result.prize_type === "points"
                  ? `Vous remportez ${result.prize_value.toLocaleString()} points !`
                  : result.prize_type === "ticket"
                    ? `Vous gagnez ${result.prize_value} ticket(s) bonus !`
                    : result.prize_name
                : "Reessayez demain avec votre ticket gratuit !"}
            </DialogDescription>
          </DialogHeader>
          <div className={`rounded-[20px] p-6 text-center my-2 ${result?.won ? "bg-[#F3F0EE]" : "bg-[#F3F0EE]"}`}>
            <p className="text-3xl font-medium tracking-[-0.02em] text-[#141413]">
              {result?.won
                ? result.prize_type === "points"
                  ? `+${result.prize_value.toLocaleString()} pts`
                  : result.prize_type === "ticket"
                    ? `+${result.prize_value} ticket${result.prize_value > 1 ? "s" : ""}`
                    : result.prize_name
                : "Perdu..."}
            </p>
            <p className="text-sm text-[#696969] mt-1">
              Tickets restants : {result?.tickets_remaining ?? 0}
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setShowResult(false)} className="flex-1">
              Compris
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
