export type PlayerType = {
  id: number
  player_name: string
  nb_point: number
  nb_debt: number
  nb_share_A: number
  avg_share_A_value: number
  nb_share_B: number
  avg_share_B_value: number
  user_id: string
  last_login: string | null
  last_daily_reward_claim: string | null
  is_online: boolean
  last_seen: string | null
  profile_photo?: string | null
  peak_net_worth: number
  last_daily_free_box?: string | null
  loto_tickets?: number
}

export type ShareStats = {
  dailyHighA: number | null
  dailyLowA: number | null
  dailyHighB: number | null
  dailyLowB: number | null
  athA: number
  atlA: number
  athB: number
  atlB: number
}

export type LotoHistoryEntry = {
  id: number
  user_id: string
  player_name: string
  prize_name: string
  prize_type: string
  prize_value: number
  won: number
  created_at: string
}

export type LotoPlayResult = {
  player: PlayerType
  prize_name: string
  prize_type: string
  prize_value: number
  won: boolean
  tickets_remaining: number
}
