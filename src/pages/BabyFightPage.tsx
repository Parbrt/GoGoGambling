import { useState, useEffect, useCallback } from "react";
import { BabyFight } from "@/components/BabyFight";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, ChevronDown, ChevronUp, History, Crown, Users, Coins } from "lucide-react";
import { api } from "@/lib/api";
import { BABY_STATS, getScoreLabel, formatOdds } from "@/lib/babyFightGame";
import type { PlayerType } from "@/types";
import type { BabyFightHistoryEntry } from "@/lib/babyFightGame";

interface BabyFightPageProps {
  userId: string;
  player: PlayerType;
  onPlayerUpdate: (player: PlayerType) => void;
}

function StatBar({ label, value }: { label: string; value: number }) {
  const color = value > 66 ? "bg-green-500" : value > 33 ? "bg-yellow-500" : "bg-red-500";
  const textColor = value > 66 ? "text-green-700" : value > 33 ? "text-yellow-700" : "text-red-700";
  const bgBadge = value > 66 ? "bg-green-100" : value > 33 ? "bg-yellow-100" : "bg-red-100";
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 text-xs text-[#696969]">{label}</span>
      <div className="flex-1 h-1.5 bg-[#D1CDC7]/40 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <Badge className={`text-[10px] px-1.5 py-0 ${bgBadge} ${textColor}`}>{getScoreLabel(value)}</Badge>
    </div>
  );
}

