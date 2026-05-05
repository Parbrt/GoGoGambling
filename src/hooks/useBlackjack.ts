import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { TableState, TableStatus, PlayerState, Card } from "@/lib/blackjackGame";
import { calculateScore } from "@/lib/blackjackGame";

const PING_INTERVAL = 3000;

interface RawPlayer {
  id: number;
  table_id: number;
  user_id: string;
  player_name: string;
  seat: number;
  bet: number;
  hand: Card[];
  is_stand: boolean;
  is_bust: boolean;
  is_blackjack: boolean;
  result: string | null;
  winnings: number;
  last_action_at: string;
}

interface RawTable {
  id: number;
  status: TableStatus;
  phase_data: {
    deck?: Card[];
    dealerHand?: Card[];
    dealerScore?: number;
    currentPlayerSeat?: number | null;
    turnDeadline?: number;
    roundDeadline?: number;
  };
  round_number: number;
}

function buildTableState(table: RawTable, players: RawPlayer[]): TableState {
  const phaseData = table.phase_data || {};
  const dealerHand: Card[] = (phaseData.dealerHand || []).map((c: Card) =>
    c.faceDown ? { ...c, faceDown: true } : { ...c, faceDown: false }
  );

  const playerStates: PlayerState[] = players.map((p) => ({
    userId: p.user_id,
    playerName: p.player_name,
    seat: p.seat,
    bet: p.bet,
    hand: p.hand || [],
    score: calculateScore(p.hand || []),
    isStand: p.is_stand,
    isBust: p.is_bust,
    isBlackjack: p.is_blackjack,
    result: p.result,
    winnings: p.winnings,
    isActive: p.result !== "left",
    lastActionAt: p.last_action_at,
  }));

  return {
    id: table.id,
    status: table.status,
    roundNumber: table.round_number,
    dealerHand,
    dealerScore: table.status === "results" || table.status === "dealer_turn"
      ? calculateScore(dealerHand)
      : calculateScore(dealerHand.filter((c) => !c.faceDown)),
    currentPlayerSeat: phaseData.currentPlayerSeat ?? null,
    players: playerStates,
    deckRemaining: (phaseData.deck || []).length,
    turnDeadline: phaseData.turnDeadline ?? 0,
    roundDeadline: phaseData.roundDeadline ?? 0,
  };
}

async function invokeBlackjack(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("blackjack-engine", { body });
  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}

export function useBlackjack(_userId: string, playerName: string, selectedTableId: number | null) {
  const [tableState, setTableState] = useState<TableState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tableIdRef = useRef(selectedTableId);
  const errorRef = useRef<boolean>(false);

  useEffect(() => {
    tableIdRef.current = selectedTableId;
    errorRef.current = false;
  }, [selectedTableId]);

  const setErrorSafe = useCallback((msg: string | null) => {
    if (!errorRef.current || msg === null) {
      setError(msg);
      if (msg !== null) errorRef.current = true;
    }
  }, []);

  // Fetch initial state
  const fetchState = useCallback(async (tableId: number) => {
    try {
      const { data: table } = await supabase
        .from("blackjack_tables")
        .select("*")
        .eq("id", tableId)
        .single();

      const { data: players } = await supabase
        .from("blackjack_table_players")
        .select("*")
        .eq("table_id", tableId)
        .order("seat", { ascending: true });

      if (table) {
        setTableState(buildTableState(table as RawTable, (players || []) as RawPlayer[]));
      }
    } catch (err) {
      console.error("Error fetching blackjack state:", err);
    }
  }, []);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!selectedTableId) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchState(selectedTableId);

    const channel = supabase
      .channel(`blackjack-table-${selectedTableId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "blackjack_tables",
          filter: `id=eq.${selectedTableId}`,
        },
        () => {
          fetchState(selectedTableId);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "blackjack_table_players",
          filter: `table_id=eq.${selectedTableId}`,
        },
        () => {
          fetchState(selectedTableId);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [selectedTableId, fetchState]);

  // Ping loop for timer management
  useEffect(() => {
    if (!selectedTableId) return;

    const interval = setInterval(async () => {
      try {
        await invokeBlackjack({ action: "ping", tableId: selectedTableId });
      } catch {
        // Silently ignore ping errors
      }
    }, PING_INTERVAL);

    return () => clearInterval(interval);
  }, [selectedTableId]);

  const join = useCallback(async () => {
    if (!selectedTableId) return false;
    setErrorSafe(null);
    try {
      const result = await invokeBlackjack({ action: "join", tableId: selectedTableId, playerName });
      if (result.error) {
        setErrorSafe(result.error as string);
        return false;
      }
      return true;
    } catch (err) {
      setErrorSafe(err instanceof Error ? err.message : "Erreur de connexion");
      return false;
    }
  }, [selectedTableId, setErrorSafe]);

  const leave = useCallback(async () => {
    if (!selectedTableId) return;
    setErrorSafe(null);
    try {
      await invokeBlackjack({ action: "leave", tableId: selectedTableId });
      setTableState(null);
    } catch (err) {
      setErrorSafe(err instanceof Error ? err.message : "Erreur");
    }
  }, [selectedTableId, setErrorSafe]);

  const placeBet = useCallback(async (amount: number) => {
    if (!selectedTableId) return false;
    setErrorSafe(null);
    try {
      const result = await invokeBlackjack({ action: "bet", tableId: selectedTableId, bet: amount });
      if (result.error) {
        setErrorSafe(result.error as string);
        return false;
      }
      return true;
    } catch (err) {
      setErrorSafe(err instanceof Error ? err.message : "Erreur");
      return false;
    }
  }, [selectedTableId, setErrorSafe]);

  const hit = useCallback(async () => {
    if (!selectedTableId) return null;
    setErrorSafe(null);
    try {
      const result = await invokeBlackjack({ action: "hit", tableId: selectedTableId });
      if (result.error) {
        setErrorSafe(result.error as string);
        return null;
      }
      return result as Record<string, unknown>;
    } catch (err) {
      setErrorSafe(err instanceof Error ? err.message : "Erreur");
      return null;
    }
  }, [selectedTableId, setErrorSafe]);

  const stand = useCallback(async () => {
    if (!selectedTableId) return false;
    setErrorSafe(null);
    try {
      const result = await invokeBlackjack({ action: "stand", tableId: selectedTableId });
      if (result.error) {
        setErrorSafe(result.error as string);
        return false;
      }
      return true;
    } catch (err) {
      setErrorSafe(err instanceof Error ? err.message : "Erreur");
      return false;
    }
  }, [selectedTableId, setErrorSafe]);

  const startRound = useCallback(async () => {
    if (!selectedTableId) return false;
    setErrorSafe(null);
    try {
      const result = await invokeBlackjack({ action: "start_round", tableId: selectedTableId });
      if (result.error) {
        setErrorSafe(result.error as string);
        return false;
      }
      return true;
    } catch (err) {
      setErrorSafe(err instanceof Error ? err.message : "Erreur");
      return false;
    }
  }, [selectedTableId, setErrorSafe]);

  return {
    tableState,
    error,
    join,
    leave,
    placeBet,
    hit,
    stand,
    startRound,
  };
}
