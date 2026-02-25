import { useState, useEffect } from "react";
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
  spin,
  calculateReward,
  type SlotResult,
} from "@/lib/slotGame";
import {
  updatePlayerPoints,
  getSlotMachineJackpot,
  getSlotMachineJackpotWithDate,
  updateSlotMachineJackpot
} from "@/lib/supabase";

interface SlotMachineProps {
  userId: string;
  currentPoints: number;
  onPointsUpdate: (newPoints: number) => void;
}

type GamePhase = "betting" | "spinning" | "result";

export function SlotMachine({
  userId,
  currentPoints,
  onPointsUpdate,
}: SlotMachineProps) {
  const [machinePoints, setMachinePoints] = useState<number>(10000);
  const [isLoadingJackpot, setIsLoadingJackpot] = useState(true);
  const [betAmount, setBetAmount] = useState<number>(10);
  const [phase, setPhase] = useState<GamePhase>("betting");
  const [slotResult, setSlotResult] = useState<SlotResult | null>(null);
  const [displayNumbers, setDisplayNumbers] = useState<number[]>([0, 0, 0, 0, 0]);
  const [error, setError] = useState<string | null>(null);

  // Charger le jackpot commun au montage + bonus quotidien de 5000 pts/jour
  useEffect(() => {
    const DAILY_BONUS = 5000;

    const loadJackpot = async () => {
      try {
        const { nb_point, updated_at } = await getSlotMachineJackpotWithDate();

        // Calculer le nombre de jours écoulés depuis la dernière mise à jour
        const lastUpdate = new Date(updated_at);
        const now = new Date();
        const elapsedDays = Math.floor(
          (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (elapsedDays > 0) {
          const bonus = elapsedDays * DAILY_BONUS;
          const newJackpot = nb_point + bonus;
          await updateSlotMachineJackpot(newJackpot);
          setMachinePoints(newJackpot);
        } else {
          setMachinePoints(nb_point);
        }
      } catch (err) {
        console.error('Erreur chargement jackpot:', err);
      } finally {
        setIsLoadingJackpot(false);
      }
    };

    loadJackpot();
  }, []);

  const handleBetChange = (amount: number) => {
    if (amount > currentPoints) amount = currentPoints;
    if (amount < 1) amount = 1;
    setBetAmount(amount);
  };

  const handleSpin = async () => {
    if (betAmount <= 0 || betAmount > currentPoints) return;

    setPhase("spinning");
    setError(null);

    // Animation des numéros
    const animationInterval = setInterval(() => {
      setDisplayNumbers(spin());
    }, 100);

    setTimeout(async () => {
      clearInterval(animationInterval);
      
      const numbers = spin();
      setDisplayNumbers(numbers);
      
      // Utiliser le jackpot actuel (peut avoir changé depuis le chargement)
      const currentJackpot = await getSlotMachineJackpot();
      
      const result = calculateReward(numbers, betAmount, currentJackpot);
      setSlotResult(result);

      // Calculer les nouveaux points
      const newPlayerPoints = currentPoints - betAmount + result.reward;
      const newMachinePoints = currentJackpot + betAmount - result.reward;

      // Validation
      if (!isFinite(newPlayerPoints) || newPlayerPoints < 0) {
        setError("Erreur de calcul des points.");
        setPhase("betting");
        return;
      }

      try {
        // Mettre à jour les points du joueur
        await updatePlayerPoints(userId, Math.round(newPlayerPoints));
        onPointsUpdate(Math.round(newPlayerPoints));
        
        // Mettre à jour le jackpot commun
        await updateSlotMachineJackpot(newMachinePoints);
        setMachinePoints(newMachinePoints <= 0 ? 10000 : Math.round(newMachinePoints));
      } catch (err) {
        setError("Erreur lors de la mise à jour");
        console.error(err);
      }

      setPhase("result");
    }, 2000);
  };

  const handleNextSpin = () => {
    setSlotResult(null);
    setDisplayNumbers([0, 0, 0, 0, 0]);
    setPhase("betting");
    setError(null);
  };

  const getNumberColor = (num: number): string => {
    if (num === 7) return "text-red-600"; // Jackpot
    if (num === 8 || num === 9) return "text-purple-600"; // High value
    if (num % 2 === 1) return "text-blue-600"; // Odd
    return "text-green-600"; // Even
  };

  const getNumberBg = (num: number): string => {
    if (num === 7) return "bg-red-100 border-red-300";
    if (num === 8 || num === 9) return "bg-purple-100 border-purple-300";
    if (num % 2 === 1) return "bg-blue-100 border-blue-300";
    return "bg-green-100 border-green-300";
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">🎰 Machine à Sous</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
            {error}
          </div>
        )}

        {/* Points display */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <p className="text-sm text-muted-foreground">Vos points</p>
            <p className="text-2xl font-bold text-primary">{currentPoints}</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-lg border-2 border-yellow-300">
            <p className="text-sm text-yellow-800 font-semibold">🎰 Jackpot commun</p>
            <p className="text-2xl font-bold text-yellow-700">
              {isLoadingJackpot ? "..." : machinePoints.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Slot Display */}
        <Card className="bg-gradient-to-b from-slate-100 to-slate-200 border-4 border-slate-300">
          <CardContent className="pt-6">
            <div className="flex justify-center gap-2 sm:gap-3">
              {displayNumbers.map((num, index) => (
                <div
                  key={index}
                  className={`w-12 h-16 sm:w-16 sm:h-20 flex items-center justify-center text-2xl sm:text-3xl font-bold rounded-lg border-2 ${
                    phase === "result" && slotResult
                      ? getNumberBg(num)
                      : "bg-white border-slate-300"
                  } ${phase === "spinning" ? "animate-pulse" : ""}`}
                >
                  <span className={phase === "result" ? getNumberColor(num) : "text-slate-700"}>
                    {num}
                  </span>
                </div>
              ))}
            </div>
            
            {phase === "result" && slotResult && (
              <div className="mt-4 text-center">
                <p className={`text-lg font-bold ${
                  slotResult.winType !== 'none' ? "text-green-600" : "text-destructive"
                }`}>
                  {slotResult.message}
                </p>
                {slotResult.reward > 0 && (
                  <Badge className="mt-2 bg-green-500 text-white text-lg px-4 py-1">
                    +{slotResult.reward.toLocaleString()} points
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Betting Phase */}
        {phase === "betting" && (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Montant de votre mise:</label>
                <Input
                  type="number"
                  min={1}
                  max={currentPoints}
                  value={betAmount}
                  onChange={(e) => handleBetChange(parseInt(e.target.value) || 0)}
                  placeholder={`Max: ${currentPoints} points`}
                />
              </div>
              <div className="flex justify-between gap-2">
                <Button variant="outline" onClick={() => handleBetChange(10)} className="flex-1">
                  10
                </Button>
                <Button variant="outline" onClick={() => handleBetChange(50)} className="flex-1">
                  50
                </Button>
                <Button variant="outline" onClick={() => handleBetChange(100)} className="flex-1">
                  100
                </Button>
                <Button variant="outline" onClick={() => handleBetChange(500)} className="flex-1">
                  500
                </Button>
                <Button variant="secondary" onClick={() => handleBetChange(currentPoints)} className="flex-1">
                  Max
                </Button>
              </div>
            </div>

            <Button
              onClick={handleSpin}
              disabled={betAmount <= 0 || betAmount > currentPoints || isLoadingJackpot}
              className="w-full"
              size="lg"
            >
              {isLoadingJackpot ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : betAmount > 0 ? (
                `Lancer pour ${betAmount} points`
              ) : (
                "Entrez une mise"
              )}
            </Button>

            {/* Rules */}
            <Card className="bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Règles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-500">7</Badge>
                  <span>Jackpot : x10 à x500</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-500">8-9</Badge>
                  <span>Haute valeur : x5 à x50</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500">1-3-5</Badge>
                  <span>Impairs : x1 à x10</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500">0-2-4-6</Badge>
                  <span>Pairs : x0.5 à x5</span>
                </div>
                <Separator className="my-2" />
                <p className="text-muted-foreground font-medium">
                  🎯 Séquence magique (0-1-2-3-4...) = Remportez le jackpot commun !
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {/* Spinning Phase */}
        {phase === "spinning" && (
          <div className="text-center py-4">
            <div className="flex justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
            <p className="mt-4 text-lg font-medium">Les rouleaux tournent...</p>
          </div>
        )}

        {/* Result Phase */}
        {phase === "result" && (
          <div className="text-center space-y-4">
            <Button onClick={handleNextSpin} size="lg" className="w-full">
              Rejouer
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
