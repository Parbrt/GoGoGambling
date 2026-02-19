import { useEffect, useState } from 'react';
import { getPlayersInfo } from '../lib/supabase';
import type { PlayerType } from '../types';

export default function PlayersList() {
  const [players, setPlayers] = useState<PlayerType[]>([]);

  useEffect(() => {
    getPlayersInfo().then(setPlayers);
  }, []);


  return (
    <ul>
      {players.map((player) => (
        <li key={player.id}>{player.player_name}, {player.nb_point}</li>
      ))}
    </ul>
  )
}
