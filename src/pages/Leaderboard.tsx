import { useEffect, useState } from "react";
import { getPlayersInfo } from "../lib/supabase";
import type { PlayerType } from "../types";

export function Leaderboard() {
  const [players, setPlayers] = useState<PlayerType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const data = await getPlayersInfo();
      // Trier par points décroissants
      const sortedPlayers = data.sort((a, b) => b.nb_point - a.nb_point);
      setPlayers(sortedPlayers);
    } catch (err) {
      setError("Erreur lors du chargement du classement");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0:
        return "bg-yellow-100 border-yellow-300";
      case 1:
        return "bg-gray-100 border-gray-300";
      case 2:
        return "bg-orange-100 border-orange-300";
      default:
        return "bg-white border-gray-200";
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return "🥇";
      case 1:
        return "🥈";
      case 2:
        return "🥉";
      default:
        return `#${index + 1}`;
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Leaderboard</h1>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Leaderboard</h1>
        <div className="bg-red-100 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
      <p className="text-gray-600 mb-8">
        Classement de tous les joueurs par nombre de points
      </p>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Rang
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joueur
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Points
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {players.map((player, index) => (
              <tr
                key={player.id}
                className={`${getRankStyle(index)} border-l-4 hover:bg-opacity-80 transition-colors`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-2xl">{getRankIcon(index)}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mr-3">
                      {player.player_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900">
                      {player.player_name}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className="text-xl font-bold text-blue-600">
                    {player.nb_point.toLocaleString()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {players.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Aucun joueur dans le classement.</p>
          </div>
        )}
      </div>

      <div className="mt-6 text-center text-sm text-gray-500">
        {players.length} joueur{players.length > 1 ? 's' : ''} au total
      </div>
    </div>
  );
}
