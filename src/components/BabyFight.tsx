import { useBabyFight } from "@/hooks/useBabyFight";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import type { PlayerType } from "@/types";
import { BabyCard } from "@/components/BabyFight/BabyCard";
import { BetFeed } from "@/components/BabyFight/BetFeed";
import { Countdown } from "@/components/BabyFight/Countdown";
import { BetPanel } from "@/components/BabyFight/BetPanel";
import { FightResult } from "@/components/BabyFight/FightResult";
import { FightHistory } from "@/components/BabyFight/FightHistory";

interface BabyFightProps {
  player: PlayerType;
  onPlayerUpdate: (player: PlayerType) => void;
}

export function BabyFight({ player, onPlayerUpdate }: BabyFightProps) {
  const {
    fight,
    bets,
    formatTimeRemaining,
    history,
    fightResult,
    selectedBaby,
    setSelectedBaby,
    betAmount,
    setBetAmount,
    error,
    loading,
    betting,
    phase,
    handleBet,
    playerPoints,
  } = useBabyFight(player, onPlayerUpdate);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#F37338]" />
            <p className="text-muted-foreground">Chargement du combat...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!fight) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center space-y-3">
            <p className="text-muted-foreground">Aucun combat en cours.</p>
            <p className="text-sm text-muted-foreground">Revenez bientot !</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const checkIfUserHasBet = () => {
    return bets.some((bet) => bet.playerName === player.player_name);
  };

  const userHasBet = checkIfUserHasBet();

  return (
    <Card>
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-3xl">👶 Baby Fight</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Combat de bebes — toutes les heures, des gains jusqu'a 50x !
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">{error}</div>
        )}

        <div className="text-center">
          <p className="text-lg">
            Vos points: <span className="font-bold text-[#F37338] text-xl">{playerPoints.toLocaleString()}</span>
          </p>
        </div>

        <Countdown timeString={formatTimeRemaining()} phase={phase} />

        {(phase === "betting" || phase === "fighting") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BabyCard
              name={fight.babyA.name}
              stats={fight.babyA.stats}
              odds={fight.oddsA}
              pot={fight.totalPotA}
              betOn={1}
              selected={selectedBaby === 1}
              onSelect={setSelectedBaby}
              disabled={phase !== "betting" || userHasBet}
            />
            <BabyCard
              name={fight.babyB.name}
              stats={fight.babyB.stats}
              odds={fight.oddsB}
              pot={fight.totalPotB}
              betOn={2}
              selected={selectedBaby === 2}
              onSelect={setSelectedBaby}
              disabled={phase !== "betting" || userHasBet}
            />
          </div>
        )}

        {phase === "betting" && selectedBaby && (
          <BetPanel
            betAmount={betAmount}
            maxPoints={playerPoints}
            onBetChange={setBetAmount}
            onBet={handleBet}
            disabled={!selectedBaby}
            loading={betting}
            hasBet={userHasBet}
          />
        )}

        {phase === "fighting" && (
          <div className="text-center py-8 space-y-6">
            <div className="text-6xl">👊</div>
            <p className="text-xl font-bold">Le combat est en cours...</p>
            <p className="text-muted-foreground">Les bebes s'affrontent !</p>
            <div className="flex justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-[#F37338]" />
            </div>
          </div>
        )}

        {phase === "betting" && (
          <BetFeed bets={bets} babyAName={fight.babyA.name} babyBName={fight.babyB.name} />
        )}

        {phase === "resolved" && fightResult && (
          <FightResult result={fightResult} />
        )}

        {(phase === "resolved" || phase === "waiting") && (
          <FightHistory history={history} />
        )}
      </CardContent>
    </Card>
  );
}
