import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import {
  createChicken,
  fight,
  generatePopulation,
  calculateBets,
  calculateWinnings,
  CHICKEN_STATS,
  type Chicken,
  type FightResult,
  type BetInfo,
} from "@/lib/chickenGame";
import { updatePlayerPoints } from "@/lib/supabase";

interface ChickenFightProps {
  userId: string;
  currentPoints: number;
  onPointsUpdate: (newPoints: number) => void;
}

type GamePhase = "betting" | "fighting" | "result";

export function ChickenFight({
  userId,
  currentPoints,
  onPointsUpdate,
}: ChickenFightProps) {
  const [chickenA, setChickenA] = useState<Chicken>(() => createChicken());
  const [chickenB, setChickenB] = useState<Chicken>(() => createChicken());
  // Utiliser une fonction d'initialisation unique pour garantir la cohérence
  const initialData = useState(() => {
    const pop = generatePopulation();
    const bets = calculateBets(pop);
    return { population: pop, betInfo: bets };
  })[0];
  
  const [population, setPopulation] = useState<[number, number][]>(initialData.population);
  const [betInfo, setBetInfo] = useState<BetInfo>(initialData.betInfo);
  const [selectedChicken, setSelectedChicken] = useState<1 | 2 | null>(null);
  const [betAmount, setBetAmount] = useState<number>(0);
  const [phase, setPhase] = useState<GamePhase>("betting");
  const [fightResult, setFightResult] = useState<FightResult | null>(null);
  const [resultMessage, setResultMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleChickenSelect = (chicken: 1 | 2) => {
    if (phase !== "betting") return;
    setSelectedChicken(chicken);
    setBetInfo(calculateBets(population, 0, chicken));
  };

  const handleBetChange = (amount: number) => {
    if (amount > currentPoints) amount = currentPoints;
    if (amount < 0) amount = 0;
    setBetAmount(amount);
    if (selectedChicken) {
      setBetInfo(calculateBets(population, amount, selectedChicken));
    }
  };

  const handleStartFight = async () => {
    if (!selectedChicken || betAmount <= 0 || betAmount > currentPoints) return;
    
    // Vérifier que le multiplicateur est valide
    if (!isFinite(betInfo.multiplier) || betInfo.multiplier < 0) {
      setError("Erreur de calcul des cotes. Veuillez réessayer.");
      return;
    }

    setPhase("fighting");

    setTimeout(async () => {
      const result = fight(chickenA, chickenB);
      setFightResult(result);

      const isWin = selectedChicken === result.winner;
      const winnings = isWin
        ? calculateWinnings(betAmount, betInfo.multiplier)
        : 0;
      
      // Validation des gains
      if (!isFinite(winnings) || winnings < 0) {
        setError("Erreur de calcul des gains. Veuillez réessayer.");
        setPhase("betting");
        return;
      }
      
      const newPoints = currentPoints - betAmount + winnings;
      
      // Validation du nouveau total de points
      if (!isFinite(newPoints) || newPoints < 0) {
        setError("Erreur de calcul des points. Veuillez réessayer.");
        setPhase("betting");
        return;
      }

      try {
        await updatePlayerPoints(userId, newPoints);
        onPointsUpdate(newPoints);

        if (isWin) {
          setResultMessage(
            `Félicitations ! Vous avez gagné ${winnings} points !`
          );
        } else {
          setResultMessage("Vous avez perdu... Mais ne vous inquiétez pas, vous aurez plus de chance la prochaine fois !");
        }
      } catch (err) {
        setError("Erreur lors de la mise à jour des points");
        console.error(err);
      }

      setPhase("result");
    }, 2000);
  };

  const handleNextRound = useCallback(() => {
    setChickenA(createChicken());
    setChickenB(createChicken());
    const newPopulation = generatePopulation();
    setPopulation(newPopulation);
    setBetInfo(calculateBets(newPopulation));
    setSelectedChicken(null);
    setBetAmount(0);
    setPhase("betting");
    setFightResult(null);
    setResultMessage("");
    setError(null);
  }, []);

  const getStatBadge = (value: number) => {
    if (value > 66) return <Badge className="bg-green-500 hover:bg-green-600">HIGH</Badge>;
    if (value > 33) return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">MID</Badge>;
    return <Badge variant="destructive">LOW</Badge>;
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">🐔 Combat de Poulets</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
            {error}
          </div>
        )}

        <div className="text-center">
          <p className="text-lg">
            Vos points: <span className="font-bold text-primary text-xl">{currentPoints}</span>
          </p>
        </div>

        {/* Betting Phase */}
        {phase === "betting" && (
          <>
            {/* Chicken Cards */}
            <div className="grid grid-cols-2 gap-4">
              {/* Chicken A */}
              <Card 
                className={`cursor-pointer transition-all ${
                  selectedChicken === 1
                    ? "border-primary ring-2 ring-primary bg-primary/5"
                    : "hover:border-primary/50"
                }`}
                onClick={() => handleChickenSelect(1)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-center">🐔 Poulet A</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {CHICKEN_STATS.map((stat, index) => (
                    <div
                      key={stat}
                      className="flex justify-between items-center"
                    >
                      <span className="text-sm text-muted-foreground">{stat}</span>
                      {getStatBadge(chickenA[index])}
                    </div>
                  ))}
                  {selectedChicken === 1 && (
                    <div className="mt-2 text-center">
                      <Badge variant="outline" className="border-primary text-primary">✓ Sélectionné</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Chicken B */}
              <Card 
                className={`cursor-pointer transition-all ${
                  selectedChicken === 2
                    ? "border-primary ring-2 ring-primary bg-primary/5"
                    : "hover:border-primary/50"
                }`}
                onClick={() => handleChickenSelect(2)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-center">🐔 Poulet B</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {CHICKEN_STATS.map((stat, index) => (
                    <div
                      key={stat}
                      className="flex justify-between items-center"
                    >
                      <span className="text-sm text-muted-foreground">{stat}</span>
                      {getStatBadge(chickenB[index])}
                    </div>
                  ))}
                  {selectedChicken === 2 && (
                    <div className="mt-2 text-center">
                      <Badge variant="outline" className="border-primary text-primary">✓ Sélectionné</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Betting Info */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                {!isFinite(betInfo.multiplier) ? (
                  <div className="text-center text-destructive">
                    <p className="font-bold">Erreur de calcul des cotes</p>
                    <p className="text-sm">Veuillez rafraîchir la page</p>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div className="text-center flex-1">
                      <p className="text-2xl font-bold text-primary">
                        {betInfo.betA}
                      </p>
                      <p className="text-sm text-muted-foreground">Mise totale sur A</p>
                    </div>
                    <div className="text-center px-4">
                      <p className="text-3xl font-bold">
                        {betInfo.display}
                      </p>
                      <p className="text-sm text-muted-foreground">Cote</p>
                    </div>
                    <div className="text-center flex-1">
                      <p className="text-2xl font-bold text-primary">
                        {betInfo.betB}
                      </p>
                      <p className="text-sm text-muted-foreground">Mise totale sur B</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bet Input */}
            {selectedChicken && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Montant de votre mise:</label>
                  <Input
                    type="number"
                    min={0}
                    max={currentPoints}
                    value={betAmount}
                    onChange={(e) => handleBetChange(parseInt(e.target.value) || 0)}
                    placeholder={`Max: ${currentPoints} points`}
                  />
                </div>
                <div className="flex justify-between gap-2">
                  <Button variant="outline" onClick={() => handleBetChange(10)} className="flex-1">
                    +10
                  </Button>
                  <Button variant="outline" onClick={() => handleBetChange(50)} className="flex-1">
                    +50
                  </Button>
                  <Button variant="outline" onClick={() => handleBetChange(100)} className="flex-1">
                    +100
                  </Button>
                  <Button variant="secondary" onClick={() => handleBetChange(currentPoints)} className="flex-1">
                    All-In
                  </Button>
                </div>
              </div>
            )}

            {/* Start Button */}
            <Button
              onClick={handleStartFight}
              disabled={!selectedChicken || betAmount <= 0 || betAmount > currentPoints || !isFinite(betInfo.multiplier)}
              className="w-full"
              size="lg"
            >
              {selectedChicken && betAmount > 0
                ? `Lancer le combat (${betAmount} points)`
                : "Sélectionnez un poulet et une mise"}
            </Button>
          </>
        )}

        {/* Fighting Phase */}
        {phase === "fighting" && (
          <div className="text-center py-8 space-y-6">
            <div className="text-6xl">🥊</div>
            <p className="text-xl font-bold">Le combat est en cours...</p>
            <div className="flex justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
            {fightResult && (
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-base text-center">Stats sélectionnées</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {fightResult.statNames.map((statName, index) => (
                      <div key={index} className="flex items-center justify-between px-4">
                        <span className="font-semibold text-primary">{statName}</span>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            A: <span className="font-bold text-foreground">{fightResult.chickenAValues[index]}</span>
                          </span>
                          <span className="text-muted-foreground">
                            B: <span className="font-bold text-foreground">{fightResult.chickenBValues[index]}</span>
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(fightResult.weights[index] * 100)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Result Phase */}
        {phase === "result" && (
          <div className="text-center py-8 space-y-6">
            <div className="text-6xl">
              {selectedChicken === fightResult?.winner ? "🏆" : "😢"}
            </div>
            <p className={`text-2xl font-bold ${
              selectedChicken === fightResult?.winner
                ? "text-green-600"
                : "text-destructive"
            }`}>
              {resultMessage}
            </p>

            {/* Fight Details */}
            {fightResult && (
              <Card className="bg-muted/50 text-left">
                <CardHeader>
                  <CardTitle className="text-base">Détails du combat</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-semibold text-primary">Poulet A</p>
                      <p>Score: {fightResult.scores.a.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-primary">Poulet B</p>
                      <p>Score: {fightResult.scores.b.toFixed(1)}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <p className="font-semibold text-sm">Stats du combat:</p>
                    <div className="space-y-2">
                      {fightResult.statNames.map((statName, index) => (
                        <div key={index} className="flex items-center justify-between text-sm py-1 px-2 bg-background rounded">
                          <span className="font-medium">{statName}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground">
                              A: <span className="font-bold text-primary">{fightResult.chickenAValues[index]}</span>
                            </span>
                            <span className="text-muted-foreground">
                              B: <span className="font-bold text-primary">{fightResult.chickenBValues[index]}</span>
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {Math.round(fightResult.weights[index] * 100)}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <p className="text-sm text-muted-foreground">
                    Gagnant: Poulet {fightResult.winner}
                  </p>
                </CardContent>
              </Card>
            )}

            <Button onClick={handleNextRound} size="lg">
              Prochain combat
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
