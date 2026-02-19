import "./index.css";
import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Header } from "./components/Header";
import { Home } from "./pages/Home";
import { Games } from "./pages/Games";
import { Leaderboard } from "./pages/Leaderboard";
import { ChickenFightPage } from "./pages/ChickenFightPage";
import { supabase, checkUsernameExists, createPlayer, getPlayerByUserId, updateLastLogin } from './lib/supabase'
import type { User } from '@supabase/supabase-js';
import type { PlayerType } from './types';

// Auth wrapper component
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
    // Check for existing session
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

    // Listen for auth changes
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
      // Check if username already exist
      const exists = await checkUsernameExists(username);
      if (exists) {
        setAuthError("This username is already taken !");
        setLoading(false);
        return;
      }

      // Create user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setAuthError(error.message);
      } else if (data.user) {
        // Create player with associated username
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

  // Show auth error
  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
          <h1 className="text-2xl font-bold mb-4">Authentication</h1>
          <p className="text-red-500 mb-4">✗ Erreur : {authError}</p>
          <button 
            className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" 
            onClick={() => setAuthError(null)}
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  // Show login/signup form if not authenticated
  if (!user || !player) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
          <h1 className="text-3xl font-bold text-center mb-2">GoGoGambling</h1>
          <p className="text-center text-gray-600 mb-6">
            {isSignUp ? "Créer un compte" : "Connexion"}
          </p>
          
          <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom d'utilisateur
                </label>
                <input
                  type="text"
                  placeholder="Votre pseudo"
                  value={username}
                  required={isSignUp}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                placeholder="votre@email.com"
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                required
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-bold py-3 rounded-lg transition-colors"
            >
              {loading ? "Chargement..." : (isSignUp ? "Créer un compte" : "Se connecter")}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setAuthError(null);
              }}
              className="text-blue-500 hover:text-blue-700 text-sm"
            >
              {isSignUp 
                ? "Déjà un compte ? Se connecter" 
                : "Pas de compte ? Créer un compte"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated app with routes
  return (
    <div className="min-h-screen bg-gray-50">
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
