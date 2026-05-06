import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BlackjackHand } from "@/components/BlackjackHand";
import { BlackjackPlayerSpot } from "@/components/BlackjackPlayerSpot";
import { BlackjackBetChips } from "@/components/BlackjackBetChips";
import { BlackjackTimer } from "@/components/BlackjackTimer";
import { BlackjackResult } from "@/components/BlackjackResult";
import { useBlackjack } from "@/hooks/useBlackjack";
import { api } from "@/lib/api";
import type { TableState } from "@/lib/blackjackGame";
import { ArrowLeft, Users } from "lucide-react";

interface BlackjackTableProps {
  userId: string;
  playerName: string;
  tableId: number;
  currentPoints: number;
  onPointsUpdate: (newPoints: number) => void;
  onLeave: () => void;
}

const BETTING_DURATION = 12;
const TURN_DURATION = 10;
const RESULTS_DURATION = 5;

export function BlackjackTable({
  userId,
  playerName,
  tableId,
  currentPoints,
  onPointsUpdate,
  onLeave,
}: BlackjackTableProps) {
  const {
    tableState,
    error,
    join,
    leave,
    placeBet,
    hit,
    stand,
    startRound,
  } = useBlackjack(userId, playerName, tableId);

  const [betAmount, setBetAmount] = useState(10);
  const [showResult, setShowResult] = useState(false);
  const [lastResultState, setLastResultState] = useState<TableState | null>(null);
  const processedRoundRef = useRef<number>(-1);
  const joinStartedRef = useRef(false);
  const [localChosen, setLocalChosen] = useState(false);

  // Timer countdown
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (joinStartedRef.current) return;
    joinStartedRef.current = true;
    join();
  }, [join]);

  // Show discrete result for 5s
  useEffect(() => {
    if (tableState?.status === "results") {
      setLastResultState(tableState);
      setShowResult(true);
      const timeout = setTimeout(() => setShowResult(false), 5000);
      return () => clearTimeout(timeout);
    }
    setShowResult(false);
  }, [tableState?.status, tableState]);

  // Persist points when results arrive
  useEffect(() => {
    if (
      tableState?.status === "results" &&
      tableState.roundNumber !== processedRoundRef.current
    ) {
      processedRoundRef.current = tableState.roundNumber;
      const localPlayer = tableState.players.find((p) => p.userId === userId);
      if (localPlayer && localPlayer.bet > 0) {
        const newPoints = currentPoints + (localPlayer.winnings || 0);
        onPointsUpdate(Math.max(0, newPoints));
        api.player.updatePoints(Math.max(0, newPoints)).catch(console.error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableState?.status, tableState?.roundNumber]);

  // Reset local "chosen" flag on every new round (roundCount change) OR when leaving playing phase
  useEffect(() => {
    setLocalChosen(false);
  }, [tableState?.roundCount, tableState?.status]);

  // Timer based on server deadlines
  useEffect(() => {
    if (!tableState) return;
    let deadline: number | null = null;

    if (tableState.status === "betting" && tableState.roundDeadline > 0) {
      deadline = tableState.roundDeadline;
    } else if (tableState.status === "playing" && tableState.turnDeadline > 0) {
      deadline = tableState.turnDeadline;
    } else if (
      (tableState.status === "results" || tableState.status === "inter_round") &&
      tableState.roundDeadline > 0
    ) {
      deadline = tableState.roundDeadline;
    }

    if (deadline === null) {
      setTimerRemaining(null);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      const current = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, (deadline ?? 0) - current);
      setTimerRemaining(remaining);
    }, 200);

    const current = Math.floor(Date.now() / 1000);
    setTimerRemaining(Math.max(0, deadline - current));

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableState?.status, tableState?.roundDeadline, tableState?.turnDeadline]);

  const localPlayer = tableState?.players.find((p) => p.userId === userId);

  // Detect simultaneous mode: server sends turnDeadline but no specific currentPlayerSeat
  const simultaneousMode =
    tableState?.status === "playing" &&
    tableState.currentPlayerSeat === null &&
    tableState.turnDeadline > 0;

  // Turn-based: it's literally my seat's turn
  const turnBasedActive =
    tableState?.status === "playing" &&
    tableState.currentPlayerSeat !== null &&
    tableState.currentPlayerSeat === localPlayer?.seat;

  const localCanStillPlay = !!(
    localPlayer &&
    localPlayer.bet > 0 &&
    !localPlayer.isStand &&
    !localPlayer.isBust &&
    !localPlayer.isBlackjack
  );

  const showLocalActions =
    (turnBasedActive || simultaneousMode) && localCanStillPlay && !localChosen;

  const handleBetConfirm = async () => {
    if (betAmount < 10 || betAmount > currentPoints) return;
    const success = await placeBet(betAmount);
    if (success) {
      const newPoints = currentPoints - betAmount;
      onPointsUpdate(newPoints);
      api.player.updatePoints(newPoints).catch(console.error);
      await startRound();
    }
  };

  const handleHit = async () => {
    setLocalChosen(true);
    await hit();
  };

  const handleStand = async () => {
    setLocalChosen(true);
    await stand();
  };

  const handleLeave = useCallback(async () => {
    await leave();
    onLeave();
  }, [leave, onLeave]);

  const sortedPlayers = useMemo(
    () => [...(tableState?.players || [])].sort((a, b) => a.seat - b.seat),
    [tableState?.players]
  );
  const activePlayers = sortedPlayers.filter((p) => p.isActive);

  const localHasBet = !!(localPlayer && localPlayer.bet > 0);

  // Phase label
  const phaseLabel = (() => {
    switch (tableState?.status) {
      case "waiting":     return "En attente de joueurs";
      case "betting":     return "Mises";
      case "playing":     return simultaneousMode ? "Choisis : carte ou stop" : "Tour des joueurs";
      case "dealer_turn": return "Tour du croupier";
      case "results":     return "Résultats";
      case "inter_round": return "Pause";
      default:            return "";
    }
  })();

  const dealerScoreVisible =
    tableState?.status === "results" || tableState?.status === "dealer_turn";

  return (
    <div className="min-h-[100dvh] bg-[#F3F0EE] relative flex flex-col">
      {/* Subtle felt accent */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.35]"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 35%, rgba(243,115,56,0.08) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[1px] pointer-events-none"
        style={{ background: "linear-gradient(to right, transparent, rgba(20,20,19,0.08), transparent)" }}
      />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-[#E8E4E0] bg-white/60 backdrop-blur-sm">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleLeave}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#D1CDC7] text-[#141413] text-xs font-semibold hover:bg-[#F3F0EE] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Quitter
        </motion.button>

        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#696969]">
            Table {tableId}
          </span>
          <span className="text-sm font-semibold text-[#141413] tracking-[-0.02em]">
            {phaseLabel}
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#D1CDC7]">
          <Users className="w-3.5 h-3.5 text-[#696969]" />
          <span className="text-[#141413] text-xs font-semibold tabular-nums">
            {activePlayers.length}/4
          </span>
        </div>
      </div>

      {/* Main — scrollable on mobile, padded when action buttons are visible */}
      <div className={`relative z-10 w-full max-w-5xl mx-auto px-4 py-4 flex flex-col gap-4 flex-1 overflow-y-auto ${showLocalActions ? "pb-36" : "pb-6"}`}>
        {/* Dealer area — always the same fixed size */}
        <div className="flex flex-col items-center gap-2">
          <span className="eyebrow">Croupier</span>
          <div
            className="w-full max-w-md rounded-[32px] bg-white border border-[#D1CDC7] shadow-[0_8px_28px_rgba(20,20,19,0.06)]"
            style={{ height: "176px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible" }}
          >
            {(tableState?.dealerHand?.length ?? 0) > 0 ? (
              <BlackjackHand
                cards={tableState?.dealerHand || []}
                size="lg"
                isDealing={
                  tableState?.status === "playing" ||
                  tableState?.status === "dealer_turn"
                }
                showScore={dealerScoreVisible || (tableState?.dealerScore ?? 0) > 0}
                score={
                  dealerScoreVisible
                    ? tableState?.dealerScore
                    : tableState?.dealerScore && tableState.dealerScore > 0
                    ? tableState.dealerScore
                    : undefined
                }
                scoreTone={
                  dealerScoreVisible && (tableState?.dealerScore ?? 0) > 21
                    ? "alert"
                    : "ink"
                }
              />
            ) : (
              <span className="text-[#D1CDC7] text-sm font-medium tracking-[-0.01em]">
                En attente de la manche
              </span>
            )}
          </div>
        </div>

        {/* Phase + timer band */}
        <div className="flex flex-col items-center gap-2 min-h-[58px]">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="err"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="px-4 py-1.5 rounded-full bg-[#CF4500]/10 border border-[#CF4500]/30 text-[#CF4500] text-xs font-semibold"
              >
                {error}
              </motion.div>
            )}

            {tableState?.status === "betting" && timerRemaining !== null && (
              <motion.div
                key="bet-timer"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <BlackjackTimer
                  remaining={timerRemaining}
                  total={BETTING_DURATION}
                  label="Temps pour miser"
                />
              </motion.div>
            )}

            {tableState?.status === "playing" && timerRemaining !== null && (
              <motion.div
                key="play-timer"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <BlackjackTimer
                  remaining={timerRemaining}
                  total={TURN_DURATION}
                  label={simultaneousMode ? "Décision simultanée" : "Tour en cours"}
                />
              </motion.div>
            )}

            {tableState?.status === "playing" && simultaneousMode && localChosen && localCanStillPlay && (
              <motion.span
                key="chosen"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[11px] text-[#1f7a45] font-semibold uppercase tracking-[0.08em]"
              >
                ✓ choix enregistré · en attente
              </motion.span>
            )}

            {tableState?.status === "playing" && !simultaneousMode && !turnBasedActive && (
              <motion.span
                key="other-turn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-[#696969] font-medium animate-pulse"
              >
                Tour d'un autre joueur…
              </motion.span>
            )}

            {tableState?.status === "dealer_turn" && (
              <motion.span
                key="dealer"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-[#141413] font-semibold tracking-[-0.01em]"
              >
                Le croupier joue…
              </motion.span>
            )}

            {(tableState?.status === "results" || tableState?.status === "inter_round") &&
              timerRemaining !== null && (
                <motion.div
                  key="next-timer"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <BlackjackTimer
                    remaining={timerRemaining}
                    total={RESULTS_DURATION}
                    label="Nouvelle manche dans"
                    variant="compact"
                  />
                </motion.div>
              )}
          </AnimatePresence>
        </div>

        {/* Players row */}
        <div className="w-full">
          <div className="flex justify-center items-end gap-3 flex-wrap">
            <AnimatePresence mode="popLayout">
              {activePlayers.map((player) => (
                <BlackjackPlayerSpot
                  key={player.userId}
                  player={player}
                  isCurrentPlayer={
                    tableState?.status === "playing" &&
                    tableState.currentPlayerSeat === player.seat
                  }
                  isLocalPlayer={player.userId === userId}
                  phase={tableState?.status || "waiting"}
                  timerRemaining={
                    turnBasedActive && player.userId === userId ? timerRemaining : null
                  }
                  hasChosen={
                    player.userId === userId
                      ? localChosen ||
                        !!tableState?.pendingChoices?.[String(player.seat)]
                      : !!tableState?.pendingChoices?.[String(player.seat)] ||
                        player.isStand ||
                        player.isBust ||
                        player.isBlackjack
                  }
                  showActions={false}
                  onHit={handleHit}
                  onStand={handleStand}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Bet area */}
        <AnimatePresence>
          {tableState?.status === "betting" && !localHasBet && (
            <motion.div
              key="bet-area"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
            >
              <BlackjackBetChips
                currentPoints={currentPoints}
                currentBet={betAmount}
                onBetChange={setBetAmount}
                onConfirmBet={handleBetConfirm}
                disabled={false}
              />
            </motion.div>
          )}

          {tableState?.status === "betting" && localHasBet && (
            <motion.div
              key="bet-wait"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <span className="inline-block px-4 py-2 rounded-full bg-white border border-[#D1CDC7] text-[#696969] text-xs font-medium animate-pulse">
                Mise placée — en attente des autres joueurs
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Big action buttons — fixed bottom bar when it's your turn */}
      <AnimatePresence>
        {showLocalActions && (
          <motion.div
            key="action-bar"
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="fixed bottom-0 left-0 right-0 z-30 px-4 pt-3 bg-gradient-to-t from-[#F3F0EE] via-[#F3F0EE]/90 to-transparent"
            style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
          >
            {/* Round label + timer */}
            {tableState?.roundCount !== undefined && tableState.roundCount > 0 && (
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#696969]">
                  Round {tableState.roundCount}
                </span>
                {timerRemaining !== null && (
                  <span className={`text-[11px] font-bold tabular-nums ${timerRemaining <= 3 ? "text-[#CF4500]" : "text-[#F37338]"}`}>
                    · {timerRemaining}s
                  </span>
                )}
              </div>
            )}
            <div className="flex gap-3 max-w-sm mx-auto">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleHit}
                className="flex-1 py-4 rounded-2xl bg-[#141413] text-white text-base font-bold tracking-[-0.02em] shadow-[0_8px_24px_rgba(20,20,19,0.18)] active:shadow-none transition-shadow"
              >
                + Carte
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleStand}
                className="flex-1 py-4 rounded-2xl bg-[#CF4500] text-white text-base font-bold tracking-[-0.02em] shadow-[0_8px_24px_rgba(207,69,0,0.25)] active:shadow-none transition-shadow"
              >
                Stop
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Discrete result */}
      <BlackjackResult
        players={lastResultState?.players || tableState?.players || []}
        dealerScore={lastResultState?.dealerScore || tableState?.dealerScore || 0}
        isVisible={showResult}
        localUserId={userId}
      />
    </div>
  );
}
