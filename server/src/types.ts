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
  peak_net_worth: number;
  last_daily_free_box: string | null;
  loto_tickets: number;
  last_loto_ticket_claim: string | null;
  chicken_charges: number;
  last_chicken_charge_refill: string | null;
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

// Shop / Loot Box types
export interface CatalogItem {
  id: number;
  name: string;
  category: string;
  rarity: string;
  base_value: number;
  qualifyable: number; // boolean as int (0/1)
  emoji: string;
  description: string;
  created_at: string;
}

export interface PlayerInventoryItem {
  id: number;
  user_id: string;
  item_id: number;
  quantity: number;
  star_level: number;
  acquired_at: string;
}

export interface PlayerInventoryJoined {
  id: number;
  user_id: string;
  item_id: number;
  quantity: number;
  star_level: number;
  acquired_at: string;
  name: string;
  category: string;
  rarity: string;
  base_value: number;
  qualifyable: number;
  emoji: string;
  description: string;
}

export interface PlayerEquipped {
  id: number;
  user_id: string;
  equipped_title_inventory_id: number | null;
  equipped_object_inventory_id: number | null;
}

export interface MarketplaceListing {
  id: number;
  seller_user_id: string;
  inventory_id: number;
  item_id: number;
  star_level: number;
  quantity: number;
  price: number;
  status: string;
  created_at: string;
  // joined fields
  seller_name?: string;
  item_name?: string;
  item_rarity?: string;
  item_emoji?: string;
  item_category?: string;
}

export interface MarketplaceTransaction {
  id: number;
  buyer_user_id: string;
  seller_user_id: string;
  listing_id: number;
  item_id: number;
  star_level: number;
  quantity: number;
  price: number;
  created_at: string;
}

export interface BoxOpenResult {
  item: CatalogItem;
  rolledRarity: string;
  player: Player;
}

// Loto (legacy - kept for backward compat)
export interface LotoHistoryEntry {
  id: number;
  user_id: string;
  player_name: string;
  prize_name: string;
  prize_type: string;
  prize_value: number;
  created_at: string;
}

export interface LotoTicketsResponse {
  tickets: number;
  canClaim: boolean;
}

export interface LotoPlayResult {
  player: Player;
  prize_name: string;
  prize_type: string;
  prize_value: number;
  won: boolean;
  tickets_remaining: number;
}

// Loto v2 — Ticket-based lottery system
export interface LotoTicket {
  id: number;
  user_id: string;
  player_name: string;
  ticket_number: string;
  draw_date: string;
  purchased_at: string;
  is_free: number;
}

export interface LotoDraw {
  id: number;
  draw_date: string;
  winning_numbers: string; // JSON array
  grand_points: number;
  grand_boxes: string; // JSON array
  grand_winner_user_id: string | null;
  grand_winner_name: string | null;
  small1_points: number;
  small1_boxes: string;
  small1_winner_user_id: string | null;
  small1_winner_name: string | null;
  small2_points: number;
  small2_boxes: string;
  small2_winner_user_id: string | null;
  small2_winner_name: string | null;
  status: string;
  drawn_at: string;
}

export interface LotoJackpot {
  grand_rollover_points: number;
  grand_rollover_boxes: string;
  small1_rollover_points: number;
  small1_rollover_boxes: string;
  small2_rollover_points: number;
  small2_rollover_boxes: string;
}

export interface LotoStatusResponse {
  tickets: LotoTicket[];
  ticketCount: number;
  maxTickets: number;
  canClaim: boolean;
  canBuy: boolean;
  todayDraw: LotoDraw | null;
  jackpot: LotoJackpot;
  ticketPrice: number;
  nextDrawTime: string;
  draws: LotoDraw[];
}
