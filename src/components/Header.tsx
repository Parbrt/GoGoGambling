import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

interface HeaderProps {
  playerName: string;
  onLogout: () => void;
}

export function Header({ playerName, onLogout }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const links = [
    { to: "/", label: "Accueil" },
    { to: "/trading", label: "Trading" },
    { to: "/games", label: "Jeux" },
    { to: "/leaderboard", label: "Classement" },
  ];

  return (
    <>
      <div className="sticky top-0 z-50 px-4 pt-6 pointer-events-none">
        <nav className="pointer-events-auto max-w-6xl mx-auto bg-white/95 backdrop-blur-md rounded-[999px] shadow-[rgba(0,0,0,0.04)_0px_4px_24px_0px] pl-7 pr-3 py-2.5 flex justify-between items-center">
          <Link
            to="/"
            className="flex items-center gap-2.5 flex-shrink-0 group"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#F37338] opacity-60 group-hover:animate-ping" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#CF4500]" />
            </span>
            <span className="text-[#141413] font-medium text-base tracking-[-0.03em]">
              GoGoGambling
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-10">
            {links.map((link) => {
              const active = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`relative text-base font-medium tracking-[-0.03em] transition-colors ${
                    active ? "text-[#141413]" : "text-[#696969] hover:text-[#141413]"
                  }`}
                >
                  {link.label}
                  {active && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#F37338]" />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/profile"
              className="group flex items-center gap-1.5 text-sm text-[#696969] hover:text-[#141413] transition-colors font-medium tracking-[-0.02em] px-3 py-1.5 rounded-full border border-transparent hover:border-[#141413]/15 hover:bg-[#F3F0EE]"
            >
              {playerName}
              <svg className="w-3 h-3 text-[#696969] group-hover:text-[#141413] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <Button size="sm" variant="outline" onClick={onLogout}>
              Déconnexion
            </Button>
          </div>

          <button
            className="md:hidden w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#F3F0EE] transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? (
              <X className="w-5 h-5 text-[#141413]" />
            ) : (
              <Menu className="w-5 h-5 text-[#141413]" />
            )}
          </button>
        </nav>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-[#F3F0EE] pt-28 px-6 flex flex-col gap-1">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className="text-3xl font-medium text-[#141413] tracking-[-0.03em] py-4 border-b border-[#D1CDC7]"
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/profile"
            onClick={() => setMobileOpen(false)}
            className="text-3xl font-medium text-[#141413] tracking-[-0.03em] py-4 border-b border-[#D1CDC7]"
          >
            {playerName}
          </Link>
          <Button
            className="w-full mt-8"
            onClick={() => {
              setMobileOpen(false);
              onLogout();
            }}
          >
            Déconnexion
          </Button>
        </div>
      )}
    </>
  );
}
