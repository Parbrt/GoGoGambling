import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

interface Game {
  id: string;
  name: string;
  description: string;
  icon: string;
  path: string;
  tone: string;
  category: string;
}

const soloGames: Game[] = [
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
];

const multiGames: Game[] = [
  {
    id: "baby-fight",
    name: "Baby Fight",
    description:
      "Deux bebes s'affrontent toutes les heures. Pariez en temps reel, les cotes evoluent avec les mises. Jusqu'a 50x.",
    icon: "👶",
    path: "/games/baby-fight",
    tone: "linear-gradient(135deg, #FDE8E8 0%, #F37338 100%)",
    category: "Combat horaire",
  },
  {
    id: "blackjack",
    name: "Blackjack",
    description:
      "Affrontez le croupier en solo ou à plusieurs. Approchez 21 sans le dépasser. Jusqu'à 4 joueurs par table.",
    icon: "🃏",
    path: "/games/blackjack",
    tone: "linear-gradient(135deg, #0a5c36 0%, #1a8a4a 100%)",
    category: "Cartes",
  },
  {
    id: "loto",
    name: "Loto",
    description:
      "Achetez vos tickets, choisissez vos numeros. Tirage a midi. Jackpot jusqu'a 1M+ pts et coffres a gagner.",
    icon: "🎱",
    path: "/loto",
    tone: "linear-gradient(135deg, #E8D5F5 0%, #7C3AED 100%)",
    category: "Tirage",
  },
];

function GameCard({ game, i }: { game: Game; i: number }) {
  return (
    <Link
      key={game.id}
      to={game.path}
      className={`group relative block ${
        i === 1 ? "md:translate-y-10" : ""
      }`}
    >
      {/* Circular portrait */}
      <div className="relative mx-auto max-w-[280px]">
        <div className="portrait-circle w-full">
          <div
            className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.04]"
            style={{ background: game.tone }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[100px] drop-shadow-sm transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-6">
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
      <div className="mt-8 space-y-2 text-center max-w-[280px] mx-auto">
        <span className="eyebrow">{game.category}</span>
        <h2 className="text-2xl font-medium tracking-[-0.02em] text-[#141413] leading-tight group-hover:text-[#9A3A0A] transition-colors">
          {game.name}
        </h2>
        <p className="text-sm text-[#555555] leading-relaxed">
          {game.description}
        </p>
      </div>
    </Link>
  );
}

export function Games() {
  return (
    <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28">
      {/* Eyebrow + title */}
      <div className="space-y-4 mb-16 max-w-2xl">
        <span className="eyebrow">Jeux</span>
        <h1 className="text-5xl md:text-6xl font-medium tracking-[-0.03em] text-[#141413] leading-[1.02]">
          Une constellation
          <br />
          <span className="text-[#9A3A0A]">de hasard.</span>
        </h1>
        <p className="text-[#555555] text-base md:text-lg max-w-md leading-relaxed">
          Pariez, tournez, affrontez. Chaque jeu a son propre tempo.
        </p>
      </div>

      {/* Ghost watermark */}
      <div
        aria-hidden
        className="ghost-headline absolute -top-2 right-2 text-[120px] md:text-[200px] hidden md:block select-none"
      >
        play.
      </div>

      {/* Row 1: Solo / Grinding */}
      <section className="mb-24">
        <div className="mb-10">
          <span className="eyebrow">Solo / Grinding</span>
          <h2 className="text-2xl md:text-3xl font-medium tracking-[-0.02em] text-[#141413] mt-2">
            Jouez a votre rythme
          </h2>
          <p className="text-sm text-[#555555] mt-1 max-w-md">
            Des jeux instantanes pour accumuler des points en solo.
          </p>
        </div>

        <div className="relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
            {soloGames.map((game, i) => (
              <GameCard key={game.id} game={game} i={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-[#D1CDC7] mb-24" />

      {/* Row 2: Multijoueur */}
      <section className="mb-24">
        <div className="mb-10">
          <span className="eyebrow">Multijoueur</span>
          <h2 className="text-2xl md:text-3xl font-medium tracking-[-0.02em] text-[#141413] mt-2">
            Affrontez les autres
          </h2>
          <p className="text-sm text-[#555555] mt-1 max-w-md">
            Des jeux ou les autres joueurs font bouger les cotes et les enjeux.
          </p>
        </div>

        <div className="relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-x-8 gap-y-16">
            {multiGames.map((game, i) => (
              <GameCard key={game.id} game={game} i={i} />
            ))}
          </div>
        </div>
      </section>


    </div>
  );
}
