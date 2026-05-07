import { getDb } from "./connection.js";
import { ITEMS_CATALOG } from "../data/items.js";

export function initSchema(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      player_name TEXT UNIQUE NOT NULL,
      nb_point INTEGER NOT NULL DEFAULT 0,
      nb_debt INTEGER NOT NULL DEFAULT 0,
      nb_share_A INTEGER NOT NULL DEFAULT 0,
      avg_share_A_value REAL NOT NULL DEFAULT 0,
      nb_share_B INTEGER NOT NULL DEFAULT 0,
      avg_share_B_value REAL NOT NULL DEFAULT 0,
      last_login TEXT,
      last_daily_reward_claim TEXT,
      is_online INTEGER NOT NULL DEFAULT 0,
      last_seen TEXT,
      profile_photo TEXT,
      loto_tickets INTEGER NOT NULL DEFAULT 0,
      last_loto_ticket_claim TEXT,
      chicken_charges INTEGER NOT NULL DEFAULT 5,
      last_chicken_charge_refill TEXT
    );

    CREATE TABLE IF NOT EXISTS shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      value_share_A REAL NOT NULL,
      value_share_B REAL NOT NULL,
      time_now INTEGER NOT NULL,
      time_update TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_shares_time_now ON shares(time_now);

    CREATE TABLE IF NOT EXISTS share_stats (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      ath_A REAL NOT NULL,
      atl_A REAL NOT NULL,
      ath_B REAL NOT NULL,
      atl_B REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS slot_machine (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nb_point INTEGER NOT NULL DEFAULT 10000,
      updated_at TEXT NOT NULL
    );
  `);

  // Migrate avg_share_* columns from INTEGER to REAL for existing databases
  migrateAvgShareColumns(db);

  // Migrate: add profile_photo column for existing databases
  migrateProfilePhotoColumn(db);

  // Migrate: add last_seen column for existing databases
  migrateLastSeenColumn(db);

  // Migrate: add peak_net_worth column for existing databases
  migratePeakNetWorthColumn(db);

  // Migrate: add last_daily_free_box column for existing databases
  migrateLastDailyFreeBoxColumn(db);

  // Migrate: add loto columns for existing databases
  migrateLotoColumns(db);

  // Migrate: add status column to marketplace_listings
  migrateMarketplaceStatusColumn(db);

  // Migrate: add loto columns for existing databases
  migrateLotoTicketsColumn(db);
  migrateLastLotoTicketClaimColumn(db);

  // Migrate: add chicken charges columns
  migrateChickenChargesColumns(db);

  // Migrate: add display_style column to player_inventory
  migrateDisplayStyleColumn(db);

  // Migrate: make non-unique titles qualifyable
  migrateTitlesQualifyable(db);

  // Create baby fight tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS baby_fights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      baby_a_name TEXT NOT NULL,
      baby_b_name TEXT NOT NULL,
      baby_a_stats TEXT NOT NULL,
      baby_b_stats TEXT NOT NULL,
      scheduled_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'betting',
      winner INTEGER,
      total_pot_a INTEGER NOT NULL DEFAULT 0,
      total_pot_b INTEGER NOT NULL DEFAULT 0,
      odds_a REAL NOT NULL DEFAULT 1.0,
      odds_b REAL NOT NULL DEFAULT 1.0,
      bet_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS baby_fight_bets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fight_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      player_name TEXT NOT NULL,
      bet_on INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      odds_at_bet REAL NOT NULL,
      won INTEGER,
      winnings INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (fight_id) REFERENCES baby_fights(id)
    );

    CREATE INDEX IF NOT EXISTS idx_baby_fights_status ON baby_fights(status);
    CREATE INDEX IF NOT EXISTS idx_baby_fights_scheduled ON baby_fights(scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_baby_fight_bets_fight ON baby_fight_bets(fight_id);
  `);

  // Create shop / loot box tables
  createShopTables(db);

  // Create loto history table (legacy)
  db.exec(`
    CREATE TABLE IF NOT EXISTS loto_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      player_name TEXT NOT NULL,
      prize_name TEXT NOT NULL,
      prize_type TEXT NOT NULL,
      prize_value INTEGER NOT NULL DEFAULT 0,
      won INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES players(user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_loto_history_created ON loto_history(created_at DESC);
  `);

  // Create loto v2 tables
  createLotoV2Tables(db);

  // Reset stale online status on server startup
  resetOnlineStatus(db);

  // Ensure slot_machine has a default row
  const jackpot = db.prepare("SELECT id FROM slot_machine LIMIT 1").get();
  if (!jackpot) {
    db.prepare("INSERT INTO slot_machine (nb_point, updated_at) VALUES (?, ?)").run(10000, new Date().toISOString());
  }

  // Seed items catalog
  seedItemsCatalog(db);
}

