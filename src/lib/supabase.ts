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
    .from('player')
    .update({ last_login: new Date().toISOString() })
    .eq('user_id', userId)

  if (error) throw error;
}

export async function setPlayerOnline(userId: string, isOnline: boolean) {
  const { error } = await supabase
    .from('player')
    .update({ is_online: isOnline })
    .eq('user_id', userId)

  if (error) throw error;
}

export async function updatePlayerPoints(userId: string, newPoints: number) {
  const { data, error } = await supabase
    .from('player')
    .update({ nb_point: Math.round(newPoints) })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Erreur lors de la mise à jour des points:', error);
    throw error;
  }

  return data;
}

// Share/Stock related functions
export interface ShareData {
  id?: number;
  value_share_A: number;
  value_share_B: number;
  time_update: string;
  time_now: string;
}

export async function getLatestShare(): Promise<ShareData | null> {
  const { data, error } = await supabase
    .from('share')
    .select('*')
    .order('time_now', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Erreur lors de la récupération des cours:', error);
    throw error;
  }

  return data;
}

export async function getShareHistory(limit: number = 50): Promise<ShareData[]> {
  const { data, error } = await supabase
    .from('share')
    .select('*')
    .order('time_now', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Erreur lors de la récupération de l\'historique:', error);
    throw error;
  }

  return data || [];
}

export async function insertShare(shareData: Omit<ShareData, 'id'>): Promise<ShareData> {
  const { data, error } = await supabase
    .from('share')
    .insert(shareData)
    .select()
    .single();

  if (error) {
    console.error('Erreur lors de l\'insertion des cours:', error);
    throw error;
  }

  return data;
}

// Met à jour la dernière ligne de la table share avec les prix courants.
// Évite de créer de nouvelles lignes pour ne pas surcharger la DB.
export async function updateLatestSnapshot(
  shareData: Omit<ShareData, 'id'>
): Promise<boolean> {
  try {
    const latest = await getLatestShare();

    if (latest?.id) {
      const { error } = await supabase
        .from('share')
        .update({
          value_share_A: shareData.value_share_A,
          value_share_B: shareData.value_share_B,
          time_update: shareData.time_update,
          time_now: shareData.time_now,
        })
        .eq('id', latest.id);

      if (error) {
        console.error('[updateLatestSnapshot] Erreur update:', error);
        return false;
      }
      return true;
    }

    // Aucune ligne n'existe encore, on en crée une
    await insertShare(shareData);
    return true;
  } catch (error) {
    console.warn('[updateLatestSnapshot] Erreur:', error);
    return false;
  }
}

export async function updatePlayerShares(
  userId: string, 
  updates: {
    nb_point?: number;
    nb_debt?: number;
    nb_share_A?: number;
    avg_share_A_value?: number;
    nb_share_B?: number;
    avg_share_B_value?: number;
  }
): Promise<PlayerType> {
  // Arrondir toutes les valeurs numériques car la DB attend des bigint
  const roundedUpdates: any = {};
  
  if (updates.nb_point !== undefined) roundedUpdates.nb_point = Math.round(updates.nb_point);
  if (updates.nb_debt !== undefined) roundedUpdates.nb_debt = Math.round(updates.nb_debt);
  if (updates.nb_share_A !== undefined) roundedUpdates.nb_share_A = Math.round(updates.nb_share_A);
  if (updates.avg_share_A_value !== undefined) roundedUpdates.avg_share_A_value = Math.round(updates.avg_share_A_value);
  if (updates.nb_share_B !== undefined) roundedUpdates.nb_share_B = Math.round(updates.nb_share_B);
  if (updates.avg_share_B_value !== undefined) roundedUpdates.avg_share_B_value = Math.round(updates.avg_share_B_value);

  const { data, error } = await supabase
    .from('player')
    .update(roundedUpdates)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Erreur lors de la mise à jour du player:', error);
    throw error;
  }

  return data;
}

export async function claimDailyReward(userId: string, currentPoints: number): Promise<PlayerType> {
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('player')
    .update({
      nb_point: Math.round(currentPoints + 50),
      last_daily_reward_claim: now
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Erreur lors de la réclamation de la récompense:', error);
    throw error;
  }

  return data;
}

// Slot Machine Jackpot functions
export interface SlotMachineData {
  nb_point: number;
  updated_at: string;
}

const DEFAULT_JACKPOT = 10000;

export async function getSlotMachineJackpot(): Promise<number> {
  const result = await getSlotMachineJackpotWithDate();
  return result.nb_point;
}

export async function getSlotMachineJackpotWithDate(): Promise<SlotMachineData> {
  const { data, error } = await supabase
    .from('slot_machine')
    .select('nb_point, updated_at')
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116' || error.code === '42P01' || error.code === '42703' || error.code === 'PGRST204') {
      return { nb_point: DEFAULT_JACKPOT, updated_at: new Date().toISOString() };
    }
    console.error('Erreur lors de la récupération du jackpot:', error);
    throw error;
  }

  if (!data || data.nb_point <= 0) {
    return { nb_point: DEFAULT_JACKPOT, updated_at: data?.updated_at || new Date().toISOString() };
  }

  return { nb_point: data.nb_point, updated_at: data.updated_at };
}

export async function updateSlotMachineJackpot(newJackpot: number): Promise<void> {
  // Si le jackpot tombe à 0 ou moins, on le reset à 10000
  const finalJackpot = newJackpot <= 0 ? DEFAULT_JACKPOT : Math.round(newJackpot);
  
  // Récupérer la première ligne pour avoir son id si elle existe
  const { data: existingRow } = await supabase
    .from('slot_machine')
    .select('*')
    .limit(1)
    .single();
  
  if (existingRow) {
    // Mettre à jour la ligne existante
    const { error } = await supabase
      .from('slot_machine')
      .update({
        nb_point: finalJackpot,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingRow.id);
    
    if (error) {
      console.error('Erreur lors de la mise à jour du jackpot:', error);
      throw error;
    }
  } else {
    // Insérer une nouvelle ligne
    const { error } = await supabase
      .from('slot_machine')
      .insert({
        nb_point: finalJackpot,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Erreur lors de l\'insertion du jackpot:', error);
      throw error;
    }
  }
}
