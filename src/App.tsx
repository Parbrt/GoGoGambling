import "./index.css";
import { useState, useEffect, useCallback, useRef } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Home } from "@/pages/Home";
import { Games } from "@/pages/Games";
import { Leaderboard } from "@/pages/Leaderboard";
import { ChickenFightPage } from "@/pages/ChickenFightPage";
import { RoulettePage } from "@/pages/RoulettePage";
import { SlotMachinePage } from "@/pages/SlotMachinePage";
import { Profile } from "@/pages/Profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { supabase, checkUsernameExists, createPlayer, getPlayerByUserId, updateLastLogin, setPlayerOnline } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js';
import type { PlayerType } from '@/types';
import { NotificationProvider } from "@/context/NotificationContext";
import { NotificationContainer } from "@/components/NotificationContainer";
import { useAutoNotifications } from "@/hooks/useAutoNotifications";
import { useGlobalNotifications } from "@/hooks/useGlobalNotifications";

// Timeout pour l'initialisation (3 secondes max)
const INIT_TIMEOUT = 3000;

function AuthenticatedApp({ user, player, setPlayer, handleLogout }: { 
  user: User; 
  player: PlayerType; 
  setPlayer: (p: PlayerType) => void;
  handleLogout: () => void;
}) {
  // Active les notifications automatiques
  useAutoNotifications({ currentUserId: user.id, currentPlayer: player });
  useGlobalNotifications({ currentUserId: user.id });

  // Gérer le statut en ligne
  useEffect(() => {
    // Marquer comme en ligne au chargement
    setPlayerOnline(user.id, true).catch(console.error);

    // Marquer comme hors ligne à la fermeture
    const handleBeforeUnload = () => {
      setPlayerOnline(user.id, false);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      setPlayerOnline(user.id, false).catch(console.error);
    };
  }, [user.id]);

  return (
    <div className="min-h-screen bg-background">
      <NotificationContainer />
      <Header playerName={player.player_name} onLogout={handleLogout} />

      <main>
        <Routes>
          <Route
            path="/"
            element={
              <Home
                user={user}
                player={player}
                onPlayerUpdate={setPlayer}
              />
            }
          />
          <Route path="/games" element={<Games />} />
          <Route
            path="/games/chicken-fight"
            element={
              <ChickenFightPage
                userId={user.id}
                player={player}
                onPlayerUpdate={setPlayer}
              />
            }
          />
          <Route
            path="/games/roulette"
            element={
              <RoulettePage
                userId={user.id}
                player={player}
                onPlayerUpdate={setPlayer}
              />
            }
          />
          <Route
            path="/games/slot-machine"
            element={
              <SlotMachinePage
                userId={user.id}
                player={player}
                onPlayerUpdate={setPlayer}
              />
            }
          />
          <Route
            path="/profile"
            element={
              <Profile
                user={user}
                player={player}
                onPlayerUpdate={setPlayer}
              />
            }
          />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
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
  
  // Ref pour éviter les initialisations multiples
  const hasInitialized = useRef(false);

  // Initialisation de l'authentification
  useEffect(() => {
    // Éviter les exécutions multiples
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    let timeoutId: ReturnType<typeof setTimeout>;
    let subscription: { unsubscribe: () => void } | null = null;

    const initializeAuth = async () => {
      try {
        console.log('[Auth] Initialisation...');
        
        // Timeout de sécurité
        timeoutId = setTimeout(() => {
          console.warn('[Auth] Timeout - affichage du formulaire de connexion');
          setInitError("Impossible de vérifier la session. Veuillez vous connecter.");
          setIsInitializing(false);
        }, INIT_TIMEOUT);

        // Récupérer la session actuelle
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[Auth] Erreur session:', sessionError);
          throw sessionError;
        }

        const currentUser = session?.user ?? null;
        console.log('[Auth] Session:', currentUser ? `User ${currentUser.id}` : 'Aucune');

        setUser(currentUser);

        if (currentUser) {
          try {
            const playerData = await getPlayerByUserId(currentUser.id);
            console.log('[Auth] Player chargé:', playerData ? playerData.player_name : 'null');
            setPlayer(playerData);
          } catch (err) {
            console.error('[Auth] Erreur chargement player:', err);
            // On continue même sans player - l'utilisateur devra compléter son profil
          }
        }

        // Annuler le timeout si tout s'est bien passé
        clearTimeout(timeoutId);
        setIsInitializing(false);
        
        // S'abonner aux changements d'état
        const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            console.log('[Auth] Événement:', event);
            
            const newUser = newSession?.user ?? null;
            
            switch (event) {
              case 'SIGNED_IN':
              case 'TOKEN_REFRESHED':
                setUser(newUser);
                if (newUser) {
                  try {
                    const playerData = await getPlayerByUserId(newUser.id);
                    setPlayer(playerData);
                  } catch (err) {
                    console.error('[Auth] Erreur chargement player:', err);
                  }
                }
                break;
                
              case 'SIGNED_OUT':
                setUser(null);
                setPlayer(null);
                break;
                
              case 'USER_UPDATED':
                setUser(newUser);
                break;
            }
          }
        );
        
        subscription = sub;
        
      } catch (err: any) {
        console.error('[Auth] Erreur init:', err);
        clearTimeout(timeoutId);
        setInitError(err.message || "Erreur d'initialisation");
        setIsInitializing(false);
      }
    };

    initializeAuth();

    return () => {
      clearTimeout(timeoutId);
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setAuthError(null);
    setInitError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setAuthError(error.message);
      } else if (data.user) {
        setUser(data.user);
        try {
          await updateLastLogin(data.user.id);
          const playerData = await getPlayerByUserId(data.user.id);
          setPlayer(playerData);
        } catch (err) {
          console.error('Erreur lors du chargement du player:', err);
        }
      }
    } catch (err: any) {
      setAuthError(err.message || "Erreur de connexion");
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
      const exists = await checkUsernameExists(username);
      if (exists) {
        setAuthError("Ce nom d'utilisateur est déjà pris !");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setAuthError(error.message);
      } else if (data.user) {
        try {
          const newPlayer = await createPlayer(data.user.id, username);
          setPlayer(newPlayer);
          setUser(data.user);
        } catch (err: any) {
          setAuthError("Compte créé mais erreur lors de la création du profil: " + err.message);
        }
      }
    } catch (err: any) {
      setAuthError(err.message || "Erreur d'inscription");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = useCallback(async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setPlayer(null);
      setEmail("");
      setPassword("");
      setUsername("");
      setAuthError(null);
      setInitError(null);
    } catch (err) {
      console.error('Erreur lors de la déconnexion:', err);
      setAuthError("Erreur lors de la déconnexion");
    } finally {
      setLoading(false);
    }
  }, []);

  // Écran de chargement initial (max 3 secondes)
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement...</p>
          <p className="text-xs text-muted-foreground">Si cela prend trop de temps, rafraîchissez la page</p>
        </div>
      </div>
    );
  }

  // Afficher les erreurs
  if (authError || initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Erreur</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                {authError || initError}
              </AlertDescription>
            </Alert>
            <Button onClick={() => {
              setAuthError(null);
              setInitError(null);
            }} className="w-full">
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Formulaire de connexion
  if (!user || !player) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">GoGoGambling</CardTitle>
            <CardDescription>
              {isSignUp ? "Créer un compte" : "Connexion"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="username">Nom d'utilisateur</Label>
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
                <Label htmlFor="email">Email</Label>
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
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  required
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  isSignUp ? "Créer un compte" : "Se connecter"
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setAuthError(null);
                  setInitError(null);
                }}
              >
                {isSignUp
                  ? "Déjà un compte ? Se connecter"
                  : "Pas de compte ? Créer un compte"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Application authentifiée
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
