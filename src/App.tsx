import "./index.css";
import { useState, useEffect } from "react";
import PlayersList from "./components/PlayersList";
import { DailyReward } from "./components/DailyReward";
import { supabase, checkUsernameExists, createPlayer, getPlayerByUserId, updateLastLogin } from './lib/supabase'
import type { User } from '@supabase/supabase-js';
import type { PlayerType } from './types';

export default function App() {
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setPlayer(null);
  };

  // Show auth error
  if (authError) {
    return (
      <div>
        <h1>Authentication</h1>
        <p>✗ Erreur : {authError}</p>
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={() => setAuthError(null)}>
          Retour
        </button>
      </div>
    );
  }

  // If user is logged in, show welcome screen with player info
  if (user && player) {
    return (
      <div>
        <h1>Bienvenue {player.player_name} !</h1>
        <p>Connecté en tant que : {user.email}</p>
        <div style={{ margin: '20px 0', padding: '15px', border: '1px solid #ccc', borderRadius: '8px' }}>
          <h3>Vos informations</h3>
          <p><strong>Nom:</strong> {player.player_name}</p>
          <p><strong>Points:</strong> {player.nb_point}</p>
          <p><strong>Dettes:</strong> {player.nb_debt}</p>
          <p><strong>Actions A:</strong> {player.nb_share_A} (valeur moyenne: {player.avg_share_A_value})</p>
          <p><strong>Actions B:</strong> {player.nb_share_B} (valeur moyenne: {player.avg_share_B_value})</p>
          <p><strong>Dernière connexion</strong> {player.last_login ? new Date(player.last_login).toLocaleString('fr-FR') : 'Jamais'}</p>
        </div>
        <button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded" onClick={handleLogout}>
          Se déconnecter
        </button>
        <h2>Liste des joueurs</h2>
        <PlayersList />
        
        {/* Daily Reward Component */}
        <DailyReward 
          userId={user.id} 
          onRewardClaimed={async () => {
            // Rafraîchir les données du joueur après réclamation
            const updatedPlayer = await getPlayerByUserId(user.id);
            setPlayer(updatedPlayer);
          }}
        />
      </div>
    );
  }

  // If user is logged in but no player found
  if (user && !player) {
    return (
      <div>
        <h1>Bienvenue !</h1>
        <p>Connecté en tant que : {user.email}</p>
        <p>Chargement de votre profil...</p>
        <button onClick={handleLogout}>
          Se déconnecter
        </button>
      </div>
    );
  }

  // Show login/signup form
  return (
    <div>
      <h1>Supabase + React</h1>
      <p>{isSignUp ? "Créer un compte" : "Connexion"}</p>
      <form>
        {isSignUp && (
          <input
            type="text"
            placeholder="Nom d'utilisateur"
            value={username}
            required={true}
            onChange={(e) => setUsername(e.target.value)}
          />
        )}
        <input
          type="email"
          placeholder="Votre email"
          value={email}
          required={true}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Votre mot de passe"
          value={password}
          required={true}
          onChange={(e) => setPassword(e.target.value)}
        />
        {isSignUp ? (
          <>
            <button onClick={handleSignUp} disabled={loading}>
              {loading ? "Chargement..." : "Créer un compte"}
            </button>
            <p>
              Déjà un compte ?{" "}
              <button type="button" onClick={() => setIsSignUp(false)}>
                Se connecter
              </button>
            </p>
          </>
        ) : (
          <>
            <button onClick={handleLogin} disabled={loading}>
              {loading ? "Chargement..." : "Se connecter"}
            </button>
            <p>
              Pas de compte ?{" "}
              <button type="button" onClick={() => setIsSignUp(true)}>
                Créer un compte
              </button>
            </p>
          </>
        )}
      </form>
    </div>
  );
}