function createShopTables(db: ReturnType<typeof getDb>): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS items_catalog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      rarity TEXT NOT NULL,
      base_value INTEGER NOT NULL DEFAULT 0,
      qualifyable INTEGER NOT NULL DEFAULT 0,
      emoji TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS player_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      star_level INTEGER NOT NULL DEFAULT 0,
      acquired_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (item_id) REFERENCES items_catalog(id),
      FOREIGN KEY (user_id) REFERENCES players(user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_player_inventory_user ON player_inventory(user_id);
    CREATE INDEX IF NOT EXISTS idx_player_inventory_item ON player_inventory(item_id);

    CREATE TABLE IF NOT EXISTS player_equipped (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      equipped_title_inventory_id INTEGER,
      equipped_object_inventory_id INTEGER,
      FOREIGN KEY (equipped_title_inventory_id) REFERENCES player_inventory(id),
      FOREIGN KEY (equipped_object_inventory_id) REFERENCES player_inventory(id),
      FOREIGN KEY (user_id) REFERENCES players(user_id)
    );

    CREATE TABLE IF NOT EXISTS marketplace_listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seller_user_id TEXT NOT NULL,
      inventory_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      star_level INTEGER NOT NULL DEFAULT 0,
      quantity INTEGER NOT NULL DEFAULT 1,
      price INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (inventory_id) REFERENCES player_inventory(id),
      FOREIGN KEY (seller_user_id) REFERENCES players(user_id),
      FOREIGN KEY (item_id) REFERENCES items_catalog(id)
    );

    CREATE INDEX IF NOT EXISTS idx_marketplace_listings_item ON marketplace_listings(item_id);
    CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller ON marketplace_listings(seller_user_id);

    CREATE TABLE IF NOT EXISTS marketplace_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      buyer_user_id TEXT NOT NULL,
      seller_user_id TEXT NOT NULL,
      listing_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      star_level INTEGER NOT NULL DEFAULT 0,
      quantity INTEGER NOT NULL DEFAULT 1,
      price INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (buyer_user_id) REFERENCES players(user_id),
      FOREIGN KEY (seller_user_id) REFERENCES players(user_id),
      FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id),
      FOREIGN KEY (item_id) REFERENCES items_catalog(id)
    );

    CREATE INDEX IF NOT EXISTS idx_marketplace_tx_buyer ON marketplace_transactions(buyer_user_id);
    CREATE INDEX IF NOT EXISTS idx_marketplace_tx_seller ON marketplace_transactions(seller_user_id);

    CREATE TABLE IF NOT EXISTS daily_deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deal_date TEXT NOT NULL,
      slot INTEGER NOT NULL CHECK(slot BETWEEN 1 AND 3),
      item_id INTEGER NOT NULL,
      price INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (item_id) REFERENCES items_catalog(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_deals_date_slot ON daily_deals(deal_date, slot);

    CREATE TABLE IF NOT EXISTS daily_deal_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      deal_id INTEGER NOT NULL,
      purchased_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES players(user_id),
      FOREIGN KEY (deal_id) REFERENCES daily_deals(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_deal_purchases_user_deal ON daily_deal_purchases(user_id, deal_id);
  `);
}

function seedItemsCatalog(db: ReturnType<typeof getDb>): void {
  // Ensure unique constraint to allow safe upsert
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_items_catalog_name_cat ON items_catalog(name, category)`);

  // Migrate: update category for renamed items
  db.prepare(
    "UPDATE OR IGNORE items_catalog SET category = ? WHERE name = ? AND category = ?"
  ).run("consumable", "Ticket de Loto", "loto_ticket");

  const upsert = db.prepare(
    `INSERT OR IGNORE INTO items_catalog (name, category, rarity, base_value, qualifyable, emoji, description)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const transaction = db.transaction(() => {
    for (const item of ITEMS_CATALOG) {
      upsert.run(
        item.name,
        item.category,
        item.rarity,
        item.base_value,
        item.qualifyable ? 1 : 0,
        item.emoji,
        item.description
      );
    }
  });

  transaction();
}

function migrateAvgShareColumns(db: ReturnType<typeof getDb>): void {
  // Check if columns are still INTEGER (old schema)
  const infoA = db.pragma("table_info(players)") as Array<{ cid: number; name: string; type: string }>;
  const colA = infoA.find(c => c.name === "avg_share_A_value");

  if (colA && colA.type.toUpperCase() === "INTEGER") {
    // Recreate table with REAL types via temp table
    db.exec(`
      CREATE TABLE players_migrated (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE NOT NULL,
        player_name TEXT UNIQUE NOT NULL,
        nb_point INTEGER NOT NULL DEFAULT 0,
        nb_debt INTEGER NOT NULL DEFAULT 0,
        nb_share_A INTEGER NOT NULL DEFAULT 0,
        avg_share_A_value REAL NOT NULL DEFAULT 0,
        nb_share_B INTEGER NOT NULL DEFAULT 0,
        avg_share_B_value REAL NOT NULL DEFAULT 0,
        last_login TEXT,
        last_daily_reward_claim TEXT,
        is_online INTEGER NOT NULL DEFAULT 0,
        last_seen TEXT,
        profile_photo TEXT,
        loto_tickets INTEGER NOT NULL DEFAULT 0,
        last_loto_ticket_claim TEXT,
        chicken_charges INTEGER NOT NULL DEFAULT 5,
        last_chicken_charge_refill TEXT
      );
      INSERT INTO players_migrated SELECT id, user_id, player_name, nb_point, nb_debt, nb_share_A, avg_share_A_value, nb_share_B, avg_share_B_value, last_login, last_daily_reward_claim, is_online, NULL, NULL, 0, NULL, 5, NULL FROM players;
      DROP TABLE players;
      ALTER TABLE players_migrated RENAME TO players;
    `);
  }
}

function migrateProfilePhotoColumn(db: ReturnType<typeof getDb>): void {
  const info = db.pragma("table_info(players)") as Array<{ cid: number; name: string }>;
  if (!info.find(c => c.name === "profile_photo")) {
    db.prepare("ALTER TABLE players ADD COLUMN profile_photo TEXT").run();
    console.log("[schema] Added profile_photo column");
  }
}

function migrateLastSeenColumn(db: ReturnType<typeof getDb>): void {
  const info = db.pragma("table_info(players)") as Array<{ cid: number; name: string }>;
  if (!info.find(c => c.name === "last_seen")) {
    db.prepare("ALTER TABLE players ADD COLUMN last_seen TEXT").run();
    console.log("[schema] Added last_seen column");
  }
}

function migratePeakNetWorthColumn(db: ReturnType<typeof getDb>): void {
  const info = db.pragma("table_info(players)") as Array<{ cid: number; name: string }>;
  if (!info.find(c => c.name === "peak_net_worth")) {
    db.prepare("ALTER TABLE players ADD COLUMN peak_net_worth INTEGER NOT NULL DEFAULT 0").run();
    console.log("[schema] Added peak_net_worth column");
  }
}

function migrateLotoTicketsColumn(db: ReturnType<typeof getDb>): void {
  const info = db.pragma("table_info(players)") as Array<{ cid: number; name: string }>;
  if (!info.find(c => c.name === "loto_tickets")) {
    db.prepare("ALTER TABLE players ADD COLUMN loto_tickets INTEGER NOT NULL DEFAULT 0").run();
    console.log("[schema] Added loto_tickets column");
  }
}

function migrateLastLotoTicketClaimColumn(db: ReturnType<typeof getDb>): void {
  const info = db.pragma("table_info(players)") as Array<{ cid: number; name: string }>;
  if (!info.find(c => c.name === "last_loto_ticket_claim")) {
    db.prepare("ALTER TABLE players ADD COLUMN last_loto_ticket_claim TEXT").run();
    console.log("[schema] Added last_loto_ticket_claim column");
  }
}

function resetOnlineStatus(db: ReturnType<typeof getDb>): void {
  db.prepare("UPDATE players SET is_online = 0").run();
  console.log("[schema] Reset all online statuses");
}

function migrateLastDailyFreeBoxColumn(db: ReturnType<typeof getDb>): void {
  const info = db.pragma("table_info(players)") as Array<{ cid: number; name: string }>;
  if (!info.find(c => c.name === "last_daily_free_box")) {
    db.prepare("ALTER TABLE players ADD COLUMN last_daily_free_box TEXT").run();
    console.log("[schema] Added last_daily_free_box column");
  }
}

function migrateLotoColumns(db: ReturnType<typeof getDb>): void {
  const info = db.pragma("table_info(players)") as Array<{ cid: number; name: string }>;
  if (!info.find(c => c.name === "loto_tickets")) {
    db.prepare("ALTER TABLE players ADD COLUMN loto_tickets INTEGER NOT NULL DEFAULT 0").run();
    console.log("[schema] Added loto_tickets column");
  }
  if (!info.find(c => c.name === "last_loto_ticket_claim")) {
    db.prepare("ALTER TABLE players ADD COLUMN last_loto_ticket_claim TEXT").run();
    console.log("[schema] Added last_loto_ticket_claim column");
  }
}

function migrateMarketplaceStatusColumn(db: ReturnType<typeof getDb>): void {
  const info = db.pragma("table_info(marketplace_listings)") as Array<{ cid: number; name: string }>;
  if (!info.find(c => c.name === "status")) {
    db.prepare("ALTER TABLE marketplace_listings ADD COLUMN status TEXT NOT NULL DEFAULT 'active'").run();
    console.log("[schema] Added status column to marketplace_listings");
  }
}

function createLotoV2Tables(db: ReturnType<typeof getDb>): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS loto_tickets_v2 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      player_name TEXT NOT NULL,
      ticket_number TEXT NOT NULL,
      draw_date TEXT NOT NULL,
      is_free INTEGER NOT NULL DEFAULT 0,
      purchased_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES players(user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_loto_tickets_v2_draw ON loto_tickets_v2(draw_date);
    CREATE INDEX IF NOT EXISTS idx_loto_tickets_v2_user_draw ON loto_tickets_v2(user_id, draw_date);
    CREATE INDEX IF NOT EXISTS idx_loto_tickets_v2_number_draw ON loto_tickets_v2(ticket_number, draw_date);

    CREATE TABLE IF NOT EXISTS loto_draws (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      draw_date TEXT NOT NULL UNIQUE,
      winning_numbers TEXT NOT NULL DEFAULT '[]',
      grand_points INTEGER NOT NULL DEFAULT 1000000,
      grand_boxes TEXT NOT NULL DEFAULT '["GAMBLINGBOX"]',
      grand_winner_user_id TEXT,
      grand_winner_name TEXT,
      small1_points INTEGER NOT NULL DEFAULT 250000,
      small1_boxes TEXT NOT NULL DEFAULT '["GOGOBOX","XBOX"]',
      small1_winner_user_id TEXT,
      small1_winner_name TEXT,
      small2_points INTEGER NOT NULL DEFAULT 50000,
      small2_boxes TEXT NOT NULL DEFAULT '["XBOX"]',
      small2_winner_user_id TEXT,
      small2_winner_name TEXT,
      status TEXT NOT NULL DEFAULT 'completed',
      drawn_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_loto_draws_date ON loto_draws(draw_date DESC);

    CREATE TABLE IF NOT EXISTS loto_jackpot (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      grand_rollover_points INTEGER NOT NULL DEFAULT 0,
      grand_rollover_boxes TEXT NOT NULL DEFAULT '[]',
      small1_rollover_points INTEGER NOT NULL DEFAULT 0,
      small1_rollover_boxes TEXT NOT NULL DEFAULT '[]',
      small2_rollover_points INTEGER NOT NULL DEFAULT 0,
      small2_rollover_boxes TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  migrateLotoV2Tables(db);
  migrateLotoTicketsV2IsFree(db);
}

function migrateLotoV2Tables(db: ReturnType<typeof getDb>): void {
  // Ensure loto_jackpot has a default row
  const jackpot = db.prepare("SELECT id FROM loto_jackpot LIMIT 1").get();
  if (!jackpot) {
    db.prepare("INSERT INTO loto_jackpot (id) VALUES (1)").run();
  }
}

function migrateLotoTicketsV2IsFree(db: ReturnType<typeof getDb>): void {
  const info = db.pragma("table_info(loto_tickets_v2)") as Array<{ cid: number; name: string }>;
  if (!info.find(c => c.name === "is_free")) {
    db.prepare("ALTER TABLE loto_tickets_v2 ADD COLUMN is_free INTEGER NOT NULL DEFAULT 0").run();
    console.log("[schema] Added is_free column to loto_tickets_v2");
  }
}

function migrateDisplayStyleColumn(db: ReturnType<typeof getDb>): void {
  const info = db.pragma("table_info(player_inventory)") as Array<{ cid: number; name: string }>;
  if (!info.find(c => c.name === "display_style")) {
    db.prepare("ALTER TABLE player_inventory ADD COLUMN display_style TEXT NOT NULL DEFAULT 'default'").run();
    console.log("[schema] Added display_style column to player_inventory");
  }
}

function migrateTitlesQualifyable(db: ReturnType<typeof getDb>): void {
  db.prepare("UPDATE items_catalog SET qualifyable = 1 WHERE category = 'title' AND rarity != 'unique'").run();
}

function migrateChickenChargesColumns(db: ReturnType<typeof getDb>): void {
  const info = db.pragma("table_info(players)") as Array<{ cid: number; name: string }>;
  if (!info.find(c => c.name === "chicken_charges")) {
    db.prepare("ALTER TABLE players ADD COLUMN chicken_charges INTEGER NOT NULL DEFAULT 5").run();
    console.log("[schema] Added chicken_charges column");
  }
  if (!info.find(c => c.name === "last_chicken_charge_refill")) {
    db.prepare("ALTER TABLE players ADD COLUMN last_chicken_charge_refill TEXT").run();
    console.log("[schema] Added last_chicken_charge_refill column");
  }
}