export function BabyFightPage({ player, onPlayerUpdate }: BabyFightPageProps) {
  const [history, setHistory] = useState<BabyFightHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [expandedFight, setExpandedFight] = useState<number | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const res = await api.games.babyFight.history(20);
      setHistory(res.fights as BabyFightHistoryEntry[]);
    } catch (err) {
      console.error("[BabyFightPage] history error:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const toggleExpand = (fightId: number) => {
    setExpandedFight((prev) => prev === fightId ? null : fightId);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">👶 Baby Fight</h1>
        <p className="text-muted-foreground">
          Pariez sur le meilleur bebe ! Un combat chaque heure, gains jusqu&apos;a 50x.
        </p>
      </div>

      <BabyFight player={player} onPlayerUpdate={onPlayerUpdate} />

      {/* ═══════════════════════════════ History section ═══════════════════════════════ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-[#696969]" />
            <CardTitle className="text-base">Historique des combats</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-[#F37338]" />
                <p className="text-sm text-muted-foreground">Chargement de l&apos;historique...</p>
              </div>
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-[#696969] text-center py-8">
              Aucun combat termine pour le moment. Revenez apres la premiere heure !
            </p>
          ) : (
            <div className="space-y-2">
              {history.map((fight) => {
                const winnerName = fight.winner === 1 ? fight.babyA.name : fight.babyB.name;
                const isExpanded = expandedFight === fight.id;
                const date = new Date(fight.scheduledAt);
                const dateStr = date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
                const timeStr = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
                const totalPot = fight.totalPotA + fight.totalPotB;
                const winnerA = fight.bets.filter((b) => b.betOn === 1 && b.won);
                const winnerB = fight.bets.filter((b) => b.betOn === 2 && b.won);
                const loserA = fight.bets.filter((b) => b.betOn === 1 && !b.won);
                const loserB = fight.bets.filter((b) => b.betOn === 2 && !b.won);

                return (
                  <div key={fight.id} className="border border-[#D1CDC7] rounded-xl overflow-hidden">
                    {/* Summary row */}
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F3F0EE]/50 transition-colors text-left"
                      onClick={() => toggleExpand(fight.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-xs text-[#696969] whitespace-nowrap">{dateStr} {timeStr}</span>
                        <span className="font-medium text-[#141413] mx-2 min-w-0 truncate">{fight.babyA.name}</span>
                        <span className="text-xs text-[#D1CDC7]">VS</span>
                        <span className="font-medium text-[#141413] mx-2 min-w-0 truncate">{fight.babyB.name}</span>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="flex items-center gap-1 text-xs text-[#696969]">
                          <Crown className="w-3.5 h-3.5 text-[#F37338]" />
                          <span className="font-medium text-[#141413]">{winnerName}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-[#696969]">
                          <Coins className="w-3.5 h-3.5" />
                          <span>{totalPot.toLocaleString()} pts</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-[#696969]">
                          <Users className="w-3.5 h-3.5" />
                          <span>{fight.betCount}</span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-[#696969]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[#696969]" />
                        )}
                      </div>
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="border-t border-[#D1CDC7] bg-[#FCFBFA] px-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Baby A card */}
                          <div className={`rounded-xl border-2 p-4 relative ${fight.winner === 1 ? "border-[#F37338] bg-[#F37338]/5" : "border-[#D1CDC7]"}`}>
                            {fight.winner === 1 && (
                              <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-[#F37338] text-[10px] font-bold text-white uppercase">
                                🏆 Vainqueur
                              </span>
                            )}
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-lg">👶</span>
                              <span className="font-bold text-[#141413]">{fight.babyA.name}</span>
                              <Badge variant="outline" className="ml-auto text-[10px]">
                                Cote {formatOdds(fight.oddsA)}
                              </Badge>
                            </div>
                            <div className="space-y-1.5 mb-3">
                              {fight.babyA.stats.map((value, i) => (
                                <StatBar key={i} label={BABY_STATS[i]} value={value} />
                              ))}
                            </div>
                            <p className="text-xs text-[#696969]">Pot: {fight.totalPotA.toLocaleString()} pts</p>
                            <p className="text-xs text-[#696969]">Parieurs: {fight.bets.filter((b) => b.betOn === 1).length}</p>
                          </div>

                          {/* Baby B card */}
                          <div className={`rounded-xl border-2 p-4 relative ${fight.winner === 2 ? "border-[#F37338] bg-[#F37338]/5" : "border-[#D1CDC7]"}`}>
                            {fight.winner === 2 && (
                              <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-[#F37338] text-[10px] font-bold text-white uppercase">
                                🏆 Vainqueur
                              </span>
                            )}
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-lg">👶</span>
                              <span className="font-bold text-[#141413]">{fight.babyB.name}</span>
                              <Badge variant="outline" className="ml-auto text-[10px]">
                                Cote {formatOdds(fight.oddsB)}
                              </Badge>
                            </div>
                            <div className="space-y-1.5 mb-3">
                              {fight.babyB.stats.map((value, i) => (
                                <StatBar key={i} label={BABY_STATS[i]} value={value} />
                              ))}
                            </div>
                            <p className="text-xs text-[#696969]">Pot: {fight.totalPotB.toLocaleString()} pts</p>
                            <p className="text-xs text-[#696969]">Parieurs: {fight.bets.filter((b) => b.betOn === 2).length}</p>
                          </div>
                        </div>

                        {/* Bet results table */}
                        <Separator className="my-4" />
                        <h4 className="text-xs font-bold uppercase tracking-[0.06em] text-[#696969] mb-3">Resultat des paris</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-[#D1CDC7]/50">
                                <th className="text-left py-2 px-2 font-medium text-[#696969]">Joueur</th>
                                <th className="text-left py-2 px-2 font-medium text-[#696969]">Mise sur</th>
                                <th className="text-right py-2 px-2 font-medium text-[#696969]">Montant</th>
                                <th className="text-right py-2 px-2 font-medium text-[#696969]">Resultat</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...(fight.winner === 1 ? winnerA : winnerB)].map((bet, i) => (
                                <tr key={`win-${i}`} className="border-b border-[#D1CDC7]/30">
                                  <td className="py-2 px-2 font-medium text-[#141413]">{bet.playerName}</td>
                                  <td className="py-2 px-2 text-[#696969]">{bet.betOn === 1 ? fight.babyA.name : fight.babyB.name}</td>
                                  <td className="py-2 px-2 text-right text-[#141413]">{bet.amount.toLocaleString()} pts</td>
                                  <td className="py-2 px-2 text-right">
                                    <span className="text-green-600 font-bold">+{bet.winnings.toLocaleString()} pts</span>
                                  </td>
                                </tr>
                              ))}
                              {[...(fight.winner === 1 ? loserB : loserA)].map((bet, i) => (
                                <tr key={`lose-${i}`} className="border-b border-[#D1CDC7]/30">
                                  <td className="py-2 px-2 font-medium text-[#141413]">{bet.playerName}</td>
                                  <td className="py-2 px-2 text-[#696969]">{bet.betOn === 1 ? fight.babyA.name : fight.babyB.name}</td>
                                  <td className="py-2 px-2 text-right text-[#141413]">{bet.amount.toLocaleString()} pts</td>
                                  <td className="py-2 px-2 text-right">
                                    <span className="text-[#CF4500] font-medium">Perdu</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-base">Comment jouer ?</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>Un nouveau combat est genere toutes les heures</li>
            <li>Analysez les statistiques de chaque bebe (Bave, Colere, Odeur, Gaz, Chance)</li>
            <li>Selectionnez le bebe que vous pensez etre le plus fort</li>
            <li>Placez votre mise (10 - 10 000 points)</li>
            <li>Les cotes evoluent en temps reel en fonction des mises de tous les joueurs</li>
            <li>Un seul pari par joueur et par combat</li>
            <li>Les gains peuvent atteindre jusqu&apos;a 50x votre mise !</li>
            <li>Le combat se deroule automatiquement a la fin de l&apos;heure</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="bg-amber-50 border-amber-200">
        <CardHeader>
          <CardTitle className="text-base">⚠️ Important</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
            <li>Vous ne pouvez parier qu&apos;une seule fois par combat</li>
            <li>Le pot minimum est garanti a 500 points par le systeme</li>
            <li>Les cotes sont plafonnees a 50x maximum</li>
            <li>Les paris sont definitifs et ne peuvent pas etre modifies</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
