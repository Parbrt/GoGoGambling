export interface Player {
  id: number;
  user_id: string;
  player_name: string;
  nb_point: number;
  nb_debt: number;
  nb_share_A: number;
  avg_share_A_value: number;
  nb_share_B: number;
  avg_share_B_value: number;
  last_login: string | null;
  last_daily_reward_claim: string | null;
  is_online: boolean;
  last_seen: string | null;
  profile_photo: string | null;
}

export interface ShareSnapshot {
  id?: number;
  value_share_A: number;
  value_share_B: number;
  time_now: number;
  time_update: string;
}

export interface SlotMachineData {
  nb_point: number;
  updated_at: string;
}

export interface PriceUpdate {
  priceA: number;
  priceB: number;
  timestamp: number;
}

export interface WSMessage {
  type: string;
  data?: unknown;
}
