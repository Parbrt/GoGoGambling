import { Link } from "react-router-dom";
import { ArrowUpRight, ChevronDown, Github, Twitter, MessageCircle, Coins } from "lucide-react";

const columns: Array<{
  title: string;
  links: Array<{ label: string; to: string; external?: boolean }>;
}> = [
  {
    title: "Jouer",
    links: [
      { label: "Chicken Fight", to: "/games/chicken-fight" },
      { label: "Roulette", to: "/games/roulette" },
      { label: "Machine à Sous", to: "/games/slot-machine" },
      { label: "Tous les jeux", to: "/games" },
    ],
  },
  {
    title: "Mon compte",
    links: [
      { label: "Tableau de bord", to: "/" },
      { label: "Trading", to: "/trading" },
      { label: "Profil", to: "/profile" },
      { label: "Classement", to: "/leaderboard" },
    ],
  },
  {
    title: "À propos",
    links: [
      { label: "Comment jouer", to: "/" },
      { label: "Mentions légales", to: "/" },
      { label: "Confidentialité", to: "/" },
    ],
  },
  {
    title: "Besoin d'aide ?",
    links: [
      { label: "Contact", to: "/", external: true },
      { label: "FAQ", to: "/", external: true },
      { label: "Signaler un bug", to: "/", external: true },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-[#141413] text-white mt-32">
      <div className="max-w-6xl mx-auto px-6 md:px-10 pt-20 pb-10 md:pt-28 md:pb-16">
        {/* Conversational headline */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-end mb-16 md:mb-24">
          <h2 className="text-4xl md:text-6xl font-medium tracking-[-0.03em] leading-[1.05] max-w-2xl">
            On est là quand <br className="hidden md:block" />
            vous tentez votre chance.
          </h2>
          <Link
            to="/games"
            className="inline-flex items-center gap-2 bg-white text-[#141413] rounded-[999px] pl-6 pr-3 py-2 font-medium text-sm tracking-[-0.02em] hover:bg-[#F3F0EE] transition-colors w-max"
          >
            Jouer maintenant
            <span className="w-8 h-8 rounded-full bg-[#141413] text-white flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </Link>
        </div>

        {/* 4-column link grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-12">
          {columns.map((col) => (
            <div key={col.title} className="space-y-5">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/60">
                {col.title}
              </p>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="inline-flex items-center gap-1.5 text-sm font-[450] text-white/95 hover:text-white tracking-[-0.02em] transition-colors group"
                    >
                      {link.label}
                      {link.external && (
                        <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div className="mt-20 pt-8 border-t border-white/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link to="/" className="flex items-center gap-2 text-sm font-medium tracking-[-0.02em]">
              <Coins className="w-4 h-4 text-[#F37338]" />
              GoGoGambling
            </Link>
            <span className="text-xs text-white/50">
              © {new Date().getFullYear()} — Pour le divertissement uniquement
            </span>
            <Link to="/" className="text-xs text-white/50 hover:text-white transition-colors">
              Confidentialité
            </Link>
            <Link to="/" className="text-xs text-white/50 hover:text-white transition-colors">
              Cookies
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 border border-white/30 rounded-[999px] px-4 py-2 text-xs font-medium tracking-[-0.02em] hover:bg-white/10 transition-colors"
            >
              France · Français
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <SocialIcon Icon={Twitter} label="Twitter" />
            <SocialIcon Icon={Github} label="GitHub" />
            <SocialIcon Icon={MessageCircle} label="Discord" />
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({ Icon, label }: { Icon: typeof Twitter; label: string }) {
  return (
    <a
      href="#"
      aria-label={label}
      className="w-9 h-9 rounded-full border border-white/30 flex items-center justify-center hover:bg-white hover:text-[#141413] transition-colors"
    >
      <Icon className="w-4 h-4" />
    </a>
  );
}
