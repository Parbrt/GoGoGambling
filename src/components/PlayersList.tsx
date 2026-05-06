import { useEffect, useState } from "react";
import { formatCompactPoints } from "../lib/utils";
import { api } from "../lib/api";
import type { PlayerType } from "../types";

export default function PlayersList() {
  const [players, setPlayers] = useState<PlayerType[]>([]);

  useEffect(() => {
    api.leaderboard.list().then(setPlayers).catch(console.error);
  }, []);

  return (
    <ul>
      {players.map((player) => (
        <li key={player.id}>{player.player_name}, {formatCompactPoints(player.nb_point)}</li>
      ))}
    </ul>
  );
}
