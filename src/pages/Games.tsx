import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

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
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Games</h1>
        <p className="text-muted-foreground">Choisissez un jeu et tentez votre chance !</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.map((game) => (
          <Link key={game.id} to={game.path} className="block">
            <Card className="group overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105">
              <div className={`${game.color} h-32 flex items-center justify-center`}>
                <span className="text-6xl transition-transform duration-300 group-hover:scale-110">
                  {game.icon}
                </span>
              </div>
              <CardHeader>
                <CardTitle className="group-hover:text-primary transition-colors">
                  {game.name}
                </CardTitle>
                <CardDescription>
                  {game.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="link" className="p-0 h-auto font-semibold group/btn">
                  Jouer maintenant
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-1" />
                </Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {games.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground text-lg">Aucun jeu disponible pour le moment.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
