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
}
