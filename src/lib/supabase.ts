import { createClient } from '@supabase/supabase-js';
import type { PlayerType } from '../types';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

export async function getPlayersInfo(): Promise<PlayerType[]> {
  const { data, error } = await supabase.from("player").select();
  if (error) {
    console.error('Erreur supabase', error);
    throw error;
  }
  return data || [];
}

export async function checkUsernameExists(username: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("player")
    .select("id")
    .eq("player_name", username)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Erreur lors de la vérification du username:', error);
    throw error;
  }

  return !!data;
}

export async function createPlayer(userId: string, playerName: string): Promise<PlayerType> {
  const { data, error } = await supabase
    .from("player")
    .insert({
      player_name: playerName,
      nb_point: 0,
      nb_debt: 0,
      nb_share_A: 0,
      avg_share_A_value: 0,
      nb_share_B: 0,
      avg_share_B_value: 0,
      user_id: userId
    })
    .select()
    .single();

  if (error) {
    console.error('Erreur lors de la création du player:', error);
    throw error;
  }

  return data;
}

export async function getPlayerByUserId(userId: string): Promise<PlayerType | null> {
  const { data, error } = await supabase
    .from("player")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Erreur lors de la récupération du player:', error);
    throw error;
  }

  return data;
}

export async function updateLastLogin(userId: string) {
  const { error } = await supabase
    .from("player")
    .update({ last_login: new Date().toISOString() })
    .eq("user_id", userId)

  if (error) throw error;
}
