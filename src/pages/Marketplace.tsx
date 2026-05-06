import { useState, useEffect, useCallback, useMemo } from "react";
import { Loader2, Search, ShoppingCart, Tag, History, Plus, X, Star, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "@/lib/api";
import { useNotifications } from "@/context/NotificationContext";
import { Button } from "@/components/ui/button";
import type { PlayerType } from "@/types";

// ─── Types ───

interface Listing {
  id: number;
  seller_user_id: string;
  inventory_id: number;
  item_id: number;
  star_level: number;
  quantity: number;
  price: number;
  created_at: string;
  seller_name: string;
  item_name: string;
  item_rarity: string;
  item_emoji: string;
  item_category: string;
}

interface InventoryItem {
  id: number;
  item_id: number;
  quantity: number;
  star_level: number;
  name: string;
  category: string;
  rarity: string;
  base_value: number;
  emoji: string;
  description: string;
}

interface Transaction {
  id: number;
  buyer_user_id: string;
  seller_user_id: string;
  listing_id: number;
  item_id: number;
  star_level: number;
  quantity: number;
  price: number;
  created_at: string;
  item_name: string;
  item_emoji: string;
  item_rarity: string;
  buyer_name: string;
  seller_name: string;
}

interface MarketplacePageProps {
  player: PlayerType;
  onPlayerUpdate: (player: PlayerType) => void;
}

// ─── Constants ───

const RARITY_STYLES: Record<string, { border: string; bg: string; text: string }> = {
  unique:    { border: "border-yellow-400",   bg: "bg-yellow-400/10",   text: "text-yellow-400" },
  exotic:    { border: "border-red-500",      bg: "bg-red-500/10",      text: "text-red-500" },
  mythic:    { border: "border-fuchsia-500",  bg: "bg-fuchsia-500/10",  text: "text-fuchsia-500" },
  legendary: { border: "border-orange-500",   bg: "bg-orange-500/10",   text: "text-orange-500" },
  epic:      { border: "border-purple-500",   bg: "bg-purple-500/10",   text: "text-purple-500" },
  rare:      { border: "border-blue-500",     bg: "bg-blue-500/10",     text: "text-blue-500" },
  common:    { border: "border-gray-400",     bg: "bg-gray-400/10",     text: "text-gray-400" },
};

const RARITY_LABELS: Record<string, string> = {
  unique: "Unique", exotic: "Exotique", mythic: "Mythique",
  legendary: "Légendaire", epic: "Épique", rare: "Rare", common: "Commun",
};

const RARITY_ORDER = ["unique", "exotic", "mythic", "legendary", "epic", "rare", "common"];
const CATEGORIES = ["all", "people", "fruit", "title", "burger", "loto_ticket"];
const CATEGORY_LABELS: Record<string, string> = {
  all: "Tout", people: "Personnes", fruit: "Fruits", title: "Titres", burger: "Burgers", loto_ticket: "Tickets",
};

const TAB_KEYS = ["buy", "sell", "my_listings"] as const;
type TabKey = typeof TAB_KEYS[number];

const springBouncy = { type: "spring" as const, stiffness: 300, damping: 18 };
const springGentle = { type: "spring" as const, stiffness: 200, damping: 24 };

// ─── Component ───

export function Marketplace({ player, onPlayerUpdate }: MarketplacePageProps) {
  const { addNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState<TabKey>("buy");
  const [listings, setListings] = useState<Listing[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [rarityFilter, setRarityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Sell form
  const [sellItem, setSellItem] = useState<InventoryItem | null>(null);
  const [sellQuantity, setSellQuantity] = useState(1);
  const [sellPrice, setSellPrice] = useState(0);
  const [showSellForm, setShowSellForm] = useState(false);

  // Buy confirm
  const [buyListing, setBuyListing] = useState<Listing | null>(null);

  // Action loading
  const [acting, setActing] = useState(false);

  // ─── Load data ───

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [listingsData, invData, txData] = await Promise.all([
        api.shop.marketplace.listings(),
        api.shop.inventory(),
        api.shop.marketplace.transactions(),
      ]);

      const allListings = listingsData as Listing[];
      setListings(allListings);

      // My listings = listings where seller matches current player
      setMyListings(allListings.filter((l) => l.seller_user_id === player.user_id));

      setInventory(invData as InventoryItem[]);
      setTransactions(txData as unknown as Transaction[]);
    } catch (err) {
      console.error("[Marketplace] Erreur chargement:", err);
      setError("Impossible de charger le marketplace");
    } finally {
      setLoading(false);
    }
  }, [player.user_id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ─── Filter listings ───

  const filteredListings = useMemo(() => {
    return listings.filter((l) => {
      if (l.seller_user_id === player.user_id) return false; // hide own
      if (rarityFilter !== "all" && l.item_rarity !== rarityFilter) return false;
      if (categoryFilter !== "all" && l.item_category !== categoryFilter) return false;
      if (searchQuery && !l.item_name.toLowerCase().includes(searchQuery.toLowerCase()) && !l.seller_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [listings, player.user_id, rarityFilter, categoryFilter, searchQuery]);

  // ─── Sellable inventory ───

  const sellableInventory = useMemo(() => {
    return inventory.filter((i) => ["fruit", "burger", "people", "loto_ticket", "title"].includes(i.category));
  }, [inventory]);

  // ─── Actions ───

  async function handleBuy(listing: Listing) {
    setBuyListing(null);
    setActing(true);
    try {
      await api.shop.marketplace.buy(listing.id);
      const newPlayer = { ...player, nb_point: player.nb_point - listing.price };
      onPlayerUpdate(newPlayer);
      await loadAll();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'achat");
    } finally {
      setActing(false);
    }
  }

  async function handleSell() {
    if (!sellItem || sellQuantity < 1 || sellPrice < 1) return;
    setShowSellForm(false);
    setActing(true);
    try {
      await api.shop.marketplace.list(sellItem.id, sellQuantity, sellPrice);
      addNotification({
        type: "marketplace",
        title: "Article mis en vente",
        message: `${sellItem.emoji} ${sellItem.name} x${sellQuantity} mis en vente pour ${(sellPrice * sellQuantity).toLocaleString()} pts`,
        duration: 6000,
      });
      setSellItem(null);
      setSellQuantity(1);
      setSellPrice(0);
      await loadAll();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la mise en vente");
    } finally {
      setActing(false);
    }
  }

  async function handleCancel(listingId: number) {
    setActing(true);
    try {
      const listing = myListings.find((l) => l.id === listingId);
      await api.shop.marketplace.cancel(listingId);
      if (listing) {
        addNotification({
          type: "marketplace",
          title: "Annonce retiree",
          message: `${listing.item_emoji} ${listing.item_name} a ete retire de la vente`,
          duration: 5000,
        });
      }
      await loadAll();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'annulation");
    } finally {
      setActing(false);
    }
  }

  function openSellForm(item: InventoryItem) {
    setSellItem(item);
    setSellQuantity(Math.min(1, item.quantity));
    setSellPrice(item.base_value);
    setShowSellForm(true);
  }

  // ─── Format helpers ───

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#696969]" />
      </div>
    );
  }

  return (
    <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28">
      {/* ─── Header ─── */}
      <div className="space-y-4 mb-12 max-w-2xl">
        <span className="eyebrow">Marketplace</span>
        <h1 className="text-5xl md:text-6xl font-medium tracking-[-0.03em] text-[#141413] leading-[1.02]">
          Achetez &
          <br />
          <span className="text-[#3860BE]">Vendez.</span>
        </h1>
        <p className="text-[#555555] text-base md:text-lg max-w-md leading-relaxed">
          Échangez vos objets avec les autres joueurs. Achetez ce qui vous manque, vendez vos doublons.
        </p>
      </div>

      <div aria-hidden className="ghost-headline absolute top-0 right-0 text-[120px] md:text-[200px] hidden md:block select-none">
        trade.
      </div>

      {/* Points */}
      <div className="mb-10 flex items-center gap-3">
        <span className="text-sm text-[#696969] font-medium">Vos points :</span>
        <motion.span
          key={player.nb_point}
          initial={{ scale: 1.1, color: "#9A3A0A" }}
          animate={{ scale: 1, color: "#141413" }}
          className="text-lg font-semibold tabular-nums tracking-[-0.02em]"
        >
          {player.nb_point.toLocaleString()} pts
        </motion.span>
      </div>

      {/* ─── Tabs ─── */}
      <div className="flex gap-2 mb-8">
        {TAB_KEYS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-[#141413] text-[#F3F0EE]"
                : "bg-[#F3F0EE] text-[#696969] hover:bg-[#E8E4E0] hover:text-[#141413]"
            }`}
          >
            {tab === "buy" && <ShoppingCart className="w-4 h-4" />}
            {tab === "sell" && <Tag className="w-4 h-4" />}
            {tab === "my_listings" && <ArrowUpRight className="w-4 h-4" />}
            {tab === "buy" ? "Acheter" : tab === "sell" ? "Vendre" : "Mes annonces"}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════ BUY ═══════════════════════════════ */}
      {activeTab === "buy" && (
        <section className="space-y-6">
          {/* Filters */}
          <div className="bg-[#FCFBFA] border border-[#D1CDC7] rounded-[40px] p-6 halo-soft space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D1CDC7]" />
                <input
                  type="text"
                  placeholder="Rechercher un objet ou un vendeur..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-full border border-[#D1CDC7] bg-white text-sm text-[#141413] placeholder-[#D1CDC7] focus:outline-none focus:border-[#141413]"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#696969] self-center mr-1">Rareté</span>
              {["all", ...RARITY_ORDER].map((r) => (
                <button
                  key={r}
                  onClick={() => setRarityFilter(r)}
                  className={`text-[10px] font-bold uppercase tracking-[0.04em] px-2.5 py-1 rounded-full transition-colors ${
                    rarityFilter === r
                      ? r === "all"
                        ? "bg-[#141413] text-[#F3F0EE]"
                        : `${RARITY_STYLES[r]?.bg || "bg-gray-100"} ${RARITY_STYLES[r]?.text || "text-gray-500"} border ${RARITY_STYLES[r]?.border || "border-gray-300"}`
                      : "bg-[#F3F0EE] text-[#696969]"
                  }`}
                >
                  {r === "all" ? "Toutes" : RARITY_LABELS[r]}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#696969] self-center mr-1">Type</span>
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  className={`text-[10px] font-bold uppercase tracking-[0.04em] px-2.5 py-1 rounded-full transition-colors ${
                    categoryFilter === c
                      ? "bg-[#141413] text-[#F3F0EE]"
                      : "bg-[#F3F0EE] text-[#696969]"
                  }`}
                >
                  {CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          </div>

          {/* Listings grid */}
          {filteredListings.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <span className="text-5xl">📭</span>
              <p className="text-[#696969] font-medium">Aucune annonce trouvée</p>
              <p className="text-sm text-[#D1CDC7]">Modifiez vos filtres ou revenez plus tard</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredListings.map((listing) => {
                const style = RARITY_STYLES[listing.item_rarity] || RARITY_STYLES.common;
                const canAfford = player.nb_point >= listing.price;

                return (
                  <motion.div
                    key={listing.id}
                    className={`relative bg-white rounded-[16px] border-2 p-3 flex flex-col items-center text-center gap-1.5 ${style.border}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={springGentle}
                  >
                    {listing.star_level > 0 && (
                      <span className="absolute -top-2 -left-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#F37338] text-[9px] font-bold text-white">
                        {Array.from({ length: listing.star_level }).map((_, i) => (
                          <Star key={i} className="w-2.5 h-2.5 fill-current" />
                        ))}
                      </span>
                    )}

                    <span className="text-3xl">{listing.item_emoji}</span>
                    <p className="text-xs font-medium text-[#141413] leading-tight line-clamp-1">
                      {listing.item_name}
                    </p>
                    <span className={`text-[10px] font-bold uppercase tracking-[0.04em] ${style.text}`}>
                      {RARITY_LABELS[listing.item_rarity]}
                    </span>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[#696969]">{listing.seller_name}</span>
                    </div>

                    <span className="text-sm font-semibold text-[#141413] tabular-nums tracking-[-0.02em]">
                      {listing.price.toLocaleString()} pts
                    </span>

                    {listing.quantity > 1 && (
                      <span className="text-[10px] text-[#696969]">x{listing.quantity}</span>
                    )}

                    <button
                      onClick={() => canAfford && setBuyListing(listing)}
                      disabled={!canAfford || acting}
                      className={`mt-1 text-[10px] font-bold uppercase tracking-[0.04em] px-4 py-1.5 rounded-full w-full transition-colors ${
                        canAfford
                          ? "bg-[#141413] text-[#F3F0EE] hover:bg-[#262627]"
                          : "bg-[#E8E4E0] text-[#D1CDC7] cursor-not-allowed"
                      }`}
                    >
                      {acting ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : "Acheter"}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ═══════════════════════════════ SELL ═══════════════════════════════ */}
      {activeTab === "sell" && (
        <section className="space-y-4">
          {sellableInventory.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <span className="text-5xl">📦</span>
              <p className="text-[#696969] font-medium">Rien à vendre</p>
              <p className="text-sm text-[#D1CDC7]">Ouvrez des box dans le shop pour obtenir des objets</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {sellableInventory.map((item) => {
                const style = RARITY_STYLES[item.rarity] || RARITY_STYLES.common;
                return (
                  <motion.div
                    key={item.id}
                    className={`relative bg-white rounded-[16px] border-2 p-3 flex flex-col items-center text-center gap-1.5 ${style.border}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={springGentle}
                  >
                    {item.star_level > 0 && (
                      <span className="absolute -top-2 -left-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#F37338] text-[9px] font-bold text-white">
                        {Array.from({ length: item.star_level }).map((_, i) => (
                          <Star key={i} className="w-2.5 h-2.5 fill-current" />
                        ))}
                      </span>
                    )}

                    <span className="text-3xl">{item.emoji}</span>
                    <p className="text-xs font-medium text-[#141413] leading-tight line-clamp-1">{item.name}</p>
                    <span className={`text-[10px] font-bold uppercase tracking-[0.04em] ${style.text}`}>{RARITY_LABELS[item.rarity]}</span>
                    <span className="text-[10px] tabular-nums text-[#696969]">x{item.quantity} · {item.base_value.toLocaleString()} pts</span>

                    <button
                      onClick={() => openSellForm(item)}
                      disabled={acting}
                      className="mt-1 text-[10px] font-bold uppercase tracking-[0.04em] px-4 py-1.5 rounded-full w-full bg-[#3860BE] text-white hover:bg-[#3860BE]/90 transition-colors disabled:opacity-50"
                    >
                      <Plus className="w-3 h-3 inline mr-1" />
                      Vendre
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ════════════════════════ MY LISTINGS ════════════════════════ */}
      {activeTab === "my_listings" && (
        <section className="space-y-6">
          {myListings.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <span className="text-5xl">🏷️</span>
              <p className="text-[#696969] font-medium">Aucune annonce en cours</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {myListings.map((listing) => {
                const style = RARITY_STYLES[listing.item_rarity] || RARITY_STYLES.common;
                return (
                  <motion.div
                    key={listing.id}
                    className={`relative bg-white rounded-[16px] border-2 p-3 flex flex-col items-center text-center gap-1.5 ${style.border}`}
                  >
                    {listing.star_level > 0 && (
                      <span className="absolute -top-2 -left-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#F37338] text-[9px] font-bold text-white">
                        {Array.from({ length: listing.star_level }).map((_, i) => (
                          <Star key={i} className="w-2.5 h-2.5 fill-current" />
                        ))}
                      </span>
                    )}

                    <span className="text-3xl">{listing.item_emoji}</span>
                    <p className="text-xs font-medium text-[#141413] line-clamp-1">{listing.item_name}</p>
                    <span className={`text-[10px] font-bold uppercase tracking-[0.04em] ${style.text}`}>{RARITY_LABELS[listing.item_rarity]}</span>
                    <span className="text-sm font-semibold text-[#141413] tabular-nums">{listing.price.toLocaleString()} pts</span>
                    {listing.quantity > 1 && <span className="text-[10px] text-[#696969]">x{listing.quantity}</span>}

                    <button
                      onClick={() => handleCancel(listing.id)}
                      disabled={acting}
                      className="mt-1 text-[10px] font-bold uppercase tracking-[0.04em] px-4 py-1.5 rounded-full w-full bg-[#CF4500]/10 text-[#CF4500] hover:bg-[#CF4500]/20 transition-colors disabled:opacity-50"
                    >
                      {acting ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : "Annuler"}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ═══════════════════════════════ Transactions history ═══════════════════════════════ */}
      <section className="mt-16 pt-16 border-t border-[#D1CDC7]">
        <div className="flex items-center gap-3 mb-6">
          <History className="w-5 h-5 text-[#696969]" />
          <h2 className="text-xl font-medium tracking-[-0.02em] text-[#141413]">Historique des transactions</h2>
        </div>

        {transactions.length === 0 ? (
          <p className="text-sm text-[#D1CDC7]">Aucune transaction pour le moment.</p>
        ) : (
          <div className="bg-[#FCFBFA] border border-[#D1CDC7] rounded-[40px] overflow-hidden halo-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#D1CDC7]">
                    <th className="text-left px-6 py-4 text-[11px] font-bold uppercase tracking-[0.06em] text-[#696969]">Objet</th>
                    <th className="text-left px-6 py-4 text-[11px] font-bold uppercase tracking-[0.06em] text-[#696969]">Type</th>
                    <th className="text-right px-6 py-4 text-[11px] font-bold uppercase tracking-[0.06em] text-[#696969]">Prix</th>
                    <th className="text-right px-6 py-4 text-[11px] font-bold uppercase tracking-[0.06em] text-[#696969] hidden sm:table-cell">Qté</th>
                    <th className="text-right px-6 py-4 text-[11px] font-bold uppercase tracking-[0.06em] text-[#696969] hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const isBuyer = tx.buyer_user_id === player.user_id;
                    const otherParty = isBuyer ? tx.seller_name : tx.buyer_name;
                    const style = RARITY_STYLES[tx.item_rarity] || RARITY_STYLES.common;

                    return (
                      <tr key={tx.id} className="border-b border-[#D1CDC7]/50 last:border-b-0 hover:bg-[#F3F0EE]/50 transition-colors">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{tx.item_emoji}</span>
                            <div className="min-w-0">
                              <p className="font-medium text-[#141413] truncate max-w-[140px]">{tx.item_name}</p>
                              <span className={`text-[10px] font-bold uppercase tracking-[0.04em] ${style.text}`}>{RARITY_LABELS[tx.item_rarity]}</span>
                              {tx.star_level > 0 && (
                                <span className="text-[10px] text-[#F37338] ml-1">
                                  {"★".repeat(tx.star_level)}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`text-xs font-medium ${isBuyer ? "text-[#CF4500]" : "text-green-600"}`}>
                            {isBuyer ? "Acheté à" : "Vendu à"} {otherParty}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right tabular-nums font-medium text-[#141413]">
                          {tx.price.toLocaleString()} pts
                        </td>
                        <td className="px-6 py-3 text-right tabular-nums text-[#696969] hidden sm:table-cell">
                          x{tx.quantity}
                        </td>
                        <td className="px-6 py-3 text-right text-[#696969] hidden md:table-cell">
                          {formatDate(tx.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ═══════════════════════════════ Buy confirm modal ═══════════════════════════════ */}
      <AnimatePresence>
        {buyListing && (
          <motion.div
            key="buy-confirm-overlay"
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
              onClick={() => setBuyListing(null)}
            />
            <motion.div
              key="buy-confirm-card"
              className="relative w-full max-w-sm rounded-[40px] border border-[#D1CDC7] halo-soft p-8 flex flex-col items-center text-center gap-5 bg-[#FCFBFA]"
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              transition={springBouncy}
            >
              <span className="text-5xl">{buyListing.item_emoji}</span>
              <div className="space-y-1">
                <h3 className="text-xl font-medium tracking-[-0.02em] text-[#141413]">
                  {buyListing.item_name}
                </h3>
                <p className="text-sm text-[#696969]">
                  Vendu par <span className="font-medium text-[#141413]">{buyListing.seller_name}</span>
                </p>
              </div>
              <div className="space-y-2 w-full">
                <div className="flex justify-between text-sm">
                  <span className="text-[#696969]">Prix unitaire</span>
                  <span className="font-semibold text-[#141413] tabular-nums">{buyListing.price.toLocaleString()} pts</span>
                </div>
                {buyListing.quantity > 1 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#696969]">Quantité</span>
                    <span className="font-medium text-[#141413]">x{buyListing.quantity}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-2 border-t border-[#D1CDC7]">
                  <span className="text-[#696969]">Total</span>
                  <span className="font-semibold text-[#141413] tabular-nums">{(buyListing.price * buyListing.quantity).toLocaleString()} pts</span>
                </div>
              </div>
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  className="flex-1 rounded-full"
                  onClick={() => setBuyListing(null)}
                >
                  Annuler
                </Button>
                <Button
                  className="ink-pill flex-1"
                  onClick={() => handleBuy(buyListing)}
                  disabled={acting}
                >
                  {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmer l'achat"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════ Sell form modal ═══════════════════════════════ */}
      <AnimatePresence>
        {showSellForm && sellItem && (
          <motion.div
            key="sell-form-overlay"
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
              onClick={() => setShowSellForm(false)}
            />
            <motion.div
              key="sell-form-card"
              className="relative w-full max-w-sm rounded-[40px] border border-[#D1CDC7] halo-soft p-8 flex flex-col items-center text-center gap-5 bg-[#FCFBFA]"
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              transition={springBouncy}
            >
              <span className="text-5xl">{sellItem.emoji}</span>
              <h3 className="text-lg font-medium tracking-[-0.02em] text-[#141413]">
                Vendre {sellItem.name}
              </h3>

              <div className="space-y-3 w-full">
                <div className="text-left space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#696969]">Quantité (max {sellItem.quantity})</label>
                  <input
                    type="number"
                    min={1}
                    max={sellItem.quantity}
                    value={sellQuantity}
                    onChange={(e) => setSellQuantity(Math.min(Math.max(1, parseInt(e.target.value) || 1), sellItem.quantity))}
                    className="w-full px-4 py-2.5 rounded-full border border-[#D1CDC7] bg-white text-sm text-[#141413] focus:outline-none focus:border-[#141413]"
                  />
                </div>

                <div className="text-left space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#696969]">Prix unitaire (pts)</label>
                  <input
                    type="number"
                    min={1}
                    value={sellPrice}
                    onChange={(e) => setSellPrice(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-4 py-2.5 rounded-full border border-[#D1CDC7] bg-white text-sm text-[#141413] focus:outline-none focus:border-[#141413]"
                  />
                </div>

                <p className="text-xs text-[#696969]">
                  Total : {(sellPrice * sellQuantity).toLocaleString()} pts
                </p>
              </div>

              <div className="flex gap-3 w-full">
                <Button variant="outline" className="flex-1 rounded-full" onClick={() => setShowSellForm(false)}>
                  Annuler
                </Button>
                <Button
                  className="flex-1 rounded-full bg-[#3860BE] hover:bg-[#3860BE]/90 text-white"
                  onClick={handleSell}
                  disabled={acting || sellQuantity < 1 || sellPrice < 1}
                >
                  {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Mettre en vente"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Error toast ─── */}
      <AnimatePresence>
        {error && (
          <motion.div
            key="error-toast"
            className="fixed bottom-8 left-1/2 z-50 bg-[#CF4500] text-white px-6 py-3 rounded-full text-sm font-medium shadow-lg flex items-center gap-3"
            style={{ x: "-50%" }}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={springGentle}
          >
            <span>{error}</span>
            <button onClick={() => setError(null)} className="hover:opacity-80">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
