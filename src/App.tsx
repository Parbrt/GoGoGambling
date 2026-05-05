import "./index.css";
import { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Home } from "@/pages/Home";
import { Trading } from "@/pages/Trading";
import { Games } from "@/pages/Games";
import { Leaderboard } from "@/pages/Leaderboard";
import { ChickenFightPage } from "@/pages/ChickenFightPage";
import { RoulettePage } from "@/pages/RoulettePage";
import { SlotMachinePage } from "@/pages/SlotMachinePage";
import { BlackjackPage } from "@/pages/BlackjackPage";
import { Profile } from "@/pages/Profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import type { User } from "@supabase/supabase-js";
import type { PlayerType } from "@/types";
import { NotificationProvider } from "@/context/NotificationContext";
import { NotificationContainer } from "@/components/NotificationContainer";
import { useAutoNotifications } from "@/hooks/useAutoNotifications";
import { useGlobalNotifications } from "@/hooks/useGlobalNotifications";

const INIT_TIMEOUT = 3000;

function AuthenticatedApp({ user, player, setPlayer, handleLogout }: {
  user: User;
  player: PlayerType;
  setPlayer: (p: PlayerType) => void;
  handleLogout: () => void;
}) {
  useAutoNotifications({ currentUserId: user.id, currentPlayer: player });
  useGlobalNotifications({ currentUserId: user.id });

  useEffect(() => {
    api.player.setOnline().catch(console.error);

    const heartbeatId = setInterval(() => {
      api.player.heartbeat().catch(() => {});
    }, 30000);

    const handleBeforeUnload = () => {
      const baseUrl = import.meta.env.VITE_API_URL || "";
      supabase.auth.getSession().then(({ data }) => {
        const token = data.session?.access_token;
        if (token) {
          fetch(`${baseUrl}/api/player/offline`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            keepalive: true,
          }).catch(() => {});
        }
      }).catch(() => {});
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      clearInterval(heartbeatId);
      api.player.setOffline().catch(() => {});
    };
  }, [user.id]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NotificationContainer />
      <Header playerName={player.player_name} onLogout={handleLogout} />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home user={user} player={player} onPlayerUpdate={setPlayer} />} />
          <Route path="/trading" element={<Trading player={player} onPlayerUpdate={setPlayer} />} />
          <Route path="/games" element={<Games />} />
          <Route path="/games/chicken-fight" element={<ChickenFightPage userId={user.id} player={player} onPlayerUpdate={setPlayer} />} />
          <Route path="/games/roulette" element={<RoulettePage userId={user.id} player={player} onPlayerUpdate={setPlayer} />} />
          <Route path="/games/slot-machine" element={<SlotMachinePage userId={user.id} player={player} onPlayerUpdate={setPlayer} />} />
          <Route path="/games/blackjack" element={<BlackjackPage userId={user.id} player={player} onPlayerUpdate={setPlayer} />} />
          <Route path="/profile" element={<Profile user={user} player={player} onPlayerUpdate={setPlayer} />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function AppContent() {
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [player, setPlayer] = useState<PlayerType | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;

    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      setInitError("Impossible de verifier la session. Veuillez vous connecter.");
      setIsInitializing(false);
    }, INIT_TIMEOUT);

    const initializeAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (cancelled) return;
        if (sessionError) throw sessionError;

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          try {
            const playerData = await api.player.me();
            if (!cancelled) setPlayer(playerData);
          } catch {
            if (!cancelled) setInitError("Impossible de charger votre profil. Verifiez votre connexion et reessayez.");
          }
        }

        if (cancelled) return;
        clearTimeout(timeoutId);
        setIsInitializing(false);

        const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            if (cancelled) return;
            const newUser = newSession?.user ?? null;
            switch (event) {
              case "SIGNED_IN":
              case "TOKEN_REFRESHED":
                setUser(newUser);
                if (newUser) {
                  try {
                    const playerData = await api.player.me();
                    if (!cancelled) setPlayer(playerData);
                  } catch {
                    if (!cancelled) setInitError("Impossible de charger votre profil. Verifiez votre connexion.");
                  }
                }
                break;
              case "SIGNED_OUT":
                setUser(null);
                setPlayer(null);
                break;
              case "USER_UPDATED":
                setUser(newUser);
                break;
            }
          }
        );
        subscription = sub;
      } catch (err: unknown) {
        if (cancelled) return;
        clearTimeout(timeoutId);
        setInitError(err instanceof Error ? err.message : "Erreur d'initialisation");
        setIsInitializing(false);
      }
    };

    initializeAuth();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setAuthError(null);
    setInitError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setAuthError(error.message);
        setLoading(false);
        return;
      }
      if (!data.user) {
        setAuthError("Erreur de connexion inattendue.");
        setLoading(false);
        return;
      }
      try {
        const playerData = await api.player.me();
        setUser(data.user);
        setPlayer(playerData);
      } catch {
        setAuthError("Impossible de charger votre profil. Verifiez votre connexion et reessayez.");
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setAuthError(null);
    setInitError(null);
    if (!username.trim()) {
      setAuthError("Veuillez choisir un nom d'utilisateur");
      setLoading(false);
      return;
    }
    try {
      const { exists } = await api.player.checkUsername(username);
      if (exists) {
        setAuthError("Ce nom d'utilisateur est deja pris !");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        if (error.message.includes("already") || error.message.includes("already registered")) {
          setAuthError("Cet email est deja utilise. Connectez-vous ou utilisez un autre email.");
        } else {
          setAuthError(error.message);
        }
        return;
      }

      if (data.user) {
        // Always create the player record even without a session (email confirmation)
        try {
          await api.player.create(data.user.id, username);
        } catch (err: unknown) {
          console.error("[SignUp] Erreur create player:", err);
        }

        if (data.session) {
          // Auto-confirmed: log in immediately
          try {
            const playerData = await api.player.me();
            setUser(data.user);
            setPlayer(playerData);
          } catch {
            setAuthError("Compte cree, mais impossible de charger votre profil. Essayez de vous connecter.");
            setUser(data.user);
          }
        } else {
          // Email confirmation required
          setAuthError(
            "Compte cree ! Verifiez votre boite email pour confirmer votre adresse, puis connectez-vous."
          );
          setIsSignUp(false);
        }
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Erreur d'inscription");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = useCallback(async () => {
    try {
      setLoading(true);
      await api.player.setOffline().catch(() => {});
      await supabase.auth.signOut();
      setUser(null);
      setPlayer(null);
      setEmail("");
      setPassword("");
      setUsername("");
      setAuthError(null);
      setInitError(null);
    } catch (err) {
      console.error("Erreur lors de la deconnexion:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F0EE]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#141413]" />
          <p className="text-[#696969] font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user || !player) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F0EE] p-6 relative overflow-hidden">
        <div
          aria-hidden
          className="ghost-headline absolute -top-4 left-0 right-0 text-center text-[140px] md:text-[220px] select-none"
        >
          welcome.
        </div>
        <div className="w-full max-w-sm relative">
          <div className="text-center mb-10">
            <span className="eyebrow inline-flex justify-center mb-3">
              {isSignUp ? "Inscription" : "Connexion"}
            </span>
            <h1 className="text-5xl font-medium tracking-[-0.03em] text-[#141413] leading-[1.02] mb-2">
              GoGoGambling
            </h1>
            <p className="text-[#696969]">
              {isSignUp
                ? "Creez votre compte en quelques secondes."
                : "Heureux de vous revoir."}
            </p>
          </div>

          <div className="bg-[#FCFBFA] rounded-[40px] border border-[#D1CDC7] p-8 shadow-[rgba(0,0,0,0.04)_0px_4px_24px_0px]">
            {(authError || initError) && (
              <div className="mb-6 p-4 bg-[#CF4500]/8 border border-[#CF4500]/20 rounded-[20px]">
                <p className="text-sm text-[#CF4500] font-medium">{authError || initError}</p>
              </div>
            )}

            <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium text-[#141413]">
                    Nom d'utilisateur
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Votre pseudo"
                    value={username}
                    required={isSignUp}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-[#141413]">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  required
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-[#141413]">
                  Mot de passe
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="········"
                  value={password}
                  required
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full mt-2">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  isSignUp ? "Creer un compte" : "Se connecter"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setAuthError(null);
                  setInitError(null);
                }}
                className="text-sm text-[#696969] hover:text-[#141413] transition-colors font-medium"
              >
                {isSignUp
                  ? "Deja un compte ? Se connecter"
                  : "Pas de compte ? Creer un compte"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthenticatedApp
      user={user}
      player={player}
      setPlayer={setPlayer}
      handleLogout={handleLogout}
    />
  );
}

function App() {
  return (
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  );
}

export default App;
