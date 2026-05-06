import { Router } from "express";
import { getDb } from "../db/connection.js";
import { authMiddleware, type AuthenticatedRequest } from "../auth/middleware.js";
import { updatePeakNetWorth } from "./player.js";
import { rollBoxItem, LOOT_BOXES, RARITY_MAP, type BoxType } from "../data/items.js";
import type {
  CatalogItem,
  PlayerInventoryJoined,
  PlayerEquipped,
  MarketplaceListing,
  Player,
} from "../types.js";

const router = Router();

// ─── Box opening ────────────────────────────────────────────────

router.post("/open-box", authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const { boxType } = req.body as { boxType: string };
    const box = LOOT_BOXES.find((b) => b.key === boxType);

    if (!box) {
      res.status(400).json({ error: "Type de box invalide" });
      return;
    }

    const db = getDb();
    const player = db
      .prepare("SELECT * FROM players WHERE user_id = ?")
      .get(req.userId!) as Player | undefined;

    if (!player) {
      res.status(404).json({ error: "Joueur introuvable" });
      return;
    }

    if (player.nb_point < box.cost) {
      res.status(400).json({
        error: `Pas assez de points. Il vous faut ${box.cost.toLocaleString()} points.`,
      });
      return;
    }

    // Deduct points
    const newPoints = player.nb_point - box.cost;
    db.prepare("UPDATE players SET nb_point = ? WHERE user_id = ?").run(
      newPoints,
      req.userId!
    );

    // Roll the item
    const { item: rolledItem, rolledRarity } = rollBoxItem(boxType as BoxType);

    // Fetch the catalog item from DB (to get its ID)
    const catalogItem = db
      .prepare("SELECT * FROM items_catalog WHERE name = ? AND category = ?")
      .get(rolledItem.name, rolledItem.category) as CatalogItem | undefined;

    if (!catalogItem) {
      // Should not happen; fallback
      res.status(500).json({ error: "Item introuvable dans le catalogue" });
      return;
    }

    // Handle special categories that don't go to inventory
    if (catalogItem.category === "stock") {
      // GOGO Coin or GAMBLING Coin — increment player share count
      if (catalogItem.name === "GOGO Coin") {
        db.prepare("UPDATE players SET nb_share_A = nb_share_A + 1 WHERE user_id = ?").run(req.userId!);
      } else if (catalogItem.name === "GAMBLING Coin") {
        db.prepare("UPDATE players SET nb_share_B = nb_share_B + 1 WHERE user_id = ?").run(req.userId!);
      }
    } else if (catalogItem.category === "loto_ticket") {
      // Loto ticket — add to inventory AND increment playable ticket counter
      const existing = db
        .prepare(
          "SELECT id, quantity FROM player_inventory WHERE user_id = ? AND item_id = ? AND star_level = 0"
        )
        .get(req.userId!, catalogItem.id) as { id: number; quantity: number } | undefined;

      if (existing) {
        db.prepare("UPDATE player_inventory SET quantity = quantity + 1 WHERE id = ?").run(
          existing.id
        );
      } else {
        db.prepare(
          "INSERT INTO player_inventory (user_id, item_id, quantity, star_level) VALUES (?, ?, 1, 0)"
        ).run(req.userId!, catalogItem.id);
      }
      db.prepare("UPDATE players SET loto_tickets = loto_tickets + 1 WHERE user_id = ?").run(req.userId!);
    } else {
      // Normal inventory item — add to player_inventory
      // Check if player already has this item (same item_id, same star_level)
      const existing = db
        .prepare(
          "SELECT id, quantity FROM player_inventory WHERE user_id = ? AND item_id = ? AND star_level = 0"
        )
        .get(req.userId!, catalogItem.id) as { id: number; quantity: number } | undefined;

      if (existing) {
        db.prepare("UPDATE player_inventory SET quantity = quantity + 1 WHERE id = ?").run(
          existing.id
        );
      } else {
        db.prepare(
          "INSERT INTO player_inventory (user_id, item_id, quantity, star_level) VALUES (?, ?, 1, 0)"
        ).run(req.userId!, catalogItem.id);
      }
    }

    updatePeakNetWorth(req.userId!);

    const updatedPlayer = db
      .prepare("SELECT * FROM players WHERE user_id = ?")
      .get(req.userId!) as Player;

    const rarityInfo = RARITY_MAP[rolledRarity as keyof typeof RARITY_MAP];

    res.json({
      item: catalogItem,
      rolledRarity,
      rarityColor: rarityInfo?.color ?? "#999999",
      player: updatedPlayer,
    });
  } catch (err) {
    console.error("[shop] Erreur open-box:", err);
    res.status(500).json({ error: "Erreur serveur lors de l'ouverture de la box" });
  }
});

