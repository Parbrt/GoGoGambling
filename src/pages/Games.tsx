import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

interface Game {
  id: string;
  name: string;
  description: string;
  icon: string;
  path: string;
  tone: string; // background tone for the circular portrait
  category: string;
}

const games: Game[] = [
  {
    id: "chicken-fight",
    name: "Chicken Fight",
    description:
      "Pariez sur le meilleur poulet. Analysez les statistiques et faites vos mises pour empocher la cagnotte.",
    icon: "🐔",
    path: "/games/chicken-fight",
    tone: "linear-gradient(135deg, #FCE3CC 0%, #F37338 100%)",
    category: "Pari sportif",
  },
  {
    id: "roulette",
    name: "Roulette",
    description:
      "Pariez sur les bons chiffres pour remporter la mise. Rouge, noir, plein, douzaine — la stratégie est à vous.",
    icon: "🍀",
    path: "/games/roulette",
    tone: "linear-gradient(135deg, #E5DCD2 0%, #9A3A0A 100%)",
    category: "Casino classique",
  },
  {
    id: "slot-machine",
    name: "Machine à Sous",
    description:
      "Faites tourner les rouleaux et tentez de gagner gros. Alignez 3, 4 ou 5 numéros identiques pour le jackpot.",
    icon: "🎰",
    path: "/games/slot-machine",
    tone: "linear-gradient(135deg, #F4E1C9 0%, #CF4500 100%)",
    category: "Jackpot",
  },
  {
    id: "blackjack",
    name: "Blackjack",
    description:
      "Affrontez le croupier en solo ou à plusieurs. Approchez 21 sans le dépasser. Jusqu'à 4 joueurs par table.",
    icon: "🃏",
    path: "/games/blackjack",
    tone: "linear-gradient(135deg, #0a5c36 0%, #1a8a4a 100%)",
    category: "Multijoueur",
  },
];

export function Games() {
  return (
    <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28">
      {/* Eyebrow + title */}
      <div className="space-y-4 mb-20 max-w-2xl">
        <span className="eyebrow">Jeux</span>
        <h1 className="text-5xl md:text-6xl font-medium tracking-[-0.03em] text-[#141413] leading-[1.02]">
          Une constellation
          <br />
          <span className="text-[#9A3A0A]">de hasard.</span>
        </h1>
        <p className="text-[#555555] text-base md:text-lg max-w-md leading-relaxed">
          Trois expériences de pari, chacune avec son propre tempo. Choisissez
          la trajectoire qui vous parle.
        </p>
      </div>

      {/* Ghost watermark */}
      <div
        aria-hidden
        className="ghost-headline absolute -top-2 right-2 text-[120px] md:text-[200px] hidden md:block select-none"
      >
        play.
      </div>

      {/* Constellation grid */}
      <div className="relative">
        {/* Decorative orbital arcs (desktop only) */}
        <svg
          aria-hidden
          className="absolute inset-0 w-full h-full hidden lg:block pointer-events-none"
          viewBox="0 0 1200 600"
          preserveAspectRatio="none"
        >
          <path
            className="orbit-arc"
            d="M 200 280 Q 400 80, 600 280"
            stroke="#F37338"
            strokeWidth="1"
            fill="none"
          />
          <path
            className="orbit-arc"
            d="M 600 280 Q 800 480, 1000 280"
            stroke="#F37338"
            strokeWidth="1"
            fill="none"
          />
        </svg>

        <div className="relative grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-x-8 gap-y-24 md:gap-y-16">
          {games.map((game, i) => (
            <Link
              key={game.id}
              to={game.path}
              className={`group relative block ${
                i === 1 ? "md:translate-y-12" : ""
              } ${i === 2 ? "xl:translate-y-4" : ""} ${
                i === 3 ? "md:translate-y-8" : ""
              }`}
            >
              {/* Circular portrait */}
              <div className="relative mx-auto max-w-[300px]">
                <div className="portrait-circle w-full">
                  <div
                    className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.04]"
                    style={{ background: game.tone }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[120px] drop-shadow-sm transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-6">
                      {game.icon}
                    </span>
                  </div>
                </div>
                {/* Satellite CTA */}
                <span className="satellite-cta">
                  <ArrowUpRight className="w-5 h-5" strokeWidth={2} />
                </span>
              </div>

              {/* Eyebrow + title below */}
              <div className="mt-8 space-y-2 text-center md:text-left max-w-[300px] mx-auto">
                <span className="eyebrow">{game.category}</span>
                <h2 className="text-2xl font-medium tracking-[-0.02em] text-[#141413] leading-tight group-hover:text-[#9A3A0A] transition-colors">
                  {game.name}
                </h2>
                <p className="text-sm text-[#555555] leading-relaxed">
                  {game.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer-style CTA strip */}
      <div className="mt-32 pt-16 border-t border-[#D1CDC7] flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
        <div className="space-y-2 max-w-lg">
          <span className="eyebrow">Bonus</span>
          <h3 className="text-2xl md:text-3xl font-medium tracking-[-0.02em] text-[#141413]">
            Une récompense quotidienne vous attend chaque jour à 9h00.
          </h3>
        </div>
        <Link
          to="/"
          className="ink-pill inline-flex items-center gap-2 px-6 py-2.5 text-sm hover:bg-[#262627] transition-colors"
        >
          Aller à l'accueil
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
