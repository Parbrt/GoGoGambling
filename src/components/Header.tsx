import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  playerName: string;
  onLogout: () => void;
}

export function Header({ playerName, onLogout }: HeaderProps) {
  return (
    <header className="bg-primary text-primary-foreground shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Nom */}
          <div className="flex-shrink-0">
            <Link to="/" className="text-2xl font-bold hover:text-primary-foreground/80 transition-colors">
              GoGoGambling
            </Link>
          </div>

          {/* Navigation centrale */}
          <nav className="hidden md:flex space-x-2">
            <Button variant="ghost" asChild>
              <Link to="/games">Games</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/leaderboard">Leaderboard</Link>
            </Button>
          </nav>

          {/* Droite : Déconnexion */}
          <div className="flex items-center space-x-4">
            <span className="text-sm text-primary-foreground/70">{playerName}</span>
            <Button variant="destructive" onClick={onLogout}>
              Déconnexion
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation mobile */}
      <div className="md:hidden bg-primary/90 border-t border-primary-foreground/10">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link to="/games">Games</Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link to="/leaderboard">Leaderboard</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
