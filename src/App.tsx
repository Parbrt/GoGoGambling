import "./index.css";
import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Home } from "@/pages/Home";
import { Games } from "@/pages/Games";
import { Leaderboard } from "@/pages/Leaderboard";
import { ChickenFightPage } from "@/pages/ChickenFightPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase, checkUsernameExists, createPlayer, getPlayerByUserId, updateLastLogin } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js';
import type { PlayerType } from '@/types';

// Updating

function AppContent() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [player, setPlayer] = useState<PlayerType | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        try {
          const playerData = await getPlayerByUserId(currentUser.id);
          setPlayer(playerData);
        } catch (err) {
          console.error('Erreur lors du chargement du player:', err);
        }
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        try {
          const playerData = await getPlayerByUserId(currentUser.id);
          setPlayer(playerData);
        } catch (err) {
          console.error('Erreur lors du chargement du player:', err);
        }
      } else {
        setPlayer(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setAuthError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAuthError(error.message);
    } else if (data.user) {
      try {
        await updateLastLogin(data.user.id);
        const playerData = await getPlayerByUserId(data.user.id);
        setPlayer(playerData);
      } catch (err) {
        console.error('Erreur lors du chargement du player:', err);
      }
    }
    setLoading(false);
  };

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setAuthError(null);

    if (!username.trim()) {
      setAuthError("Veuillez choisir un nom d'utilisateur");
      setLoading(false);
      return;
    }

    try {
      const exists = await checkUsernameExists(username);
      if (exists) {
        setAuthError("This username is already taken !");
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
          alert("Account created successfuly");
        } catch (err: any) {
          setAuthError("Compte créé mais erreur lors de la création du profil: " + err.message);
        }
      }
    } catch (err: any) {
      setAuthError(err.message);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    setUser(null);
    setPlayer(null);
  };

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>✗ Erreur : {authError}</AlertDescription>
            </Alert>
            <Button onClick={() => setAuthError(null)} className="w-full">
              Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                {loading ? "Chargement..." : (isSignUp ? "Créer un compte" : "Se connecter")}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setAuthError(null);
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

  return (
    <div className="min-h-screen bg-background">
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
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return <AppContent />;
}

export default App;
