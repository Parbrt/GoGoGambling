import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { CHICKEN_STATS, createChicken, generatePopulation, calculateBets } from "@/lib/chickenGame";
import { api } from "@/lib/api";

interface ChickenFightProps {
  userId: string;
  currentPoints: number;
  initialCharges?: number;
  initialLastChargeRefill?: string | null;
  onPlayerUpdate: (player: { nb_point: number; chicken_charges: number; last_chicken_charge_refill: string | null }) => void;
}

type GamePhase = "betting" | "fighting" | "result";

const MAX_CHARGES = 5;
const CHARGE_COOLDOWN_MS = 10 * 60 * 1000;

function calcNextChargeMs(charges: number, lastRefill: string | null): number {
  if (charges >= MAX_CHARGES || !lastRefill) return 0;
  const now = Date.now();
  const elapsed = now - new Date(lastRefill).getTime();
  const remaining = CHARGE_COOLDOWN_MS - (elapsed % CHARGE_COOLDOWN_MS);
  return Math.max(0, remaining);
}

export function ChickenFight({ currentPoints, initialCharges = 5, initialLastChargeRefill = null, onPlayerUpdate }: ChickenFightProps) {
  const [chickenA, setChickenA] = useState<number[]>(createChicken);
  const [chickenB, setChickenB] = useState<number[]>(createChicken);
  const [betAmount, setBetAmount] = useState<number>(0);
  const [selectedChicken, setSelectedChicken] = useState<1 | 2 | null>(null);
  const [phase, setPhase] = useState<GamePhase>("betting");
  const [resultMessage, setResultMessage] = useState<string>("");
  const [isWin, setIsWin] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [population, setPopulation] = useState<[number, number][]>(generatePopulation);

  // Charges state
  const [charges, setCharges] = useState(initialCharges);
  const [lastChargeRefill, setLastChargeRefill] = useState<string | null>(initialLastChargeRefill);
  const [nextChargeMs, setNextChargeMs] = useState(() => calcNextChargeMs(initialCharges, initialLastChargeRefill));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const betInfo = useMemo(
    () => calculateBets(population, betAmount, selectedChicken),
    [population, betAmount, selectedChicken]
  );

  // Timer for charge refill countdown
  const chargesRef = useRef(charges);
  const lastChargeRefillRef = useRef(lastChargeRefill);
  const currentPointsRef = useRef(currentPoints);
  const onPlayerUpdateRef = useRef(onPlayerUpdate);

  // Sync refs after render (avoid accessing refs during render)
  useEffect(() => {
    chargesRef.current = charges;
    lastChargeRefillRef.current = lastChargeRefill;
    currentPointsRef.current = currentPoints;
    onPlayerUpdateRef.current = onPlayerUpdate;
  });

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    const tick = () => {
      const c = chargesRef.current;
      const lr = lastChargeRefillRef.current;

      if (c >= MAX_CHARGES) {
        setNextChargeMs(0);
        return;
      }

      const remaining = calcNextChargeMs(c, lr);
      setNextChargeMs(remaining);

      if (remaining <= 0 && c < MAX_CHARGES && lr) {
        const now = Date.now();
        const elapsed = now - new Date(lr).getTime();
        const recovered = Math.floor(elapsed / CHARGE_COOLDOWN_MS);
        if (recovered > 0) {
          const newCharges = Math.min(MAX_CHARGES, c + recovered);
          const newLastRefill = new Date(new Date(lr).getTime() + recovered * CHARGE_COOLDOWN_MS).toISOString();
          const finalLastRefill = newCharges >= MAX_CHARGES ? new Date().toISOString() : newLastRefill;
          setCharges(newCharges);
          setLastChargeRefill(finalLastRefill);
          onPlayerUpdateRef.current?.({ nb_point: currentPointsRef.current, chicken_charges: newCharges, last_chicken_charge_refill: finalLastRefill });
        }
      }
    };

    tick();
    timerRef.current = setInterval(tick, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);
  const [fightResult, setFightResult] = useState<{
    winner: 1 | 2;
    scores: { a: number; b: number };
    statNames: [string, string, string];
    weights: [number, number, number];
    chickenAValues: [number, number, number];
    chickenBValues: [number, number, number];
  } | null>(null);

  const handleChickenSelect = (chicken: 1 | 2) => {
    if (phase !== "betting") return;
    setSelectedChicken(chicken);
  };

  const handleBetChange = (amount: number) => {
    if (amount > currentPoints) amount = currentPoints;
    if (amount < 0) amount = 0;
    setBetAmount(amount);
  };

  const handleStartFight = async () => {
    if (!selectedChicken || betAmount <= 0 || betAmount > currentPoints) return setError("Choisissez un poulet et une mise valide");
    if (charges <= 0) return setError("Plus de charges disponibles, attendez la prochaine recharge");

    setPhase("fighting");
    setError(null);

    try {
      const result = await api.games.chickenFight(betAmount, selectedChicken, chickenA, chickenB);
      setChickenA(result.chickenA);
      setChickenB(result.chickenB);
      setFightResult(result.fightResult);
      setIsWin(result.isWin);

      if (result.isWin) {
        setResultMessage(`Felicitations ! Vous avez gagne ${result.winnings} points !`);
      } else {
        setResultMessage("Vous avez perdu... La prochaine fois sera la bonne !");
      }

      setCharges(result.chicken_charges);
      setNextChargeMs(result.next_charge_in_ms);
      setLastChargeRefill(result.player.last_chicken_charge_refill ?? null);
      onPlayerUpdate({
        nb_point: result.player.nb_point,
        chicken_charges: result.chicken_charges,
        last_chicken_charge_refill: result.player.last_chicken_charge_refill ?? null,
      });
      setPhase("result");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur");
      setPhase("betting");
    }
  };

  const handleNextRound = useCallback(() => {
    setChickenA(createChicken()); setChickenB(createChicken());
    setSelectedChicken(null); setBetAmount(0);
    setPopulation(generatePopulation());
    setPhase("betting"); setFightResult(null);
    setResultMessage(""); setError(null); setIsWin(false);
  }, []);

  const getStatBadge = (value: number) => {
    if (value > 66) return <Badge className="bg-green-500 hover:bg-green-600">HIGH</Badge>;
    if (value > 33) return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">MID</Badge>;
    return <Badge variant="destructive">LOW</Badge>;
  };

  // Chickens for pre-fight display
  const displayA = chickenA;
  const displayB = chickenB;

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">🐔 Combat de Poulets</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && <div className="p-4 bg-destructive/10 text-destructive rounded-lg">{error}</div>}

        <div className="text-center">
          <p className="text-lg">Vos points: <span className="font-bold text-primary text-xl">{currentPoints}</span></p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Charges:</span>
          <div className="flex gap-1">
            {Array.from({ length: MAX_CHARGES }, (_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-colors ${
                  i < charges ? "bg-primary" : "bg-muted-foreground/20"
                }`}
              />
            ))}
          </div>
          <span className="text-sm font-bold text-primary">{charges}/{MAX_CHARGES}</span>
          {charges < MAX_CHARGES && (
            <span className="text-xs text-muted-foreground tabular-nums">
              +1 dans {Math.floor(nextChargeMs / 60000)}:{(Math.floor((nextChargeMs % 60000) / 1000)).toString().padStart(2, "0")}
            </span>
          )}
        </div>

        {phase === "betting" && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Card className={`cursor-pointer transition-all ${selectedChicken === 1 ? "border-primary ring-2 ring-primary bg-primary/5" : "hover:border-primary/50"}`} onClick={() => handleChickenSelect(1)}>
                <CardHeader className="pb-2"><CardTitle className="text-lg text-center">🐔 Poulet A</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {CHICKEN_STATS.map((stat, idx) => (
                    <div key={stat} className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{stat}</span>
                      {getStatBadge(displayA[idx])}
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-sm font-medium">Cote</span>
                    <Badge variant="default" className="font-bold">{betInfo.displayA}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground text-center">
                    Mises: {betInfo.betA} pts
                  </div>
                  {selectedChicken === 1 && <div className="mt-2 text-center"><Badge variant="outline" className="border-primary text-primary">✓ Selectionne</Badge></div>}
                </CardContent>
              </Card>
              <Card className={`cursor-pointer transition-all ${selectedChicken === 2 ? "border-primary ring-2 ring-primary bg-primary/5" : "hover:border-primary/50"}`} onClick={() => handleChickenSelect(2)}>
                <CardHeader className="pb-2"><CardTitle className="text-lg text-center">🐔 Poulet B</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {CHICKEN_STATS.map((stat, idx) => (
                    <div key={stat} className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{stat}</span>
                      {getStatBadge(displayB[idx])}
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-sm font-medium">Cote</span>
                    <Badge variant="default" className="font-bold">{betInfo.displayB}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground text-center">
                    Mises: {betInfo.betB} pts
                  </div>
                  {selectedChicken === 2 && <div className="mt-2 text-center"><Badge variant="outline" className="border-primary text-primary">✓ Selectionne</Badge></div>}
                </CardContent>
              </Card>
            </div>

            {selectedChicken && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Montant de votre mise:</label>
                  <Input type="number" min={0} max={currentPoints} value={betAmount} onChange={(e) => handleBetChange(parseInt(e.target.value) || 0)} placeholder={`Max: ${currentPoints} points`} />
                </div>
                <div className="flex justify-between gap-2">
                  <Button variant="outline" onClick={() => handleBetChange(betAmount + 10)} className="flex-1">+10</Button>
                  <Button variant="outline" onClick={() => handleBetChange(betAmount + 50)} className="flex-1">+50</Button>
                  <Button variant="outline" onClick={() => handleBetChange(betAmount + 100)} className="flex-1">+100</Button>
                  <Button variant="outline" onClick={() => handleBetChange(betAmount + 1000)} className="flex-1">+1000</Button>
                  <Button variant="secondary" onClick={() => handleBetChange(currentPoints)} className="flex-1">All-In</Button>
                </div>
              </div>
            )}

            <Button onClick={handleStartFight} disabled={!selectedChicken || betAmount <= 0 || betAmount > currentPoints || charges <= 0} className="w-full" size="lg">
              {charges <= 0 ? "Aucune charge disponible" : selectedChicken && betAmount > 0 ? `Lancer le combat (${betAmount} points)` : "Selectionnez un poulet et une mise"}
            </Button>
          </>
        )}

        {phase === "fighting" && (
          <div className="text-center py-8 space-y-6">
            <div className="text-6xl">🥊</div>
            <p className="text-xl font-bold">Le combat est en cours...</p>
            <div className="flex justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
          </div>
        )}

        {phase === "result" && (
          <div className="text-center py-8 space-y-6">
            <div className="text-6xl">{isWin ? "🏆" : "😢"}</div>
            <p className={`text-2xl font-bold ${isWin ? "text-green-600" : "text-destructive"}`}>{resultMessage}</p>

            {fightResult && (
              <Card className="bg-muted/50 text-left">
                <CardHeader><CardTitle className="text-base">Details du combat</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="font-semibold text-primary">Poulet A</p><p>Score: {fightResult.scores.a.toFixed(1)}</p></div>
                    <div><p className="font-semibold text-primary">Poulet B</p><p>Score: {fightResult.scores.b.toFixed(1)}</p></div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <p className="font-semibold text-sm">Stats du combat:</p>
                    {fightResult.statNames.map((statName, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm py-1 px-2 bg-background rounded">
                        <span className="font-medium">{statName}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">A: <span className="font-bold text-primary">{fightResult.chickenAValues[idx]}</span></span>
                          <span className="text-muted-foreground">B: <span className="font-bold text-primary">{fightResult.chickenBValues[idx]}</span></span>
                          <Badge variant="outline" className="text-xs">{Math.round(fightResult.weights[idx] * 100)}%</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <p className="text-sm text-muted-foreground">Gagnant: Poulet {fightResult.winner}</p>
                </CardContent>
              </Card>
            )}

            <Button onClick={handleNextRound} size="lg">Prochain combat</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
