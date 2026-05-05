import { getDb } from "./connection.js";

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
      profile_photo TEXT
    );

    CREATE TABLE IF NOT EXISTS shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      value_share_A REAL NOT NULL,
      value_share_B REAL NOT NULL,
      time_now INTEGER NOT NULL,
      time_update TEXT NOT NULL
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

  // Reset stale online status on server startup
  resetOnlineStatus(db);

  // Ensure slot_machine has a default row
  const jackpot = db.prepare("SELECT id FROM slot_machine LIMIT 1").get();
  if (!jackpot) {
    db.prepare("INSERT INTO slot_machine (nb_point, updated_at) VALUES (?, ?)").run(10000, new Date().toISOString());
  }
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
      profile_photo TEXT
      );
      INSERT INTO players_migrated SELECT id, user_id, player_name, nb_point, nb_debt, nb_share_A, avg_share_A_value, nb_share_B, avg_share_B_value, last_login, last_daily_reward_claim, is_online, NULL, NULL FROM players;
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

function resetOnlineStatus(db: ReturnType<typeof getDb>): void {
  db.prepare("UPDATE players SET is_online = 0").run();
  console.log("[schema] Reset all online statuses");
}
