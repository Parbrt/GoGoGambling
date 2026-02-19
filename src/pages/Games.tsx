import { Link } from "react-router-dom";

interface Game {
  id: string;
  name: string;
  description: string;
  icon: string;
  path: string;
  color: string;
}

const games: Game[] = [
  {
    id: "chicken-fight",
    name: "Chicken Fight",
    description: "Pariez sur le meilleur poulet ! Analysez les statistiques et faites vos mises pour gagner des points.",
    icon: "🐔",
    path: "/games/chicken-fight",
    color: "bg-yellow-500",
  },
];

export function Games() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Games</h1>
      <p className="text-gray-600 mb-8">Choisissez un jeu et tentez votre chance !</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.map((game) => (
          <Link
            key={game.id}
            to={game.path}
            className="group block bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-105"
          >
            <div className={`${game.color} h-32 flex items-center justify-center`}>
              <span className="text-6xl group-hover:scale-110 transition-transform duration-300">
                {game.icon}
              </span>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold mb-2 text-gray-800 group-hover:text-blue-600 transition-colors">
                {game.name}
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                {game.description}
              </p>
              <div className="mt-4 flex items-center text-blue-600 font-semibold text-sm">
                <span>Jouer maintenant</span>
                <svg 
                  className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {games.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Aucun jeu disponible pour le moment.</p>
        </div>
      )}
    </div>
  );
}
