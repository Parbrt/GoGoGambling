import { useState } from "react";
import { BlackjackLobby } from "@/components/BlackjackLobby";
import { BlackjackTable } from "@/components/BlackjackTable";
import type { PlayerType } from "@/types";

interface BlackjackPageProps {
  userId: string;
  player: PlayerType;
  onPlayerUpdate: (player: PlayerType) => void;
}

export function BlackjackPage({ userId, player, onPlayerUpdate }: BlackjackPageProps) {
  const [selectedTable, setSelectedTable] = useState<number | null>(null);

  if (selectedTable !== null) {
    return (
      <BlackjackTable
        userId={userId}
        playerName={player.player_name}
        tableId={selectedTable}
        currentPoints={player.nb_point}
        onPointsUpdate={(newPoints) => onPlayerUpdate({ ...player, nb_point: newPoints })}
        onLeave={() => setSelectedTable(null)}
      />
    );
  }

  return (
    <BlackjackLobby
      onJoinTable={(tableId) => setSelectedTable(tableId)}
      onSpectateTable={(tableId) => setSelectedTable(tableId)}
    />
  );
}