// ─── Catalog ────────────────────────────────────────────────────

router.get("/catalog", (_req, res) => {
  try {
    const db = getDb();
    const items = db.prepare("SELECT * FROM items_catalog ORDER BY rarity, name").all();
    res.json(items);
  } catch (err) {
    console.error("[shop] Erreur catalog:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/boxes", (_req, res) => {
  try {
    res.json({ boxes: LOOT_BOXES, rarities: RARITY_MAP });
  } catch (err) {
    console.error("[shop] Erreur boxes:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── Inventory ──────────────────────────────────────────────────

router.get("/inventory", authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const db = getDb();
    const inventory = db
      .prepare(
        `SELECT pi.*, ic.name, ic.category, ic.rarity, ic.base_value,
                ic.qualifyable, ic.emoji, ic.description
         FROM player_inventory pi
         JOIN items_catalog ic ON pi.item_id = ic.id
         WHERE pi.user_id = ?
         ORDER BY
           CASE ic.rarity
             WHEN 'unique' THEN 0
             WHEN 'exotic' THEN 1
             WHEN 'mythic' THEN 2
             WHEN 'legendary' THEN 3
             WHEN 'epic' THEN 4
             WHEN 'rare' THEN 5
             WHEN 'common' THEN 6
           END,
           ic.name`
      )
      .all(req.userId!) as PlayerInventoryJoined[];

    res.json(inventory);
  } catch (err) {
    console.error("[shop] Erreur inventory:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── Equip / Unequip ────────────────────────────────────────────

router.post("/equip", authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const { inventoryId, slot } = req.body as {
      inventoryId: number | null;
      slot: "title" | "object";
    };

    if (!["title", "object"].includes(slot)) {
      res.status(400).json({ error: "Slot invalide. Utilisez 'title' ou 'object'." });
      return;
    }

    const db = getDb();
    const userId = req.userId!;

    // Verify player owns this inventory item
    if (inventoryId !== null) {
      const owned = db
        .prepare("SELECT * FROM player_inventory WHERE id = ? AND user_id = ?")
        .get(inventoryId, userId) as { id: number } | undefined;

      if (!owned) {
        res.status(400).json({ error: "Cet objet ne vous appartient pas" });
        return;
      }

      // Verify the item is of the right category for the slot
      const item = db
        .prepare(
          `SELECT ic.category FROM player_inventory pi
           JOIN items_catalog ic ON pi.item_id = ic.id
           WHERE pi.id = ?`
        )
        .get(inventoryId) as { category: string } | undefined;

      if (!item) {
        res.status(404).json({ error: "Objet introuvable" });
        return;
      }

      if (slot === "title" && item.category !== "title") {
        res.status(400).json({ error: "Cet objet n'est pas un titre" });
        return;
      }

      if (slot === "object" && !["people", "fruit", "burger"].includes(item.category)) {
        res.status(400).json({ error: "Cet objet ne peut pas être équipé comme objet" });
        return;
      }
    }

    // Upsert player_equipped
    const equipped = db
      .prepare("SELECT * FROM player_equipped WHERE user_id = ?")
      .get(userId) as PlayerEquipped | undefined;

    if (!equipped) {
      db.prepare(
        `INSERT INTO player_equipped (user_id, equipped_title_inventory_id, equipped_object_inventory_id)
         VALUES (?, ?, ?)`
      ).run(
        userId,
        slot === "title" ? inventoryId : null,
        slot === "object" ? inventoryId : null
      );
    } else if (slot === "title") {
      db.prepare(
        "UPDATE player_equipped SET equipped_title_inventory_id = ? WHERE user_id = ?"
      ).run(inventoryId, userId);
    } else {
      db.prepare(
        "UPDATE player_equipped SET equipped_object_inventory_id = ? WHERE user_id = ?"
      ).run(inventoryId, userId);
    }

    // Return full equipped state
    const updated = db
      .prepare("SELECT * FROM player_equipped WHERE user_id = ?")
      .get(userId) as PlayerEquipped;

    res.json(updated);
  } catch (err) {
    console.error("[shop] Erreur equip:", err);
    res.status(500).json({ error: "Erreur serveur lors de l'équipement" });
  }
});

// ─── Get equipped ───────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleGetEquipped = (req: any, res: any) => {
  try {
    const db = getDb();
    const targetUserId = req.params.userId || req.userId!;

    const equipped = db
      .prepare("SELECT * FROM player_equipped WHERE user_id = ?")
      .get(targetUserId) as PlayerEquipped | undefined;

    if (!equipped) {
      res.json({ equipped_title: null, equipped_object: null });
      return;
    }

    let equippedTitle = null;
    let equippedObject = null;

    if (equipped.equipped_title_inventory_id) {
      equippedTitle = db
        .prepare(
          `SELECT pi.*, ic.name, ic.emoji, ic.rarity, ic.category
           FROM player_inventory pi
           JOIN items_catalog ic ON pi.item_id = ic.id
           WHERE pi.id = ?`
        )
        .get(equipped.equipped_title_inventory_id);
    }

    if (equipped.equipped_object_inventory_id) {
      equippedObject = db
        .prepare(
          `SELECT pi.*, ic.name, ic.emoji, ic.rarity, ic.category
           FROM player_inventory pi
           JOIN items_catalog ic ON pi.item_id = ic.id
           WHERE pi.id = ?`
        )
        .get(equipped.equipped_object_inventory_id);
    }

    res.json({ equipped_title: equippedTitle, equipped_object: equippedObject });
  } catch (err) {
    console.error("[shop] Erreur equipped:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

router.get("/equipped", authMiddleware, handleGetEquipped);
router.get("/equipped/:userId", authMiddleware, handleGetEquipped);

// ─── Fuse (5 → 1★) ─────────────────────────────────────────────

router.post("/fuse", authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const { inventoryId } = req.body as { inventoryId: number };

    const db = getDb();
    const userId = req.userId!;

    const source = db
      .prepare(
        `SELECT pi.*, ic.name, ic.qualifyable, ic.base_value
         FROM player_inventory pi
         JOIN items_catalog ic ON pi.item_id = ic.id
         WHERE pi.id = ? AND pi.user_id = ?`
      )
      .get(inventoryId, userId) as
      | (PlayerInventoryJoined & { qualifyable: number; base_value: number })
      | undefined;

    if (!source) {
      res.status(404).json({ error: "Objet introuvable dans votre inventaire" });
      return;
    }

    if (!source.qualifyable) {
      res.status(400).json({ error: "Cet objet ne peut pas être fusionné" });
      return;
    }

    if (source.quantity < 5) {
      res.status(400).json({
        error: `Il vous faut 5 exemplaires pour fusionner. Vous en avez ${source.quantity}.`,
      });
      return;
    }

    // Consume 5, create starred version
    const newQuantity = source.quantity - 5;
    const newStarLevel = source.star_level + 1;

    if (newQuantity <= 0) {
      // Remove the old entry entirely
      db.prepare("DELETE FROM player_inventory WHERE id = ?").run(inventoryId);
    } else {
      db.prepare("UPDATE player_inventory SET quantity = ? WHERE id = ?").run(
        newQuantity,
        inventoryId
      );
    }

    // Add the starred version
    db.prepare(
      "INSERT INTO player_inventory (user_id, item_id, quantity, star_level) VALUES (?, ?, 1, ?)"
    ).run(userId, source.item_id, newStarLevel);

    res.json({
      success: true,
      item_name: source.name,
      new_star_level: newStarLevel,
      base_value: source.base_value,
    });
  } catch (err) {
    console.error("[shop] Erreur fuse:", err);
    res.status(500).json({ error: "Erreur serveur lors de la fusion" });
  }
});

// ─── Marketplace: list item ─────────────────────────────────────

router.post("/marketplace/list", authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const { inventoryId, quantity, price } = req.body as {
      inventoryId: number;
      quantity: number;
      price: number;
    };

    if (!inventoryId || !quantity || !price || quantity < 1 || price < 1) {
      res.status(400).json({ error: "Données invalides" });
      return;
    }

    const db = getDb();
    const userId = req.userId!;

    const source = db
      .prepare("SELECT * FROM player_inventory WHERE id = ? AND user_id = ?")
      .get(inventoryId, userId) as PlayerInventoryJoined | undefined;

    if (!source) {
      res.status(404).json({ error: "Objet introuvable dans votre inventaire" });
      return;
    }

    if (source.quantity < quantity) {
      res.status(400).json({
        error: `Vous n'avez que ${source.quantity} exemplaire(s).`,
      });
      return;
    }

    // Deduct from inventory
    const newQuantity = source.quantity - quantity;
    if (newQuantity <= 0) {
      db.prepare("DELETE FROM player_inventory WHERE id = ?").run(inventoryId);
    } else {
      db.prepare("UPDATE player_inventory SET quantity = ? WHERE id = ?").run(
        newQuantity,
        inventoryId
      );
    }

    // Create listing
    const result = db
      .prepare(
        `INSERT INTO marketplace_listings (seller_user_id, inventory_id, item_id, star_level, quantity, price)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(userId, inventoryId, source.item_id, source.star_level, quantity, price);

    res.json({ success: true, listingId: result.lastInsertRowid });
  } catch (err) {
    console.error("[shop] Erreur marketplace/list:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── Marketplace: browse listings ───────────────────────────────

router.get("/marketplace/listings", (_req, res) => {
  try {
    const db = getDb();
    const listings = db
      .prepare(
        `SELECT ml.*, p.player_name as seller_name, ic.name as item_name,
                ic.rarity as item_rarity, ic.emoji as item_emoji, ic.category as item_category
         FROM marketplace_listings ml
         JOIN players p ON ml.seller_user_id = p.user_id
         JOIN items_catalog ic ON ml.item_id = ic.id
         ORDER BY ml.created_at DESC
         LIMIT 100`
      )
      .all() as MarketplaceListing[];

    res.json(listings);
  } catch (err) {
    console.error("[shop] Erreur marketplace/listings:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── Marketplace: buy listing ───────────────────────────────────

router.post("/marketplace/buy", authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const { listingId } = req.body as { listingId: number };

    const db = getDb();
    const buyerUserId = req.userId!;

    const listing = db
      .prepare(
        `SELECT ml.*, p.player_name as seller_name
         FROM marketplace_listings ml
         JOIN players p ON ml.seller_user_id = p.user_id
         WHERE ml.id = ?`
      )
      .get(listingId) as MarketplaceListing | undefined;

    if (!listing) {
      res.status(404).json({ error: "Annonce introuvable" });
      return;
    }

    if (listing.seller_user_id === buyerUserId) {
      res.status(400).json({ error: "Vous ne pouvez pas acheter votre propre annonce" });
      return;
    }

    const buyer = db
      .prepare("SELECT * FROM players WHERE user_id = ?")
      .get(buyerUserId) as Player | undefined;

    if (!buyer) {
      res.status(404).json({ error: "Acheteur introuvable" });
      return;
    }

    if (buyer.nb_point < listing.price) {
      res.status(400).json({ error: "Pas assez de points pour cet achat" });
      return;
    }

    // Transfer points: buyer → seller
    db.prepare("UPDATE players SET nb_point = nb_point - ? WHERE user_id = ?").run(
      listing.price,
      buyerUserId
    );
    db.prepare("UPDATE players SET nb_point = nb_point + ? WHERE user_id = ?").run(
      listing.price,
      listing.seller_user_id
    );

    // Delete listing
    db.prepare("DELETE FROM marketplace_listings WHERE id = ?").run(listingId);

    // Add item to buyer's inventory
    const existing = db
      .prepare(
        "SELECT id FROM player_inventory WHERE user_id = ? AND item_id = ? AND star_level = ?"
      )
      .get(buyerUserId, listing.item_id, listing.star_level) as { id: number } | undefined;

    if (existing) {
      db.prepare("UPDATE player_inventory SET quantity = quantity + ? WHERE id = ?").run(
        listing.quantity,
        existing.id
      );
    } else {
      db.prepare(
        "INSERT INTO player_inventory (user_id, item_id, quantity, star_level) VALUES (?, ?, ?, ?)"
      ).run(buyerUserId, listing.item_id, listing.quantity, listing.star_level);
    }

    // Record transaction
    db.prepare(
      `INSERT INTO marketplace_transactions (buyer_user_id, seller_user_id, listing_id, item_id, star_level, quantity, price)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      buyerUserId,
      listing.seller_user_id,
      listingId,
      listing.item_id,
      listing.star_level,
      listing.quantity,
      listing.price
    );

    updatePeakNetWorth(buyerUserId);
    updatePeakNetWorth(listing.seller_user_id);

    res.json({ success: true, price: listing.price });
  } catch (err) {
    console.error("[shop] Erreur marketplace/buy:", err);
    res.status(500).json({ error: "Erreur serveur lors de l'achat" });
  }
});

// ─── Marketplace: cancel listing ────────────────────────────────

router.post("/marketplace/cancel", authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const { listingId } = req.body as { listingId: number };

    const db = getDb();
    const userId = req.userId!;

    const listing = db
      .prepare("SELECT * FROM marketplace_listings WHERE id = ? AND seller_user_id = ?")
      .get(listingId, userId) as MarketplaceListing | undefined;

    if (!listing) {
      res.status(404).json({ error: "Annonce introuvable ou ne vous appartient pas" });
      return;
    }

    // Remove listing
    db.prepare("DELETE FROM marketplace_listings WHERE id = ?").run(listingId);

    // Return item to inventory
    const existing = db
      .prepare(
        "SELECT id FROM player_inventory WHERE user_id = ? AND item_id = ? AND star_level = ?"
      )
      .get(userId, listing.item_id, listing.star_level) as { id: number } | undefined;

    if (existing) {
      db.prepare("UPDATE player_inventory SET quantity = quantity + ? WHERE id = ?").run(
        listing.quantity,
        existing.id
      );
    } else {
      db.prepare(
        "INSERT INTO player_inventory (user_id, item_id, quantity, star_level) VALUES (?, ?, ?, ?)"
      ).run(userId, listing.item_id, listing.quantity, listing.star_level);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("[shop] Erreur marketplace/cancel:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── Marketplace: transaction history ───────────────────────────

router.get("/marketplace/transactions", authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const db = getDb();
    const userId = req.userId!;

    const transactions = db
      .prepare(
        `SELECT mt.*,
                ic.name as item_name, ic.emoji as item_emoji, ic.rarity as item_rarity,
                buyer.player_name as buyer_name,
                seller.player_name as seller_name
         FROM marketplace_transactions mt
         JOIN items_catalog ic ON mt.item_id = ic.id
         JOIN players buyer ON mt.buyer_user_id = buyer.user_id
         JOIN players seller ON mt.seller_user_id = seller.user_id
         WHERE mt.buyer_user_id = ? OR mt.seller_user_id = ?
         ORDER BY mt.created_at DESC
         LIMIT 50`
      )
      .all(userId, userId);

    res.json(transactions);
  } catch (err) {
    console.error("[shop] Erreur marketplace/transactions:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── Box opening history ────────────────────────────────────────

router.get("/box-history", authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const db = getDb();
    const userId = req.userId!;

    // Box openings are tracked via player_inventory (acquired_at)
    const history = db
      .prepare(
        `SELECT pi.*, ic.name, ic.emoji, ic.rarity, ic.category, ic.base_value
         FROM player_inventory pi
         JOIN items_catalog ic ON pi.item_id = ic.id
         WHERE pi.user_id = ?
         ORDER BY pi.acquired_at DESC
         LIMIT 20`
      )
      .all(userId);

    res.json(history);
  } catch (err) {
    console.error("[shop] Erreur box-history:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── Daily free box ─────────────────────────────────────────────

router.post("/daily-free-box", authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const db = getDb();
    const userId = req.userId!;

    const player = db
      .prepare("SELECT * FROM players WHERE user_id = ?")
      .get(userId) as Player | undefined;

    if (!player) {
      res.status(404).json({ error: "Joueur introuvable" });
      return;
    }

    const now = new Date();
    const todayAt9 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0);
    const lastFree = player.last_daily_free_box ? new Date(player.last_daily_free_box) : null;

    if (lastFree && lastFree >= todayAt9) {
      res.status(400).json({
        error: "Box gratuite déjà réclamée aujourd'hui",
        nextAvailable: new Date(todayAt9.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      });
      return;
    }

    // Open a free XBOX
    const { item: rolledItem, rolledRarity } = rollBoxItem("XBOX");

    const catalogItem = db
      .prepare("SELECT * FROM items_catalog WHERE name = ? AND category = ?")
      .get(rolledItem.name, rolledItem.category) as CatalogItem | undefined;

    if (!catalogItem) {
      res.status(500).json({ error: "Item introuvable" });
      return;
    }

    // Handle stocks
    if (catalogItem.category === "stock") {
      if (catalogItem.name === "GOGO Coin") {
        db.prepare("UPDATE players SET nb_share_A = nb_share_A + 1 WHERE user_id = ?").run(userId);
      } else if (catalogItem.name === "GAMBLING Coin") {
        db.prepare("UPDATE players SET nb_share_B = nb_share_B + 1 WHERE user_id = ?").run(userId);
      }
    } else if (catalogItem.category === "loto_ticket") {
      const existing = db
        .prepare("SELECT id, quantity FROM player_inventory WHERE user_id = ? AND item_id = ? AND star_level = 0")
        .get(userId, catalogItem.id) as { id: number; quantity: number } | undefined;

      if (existing) {
        db.prepare("UPDATE player_inventory SET quantity = quantity + 1 WHERE id = ?").run(existing.id);
      } else {
        db.prepare("INSERT INTO player_inventory (user_id, item_id, quantity, star_level) VALUES (?, ?, 1, 0)")
          .run(userId, catalogItem.id);
      }
      db.prepare("UPDATE players SET loto_tickets = loto_tickets + 1 WHERE user_id = ?").run(userId);
    } else {
      const existing = db
        .prepare("SELECT id, quantity FROM player_inventory WHERE user_id = ? AND item_id = ? AND star_level = 0")
        .get(userId, catalogItem.id) as { id: number; quantity: number } | undefined;

      if (existing) {
        db.prepare("UPDATE player_inventory SET quantity = quantity + 1 WHERE id = ?").run(existing.id);
      } else {
        db.prepare("INSERT INTO player_inventory (user_id, item_id, quantity, star_level) VALUES (?, ?, 1, 0)")
          .run(userId, catalogItem.id);
      }
    }

    // Mark free box as claimed
    db.prepare("UPDATE players SET last_daily_free_box = ? WHERE user_id = ?")
      .run(now.toISOString(), userId);

    updatePeakNetWorth(userId);

    const updatedPlayer = db
      .prepare("SELECT * FROM players WHERE user_id = ?")
      .get(userId) as Player;

    res.json({
      item: catalogItem,
      rolledRarity,
      rarityColor: RARITY_MAP[rolledRarity as keyof typeof RARITY_MAP]?.color ?? "#999999",
      player: updatedPlayer,
      free: true,
    });
  } catch (err) {
    console.error("[shop] Erreur daily-free-box:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
