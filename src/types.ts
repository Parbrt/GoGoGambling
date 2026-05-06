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
  chicken_charges?: number
  last_chicken_charge_refill?: string | null
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

// Loto v2 types
export type LotoTicket = {
  id: number
  user_id: string
  player_name: string
  ticket_number: string
  draw_date: string
  purchased_at: string
  is_free: number
}

export type LotoDraw = {
  id: number
  draw_date: string
  winning_numbers: string
  grand_points: number
  grand_boxes: string
  grand_winner_user_id: string | null
  grand_winner_name: string | null
  small1_points: number
  small1_boxes: string
  small1_winner_user_id: string | null
  small1_winner_name: string | null
  small2_points: number
  small2_boxes: string
  small2_winner_user_id: string | null
  small2_winner_name: string | null
  status: string
  drawn_at: string
}

export type LotoJackpot = {
  grand_rollover_points: number
  grand_rollover_boxes: string
  small1_rollover_points: number
  small1_rollover_boxes: string
  small2_rollover_points: number
  small2_rollover_boxes: string
}

export type LotoStatusResponse = {
  tickets: LotoTicket[]
  ticketCount: number
  maxTickets: number
  canClaim: boolean
  canBuy: boolean
  todayDraw: LotoDraw | null
  jackpot: LotoJackpot
  ticketPrice: number
  nextDrawTime: string
  draws: LotoDraw[]
}
