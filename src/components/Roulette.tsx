import { useState, useCallback, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import RoulettePro from "react-roulette-pro";
import "react-roulette-pro/dist/index.css";
import { generateRouletteNumber, calculateRouletteWinnings, isEven, ROULETTE_NUMBERS, type RouletteChoice } from "@/lib/rouletteGame";
import { updatePlayerPoints } from "@/lib/supabase";

interface RouletteProps {
  userId: string;
  currentPoints: number;
  onPointsUpdate: (newPoints: number) => void;
}

type GamePhase = "betting" | "spinning" | "result";
type BetType = "odd-even" | "number" | null;

// Générer une image SVG simple pour chaque numéro
const generateRouletteImage = (num: number): string => {
  let bgColor = "";
  
  if (num === 0) {
    bgColor = "#22c55e"; // Vert
  } else if (isEven(num)) {
    bgColor = "#000000"; // Noir
  } else {
    bgColor = "#ef4444"; // Rouge
  }
  
  // Créer un SVG simple avec le numéro
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
      <rect width="100" height="100" fill="${bgColor}"/>
      <text x="50" y="65" font-family="Arial" font-size="40" fill="white" text-anchor="middle" font-weight="bold">${num}</text>
    </svg>
  `;
  
  // Convertir en data URI
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// Générer les prix pour la roulette (numéros 0-35)
const generateRoulettePrizes = () => {
  return ROULETTE_NUMBERS.map((num) => ({
    id: `number-${num}`,
    image: generateRouletteImage(num),
    text: num.toString(),
  }));
};

const PRIZES = generateRoulettePrizes();

// Répéter les prix pour un effet de roue infinie avec IDs uniques
const generatePrizeList = () => {
  const repetitions = 8;
  const list = [];
  
  for (let i = 0; i < repetitions; i++) {
    for (const prize of PRIZES) {
      list.push({
        ...prize,
        id: `${prize.id}-rep-${i}`, // ID unique par répétition
        originalNumber: parseInt(prize.text), // Garder le numéro original pour le calcul
      });
    }
  }
  
  return list;
};

const PRIZE_LIST = generatePrizeList();

export function Roulette({
  userId,
  currentPoints,
  onPointsUpdate,
}: RouletteProps) {
  const [phase, setPhase] = useState<GamePhase>("betting");
  const [betType, setBetType] = useState<BetType>(null);
  const [betChoice, setBetChoice] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState<number>(0);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [resultMessage, setResultMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isWin, setIsWin] = useState<boolean>(false);
  
  // Ref pour stocker le numéro gagnant (pour être sûr qu'il est disponible dans le callback)
  const winningNumberRef = useRef<number | null>(null);
  
  // États pour la roulette
  const [startSpinning, setStartSpinning] = useState(false);
  const [prizeIndex, setPrizeIndex] = useState(0);

  const handleBetTypeSelect = (type: BetType) => {
    setBetType(type);
    setBetChoice(null);
  };

  const handleBetChoiceSelect = (choice: number) => {
    setBetChoice(choice);
  };

  const handleBetAmountChange = (amount: number) => {
    if (amount > currentPoints) amount = currentPoints;
    if (amount < 0) amount = 0;
    setBetAmount(amount);
  };

  const handleSpin = async () => {
    if (!betType || betChoice === null || betAmount <= 0) return;

    const number = generateRouletteNumber();
    setWinningNumber(number);
    winningNumberRef.current = number; // Stocker dans la ref pour le callback
    
    // Calculer l'index dans la liste des prix
    // PRIZE_LIST contient les numéros répétés 8 fois
    // On veut s'arrêter sur la 5ème répétition (index 4) + le numéro gagnant
    const repetitionIndex = 4; // 5ème répétition (0-indexed)
    const targetIndex = (repetitionIndex * PRIZES.length) + number;
    
    console.log('Spinning to number:', number, 'at index:', targetIndex);
    
    // D'abord mettre à jour l'index, puis démarrer
    setPrizeIndex(targetIndex);
    setPhase("spinning");
    
    // Petit délai pour s'assurer que prizeIndex est mis à jour
    setTimeout(() => {
      setStartSpinning(true);
    }, 100);
  };

  const handlePrizeDefined = useCallback(async () => {
    // Utiliser la ref pour être sûr d'avoir le numéro gagnant
    const actualWinningNumber = winningNumberRef.current;
    
    console.log('handlePrizeDefined called, winning number:', actualWinningNumber);
    
    if (actualWinningNumber === null || !betType || betChoice === null) {
      console.log('Missing data, returning early');
      return;
    }

    const choice: RouletteChoice = {
      type: betType,
      value: betChoice,
    };

    const winnings = calculateRouletteWinnings(betAmount, choice, actualWinningNumber);
    const isWinning = winnings > 0;
    setIsWin(isWinning);

    const newPoints = currentPoints - betAmount + winnings;

    if (!isFinite(newPoints) || newPoints < 0) {
      setError("Erreur de calcul des points. Veuillez réessayer.");
      setPhase("betting");
      return;
    }

    try {
      await updatePlayerPoints(userId, newPoints);
      onPointsUpdate(newPoints);

      if (isWinning) {
        const multiplier = betType === "odd-even" ? 2 : 36;
        setResultMessage(
          `Félicitations ! Le numéro ${actualWinningNumber} est sorti ! Vous avez gagné ${winnings} points (x${multiplier}) !`
        );
      } else {
        setResultMessage(`Le numéro ${actualWinningNumber} est sorti... Vous avez perdu votre mise.`);
      }
    } catch (err) {
      setError("Erreur lors de la mise à jour des points");
      console.error(err);
    }

    setPhase("result");
    setStartSpinning(false);
    
    // Réinitialiser la ref
    winningNumberRef.current = null;
  }, [betType, betChoice, betAmount, currentPoints, userId, onPointsUpdate]);

  // Forcer le résultat après 8 secondes si le callback n'est pas déclenché
  useEffect(() => {
    if (phase === "spinning") {
      const timer = setTimeout(() => {
        console.log("Forcing prize defined after timeout");
        handlePrizeDefined();
      }, 6500); // 6.5 secondes max (5s animation + 1.5s marge)
      
      return () => clearTimeout(timer);
    }
  }, [phase, handlePrizeDefined]);

  const handleNextRound = () => {
    setPhase("betting");
    setBetType(null);
    setBetChoice(null);
    setBetAmount(0);
    setWinningNumber(null);
    winningNumberRef.current = null;
    setResultMessage("");
    setError(null);
    setIsWin(false);
    setStartSpinning(false);
    setPrizeIndex(0);
  };

  const getNumberColor = (num: number) => {
    if (num === 0) return "bg-green-500 text-white";
    return isEven(num) ? "bg-black text-white" : "bg-red-500 text-white";
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">🎰 Roulette</CardTitle>
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
            {/* Bet Type Selection */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <Label className="text-base font-semibold block mb-4">Choisissez votre type de pari:</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant={betType === "odd-even" ? "default" : "outline"}
                    onClick={() => handleBetTypeSelect("odd-even")}
                    className="h-auto py-4 flex flex-col"
                  >
                    <span className="text-lg font-bold">Impair/Pair</span>
                    <Badge variant="secondary" className="mt-2">x2</Badge>
                  </Button>
                  <Button
                    variant={betType === "number" ? "default" : "outline"}
                    onClick={() => handleBetTypeSelect("number")}
                    className="h-auto py-4 flex flex-col"
                  >
                    <span className="text-lg font-bold">Numéro (0-35)</span>
                    <Badge variant="secondary" className="mt-2">x36</Badge>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Bet Choice Selection */}
            {betType === "odd-even" && (
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <Label className="text-base font-semibold block mb-4">Impair ou Pair ?</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant={betChoice === 1 ? "default" : "outline"}
                      onClick={() => handleBetChoiceSelect(1)}
                      className="h-auto py-4"
                    >
                      <span className="text-lg font-bold">🔴 Impair</span>
                    </Button>
                    <Button
                      variant={betChoice === 2 ? "default" : "outline"}
                      onClick={() => handleBetChoiceSelect(2)}
                      className="h-auto py-4"
                    >
                      <span className="text-lg font-bold">⚫ Pair</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {betType === "number" && (
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <Label className="text-base font-semibold block mb-4">Choisissez un numéro (0-35):</Label>
                  <div className="grid grid-cols-6 gap-2 max-h-60 overflow-y-auto p-2">
                    {ROULETTE_NUMBERS.map((num) => (
                      <Button
                        key={num}
                        variant={betChoice === num ? "default" : "outline"}
                        onClick={() => handleBetChoiceSelect(num)}
                        className={`h-10 w-10 p-0 text-sm font-bold ${
                          betChoice === num ? "" : getNumberColor(num)
                        }`}
                      >
                        {num}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bet Amount Input */}
            {betChoice !== null && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Montant de votre mise:</label>
                  <Input
                    type="number"
                    min={0}
                    max={currentPoints}
                    value={betAmount}
                    onChange={(e) => handleBetAmountChange(parseInt(e.target.value) || 0)}
                    placeholder={`Max: ${currentPoints} points`}
                  />
                </div>
                <div className="flex justify-between gap-2">
                  <Button variant="outline" onClick={() => handleBetAmountChange(10)} className="flex-1">
                    +10
                  </Button>
                  <Button variant="outline" onClick={() => handleBetAmountChange(50)} className="flex-1">
                    +50
                  </Button>
                  <Button variant="outline" onClick={() => handleBetAmountChange(100)} className="flex-1">
                    +100
                  </Button>
                  <Button variant="secondary" onClick={() => handleBetAmountChange(currentPoints)} className="flex-1">
                    All-In
                  </Button>
                </div>
              </div>
            )}

            {/* Spin Button */}
            <Button
              onClick={handleSpin}
              disabled={!betType || betChoice === null || betAmount <= 0 || betAmount > currentPoints}
              className="w-full"
              size="lg"
            >
              {betType && betChoice !== null && betAmount > 0
                ? `Lancer la roulette (${betAmount} points)`
                : "Choisissez votre pari"}
            </Button>
          </>
        )}

        {/* Spinning Phase */}
        {phase === "spinning" && (
          <div className="text-center py-8 space-y-6">
            <p className="text-xl font-bold">La roulette tourne...</p>
            <div className="flex justify-center items-center min-h-[300px]">
              <RoulettePro
                prizes={PRIZE_LIST}
                prizeIndex={prizeIndex}
                start={startSpinning}
                onPrizeDefined={handlePrizeDefined}
                spinningTime={5}
                options={{
                  stopInCenter: true,
                  withoutAnimation: false,
                }}
              />
            </div>
            {/* Bouton de secours au cas où l'animation bloque */}
            <Button 
              variant="outline" 
              onClick={handlePrizeDefined}
              className="mt-4"
            >
              Voir le résultat
            </Button>
          </div>
        )}

        {/* Result Phase */}
        {phase === "result" && winningNumber !== null && (
          <div className="text-center py-8 space-y-6">
            <div className={`text-6xl w-20 h-20 mx-auto rounded-full flex items-center justify-center font-bold text-3xl ${getNumberColor(winningNumber)}`}>
              {winningNumber}
            </div>
            <p className={`text-2xl font-bold ${isWin ? "text-green-600" : "text-destructive"}`}>
              {resultMessage}
            </p>

            <Card className="bg-muted/50 text-left">
              <CardHeader>
                <CardTitle className="text-base">Détails du pari</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><span className="font-semibold">Type de pari:</span> {betType === "odd-even" ? "Impair/Pair" : "Numéro"}</p>
                <p><span className="font-semibold">Votre choix:</span> {betType === "odd-even" ? (betChoice === 1 ? "Impair" : "Pair") : betChoice}</p>
                <p><span className="font-semibold">Numéro gagnant:</span> {winningNumber} ({isEven(winningNumber) ? "Pair" : "Impair"})</p>
                <p><span className="font-semibold">Mise:</span> {betAmount} points</p>
              </CardContent>
            </Card>

            <Button onClick={handleNextRound} size="lg">
              Rejouer
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
