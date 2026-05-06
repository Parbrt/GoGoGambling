import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import type { PlayerType } from "@/types";
import type { BabyFightData, BabyFightBet } from "@/lib/babyFightGame";

export interface BabyFightHistoryEntryLocal extends BabyFightData {
  bets: Array<{
    playerName: string;
    amount: number;
    betOn: number;
    won: boolean;
    winnings: number;
  }>;
}

interface FightResultFull {
  winner: 1 | 2;
  babyAName: string;
  babyBName: string;
  statsUsed: [number, number, number];
  statNames: [string, string, string];
  weights: [number, number, number];
  scores: { a: number; b: number };
  babyAValues: [number, number, number];
  babyBValues: [number, number, number];
  oddsA: number;
  oddsB: number;
  potA: number;
  potB: number;
  results: Array<{ playerName: string; won: boolean; winnings: number; betAmount: number }>;
}

export function useBabyFight(player: PlayerType, onPlayerUpdate: (p: PlayerType) => void) {
  const [fight, setFight] = useState<BabyFightData | null>(null);
  const [bets, setBets] = useState<BabyFightBet[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [history, setHistory] = useState<BabyFightHistoryEntryLocal[]>([]);
  const [fightResult, setFightResult] = useState<FightResultFull | null>(null);
  const [selectedBaby, setSelectedBaby] = useState<1 | 2 | null>(null);
  const [betAmount, setBetAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [betting, setBetting] = useState(false);
  const [phase, setPhase] = useState<"betting" | "fighting" | "resolved" | "waiting">("betting");
  const initRef = useRef(false);
  const seenBetsRef = useRef<Set<string>>(new Set());
  const currentFightRef = useRef<number | null>(null);

  const resetBetsTracker = useCallback((fightId: number | null) => {
    if (currentFightRef.current !== fightId) {
      currentFightRef.current = fightId;
      seenBetsRef.current = new Set();
    }
  }, []);

  const loadState = useCallback(async () => {
    try {
      const state = await api.games.babyFight.state();
      const typedFight = state.fight ? {
        ...state.fight,
        status: state.fight.status as BabyFightData["status"],
      } : null;
      setFight(typedFight);
      resetBetsTracker(typedFight?.id ?? null);
      setBets(state.bets);
      state.bets.forEach((bet) => {
        seenBetsRef.current.add(`${bet.playerName}-${bet.amount}-${bet.betOn}`);
      });
      setTimeRemaining(state.timeRemaining);

      if (typedFight) {
        if (typedFight.status === "betting") setPhase("betting");
        else if (typedFight.status === "fighting") setPhase("fighting");
        else if (typedFight.status === "resolved") setPhase("resolved");
      } else {
        setPhase("waiting");
      }
    } catch (err) {
      console.error("[baby-fight] loadState error:", err);
    } finally {
      setLoading(false);
    }
  }, [resetBetsTracker]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await api.games.babyFight.history(5);
      setHistory(res.fights as BabyFightHistoryEntryLocal[]);
    } catch (err) {
      console.error("[baby-fight] history error:", err);
    }
  }, []);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    loadState();
    loadHistory();
  }, [loadState, loadHistory]);

  useEffect(() => {
    if (timeRemaining <= 0) return;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const next = prev - 1000;
        if (next <= 0) {
          clearInterval(interval);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining > 0]);

  const onBetRef = useRef<((bet: BabyFightBet) => void) | null>(null);
  const onFightUpdateRef = useRef<((odds: { oddsA: number; oddsB: number; potA: number; potB: number; betCount: number }) => void) | null>(null);

  useEffect(() => {
    onBetRef.current = (bet: BabyFightBet) => {
      const key = `${bet.playerName}-${bet.amount}-${bet.betOn}`;
      if (seenBetsRef.current.has(key)) return;
      seenBetsRef.current.add(key);
      setBets((prev) => [bet, ...prev]);
    };
    onFightUpdateRef.current = (odds) => {
      setFight((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          oddsA: odds.oddsA,
          oddsB: odds.oddsB,
          totalPotA: odds.potA,
          totalPotB: odds.potB,
          betCount: odds.betCount,
        };
      });
    };
  });

  useWebSocket({
    onBabyFight: useCallback((type: string, data: Record<string, unknown>) => {
      switch (type) {
        case "baby_fight:bet": {
          onBetRef.current?.({
            playerName: data.playerName as string,
            amount: data.amount as number,
            betOn: data.betOn as number,
          });
          onFightUpdateRef.current?.({
            oddsA: data.oddsA as number,
            oddsB: data.oddsB as number,
            potA: data.potA as number,
            potB: data.potB as number,
            betCount: data.betCount as number,
          });
          break;
        }
        case "baby_fight:new": {
          const newFight = data.fight as BabyFightData;
          resetBetsTracker(newFight?.id ?? null);
          setFight(newFight);
          setBets(data.bets as BabyFightBet[] || []);
          (data.bets as BabyFightBet[])?.forEach((bet) => {
            seenBetsRef.current.add(`${bet.playerName}-${bet.amount}-${bet.betOn}`);
          });
          setTimeRemaining(data.timeRemaining as number);
          setPhase("betting");
          setFightResult(null);
          setSelectedBaby(null);
          setBetAmount(0);
          setError(null);
          break;
        }
        case "baby_fight:fight_start":
          setPhase("fighting");
          break;
        case "baby_fight:result": {
          setFightResult(data as unknown as FightResultFull);
          setPhase("resolved");
          loadHistory();
          break;
        }
        case "baby_fight:state": {
          const wsData = data as unknown as { fight: BabyFightData | null; bets: BabyFightBet[]; timeRemaining: number };
          const typedFight = wsData.fight ? {
            ...wsData.fight,
            status: wsData.fight.status as BabyFightData["status"],
          } : null;
          resetBetsTracker(typedFight?.id ?? null);
          setFight(typedFight);
          setBets(wsData.bets);
          wsData.bets.forEach((bet) => {
            seenBetsRef.current.add(`${bet.playerName}-${bet.amount}-${bet.betOn}`);
          });
          setTimeRemaining(wsData.timeRemaining);
          if (typedFight) {
            if (typedFight.status === "betting") setPhase("betting");
            else if (typedFight.status === "fighting") setPhase("fighting");
            else setPhase("resolved");
          }
          break;
        }
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  });

  const handleBet = useCallback(async () => {
    if (!fight || !selectedBaby || betAmount < 10 || betAmount > 10000 || betAmount > player.nb_point) {
      setError("Selectionnez un bebe et une mise valide (10-10000 points)");
      return null;
    }

    setBetting(true);
    setError(null);

    try {
      const result = await api.games.babyFight.bet(fight.id, selectedBaby, betAmount);
      onPlayerUpdate(result.player);
      return result;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors du pari");
      return null;
    } finally {
      setBetting(false);
    }
  }, [fight, selectedBaby, betAmount, player.nb_point, onPlayerUpdate]);

  const formatTimeRemaining = useCallback(() => {
    if (timeRemaining <= 0) return "00:00:00";
    const totalSeconds = Math.floor(timeRemaining / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }, [timeRemaining]);

  return {
    fight,
    bets,
    timeRemaining,
    formatTimeRemaining,
    history,
    fightResult,
    selectedBaby,
    setSelectedBaby,
    betAmount,
    setBetAmount,
    error,
    setError,
    loading,
    betting,
    phase,
    handleBet,
    playerPoints: player.nb_point,
    loadHistory,
  };
}
