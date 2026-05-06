import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { formatCompactPoints } from "@/lib/utils";

interface SlotMachineProps {
  userId: string;
  currentPoints: number;
  onPointsUpdate: (newPoints: number) => void;
}

type GamePhase = "betting" | "spinning" | "result";

export function SlotMachine({ currentPoints, onPointsUpdate }: SlotMachineProps) {
  const [machinePoints, setMachinePoints] = useState<number>(10000);
  const [isLoadingJackpot, setIsLoadingJackpot] = useState(true);
  const [betAmount, setBetAmount] = useState<number>(10);
  const [phase, setPhase] = useState<GamePhase>("betting");
  const [displayNumbers, setDisplayNumbers] = useState<number[]>([0, 0, 0, 0, 0]);
  const [resultMessage, setResultMessage] = useState<string>("");
  const [reward, setReward] = useState<number>(0);
  const [winType, setWinType] = useState<"similar" | "sequence" | "none">("none");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.games.slotJackpot().then(({ jackpot }) => {
      setMachinePoints(jackpot);
      setIsLoadingJackpot(false);
    }).catch(() => {
      setIsLoadingJackpot(false);
    });
  }, []);

  const handleBetChange = (amount: number) => {
    if (amount > currentPoints) amount = currentPoints;
    if (amount < 1) amount = 1;
    setBetAmount(amount);
  };

  const doSpin = async () => {
    setPhase("spinning");
    setError(null);

    // Spin animation
    const animInterval = setInterval(() => {
      setDisplayNumbers(Array.from({ length: 5 }, () => Math.floor(Math.random() * 10)));
    }, 100);

    try {
      const result = await api.games.slotSpin(betAmount);

      setTimeout(() => {
        clearInterval(animInterval);
        setDisplayNumbers(result.numbers);
        setReward(result.reward);
        setWinType(result.winType);
        setResultMessage(result.message);
        setMachinePoints(result.jackpot);
        onPointsUpdate(result.player.nb_point);
        setPhase("result");
      }, 1500);
    } catch (err: unknown) {
      clearInterval(animInterval);
      setError(err instanceof Error ? err.message : "Erreur");
      setPhase("betting");
    }
  };

  const handleSpin = () => {
    if (betAmount <= 0 || betAmount > currentPoints) return;
    doSpin();
  };

  const handleRespin = () => {
    if (betAmount <= 0 || betAmount > currentPoints) return;
    setError(null);
    doSpin();
  };

  const handleNextSpin = () => {
    setDisplayNumbers([0, 0, 0, 0, 0]);
    setPhase("betting");
    setError(null);
    setResultMessage("");
    setReward(0);
    setWinType("none");
  };

  const getNumberColor = (num: number): string => {
    if (num === 7) return "text-red-600";
    if (num === 8 || num === 9) return "text-purple-600";
    if (num % 2 === 1) return "text-blue-600";
    return "text-green-600";
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
        <CardTitle className="text-2xl">🎰 Machine a Sous</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && <div className="p-4 bg-destructive/10 text-destructive rounded-lg">{error}</div>}

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <p className="text-sm text-muted-foreground">Vos points</p>
            <p className="text-2xl font-bold text-primary">{formatCompactPoints(currentPoints)}</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-lg border-2 border-yellow-300">
            <p className="text-sm text-yellow-800 font-semibold">🎰 Jackpot commun</p>
            <p className="text-2xl font-bold text-yellow-700">
              {isLoadingJackpot ? "..." : formatCompactPoints(machinePoints)}
            </p>
          </div>
        </div>

        <Card className="bg-gradient-to-b from-slate-100 to-slate-200 border-4 border-slate-300">
          <CardContent className="pt-6">
            <div className="flex justify-center gap-2 sm:gap-3">
              {displayNumbers.map((num, index) => (
                <div key={index} className={`w-12 h-16 sm:w-16 sm:h-20 flex items-center justify-center text-2xl sm:text-3xl font-bold rounded-lg border-2 ${phase === "result" ? getNumberBg(num) : "bg-white border-slate-300"} ${phase === "spinning" ? "animate-pulse" : ""}`}>
                  <span className={phase === "result" ? getNumberColor(num) : "text-slate-700"}>{num}</span>
                </div>
              ))}
            </div>
            {phase === "result" && (
              <div className="mt-4 text-center">
                <p className={`text-lg font-bold ${winType !== "none" ? "text-green-600" : "text-destructive"}`}>{resultMessage}</p>
                {reward > 0 && <Badge className="mt-2 bg-green-500 text-white text-lg px-4 py-1">+{formatCompactPoints(reward)} points</Badge>}
              </div>
            )}
          </CardContent>
        </Card>

        {phase === "betting" && (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Montant de votre mise:</label>
                <Input type="number" min={1} max={currentPoints} value={betAmount} onChange={(e) => handleBetChange(parseInt(e.target.value) || 0)} placeholder={`Max: ${formatCompactPoints(currentPoints)} points`} />
              </div>
              <div className="flex justify-between gap-2">
                <Button variant="outline" onClick={() => handleBetChange(betAmount + 10)} className="flex-1">+10</Button>
                <Button variant="outline" onClick={() => handleBetChange(betAmount + 50)} className="flex-1">+50</Button>
                <Button variant="outline" onClick={() => handleBetChange(betAmount + 100)} className="flex-1">+100</Button>
                <Button variant="outline" onClick={() => handleBetChange(betAmount + 500)} className="flex-1">+500</Button>
                <Button variant="outline" onClick={() => handleBetChange(betAmount + 1000)} className="flex-1">+1000</Button>
                <Button variant="secondary" onClick={() => handleBetChange(currentPoints)} className="flex-1">Max</Button>
              </div>
            </div>
            <Button onClick={handleSpin} disabled={betAmount <= 0 || betAmount > currentPoints || isLoadingJackpot} className="w-full" size="lg">
              {isLoadingJackpot ? <Loader2 className="h-5 w-5 animate-spin" /> : betAmount > 0 ? `Lancer pour ${formatCompactPoints(betAmount)} points` : "Entrez une mise"}
            </Button>
            <Card className="bg-muted/50">
              <CardHeader className="pb-2"><CardTitle className="text-base">Regles</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><Badge className="bg-red-500">7</Badge><span>Jackpot : x10 a x500</span></div>
                <div className="flex items-center gap-2"><Badge className="bg-purple-500">8-9</Badge><span>Haute valeur : x5 a x50</span></div>
                <div className="flex items-center gap-2"><Badge className="bg-blue-500">1-3-5</Badge><span>Impairs : x1 a x10</span></div>
                <div className="flex items-center gap-2"><Badge className="bg-green-500">0-2-4-6</Badge><span>Pairs : x0.5 a x5</span></div>
                <Separator className="my-2" />
                <p className="text-muted-foreground font-medium">🎯 Sequence magique (0-1-2-3-4...) = Remportez le jackpot commun !</p>
              </CardContent>
            </Card>
          </>
        )}

        {phase === "spinning" && (
          <div className="text-center py-4">
            <div className="flex justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
            <p className="mt-4 text-lg font-medium">Les rouleaux tournent...</p>
          </div>
        )}

        {phase === "result" && (
          <div className="text-center space-y-4">
            <Button onClick={handleRespin} disabled={betAmount <= 0 || betAmount > currentPoints} size="lg" className="w-full">Relancer ({formatCompactPoints(betAmount)} pts)</Button>
            <Button onClick={handleNextSpin} size="lg" variant="outline" className="w-full">Changer la mise</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
