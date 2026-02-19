import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

interface HeaderProps {
  playerName: string;
  onLogout: () => void;
}

export function Header({ playerName, onLogout }: HeaderProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
    navigate("/");
  };

  return (
    <header className="bg-blue-600 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Nom */}
          <div className="flex-shrink-0">
            <Link to="/" className="text-2xl font-bold hover:text-blue-200 transition-colors">
              GoGoGambling
            </Link>
          </div>

          {/* Navigation centrale */}
          <nav className="hidden md:flex space-x-8">
            <Link
              to="/games"
              className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Games
            </Link>
            <Link
              to="/leaderboard"
              className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Leaderboard
            </Link>
          </nav>

          {/* Droite : Déconnexion */}
          <div className="flex items-center space-x-4">
            <span className="text-sm text-blue-200">{playerName}</span>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      {/* Navigation mobile */}
      <div className="md:hidden bg-blue-700">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <Link
            to="/games"
            className="block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-600"
          >
            Games
          </Link>
          <Link
            to="/leaderboard"
            className="block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-600"
          >
            Leaderboard
          </Link>
        </div>
      </div>
    </header>
  );
}
