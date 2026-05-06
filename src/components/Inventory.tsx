import { useState, useEffect, useCallback } from "react";
import { Star, Shield, Shirt, Sparkles, Loader2, Swords, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "@/lib/api";

// ─── Types ───

interface InventoryItem {
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

interface EquippedData {
  equipped_title: InventoryItem | null;
  equipped_object: InventoryItem | null;
}

// ─── Rarity colors (matching server RARITY_MAP) ───

const RARITY_STYLES: Record<string, { border: string; bg: string; text: string; glow: string }> = {
  unique:    { border: "border-yellow-400",   bg: "bg-yellow-400/10",   text: "text-yellow-400",   glow: "shadow-[0_0_20px_rgba(250,204,21,0.3)]" },
  exotic:    { border: "border-red-500",      bg: "bg-red-500/10",      text: "text-red-500",      glow: "shadow-[0_0_20px_rgba(239,68,68,0.3)]" },
  mythic:    { border: "border-fuchsia-500",  bg: "bg-fuchsia-500/10",  text: "text-fuchsia-500",  glow: "shadow-[0_0_20px_rgba(217,70,239,0.3)]" },
  legendary: { border: "border-orange-500",   bg: "bg-orange-500/10",   text: "text-orange-500",   glow: "shadow-[0_0_20px_rgba(249,115,22,0.3)]" },
  epic:      { border: "border-purple-500",   bg: "bg-purple-500/10",   text: "text-purple-500",   glow: "shadow-[0_0_20px_rgba(147,51,234,0.3)]" },
  rare:      { border: "border-blue-500",     bg: "bg-blue-500/10",     text: "text-blue-500",     glow: "shadow-[0_0_20px_rgba(59,130,246,0.3)]" },
  common:    { border: "border-gray-400",     bg: "bg-gray-400/10",     text: "text-gray-400",     glow: "" },
};

const RARITY_LABELS: Record<string, string> = {
  unique: "Unique",
  exotic: "Exotique",
  mythic: "Mythique",
  legendary: "Légendaire",
  epic: "Épique",
  rare: "Rare",
  common: "Commun",
};

const CATEGORY_FILTERS = [
  { key: "all", label: "Tout", icon: null },
  { key: "people", label: "Personnes", icon: null },
  { key: "fruit", label: "Fruits", icon: null },
  { key: "title", label: "Titres", icon: null },
  { key: "burger", label: "Burgers", icon: null },
  { key: "loto_ticket", label: "Tickets", icon: null },
];

// ─── Component ───

export function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [equipped, setEquipped] = useState<EquippedData>({ equipped_title: null, equipped_object: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [fusingId, setFusingId] = useState<number | null>(null);
  const [fuseResult, setFuseResult] = useState<{ name: string; stars: number } | null>(null);

  // ─── Load inventory ───

  const loadInventory = useCallback(async () => {
    try {
      const [inv, eq] = await Promise.all([
        api.shop.inventory(),
        api.shop.equipped(),
      ]);
      setItems(inv as InventoryItem[]);
      setEquipped(eq as EquippedData);
    } catch (err) {
      console.error("[Inventory] Erreur chargement:", err);
      setError("Impossible de charger l'inventaire");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadInventory(); }, [loadInventory]);

  // ─── Equip / Unequip ───

  async function handleEquip(inventoryId: number, slot: "title" | "object") {
    const item = items.find((i) => i.id === inventoryId);
    if (!item) return;
    const isCurrentlyEquipped =
      (slot === "title" && equipped.equipped_title?.id === inventoryId) ||
      (slot === "object" && equipped.equipped_object?.id === inventoryId);

    const newValue = isCurrentlyEquipped ? null : inventoryId;

    try {
      await api.shop.equip(newValue, slot);
      // Reload equipped
      const eq = await api.shop.equipped();
      setEquipped(eq as EquippedData);
    } catch (err) {
      console.error("[Inventory] Erreur equip:", err);
      setError("Erreur lors de l'équipement");
    }
  }

  // ─── Fuse ───

  async function handleFuse(inventoryId: number) {
    setFusingId(inventoryId);
    try {
      const result = await api.shop.fuse(inventoryId);
      setFuseResult({ name: result.item_name, stars: result.new_star_level });
      await loadInventory();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la fusion");
    } finally {
      setFusingId(null);
    }
  }

  // ─── Filter items ───

  const filteredItems = activeFilter === "all"
    ? items
    : items.filter((i) => i.category === activeFilter);

  // ─── Group items for compact display ───

  const itemGroups = filteredItems.reduce<Record<string, InventoryItem[]>>((acc, item) => {
    const key = `${item.item_id}-${item.star_level}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const displayItems = Object.values(itemGroups).map((group) => ({
    ...group[0],
    quantity: group.reduce((sum, i) => sum + i.quantity, 0),
    inventoryIds: group.map((i) => i.id),
  }));

  // ─── Count by category ───

  const categoryCounts = CATEGORY_FILTERS.map((cat) => ({
    ...cat,
    count: cat.key === "all" ? items.length : items.filter((i) => i.category === cat.key).length,
  }));

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#696969]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ─── Equipped slots ─── */}
      <div className="bg-[#FCFBFA] border border-[#D1CDC7] rounded-[40px] p-8 halo-soft">
        <span className="eyebrow">Équipement actuel</span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {/* Title slot */}
          <div className="bg-[#F3F0EE] rounded-[20px] p-5 flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl ${
              equipped.equipped_title
                ? `bg-gradient-to-br ${RARITY_STYLES[equipped.equipped_title.rarity]?.bg || "bg-gray-100"} border-2 ${RARITY_STYLES[equipped.equipped_title.rarity]?.border || "border-gray-300"}`
                : "bg-[#E8E4E0] border-2 border-dashed border-[#D1CDC7]"
            }`}>
              {equipped.equipped_title ? (
                <span>{equipped.equipped_title.emoji}</span>
              ) : (
                <Shield className="w-6 h-6 text-[#D1CDC7]" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.08em] text-[#696969] font-medium">Titre</p>
              {equipped.equipped_title ? (
                <>
                  <p className="font-medium text-[#141413] truncate">{equipped.equipped_title.name}</p>
                  <p className={`text-xs font-medium ${RARITY_STYLES[equipped.equipped_title.rarity]?.text || "text-gray-400"}`}>
                    {RARITY_LABELS[equipped.equipped_title.rarity]}
                  </p>
                </>
              ) : (
                <p className="text-sm text-[#D1CDC7] italic">Aucun titre équipé</p>
              )}
            </div>
          </div>

          {/* Object slot */}
          <div className="bg-[#F3F0EE] rounded-[20px] p-5 flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl ${
              equipped.equipped_object
                ? `bg-gradient-to-br ${RARITY_STYLES[equipped.equipped_object.rarity]?.bg || "bg-gray-100"} border-2 ${RARITY_STYLES[equipped.equipped_object.rarity]?.border || "border-gray-300"}`
                : "bg-[#E8E4E0] border-2 border-dashed border-[#D1CDC7]"
            }`}>
              {equipped.equipped_object ? (
                <span>{equipped.equipped_object.emoji}</span>
              ) : (
                <Shirt className="w-6 h-6 text-[#D1CDC7]" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.08em] text-[#696969] font-medium">Objet</p>
              {equipped.equipped_object ? (
                <>
                  <p className="font-medium text-[#141413] truncate">{equipped.equipped_object.name}</p>
                  <p className={`text-xs font-medium ${RARITY_STYLES[equipped.equipped_object.rarity]?.text || "text-gray-400"}`}>
                    {RARITY_LABELS[equipped.equipped_object.rarity]}
                  </p>
                </>
              ) : (
                <p className="text-sm text-[#D1CDC7] italic">Aucun objet équipé</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Inventory grid ─── */}
      <div className="bg-[#FCFBFA] border border-[#D1CDC7] rounded-[40px] p-8 halo-soft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="space-y-1">
            <span className="eyebrow">Inventaire</span>
            <p className="text-sm text-[#696969]">
              {items.length} objet{items.length !== 1 ? "s" : ""} possédé{items.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Category filter pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categoryCounts.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveFilter(cat.key)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-colors ${
                activeFilter === cat.key
                  ? "bg-[#141413] text-[#F3F0EE]"
                  : "bg-[#F3F0EE] text-[#696969] hover:bg-[#E8E4E0] hover:text-[#141413]"
              }`}
            >
              {cat.label}
              <span className={`tabular-nums text-[10px] ${activeFilter === cat.key ? "text-[#F3F0EE]/60" : "text-[#D1CDC7]"}`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {/* Items grid */}
        {displayItems.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <span className="text-5xl">📭</span>
            <p className="text-[#696969] font-medium">Aucun objet trouvé</p>
            <p className="text-sm text-[#D1CDC7]">Ouvrez des box dans le shop pour obtenir des objets !</p>
          </div>
        ) : (
          <div className="max-h-[32rem] overflow-y-auto rounded-xl pt-2 pl-2 pr-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {displayItems.map((item) => {
              const style = RARITY_STYLES[item.rarity] || RARITY_STYLES.common;
              const isEquippedTitle = equipped.equipped_title?.id === item.id;
              const isEquippedObject = equipped.equipped_object?.id === item.id;

              const canEquipTitle = item.category === "title";
              const canEquipObject = ["people", "fruit", "burger"].includes(item.category);
              const canFuse = item.qualifyable && item.quantity >= 5 && item.star_level < 3;

              return (
                <div
                  key={`${item.item_id}-${item.star_level}-${item.inventoryIds[0]}`}
                  className={`relative bg-white rounded-[16px] border-2 p-3 flex flex-col items-center text-center gap-1.5 transition-all duration-200 hover:-translate-y-0.5 ${
                    style.border
                  } ${
                    isEquippedTitle || isEquippedObject ? style.glow : ""
                  }`}
                >
                  {/* Equipped badge */}
                  {(isEquippedTitle || isEquippedObject) && (
                    <span className="absolute -top-2 -right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#141413] text-[9px] font-bold text-[#F3F0EE] uppercase tracking-[0.04em]">
                      <Sparkles className="w-2.5 h-2.5" />
                      Équipé
                    </span>
                  )}

                  {/* Star badge */}
                  {item.star_level > 0 && (
                    <span className="absolute -top-2 -left-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#F37338] text-[9px] font-bold text-white">
                      {Array.from({ length: item.star_level }).map((_, i) => (
                        <Star key={i} className="w-2.5 h-2.5 fill-current" />
                      ))}
                    </span>
                  )}

                  {/* Emoji */}
                  <span className="text-3xl">{item.emoji}</span>

                  {/* Name */}
                  <p className="text-xs font-medium text-[#141413] leading-tight line-clamp-2">
                    {item.name}
                  </p>

                  {/* Rarity */}
                  <span className={`text-[10px] font-bold uppercase tracking-[0.04em] ${style.text}`}>
                    {RARITY_LABELS[item.rarity]}
                  </span>

                  {/* Quantity */}
                  {item.quantity > 1 && (
                    <span className="text-[10px] tabular-nums text-[#696969] bg-[#F3F0EE] rounded-full px-2 py-0.5">
                      x{item.quantity}
                    </span>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {canEquipTitle && (
                      <button
                        onClick={() => handleEquip(item.inventoryIds[0], "title")}
                        className={`text-[10px] font-medium px-2 py-1 rounded-full transition-colors ${
                          isEquippedTitle
                            ? "bg-[#141413] text-[#F3F0EE]"
                            : "bg-[#F3F0EE] text-[#696969] hover:bg-[#E8E4E0] hover:text-[#141413]"
                        }`}
                      >
                        {isEquippedTitle ? "Retirer" : "Titre"}
                      </button>
                    )}
                    {canEquipObject && (
                      <button
                        onClick={() => handleEquip(item.inventoryIds[0], "object")}
                        className={`text-[10px] font-medium px-2 py-1 rounded-full transition-colors ${
                          isEquippedObject
                            ? "bg-[#141413] text-[#F3F0EE]"
                            : "bg-[#F3F0EE] text-[#696969] hover:bg-[#E8E4E0] hover:text-[#141413]"
                        }`}
                      >
                        {isEquippedObject ? "Retirer" : "Objet"}
                      </button>
                    )}
                    {canFuse && (
                      <button
                        onClick={() => handleFuse(item.inventoryIds[0])}
                        disabled={fusingId === item.inventoryIds[0]}
                        className="text-[10px] font-medium px-2 py-1 rounded-full bg-[#F37338]/10 text-[#CF4500] hover:bg-[#F37338]/20 transition-colors disabled:opacity-50"
                      >
                        {fusingId === item.inventoryIds[0] ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <Swords className="w-3 h-3 inline mr-0.5" />
                            Fusionner
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}
      </div>

      {/* ─── Fusion result modal ─── */}
      <AnimatePresence>
        {fuseResult && (
          <motion.div
            key="fuse-overlay"
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-[#141413]/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFuseResult(null)}
            />
            <motion.div
              className="relative w-full max-w-xs rounded-[40px] border border-[#F37338]/30 halo-soft p-10 flex flex-col items-center text-center gap-5 bg-[#FCFBFA]"
              initial={{ scale: 0.5, opacity: 0, rotate: -5 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
            >
              <motion.div
                className="w-20 h-20 rounded-full bg-gradient-to-br from-[#F37338] to-[#9A3A0A] flex items-center justify-center"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <span className="text-4xl">⭐</span>
              </motion.div>
              <div className="space-y-2">
                <h3 className="text-lg font-medium tracking-[-0.02em] text-[#141413]">
                  Fusion réussie !
                </h3>
                <p className="text-sm text-[#696969]">
                  <span className="font-medium text-[#141413]">{fuseResult.name}</span>{" "}
                  passe au niveau{" "}
                  <span className="inline-flex items-center gap-0.5 text-[#F37338] font-bold">
                    {"★".repeat(fuseResult.stars)}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setFuseResult(null)}
                className="ink-pill w-full text-sm"
              >
                Continuer
              </button>
              <button
                onClick={() => setFuseResult(null)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center bg-[#F3F0EE] hover:bg-[#E8E4E0]"
                aria-label="Fermer"
              >
                <X className="w-4 h-4 text-[#696969]" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#CF4500] text-white px-6 py-3 rounded-full text-sm font-medium shadow-lg flex items-center gap-3">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="hover:opacity-80">×</button>
        </div>
      )}
    </div>
  );
}
