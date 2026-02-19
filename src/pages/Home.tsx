import { DailyReward } from "../components/DailyReward";
import { getPlayerByUserId } from "../lib/supabase";
import type { PlayerType } from "../types";
import type { User } from "@supabase/supabase-js";

interface HomeProps {
  user: User;
  player: PlayerType;
  onPlayerUpdate: (player: PlayerType) => void;
}

export function Home({ user, player, onPlayerUpdate }: HomeProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Bienvenue {player.player_name} !</h1>
      
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Vos informations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Email</p>
            <p className="font-semibold">{user.email}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Nom</p>
            <p className="font-semibold">{player.player_name}</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-600">Points</p>
            <p className="font-bold text-2xl text-blue-700">{player.nb_point}</p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-red-600">Dettes</p>
            <p className="font-bold text-2xl text-red-700">{player.nb_debt}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-600">Actions A</p>
            <p className="font-semibold">{player.nb_share_A} (moy: {player.avg_share_A_value})</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-600">Actions B</p>
            <p className="font-semibold">{player.nb_share_B} (moy: {player.avg_share_B_value})</p>
          </div>
        </div>
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Dernière connexion</p>
          <p className="font-semibold">
            {player.last_login 
              ? new Date(player.last_login).toLocaleString('fr-FR') 
              : 'Jamais'}
          </p>
        </div>
      </div>

      <DailyReward 
        userId={user.id} 
        onRewardClaimed={async () => {
          // Rafraîchir les données du joueur après réclamation
          const updatedPlayer = await getPlayerByUserId(user.id);
          if (updatedPlayer) {
            onPlayerUpdate(updatedPlayer);
          }
        }}
      />
    </div>
  );
}
