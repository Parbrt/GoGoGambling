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

// ─── Display style rolling ───────────────────────────────────────

const STYLE_POOLS: Record<string, [string, number][]> = {
  common:    [["default",70],["bold",20],["italic",10]],
  rare:      [["default",50],["bold",20],["italic",15],["tinted",15]],
  epic:      [["default",40],["bold",15],["italic",15],["tinted",15],["underline",15]],
  legendary: [["default",30],["bold_italic",15],["tinted",15],["glow",15],["underline",15],["strikethrough",10]],
  mythic:    [["default",20],["tinted",15],["glow",15],["solid",15],["italic",15],["gradient",10],["outlined",10]],
  exotic:    [["default",20],["glow",15],["tinted_bold",15],["solid",15],["bold_italic",15],["gradient",10],["strikethrough",10]],
  unique:    [["glow",15],["gradient",15],["solid",15],["rainbow",15],["tinted_bold",15],["bold_italic",10],["outlined",10],["glow_bold",5]],
};

function rollDisplayStyle(rarity: string): string {
  const pool = STYLE_POOLS[rarity] ?? STYLE_POOLS.common;
  const total = pool.reduce((sum, [, w]) => sum + w, 0);
  let rand = Math.random() * total;
  for (const [style, weight] of pool) {
    rand -= weight;
    if (rand <= 0) return style;
  }
  return "default";
}

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

    // Get names of unique items already owned by any player (globally unique)
    const ownedUniques = db
      .prepare(
        `SELECT ic.name FROM player_inventory pi
         JOIN items_catalog ic ON pi.item_id = ic.id
         WHERE ic.rarity = 'unique' AND pi.quantity > 0`
      )
      .all() as { name: string }[];
    const excludeNames = ownedUniques.map((u) => u.name);

    // Roll the item (excluding already-owned unique items)
    const { item: rolledItem, rolledRarity } = rollBoxItem(
      boxType as BoxType,
      excludeNames
    );

    if (rolledRarity === null || !rolledItem) {
      res.status(500).json({ error: "Plus aucun item disponible dans cette rareté" });
      return;
    }

    // Fetch the catalog item from DB (to get its ID)
    const catalogItem = db
      .prepare("SELECT * FROM items_catalog WHERE name = ? AND category = ?")
      .get(rolledItem.name, rolledItem.category) as CatalogItem | undefined;

    if (!catalogItem) {
      // Should not happen; fallback
      res.status(500).json({ error: "Item introuvable dans le catalogue" });
      return;
    }

    // Declare displayStyle with default for special categories
    let displayStyle = "default";

    // Handle special categories that don't go to inventory
    if (catalogItem.category === "stock") {
      // GOGO Coin or GAMBLING Coin — increment player share count
      if (catalogItem.name === "GOGO Coin") {
        db.prepare("UPDATE players SET nb_share_A = nb_share_A + 1 WHERE user_id = ?").run(req.userId!);
      } else if (catalogItem.name === "GAMBLING Coin") {
        db.prepare("UPDATE players SET nb_share_B = nb_share_B + 1 WHERE user_id = ?").run(req.userId!);
      }
    } else if (catalogItem.name === "Ticket de Loto") {
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
      displayStyle = rollDisplayStyle(catalogItem.rarity);
      const existing = db
        .prepare(
          "SELECT id, quantity FROM player_inventory WHERE user_id = ? AND item_id = ? AND star_level = 0"
        )
        .get(req.userId!, catalogItem.id) as { id: number; quantity: number } | undefined;

      if (existing) {
        db.prepare("UPDATE player_inventory SET quantity = quantity + 1, display_style = ? WHERE id = ?").run(
          displayStyle, existing.id
        );
      } else {
        db.prepare(
          "INSERT INTO player_inventory (user_id, item_id, quantity, star_level, display_style) VALUES (?, ?, 1, 0, ?)"
        ).run(req.userId!, catalogItem.id, displayStyle);
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
      displayStyle,
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
         WHERE pi.user_id = ? AND pi.quantity > 0
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
    const { inventoryId, displayStyle } = req.body as { inventoryId: number; displayStyle?: string };

    const db = getDb();
    const userId = req.userId!;

    // Identify item from the referenced row
    const ref = db
      .prepare(
        `SELECT pi.item_id, pi.star_level, ic.name, ic.qualifyable, ic.base_value
         FROM player_inventory pi
         JOIN items_catalog ic ON pi.item_id = ic.id
         WHERE pi.id = ? AND pi.user_id = ?`
      )
      .get(inventoryId, userId) as
      | { item_id: number; star_level: number; name: string; qualifyable: number; base_value: number }
      | undefined;

    if (!ref) {
      res.status(404).json({ error: "Objet introuvable dans votre inventaire" });
      return;
    }

    if (!ref.qualifyable) {
      res.status(400).json({ error: "Cet objet ne peut pas être fusionné" });
      return;
    }

    const MAX_STAR = 5;
    if (ref.star_level >= MAX_STAR) {
      res.status(400).json({ error: `Niveau ${"★".repeat(ref.star_level)} maximum atteint` });
      return;
    }

    // Aggregate ALL rows for this item/star_level (multiple rows can exist after repeated fusions)
    const allRows = db
      .prepare(
        "SELECT id, quantity, display_style FROM player_inventory WHERE user_id = ? AND item_id = ? AND star_level = ? AND quantity > 0 ORDER BY id"
      )
      .all(userId, ref.item_id, ref.star_level) as { id: number; quantity: number; display_style: string }[];

    const totalQty = allRows.reduce((sum, r) => sum + r.quantity, 0);
    const required = 2;

    if (totalQty < required) {
      res.status(400).json({
        error: `Il vous faut ${required} exemplaires pour fusionner. Vous en avez ${totalQty}.`,
      });
      return;
    }

    // Consume 2 copies across rows (starting from oldest), track display styles of consumed rows
    let toConsume = required;
    const consumedStyles: string[] = [];
    for (const row of allRows) {
      if (toConsume <= 0) break;
      const consume = Math.min(row.quantity, toConsume);
      const remaining = row.quantity - consume;
      if (row.display_style) consumedStyles.push(row.display_style);
      if (remaining <= 0) {
        db.prepare("DELETE FROM player_inventory WHERE id = ?").run(row.id);
      } else {
        db.prepare("UPDATE player_inventory SET quantity = ? WHERE id = ?").run(remaining, row.id);
      }
      toConsume -= consume;
    }

    const newStarLevel = ref.star_level + 1;
    // Use explicitly chosen style, or fall back to the style of the first consumed row
    const resolvedStyle = displayStyle ?? consumedStyles[0] ?? "default";

    // Merge into existing row for this star level if one exists (avoids fragmentation)
    const existingStar = db
      .prepare("SELECT id FROM player_inventory WHERE user_id = ? AND item_id = ? AND star_level = ?")
      .get(userId, ref.item_id, newStarLevel) as { id: number } | undefined;

    let newInventoryId: number;
    if (existingStar) {
      db.prepare("UPDATE player_inventory SET quantity = quantity + 1, display_style = ? WHERE id = ?").run(resolvedStyle, existingStar.id);
      newInventoryId = existingStar.id;
    } else {
      const ins = db.prepare(
        "INSERT INTO player_inventory (user_id, item_id, quantity, star_level, display_style) VALUES (?, ?, 1, ?, ?)"
      ).run(userId, ref.item_id, newStarLevel, resolvedStyle);
      newInventoryId = Number(ins.lastInsertRowid);
    }

    // If the referenced row was equipped, redirect to the new fused row
    const wasEquipped = db
      .prepare(
        "SELECT * FROM player_equipped WHERE user_id = ? AND (equipped_title_inventory_id = ? OR equipped_object_inventory_id = ?)"
      )
      .get(userId, inventoryId, inventoryId) as PlayerEquipped | undefined;
    if (wasEquipped) {
      if (wasEquipped.equipped_title_inventory_id === inventoryId) {
        db.prepare("UPDATE player_equipped SET equipped_title_inventory_id = ? WHERE user_id = ?").run(newInventoryId, userId);
      }
      if (wasEquipped.equipped_object_inventory_id === inventoryId) {
        db.prepare("UPDATE player_equipped SET equipped_object_inventory_id = ? WHERE user_id = ?").run(newInventoryId, userId);
      }
    }

    res.json({
      success: true,
      item_name: ref.name,
      new_star_level: newStarLevel,
      base_value: ref.base_value,
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

    // Block listing unique items on marketplace
    const itemCat = db
      .prepare("SELECT rarity FROM items_catalog WHERE id = ?")
      .get(source.item_id) as { rarity: string } | undefined;
    if (itemCat?.rarity === "unique") {
      res.status(400).json({ error: "Les objets uniques ne peuvent pas être vendus sur le marché" });
      return;
    }

    if (source.quantity < quantity) {
      res.status(400).json({
        error: `Vous n'avez que ${source.quantity} exemplaire(s).`,
      });
      return;
    }

    // Deduct from inventory — keep row alive with quantity 0 to preserve FK
    const newQuantity = source.quantity - quantity;
    db.prepare("UPDATE player_inventory SET quantity = ? WHERE id = ?").run(
      Math.max(0, newQuantity),
      inventoryId
    );

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
         WHERE ml.status = 'active'
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

    // Record transaction BEFORE updating listing status
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

    // Mark listing as sold
    db.prepare("UPDATE marketplace_listings SET status = 'sold' WHERE id = ?").run(listingId);
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

    // Mark listing as cancelled
    db.prepare("UPDATE marketplace_listings SET status = 'cancelled' WHERE id = ?").run(listingId);

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

    // Get names of unique items already owned by any player
    const ownedUniques = db
      .prepare(
        `SELECT ic.name FROM player_inventory pi
         JOIN items_catalog ic ON pi.item_id = ic.id
         WHERE ic.rarity = 'unique' AND pi.quantity > 0`
      )
      .all() as { name: string }[];
    const excludeNames = ownedUniques.map((u) => u.name);

    // Open a free XBOX
    const { item: rolledItem, rolledRarity } = rollBoxItem("XBOX", excludeNames);

    if (rolledRarity === null || !rolledItem) {
      res.status(500).json({ error: "Plus aucun item disponible" });
      return;
    }

    const catalogItem = db
      .prepare("SELECT * FROM items_catalog WHERE name = ? AND category = ?")
      .get(rolledItem.name, rolledItem.category) as CatalogItem | undefined;

    if (!catalogItem) {
      res.status(500).json({ error: "Item introuvable" });
      return;
    }

    let displayStyle = "default";

    // Handle stocks
    if (catalogItem.category === "stock") {
      if (catalogItem.name === "GOGO Coin") {
        db.prepare("UPDATE players SET nb_share_A = nb_share_A + 1 WHERE user_id = ?").run(userId);
      } else if (catalogItem.name === "GAMBLING Coin") {
        db.prepare("UPDATE players SET nb_share_B = nb_share_B + 1 WHERE user_id = ?").run(userId);
      }
    } else if (catalogItem.name === "Ticket de Loto") {
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
      displayStyle = rollDisplayStyle(catalogItem.rarity);
      const existing = db
        .prepare("SELECT id, quantity FROM player_inventory WHERE user_id = ? AND item_id = ? AND star_level = 0")
        .get(userId, catalogItem.id) as { id: number; quantity: number } | undefined;

      if (existing) {
        db.prepare("UPDATE player_inventory SET quantity = quantity + 1, display_style = ? WHERE id = ?").run(displayStyle, existing.id);
      } else {
        db.prepare("INSERT INTO player_inventory (user_id, item_id, quantity, star_level, display_style) VALUES (?, ?, 1, 0, ?)")
          .run(userId, catalogItem.id, displayStyle);
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
      displayStyle,
    });
  } catch (err) {
    console.error("[shop] Erreur daily-free-box:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── Use consumable item ────────────────────────────────────────

router.post("/use-consumable", authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const { inventoryId } = req.body as { inventoryId: number };

    if (!inventoryId) {
      res.status(400).json({ error: "ID d'objet requis" });
      return;
    }

    const db = getDb();
    const userId = req.userId!;

    const source = db
      .prepare(
        `SELECT pi.*, ic.name, ic.category, ic.emoji
         FROM player_inventory pi
         JOIN items_catalog ic ON pi.item_id = ic.id
         WHERE pi.id = ? AND pi.user_id = ?`
      )
      .get(inventoryId, userId) as
      | { id: number; item_id: number; quantity: number; name: string; category: string; emoji: string }
      | undefined;

    if (!source) {
      res.status(404).json({ error: "Objet introuvable dans votre inventaire" });
      return;
    }

    if (source.category !== "consumable" && source.category !== "loto_ticket") {
      res.status(400).json({ error: "Cet objet n'est pas un consommable" });
      return;
    }

    // Apply effect based on item name
    let effectMessage = "";
    const player = db
      .prepare("SELECT * FROM players WHERE user_id = ?")
      .get(userId) as Player | undefined;

    if (!player) {
      res.status(404).json({ error: "Joueur introuvable" });
      return;
    }

    if (source.name === "Recharge de Poulets") {
      db.prepare(
        "UPDATE players SET chicken_charges = 5, last_chicken_charge_refill = ? WHERE user_id = ?"
      ).run(new Date().toISOString(), userId);
      effectMessage = "Toutes vos charges de poulet ont été restaurées !";
    } else if (source.name === "Ticket de Loto") {
      // Convert inventory loto ticket into playable v2 ticket
      const now = new Date();
      const DRAW_HOUR = 12;
      const DRAW_MINUTE = 0;
      const drawTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), DRAW_HOUR, DRAW_MINUTE);

      if (now >= drawTime) {
        res.status(400).json({ error: "Les tickets ne peuvent plus être utilisés pour le tirage du jour. Revenez après midi." });
        return;
      }

      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      const ticketCount = (db
        .prepare("SELECT COUNT(*) as cnt FROM loto_tickets_v2 WHERE user_id = ? AND draw_date = ?")
        .get(userId, todayStr) as { cnt: number }).cnt;

      if (ticketCount >= 10) {
        res.status(400).json({ error: "Maximum 10 tickets par tirage" });
        return;
      }

      // Generate unique ticket number for this draw
      let ticketNumber: string;
      let attempts = 0;
      do {
        ticketNumber = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
        const exists = db
          .prepare("SELECT id FROM loto_tickets_v2 WHERE ticket_number = ? AND draw_date = ?")
          .get(ticketNumber, todayStr);
        if (!exists) break;
        attempts++;
      } while (attempts < 50);

      if (attempts >= 50) {
        res.status(500).json({ error: "Impossible de générer un numéro unique. Réessayez." });
        return;
      }

      db.prepare(
        "INSERT INTO loto_tickets_v2 (user_id, player_name, ticket_number, draw_date) VALUES (?, ?, ?, ?)"
      ).run(userId, player.player_name, ticketNumber, todayStr);

      effectMessage = `Ticket de Loto n°${ticketNumber} activé pour le tirage du jour !`;
    } else {
      res.status(400).json({ error: "Ce consommable ne peut pas être utilisé ici" });
      return;
    }

    // Consume one from inventory
    if (source.quantity <= 1) {
      db.prepare("DELETE FROM player_inventory WHERE id = ?").run(inventoryId);
    } else {
      db.prepare("UPDATE player_inventory SET quantity = quantity - 1 WHERE id = ?").run(inventoryId);
    }

    const updatedPlayer = db
      .prepare("SELECT * FROM players WHERE user_id = ?")
      .get(userId) as Player;

    res.json({
      success: true,
      effect: effectMessage,
      player: updatedPlayer,
      item_name: source.name,
    });
  } catch (err) {
    console.error("[shop] Erreur use-consumable:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── Collection stats ────────────────────────────────────────────

router.get("/collection-stats", authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const db = getDb();
    const userId = req.userId!;

    const TRACKED_CATEGORIES = [
      { key: "fruit",   label: "Fruits",       emoji: "🍎" },
      { key: "burger",  label: "Burgers",       emoji: "🍔" },
      { key: "title",   label: "Titres",        emoji: "🏅" },
      { key: "people",  label: "Personnages",   emoji: "👤" },
    ] as const;

    const categories = TRACKED_CATEGORIES.map(({ key, label, emoji }) => {
      const { total } = db
        .prepare("SELECT COUNT(*) as total FROM items_catalog WHERE category = ?")
        .get(key) as { total: number };

      const { owned } = db
        .prepare(
          `SELECT COUNT(DISTINCT pi.item_id) as owned
           FROM player_inventory pi
           JOIN items_catalog ic ON pi.item_id = ic.id
           WHERE pi.user_id = ? AND pi.quantity > 0 AND ic.category = ?`
        )
        .get(userId, key) as { owned: number };

      return { key, label, emoji, owned, total };
    });

    const { uniqueTotal } = db
      .prepare("SELECT COUNT(*) as uniqueTotal FROM items_catalog WHERE rarity = 'unique'")
      .get() as { uniqueTotal: number };

    const { uniqueOwned } = db
      .prepare(
        `SELECT COUNT(DISTINCT pi.item_id) as uniqueOwned
         FROM player_inventory pi
         JOIN items_catalog ic ON pi.item_id = ic.id
         WHERE ic.rarity = 'unique' AND pi.quantity > 0`
      )
      .get() as { uniqueOwned: number };

    res.json({ categories, uniqueGlobal: { owned: uniqueOwned, total: uniqueTotal } });
  } catch (err) {
    console.error("[shop] Erreur collection-stats:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── Daily Deals ─────────────────────────────────────────────────

function getTodayDealDateStr(): string {
  const now = new Date();
  const todayAt9 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0);
  if (now < todayAt9) {
    todayAt9.setDate(todayAt9.getDate() - 1);
  }
  return todayAt9.toISOString().slice(0, 10);
}

function seedDailyDeals(db: ReturnType<typeof getDb>, dateStr: string): void {
  const existing = db.prepare("SELECT COUNT(*) as cnt FROM daily_deals WHERE deal_date = ?").get(dateStr) as { cnt: number };
  if (existing.cnt > 0) return;

  function mulberry32(seed: number): () => number {
    let s = seed | 0;
    return () => {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const seed = dateStr.split("-").reduce((acc, n) => acc * 31 + parseInt(n, 10), 0);
  const rand = mulberry32(seed);

  const RARITY_WEIGHTS: Array<{ rarity: string; weight: number }> = [
    { rarity: "common", weight: 55 },
    { rarity: "rare", weight: 28 },
    { rarity: "epic", weight: 10 },
    { rarity: "legendary", weight: 4 },
    { rarity: "mythic", weight: 2 },
    { rarity: "exotic", weight: 1 },
  ];
  const totalWeight = RARITY_WEIGHTS.reduce((s, r) => s + r.weight, 0);

  function pickWeightedRarity(): string {
    const roll = rand() * totalWeight;
    let cumul = 0;
    for (const r of RARITY_WEIGHTS) {
      cumul += r.weight;
      if (roll < cumul) return r.rarity;
    }
    return "common";
  }

  const eligibleItems = db
    .prepare(
      `SELECT * FROM items_catalog
       WHERE rarity != 'unique'
       AND category NOT IN ('consumable', 'stock', 'points', 'loto_ticket')
       ORDER BY name`
    )
    .all() as Array<{ id: number; name: string; category: string; rarity: string; base_value: number; emoji: string }>;

  const consumableItems = db
    .prepare("SELECT * FROM items_catalog WHERE category IN ('consumable', 'loto_ticket')")
    .all() as Array<{ id: number; name: string; category: string; rarity: string; base_value: number; emoji: string }>;

  if (eligibleItems.length === 0) return;

  const insert = db.prepare(
    "INSERT INTO daily_deals (deal_date, slot, item_id, price) VALUES (?, ?, ?, ?)"
  );

  const transaction = db.transaction(() => {
    for (let slot = 1; slot <= 2; slot++) {
      const targetRarity = pickWeightedRarity();
      const candidates = eligibleItems.filter((i) => i.rarity === targetRarity);
      const pool = candidates.length > 0 ? candidates : eligibleItems;
      const picked = pool[Math.floor(rand() * pool.length)];
      const price = Math.ceil(picked.base_value * 1.2);
      insert.run(dateStr, slot, picked.id, price > 0 ? price : 100);
    }

    if (consumableItems.length > 0) {
      const consumable = consumableItems[Math.floor(rand() * consumableItems.length)];
      const price = Math.ceil(consumable.base_value * 1.2);
      insert.run(dateStr, 3, consumable.id, price > 0 ? price : 100);
    }
  });

  transaction();
}

router.get("/daily-deals", authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const db = getDb();
    const today = getTodayDealDateStr();
    seedDailyDeals(db, today);

    const deals = db
      .prepare(
        `SELECT dd.*, ic.name, ic.category, ic.rarity, ic.base_value, ic.emoji, ic.description
         FROM daily_deals dd
         JOIN items_catalog ic ON dd.item_id = ic.id
         WHERE dd.deal_date = ?
         ORDER BY dd.slot`
      )
      .all(today) as Array<{
        id: number; deal_date: string; slot: number; item_id: number; price: number;
        name: string; category: string; rarity: string; base_value: number; emoji: string; description: string;
      }>;

    const purchases = db
      .prepare(
        `SELECT deal_id FROM daily_deal_purchases ddp
         JOIN daily_deals dd ON ddp.deal_id = dd.id
         WHERE dd.deal_date = ? AND ddp.user_id = ?`
      )
      .all(today, req.userId!) as Array<{ deal_id: number }>;
    const purchasedIds = new Set(purchases.map((p) => p.deal_id));

    const now = new Date();
    const todayAt9 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0);
    // Si avant 9h, le reset est à 9h aujourd'hui (les deals affichés sont ceux d'hier)
    // Si après 9h, le reset est à 9h demain
    const resetTime = now < todayAt9
      ? todayAt9
      : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0);
    const nextRefreshMs = resetTime.getTime() - now.getTime();

    res.json({
      deals: deals.map((d) => ({ ...d, purchased: purchasedIds.has(d.id) })),
      nextRefreshMs,
    });
  } catch (err) {
    console.error("[shop] Erreur daily-deals:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/buy-daily-deal", authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const { dealId } = req.body as { dealId: number };

    if (!dealId) {
      res.status(400).json({ error: "ID du deal requis" });
      return;
    }

    const db = getDb();
    const userId = req.userId!;
    const today = getTodayDealDateStr();

    const deal = db
      .prepare(
        `SELECT dd.*, ic.name, ic.category, ic.rarity, ic.emoji
         FROM daily_deals dd
         JOIN items_catalog ic ON dd.item_id = ic.id
         WHERE dd.id = ? AND dd.deal_date = ?`
      )
      .get(dealId, today) as {
        id: number; item_id: number; price: number; slot: number;
        name: string; category: string; rarity: string; emoji: string;
      } | undefined;

    if (!deal) {
      res.status(404).json({ error: "Deal introuvable ou expiré" });
      return;
    }

    const alreadyPurchased = db
      .prepare("SELECT id FROM daily_deal_purchases WHERE user_id = ? AND deal_id = ?")
      .get(userId, dealId);

    if (alreadyPurchased) {
      res.status(400).json({ error: "Vous avez déjà acheté cet article aujourd'hui" });
      return;
    }

    const player = db
      .prepare("SELECT * FROM players WHERE user_id = ?")
      .get(userId) as Player | undefined;

    if (!player) {
      res.status(404).json({ error: "Joueur introuvable" });
      return;
    }

    if (player.nb_point < deal.price) {
      res.status(400).json({
        error: `Pas assez de points. Il vous faut ${deal.price.toLocaleString()} points.`,
      });
      return;
    }

    db.prepare("UPDATE players SET nb_point = nb_point - ? WHERE user_id = ?")
      .run(deal.price, userId);

    if (deal.name === "Ticket de Loto") {
      const existing = db
        .prepare("SELECT id, quantity FROM player_inventory WHERE user_id = ? AND item_id = ? AND star_level = 0")
        .get(userId, deal.item_id) as { id: number; quantity: number } | undefined;

      if (existing) {
        db.prepare("UPDATE player_inventory SET quantity = quantity + 1 WHERE id = ?").run(existing.id);
      } else {
        db.prepare("INSERT INTO player_inventory (user_id, item_id, quantity, star_level) VALUES (?, ?, 1, 0)")
          .run(userId, deal.item_id);
      }
      db.prepare("UPDATE players SET loto_tickets = loto_tickets + 1 WHERE user_id = ?").run(userId);
    } else {
      const existing = db
        .prepare("SELECT id, quantity FROM player_inventory WHERE user_id = ? AND item_id = ? AND star_level = 0")
        .get(userId, deal.item_id) as { id: number; quantity: number } | undefined;

      if (existing) {
        db.prepare("UPDATE player_inventory SET quantity = quantity + 1 WHERE id = ?").run(existing.id);
      } else {
        db.prepare("INSERT INTO player_inventory (user_id, item_id, quantity, star_level) VALUES (?, ?, 1, 0)")
          .run(userId, deal.item_id);
      }
    }

    db.prepare("INSERT INTO daily_deal_purchases (user_id, deal_id) VALUES (?, ?)").run(userId, dealId);

    updatePeakNetWorth(userId);

    const updatedPlayer = db
      .prepare("SELECT * FROM players WHERE user_id = ?")
      .get(userId) as Player;

    res.json({
      success: true,
      player: updatedPlayer,
      deal: { id: deal.id, name: deal.name, price: deal.price, emoji: deal.emoji, rarity: deal.rarity },
    });
  } catch (err) {
    console.error("[shop] Erreur buy-daily-deal:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
