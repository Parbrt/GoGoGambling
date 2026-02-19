import { useState, useCallback } from "react";
import {
  createChicken,
  getScale,
  fight,
  generatePopulation,
  calculateBets,
  calculateWinnings,
  CHICKEN_STATS,
  type Chicken,
  type FightResult,
  type BetInfo,
} from "../lib/chickenGame";
import { updatePlayerPoints } from "../lib/supabase";

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
  const [population, setPopulation] = useState<[number, number][]>(
    generatePopulation()
  );
  const [betInfo, setBetInfo] = useState<BetInfo>(() =>
    calculateBets(generatePopulation())
  );
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
    if (!selectedChicken || betAmount <= 0) return;

    setPhase("fighting");

    // Simulate fight delay for suspense
    setTimeout(async () => {
      const result = fight(chickenA, chickenB);
      setFightResult(result);

      const isWin = selectedChicken === result.winner;
      const winnings = isWin
        ? calculateWinnings(betAmount, betInfo.multiplier)
        : 0;
      const newPoints = currentPoints - betAmount + winnings;

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

  const getStatColor = (value: number) => {
    if (value > 66) return "text-green-600 font-bold";
    if (value > 33) return "text-yellow-600 font-semibold";
    return "text-red-500";
  };

  return (
    <div className="mt-8 p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-center mb-6">
        🐔 Combat de Poulets
      </h2>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="mb-4 text-center">
        <p className="text-lg">
          Vos points: <span className="font-bold text-blue-600">{currentPoints}</span>
        </p>
      </div>

      {/* Betting Phase */}
      {phase === "betting" && (
        <>
          {/* Chicken Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Chicken A */}
            <div
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedChicken === 1
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-blue-300"
              }`}
              onClick={() => handleChickenSelect(1)}
            >
              <h3 className="text-lg font-bold text-center mb-3">🐔 Poulet A</h3>
              <div className="space-y-2">
                {CHICKEN_STATS.map((stat, index) => (
                  <div
                    key={stat}
                    className="flex justify-between items-center"
                  >
                    <span className="text-sm text-gray-600">{stat}</span>
                    <span className={getStatColor(chickenA[index])}>
                      {getScale(chickenA[index])}
                    </span>
                  </div>
                ))}
              </div>
              {selectedChicken === 1 && (
                <div className="mt-3 text-center text-blue-600 font-semibold">
                  ✓ Sélectionné
                </div>
              )}
            </div>

            {/* Chicken B */}
            <div
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedChicken === 2
                  ? "border-red-500 bg-red-50"
                  : "border-gray-200 hover:border-red-300"
              }`}
              onClick={() => handleChickenSelect(2)}
            >
              <h3 className="text-lg font-bold text-center mb-3">🐔 Poulet B</h3>
              <div className="space-y-2">
                {CHICKEN_STATS.map((stat, index) => (
                  <div
                    key={stat}
                    className="flex justify-between items-center"
                  >
                    <span className="text-sm text-gray-600">{stat}</span>
                    <span className={getStatColor(chickenB[index])}>
                      {getScale(chickenB[index])}
                    </span>
                  </div>
                ))}
              </div>
              {selectedChicken === 2 && (
                <div className="mt-3 text-center text-red-600 font-semibold">
                  ✓ Sélectionné
                </div>
              )}
            </div>
          </div>

          {/* Betting Info */}
          <div className="bg-gray-100 p-4 rounded-lg mb-4">
            <div className="flex justify-between items-center">
              <div className="text-center flex-1">
                <p className="text-2xl font-bold text-blue-600">
                  {betInfo.betA}
                </p>
                <p className="text-sm text-gray-600">Mise totale sur A</p>
              </div>
              <div className="text-center px-4">
                <p className="text-3xl font-bold text-purple-600">
                  {betInfo.display}
                </p>
                <p className="text-sm text-gray-600">Cote</p>
              </div>
              <div className="text-center flex-1">
                <p className="text-2xl font-bold text-red-600">
                  {betInfo.betB}
                </p>
                <p className="text-sm text-gray-600">Mise totale sur B</p>
              </div>
            </div>
          </div>

          {/* Bet Input */}
          {selectedChicken && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Montant de votre mise:
              </label>
              <input
                type="number"
                min="0"
                max={currentPoints}
                value={betAmount}
                onChange={(e) => handleBetChange(parseInt(e.target.value) || 0)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={`Max: ${currentPoints} points`}
              />
              <div className="flex justify-between mt-2">
                <button
                  onClick={() => handleBetChange(10)}
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                >
                  +10
                </button>
                <button
                  onClick={() => handleBetChange(50)}
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                >
                  +50
                </button>
                <button
                  onClick={() => handleBetChange(100)}
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                >
                  +100
                </button>
                <button
                  onClick={() => handleBetChange(currentPoints)}
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm font-semibold"
                >
                  All-In
                </button>
              </div>
            </div>
          )}

          {/* Start Button */}
          <button
            onClick={handleStartFight}
            disabled={!selectedChicken || betAmount <= 0 || betAmount > currentPoints}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            {selectedChicken && betAmount > 0
              ? `Lancer le combat (${betAmount} points)`
              : "Sélectionnez un poulet et une mise"}
          </button>
        </>
      )}

      {/* Fighting Phase */}
      {phase === "fighting" && (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🥊</div>
          <p className="text-xl font-bold">Le combat est en cours...</p>
          <div className="mt-4 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
          {fightResult && (
            <div className="mt-6 text-sm text-gray-600">
              <p>Caractéristiques du combat:</p>
              <p className="font-semibold">
                {fightResult.statNames.join(" • ")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Result Phase */}
      {phase === "result" && (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">
            {selectedChicken === fightResult?.winner ? "🏆" : "😢"}
          </div>
          <p
            className={`text-2xl font-bold mb-4 ${
              selectedChicken === fightResult?.winner
                ? "text-green-600"
                : "text-red-500"
            }`}
          >
            {resultMessage}
          </p>

          {/* Fight Details */}
          {fightResult && (
            <div className="bg-gray-100 p-4 rounded-lg mb-6 text-left">
              <h4 className="font-bold mb-2">Détails du combat:</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold text-blue-600">Poulet A</p>
                  <p>Score: {fightResult.scores.a.toFixed(1)}</p>
                </div>
                <div>
                  <p className="font-semibold text-red-600">Poulet B</p>
                  <p>Score: {fightResult.scores.b.toFixed(1)}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t">
                <p className="text-sm text-gray-600">
                  Gagnant: Poulet {fightResult.winner}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleNextRound}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Prochain combat
          </button>
        </div>
      )}
    </div>
  );
}
