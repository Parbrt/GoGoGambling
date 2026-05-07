import { useState, useEffect, useCallback } from "react";
import { ArrowUpRight, Loader2, Sparkles, Star, X, Gift, BarChart3, Clock, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "@/lib/api";
import { cacheGet, cacheHas } from "@/lib/cache";
import { Button } from "@/components/ui/button";
import { getStyleDef, RARITY_HEX } from "@/lib/displayStyles";
import type { PlayerType } from "@/types";

// ─── Types ───

interface BoxInfo {
  key: string;
  name: string;
  cost: number;
  emoji: string;
  description: string;
  probabilities: Record<string, number>;
}

interface BoxResult {
  item: {
    id: number;
    name: string;
    category: string;
    rarity: string;
    base_value: number;
    emoji: string;
    description: string;
    qualifyable: number;
  };
  rolledRarity: string;
  rarityColor: string;
  player: PlayerType;
  displayStyle: string;
}

const DISPLAY_STYLE_LABELS: Record<string, string> = {
  default: "Normal",
  bold: "Gras",
  italic: "Italique",
  bold_italic: "Gras + Italique",
  underline: "Souligné",
  strikethrough: "Barré",
  tinted: "Teinté",
  tinted_bold: "Teinté + Gras",
  glow: "Brillant",
  glow_bold: "Brillant + Gras",
  solid: "Plein",
  solid_italic: "Plein + Italique",
  outlined: "Contour",
  gradient: "Dégradé",
  rainbow: "Arc-en-ciel",
};

interface ShopPageProps {
  player: PlayerType;
  onPlayerUpdate: (player: PlayerType) => void;
}

// ─── Constants ───

const RARITY_BARS: Record<string, string> = {
  unique: "bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500",
  exotic: "bg-gradient-to-r from-red-400 to-red-600",
  mythic: "bg-gradient-to-r from-fuchsia-400 to-fuchsia-600",
  legendary: "bg-gradient-to-r from-orange-400 to-orange-600",
  epic: "bg-gradient-to-r from-purple-400 to-purple-600",
  rare: "bg-gradient-to-r from-blue-400 to-blue-600",
  common: "bg-gradient-to-r from-gray-300 to-gray-500",
};

const RARITY_LABELS: Record<string, string> = {
  unique: "Unique", exotic: "Exotique", mythic: "Mythique",
  legendary: "Légendaire", epic: "Épique", rare: "Rare", common: "Commun",
};

const RARITY_ORDER = ["unique", "exotic", "mythic", "legendary", "epic", "rare", "common"];

const RARITY_CARD_STYLES: Record<string, { border: string; text: string; iconBg: string }> = {
  unique:    { border: "border-yellow-400",   text: "text-yellow-400",   iconBg: "from-yellow-400 to-amber-500" },
  exotic:    { border: "border-red-500",      text: "text-red-500",      iconBg: "from-red-400 to-red-600" },
  mythic:    { border: "border-fuchsia-500",  text: "text-fuchsia-500",  iconBg: "from-fuchsia-400 to-fuchsia-600" },
  legendary: { border: "border-orange-500",   text: "text-orange-500",   iconBg: "from-orange-400 to-orange-600" },
  epic:      { border: "border-purple-500",   text: "text-purple-500",   iconBg: "from-purple-400 to-purple-600" },
  rare:      { border: "border-blue-500",     text: "text-blue-500",     iconBg: "from-blue-400 to-blue-600" },
  common:    { border: "border-gray-400",     text: "text-gray-400",     iconBg: "from-gray-400 to-gray-500" },
};

const RARITY_FLASH_COLORS: Record<string, string> = {
  unique: "#FFD700", exotic: "#FF4444", mythic: "#E879F9",
  legendary: "#FB923C", epic: "#C084FC", rare: "#60A5FA", common: "#F8F8F8",
};

const RARITY_OVERLAY_TINT: Record<string, string> = {
  unique: "rgba(255,215,0,0.08)", exotic: "rgba(248,113,113,0.08)", mythic: "rgba(232,121,249,0.09)",
  legendary: "rgba(251,146,60,0.08)", epic: "rgba(192,132,252,0.09)", rare: "rgba(96,165,250,0.08)",
  common: "rgba(0,0,0,0)",
};

const RARITY_PARTICLE_COLORS: Record<string, string[]> = {
  unique:    ["#FFD700", "#FFC107", "#FBBF24", "#FF6B00", "#FF4444", "#FFE566"],
  exotic:    ["#FF4444", "#EF4444", "#DC2626", "#FF6B6B", "#FF8C8C"],
  mythic:    ["#E879F9", "#D946EF", "#A21CAF", "#F0ABFC", "#C084FC"],
  legendary: ["#FB923C", "#F97316", "#FFD700", "#CF4500", "#FF8C00"],
  epic:      ["#C084FC", "#A855F7", "#7C3AED", "#E879F9", "#9333EA"],
  rare:      ["#3860BE", "#60A5FA", "#93BBFF", "#2244AA", "#4080FF"],
  common:    ["#D1CDC7", "#9A9A9A", "#BCBCBC"],
};

const RARITY_PARTICLE_COUNT: Record<string, number> = {
  unique: 90, exotic: 65, mythic: 72, legendary: 55, epic: 44, rare: 28, common: 10,
};

const RARITY_CARD_INITIAL: Record<string, Record<string, number>> = {
  common:    { scale: 0.85, opacity: 0 },
  rare:      { scale: 0.72, y: 32, opacity: 0 },
  epic:      { scale: 0.6, rotate: -8, opacity: 0 },
  legendary: { scale: 0.45, rotate: 12, opacity: 0 },
  mythic:    { scale: 0.3, rotate: -16, opacity: 0 },
  exotic:    { scale: 0.3, y: -40, rotate: 8, opacity: 0 },
  unique:    { scale: 0.1, opacity: 0 },
};

const RARITY_CARD_SPRING: Record<string, Record<string, unknown>> = {
  common:    { type: "spring", stiffness: 280, damping: 24 },
  rare:      { type: "spring", stiffness: 300, damping: 20 },
  epic:      { type: "spring", stiffness: 320, damping: 18 },
  legendary: { type: "spring", stiffness: 340, damping: 16 },
  mythic:    { type: "spring", stiffness: 360, damping: 14 },
  exotic:    { type: "spring", stiffness: 350, damping: 15 },
  unique:    { type: "spring", stiffness: 190, damping: 12 },
};

const BOX_GRADIENTS: Record<string, string> = {
  GAMBLINGBOX: "linear-gradient(135deg, #FFD700 0%, #CF4500 100%)",
  GOGOBOX: "linear-gradient(135deg, #F37338 0%, #9A3A0A 100%)",
  XBOX: "linear-gradient(135deg, #3860BE 0%, #141413 100%)",
};

interface CollectionStats {
  categories: Array<{ key: string; label: string; emoji: string; owned: number; total: number }>;
  uniqueGlobal: { owned: number; total: number };
}

const CATEGORY_COLORS: Record<string, { icon: string; bar: string }> = {
  fruit:  { icon: "from-orange-400 to-orange-600", bar: "from-orange-400 to-orange-600" },
  burger: { icon: "from-purple-400 to-purple-600", bar: "from-purple-400 to-purple-600" },
  title:  { icon: "from-blue-400 to-indigo-600",   bar: "from-blue-400 to-indigo-600" },
  people: { icon: "from-yellow-300 to-amber-500",  bar: "from-yellow-300 to-amber-500" },
};

// ─── Spring configs ───

const springBouncy = { type: "spring" as const, stiffness: 300, damping: 18 };
const springGentle = { type: "spring" as const, stiffness: 200, damping: 24 };

// ─── Confetti particles ───

function spawnParticles(rarity = "common"): Array<{ x: number; y: number; color: string; size: number; delay: number; duration: number; rotation: number }> {
  const count = RARITY_PARTICLE_COUNT[rarity] ?? 20;
  const colors = RARITY_PARTICLE_COLORS[rarity] ?? RARITY_PARTICLE_COLORS.common;
  const spread = rarity === "unique" ? 420 : ["exotic", "mythic", "legendary"].includes(rarity) ? 340 : 270;
  return Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * spread,
    y: (Math.random() - 0.5) * spread - 60,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 4 + Math.random() * (rarity === "unique" ? 12 : 7),
    delay: Math.random() * (rarity === "unique" ? 0.5 : 0.28),
    duration: 0.8 + Math.random() * (rarity === "unique" ? 0.9 : 0.55),
    rotation: Math.random() * 720 - 360,
  }));
}

// ─── Component ───

export function Shop({ player, onPlayerUpdate }: ShopPageProps) {
  const [boxes, setBoxes] = useState<BoxInfo[]>(() => {
    const cached = cacheGet<{ boxes: BoxInfo[] }>("/api/shop/boxes");
    return cached?.boxes ?? [];
  });
  const [loading, setLoading] = useState(() => !cacheHas("/api/shop/boxes"));
  const [opening, setOpening] = useState(false);
  const [openingBoxKey, setOpeningBoxKey] = useState<string | null>(null);
  const [showShake, setShowShake] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [result, setResult] = useState<BoxResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);
  const [particles, setParticles] = useState<ReturnType<typeof spawnParticles>>([]);
  const [revealRarity, setRevealRarity] = useState<string | null>(null);

  // Phase 8: Pity system (localStorage)
  const [pityCounter, setPityCounter] = useState(() => {
    try { return parseInt(localStorage.getItem("ggg_pity") || "0", 10); } catch { return 0; }
  });
  const PITY_THRESHOLD = 60;
  const isPityActive = pityCounter >= PITY_THRESHOLD;

  const [collectionStats, setCollectionStats] = useState<CollectionStats | null>(null);
  const [boxHistory, setBoxHistory] = useState<Array<{ name: string; emoji: string; rarity: string; acquired_at: string }>>([]);
  const [freeBoxAvailable, setFreeBoxAvailable] = useState(false);
  const [freeBoxLoading, setFreeBoxLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [dailyDeals, setDailyDeals] = useState<Array<{
    id: number; slot: number; price: number;
    name: string; category: string; rarity: string; emoji: string; description: string;
    purchased: boolean;
  }>>([]);
  const [nextDealRefreshMs, setNextDealRefreshMs] = useState(0);
  const [dealLoading, setDealLoading] = useState<number | null>(null);


  useEffect(() => {
    api.shop.boxes()
      .then((data) => setBoxes(data.boxes))
      .catch(console.error)
      .finally(() => setLoading(false));

    // Load collection stats
    api.shop.collectionStats()
      .then((stats) => setCollectionStats(stats))
      .catch(() => {});

    // Load box history
    api.shop.boxHistory()
      .then((h) => setBoxHistory(h as Array<{ name: string; emoji: string; rarity: string; acquired_at: string }>))
      .catch(() => {});

    // Check free box availability
    checkFreeBox(player);

    // Load daily deals
    api.shop.dailyDeals()
      .then((data) => {
        setDailyDeals(data.deals);
        setNextDealRefreshMs(data.nextRefreshMs);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Open box with animation sequence ───

  const handleOpen = useCallback(async (boxType: string) => {
    setShowConfirm(null);
    setOpening(true);
    setOpeningBoxKey(boxType);
    setShowShake(true);
    setShowFlash(false);
    setResult(null);
    setParticles([]);
    setError(null);
    setRevealRarity(null);

    // API call starts immediately, shake runs in parallel (min 1400ms)
    const minShake = new Promise<void>((r) => setTimeout(r, 1400));
    const apiPromise = api.shop.openBox(boxType);

    try {
      const [, data] = await Promise.all([minShake, apiPromise]);

      setShowShake(false);
      setRevealRarity(data.rolledRarity);
      await new Promise((r) => setTimeout(r, 80));

      // Rarity-colored flash
      setShowFlash(true);
      await new Promise((r) => setTimeout(r, 340));
      setShowFlash(false);
      await new Promise((r) => setTimeout(r, 80));

      // Reveal
      setResult(data);
      setParticles(spawnParticles(data.rolledRarity));
      onPlayerUpdate(data.player);

      const isRare = ["unique", "exotic", "mythic", "legendary"].includes(data.rolledRarity);
      if (isRare) {
        setPityCounter(0);
        localStorage.setItem("ggg_pity", "0");
      } else {
        const next = pityCounter + 1;
        setPityCounter(next);
        localStorage.setItem("ggg_pity", String(next));
      }

      api.shop.collectionStats()
        .then((stats) => setCollectionStats(stats))
        .catch(() => {});
      api.shop.boxHistory()
        .then((h) => setBoxHistory(h as Array<{ name: string; emoji: string; rarity: string; acquired_at: string }>))
        .catch(() => {});
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'ouverture");
      setOpening(false);
      setOpeningBoxKey(null);
      setShowShake(false);
      setRevealRarity(null);
    }
  }, [onPlayerUpdate, pityCounter]);

  // ─── Check free box ───

  function checkFreeBox(p: PlayerType) {
    const now = new Date();
    const todayAt9 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0);
    const lastFree = p.last_daily_free_box ? new Date(p.last_daily_free_box) : null;
    setFreeBoxAvailable(!lastFree || lastFree < todayAt9);
  }

  // ─── Daily free box ───

  async function handleFreeBox() {
    setFreeBoxLoading(true);
    setOpening(true);
    setOpeningBoxKey("XBOX");
    setShowShake(true);
    setShowFlash(false);
    setResult(null);
    setParticles([]);
    setError(null);
    setRevealRarity(null);

    const minShake = new Promise<void>((r) => setTimeout(r, 1400));
    const apiPromise = api.shop.dailyFreeBox();

    try {
      const [, data] = await Promise.all([minShake, apiPromise]);

      setShowShake(false);
      setRevealRarity(data.rolledRarity);
      await new Promise((r) => setTimeout(r, 80));

      setShowFlash(true);
      await new Promise((r) => setTimeout(r, 340));
      setShowFlash(false);
      await new Promise((r) => setTimeout(r, 80));

      const boxResult: BoxResult = {
        item: data.item as BoxResult["item"],
        rolledRarity: data.rolledRarity,
        rarityColor: data.rarityColor,
        player: data.player,
        displayStyle: data.displayStyle,
      };
      setResult(boxResult);
      setParticles(spawnParticles(data.rolledRarity));
      onPlayerUpdate(data.player);
      setFreeBoxAvailable(false);
      api.shop.collectionStats()
        .then((stats) => setCollectionStats(stats))
        .catch(() => {});
      api.shop.boxHistory()
        .then((h) => setBoxHistory(h as Array<{ name: string; emoji: string; rarity: string; acquired_at: string }>))
        .catch(() => {});
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur box gratuite");
      setOpening(false);
      setOpeningBoxKey(null);
      setShowShake(false);
      setRevealRarity(null);
    } finally {
      setFreeBoxLoading(false);
    }
  }

  // ─── Dismiss result ───

  const dismissResult = useCallback(() => {
    setResult(null);
    setOpening(false);
    setOpeningBoxKey(null);
    setParticles([]);
    setRevealRarity(null);
  }, []);

  // ─── Buy daily deal ───

  async function handleBuyDeal(dealId: number) {
    setDealLoading(dealId);
    try {
      const data = await api.shop.buyDailyDeal(dealId);
      onPlayerUpdate(data.player);
      setDailyDeals((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, purchased: true } : d))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'achat");
    } finally {
      setDealLoading(null);
    }
  }

  // ─── Loading state ───

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <Loader2 className="h-8 w-8 text-[#696969]" />
        </motion.div>
      </div>
    );
  }

  const openingBox = boxes.find((b) => b.key === openingBoxKey);

  return (
    <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28">
      {/* ─── Header ─── */}
      <div className="space-y-4 mb-16 max-w-2xl">
        <span className="eyebrow">Shop</span>
        <h1 className="text-5xl md:text-6xl font-medium tracking-[-0.03em] text-[#141413] leading-[1.02]">
          Ouvrez des
          <br />
          <span className="text-[#9A3A0A]">loot boxs.</span>
        </h1>
        <p className="text-[#555555] text-base md:text-lg max-w-md leading-relaxed">
          Dépensez vos points pour tenter d&apos;obtenir des objets rares, des titres de prestige et bien plus.
        </p>
      </div>

      {/* Ghost watermark */}
      <div aria-hidden className="ghost-headline absolute top-0 right-0 text-[120px] md:text-[200px] hidden md:block select-none">
        loot.
      </div>

      {/* Points */}
      <div className="mb-12 flex items-center gap-3">
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

      {/* ─── Free box + pity + collection row ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
        {/* Free daily box */}
        <div className="bg-[#FCFBFA] border border-[#D1CDC7] rounded-[24px] p-5 flex items-center gap-4 halo-soft">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 ${
            freeBoxAvailable
              ? "bg-gradient-to-br from-[#3860BE] to-[#141413]"
              : "bg-[#E8E4E0]"
          }`}>
            <Gift className={`w-6 h-6 ${freeBoxAvailable ? "text-white" : "text-[#D1CDC7]"}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#141413]">Box gratuite</p>
            {freeBoxAvailable ? (
              <button
                onClick={handleFreeBox}
                disabled={freeBoxLoading}
                className="text-xs font-bold text-[#3860BE] hover:text-[#3860BE]/80 transition-colors"
              >
                {freeBoxLoading ? (
                  <span className="inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Ouverture...</span>
                ) : (
                  "1 XBOX disponible !"
                )}
              </button>
            ) : (
              <p className="text-xs text-[#D1CDC7]">Déjà réclamée</p>
            )}
          </div>
        </div>

        {/* Pity counter */}
        <div className="bg-[#FCFBFA] border border-[#D1CDC7] rounded-[24px] p-5 flex items-center gap-4 halo-soft">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 ${
            isPityActive ? "bg-gradient-to-br from-yellow-400 to-[#CF4500]" : "bg-[#F3F0EE]"
          }`}>
            <BarChart3 className={`w-6 h-6 ${isPityActive ? "text-white" : "text-[#696969]"}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#141413]">Pitié</p>
            <p className={`text-xs tabular-nums ${isPityActive ? "text-[#CF4500] font-bold" : "text-[#696969]"}`}>
              {pityCounter} / {PITY_THRESHOLD} boxs
              {isPityActive && <span className="ml-1">🔥 Boost actif !</span>}
            </p>
            <div className="mt-1 h-1 bg-[#E8E4E0] rounded-full overflow-hidden w-20">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isPityActive ? "bg-gradient-to-r from-yellow-400 to-[#CF4500]" : "bg-[#696969]"
                }`}
                style={{ width: `${Math.min(100, (pityCounter / PITY_THRESHOLD) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Collection totale */}
        <div className="bg-[#FCFBFA] border border-[#D1CDC7] rounded-[24px] p-5 flex items-center gap-4 halo-soft">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-xl shrink-0">
            <span className="text-white text-lg">🏆</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#141413]">Collection</p>
            {collectionStats ? (() => {
              const totalOwned = collectionStats.categories.reduce((s, c) => s + c.owned, 0);
              const totalItems = collectionStats.categories.reduce((s, c) => s + c.total, 0);
              const pct = totalItems > 0 ? (totalOwned / totalItems) * 100 : 0;
              return (
                <>
                  <p className="text-xs tabular-nums text-[#696969]">
                    {totalOwned} / {totalItems} types
                    {totalOwned >= totalItems && totalItems > 0 && <span className="ml-1 text-[#F37338] font-bold">Complète !</span>}
                  </p>
                  <div className="mt-1 h-1 bg-[#E8E4E0] rounded-full overflow-hidden w-20">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </>
              );
            })() : <p className="text-xs text-[#D1CDC7]">Chargement...</p>}
          </div>
        </div>
      </div>

      {/* ─── Box cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-16 mb-24">
        {boxes.map((box, i) => {
          const canAfford = player.nb_point >= box.cost;

          return (
            <motion.div
              key={box.key}
              className={`group relative ${i === 1 ? "md:translate-y-6" : ""}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...springGentle, delay: i * 0.1 }}
            >
              {/* Circular portrait */}
              <motion.div
                className="relative mx-auto max-w-[260px]"
                whileHover={{ scale: 1.02 }}
              >
                <div className="portrait-circle w-full">
                  <motion.div
                    className="absolute inset-0"
                    style={{ background: BOX_GRADIENTS[box.key] }}
                    whileHover={{ scale: 1.04 }}
                    transition={{ type: "spring", stiffness: 150, damping: 20 }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.span
                      className="text-[80px] drop-shadow-sm select-none"
                      whileHover={{ scale: 1.1, rotate: -3 }}
                      transition={springGentle}
                    >
                      {box.emoji}
                    </motion.span>
                  </div>
                </div>

                {/* Satellite CTA */}
                <motion.button
                  onClick={() => canAfford && setShowConfirm(box.key)}
                  disabled={!canAfford}
                  className={`satellite-cta ${!canAfford ? "opacity-40 cursor-not-allowed" : ""}`}
                  whileHover={canAfford ? { rotate: -12, scale: 1.05 } : {}}
                  whileTap={canAfford ? { scale: 0.9 } : {}}
                  aria-label={`Ouvrir ${box.name}`}
                >
                  <ArrowUpRight className="w-5 h-5" strokeWidth={2} />
                </motion.button>
              </motion.div>

              {/* Info below */}
              <div className="mt-8 space-y-3 text-center max-w-[260px] mx-auto">
                <span className="eyebrow">
                  {box.key === "GAMBLINGBOX" ? "Ultime" : box.key === "GOGOBOX" ? "Premium" : "Starter"}
                </span>
                <h2 className="text-2xl font-medium tracking-[-0.02em] text-[#141413] leading-tight">
                  {box.name}
                </h2>
                <p className="text-sm text-[#555555] leading-relaxed">{box.description}</p>

                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium tracking-[-0.02em] ${
                  canAfford ? "bg-[#141413] text-[#F3F0EE]" : "bg-[#E8E4E0] text-[#696969]"
                }`}>
                  {box.cost.toLocaleString()} pts
                </div>

                {/* Probability bars */}
                <div className="space-y-1.5 pt-2">
                  {RARITY_ORDER.map((rarity) => {
                    const prob = box.probabilities[rarity];
                    if (!prob || prob === 0) return null;
                    return (
                      <div key={rarity} className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#696969] w-16 text-right shrink-0">
                          {RARITY_LABELS[rarity]}
                        </span>
                        <div className="flex-1 h-2 bg-[#E8E4E0] rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${RARITY_BARS[rarity]}`}
                            initial={{ width: 0 }}
                            whileInView={{ width: `${prob}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                          />
                        </div>
                        <span className="text-[10px] tabular-nums text-[#696969] w-10 shrink-0">{prob}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ─── Collections ─── */}
      <section className="mb-16 pt-12 border-t border-[#D1CDC7]">
        <div className="space-y-3 mb-10">
          <span className="eyebrow">Collections</span>
          <h2 className="text-3xl md:text-4xl font-medium tracking-[-0.03em] text-[#141413]">
            Complétez votre<br />
            <span className="text-[#9A3A0A]">collection.</span>
          </h2>
          <p className="text-sm text-[#555555] max-w-md leading-relaxed">
            Chaque catégorie a ses propres objets à débloquer. Les uniques ne peuvent appartenir qu&apos;à un seul joueur.
          </p>
        </div>

        {/* Personal category bars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {collectionStats ? collectionStats.categories.map((cat, i) => {
            const colors = CATEGORY_COLORS[cat.key] ?? { icon: "from-gray-400 to-gray-600", bar: "from-gray-400 to-gray-600" };
            const pct = cat.total > 0 ? (cat.owned / cat.total) * 100 : 0;
            return (
              <motion.div
                key={cat.key}
                className="bg-[#FCFBFA] border border-[#D1CDC7] rounded-[24px] p-5 flex items-center gap-4 halo-soft"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ ...springGentle, delay: i * 0.07 }}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 bg-gradient-to-br ${colors.icon}`}>
                  <span>{cat.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <p className="text-xs font-medium text-[#141413]">{cat.label}</p>
                    <span className="text-xs tabular-nums text-[#696969]">{cat.owned} / {cat.total}</span>
                  </div>
                  <div className="h-1.5 bg-[#E8E4E0] rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r ${colors.bar}`}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: i * 0.07 }}
                    />
                  </div>
                  {cat.owned >= cat.total && cat.total > 0 && (
                    <p className="text-[10px] text-[#F37338] font-bold mt-0.5">Complète !</p>
                  )}
                </div>
              </motion.div>
            );
          }) : (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-[#FCFBFA] border border-[#D1CDC7] rounded-[24px] p-5 h-[72px] animate-pulse" />
            ))
          )}
        </div>

        {/* Global unique items bar */}
        {collectionStats && (
          <motion.div
            className="rounded-[32px] bg-[#141413] p-7 md:p-9 text-white"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={springGentle}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">💎</span>
                  <span className="text-xs uppercase tracking-[0.14em] text-[#999999]">Objets Uniques — Mondial</span>
                </div>
                <div>
                  <span className="text-3xl md:text-4xl font-medium tracking-[-0.03em]">
                    {collectionStats.uniqueGlobal.owned}
                  </span>
                  <span className="text-lg text-[#696969]"> / {collectionStats.uniqueGlobal.total}</span>
                </div>
                <p className="text-sm text-[#696969] max-w-xs leading-relaxed">
                  Uniques en circulation parmi tous les joueurs. Chaque drop est historique — un seul propriétaire possible.
                </p>
              </div>
              <div className="flex-1 max-w-sm">
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${collectionStats.uniqueGlobal.total > 0 ? (collectionStats.uniqueGlobal.owned / collectionStats.uniqueGlobal.total) * 100 : 0}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-[#696969]">
                  <span>0</span>
                  <span className="text-[#999999]">
                    {collectionStats.uniqueGlobal.owned} possédé{collectionStats.uniqueGlobal.owned > 1 ? "s" : ""}
                  </span>
                  <span>{collectionStats.uniqueGlobal.total}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════
          CONFIRMATION MODAL
          ═══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showConfirm && (() => {
          const box = boxes.find((b) => b.key === showConfirm);
          if (!box) return null;
          return (
            <motion.div
              key="confirm-overlay"
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
                onClick={() => setShowConfirm(null)}
              />
              <motion.div
                key="confirm-card"
                className="relative w-full max-w-sm rounded-[40px] border border-[#D1CDC7] halo-soft p-8 flex flex-col items-center text-center gap-6 bg-[#FCFBFA]"
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 10 }}
                transition={springBouncy}
              >
                <motion.div
                  className="text-6xl"
                  animate={{ rotate: [0, -5, 5, -3, 3, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                >
                  {box.emoji}
                </motion.div>
                <div className="space-y-2">
                  <h3 className="text-xl font-medium tracking-[-0.02em] text-[#141413]">
                    Ouvrir {box.name} ?
                  </h3>
                  <p className="text-sm text-[#696969]">
                    Cette opération coûtera{" "}
                    <span className="font-semibold text-[#141413]">{box.cost.toLocaleString()} pts</span>.
                  </p>
                </div>
                <div className="flex gap-3 w-full">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-full"
                    onClick={() => setShowConfirm(null)}
                  >
                    Annuler
                  </Button>
                  <Button
                    className="ink-pill flex-1"
                    onClick={() => handleOpen(box.key)}
                  >
                    Ouvrir
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════
          OPENING ANIMATION OVERLAY
          ═══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {opening && (
          <motion.div
            key="opening-overlay"
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* Dark base */}
            <div className="absolute inset-0 bg-[#0d0d0c]" />

            {/* Rarity atmospheric tint — appears once rarity is known */}
            <AnimatePresence>
              {revealRarity && (
                <motion.div
                  key="tint"
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse 80% 60% at 50% 50%, ${RARITY_OVERLAY_TINT[revealRarity]}, transparent)`,
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.7 }}
                />
              )}
            </AnimatePresence>

            {/* Shake phase — escalating intensity */}
            <AnimatePresence>
              {showShake && openingBox && (
                <motion.div
                  key="shake"
                  className="relative flex flex-col items-center gap-10 z-10"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.4, opacity: 0 }}
                  transition={{ scale: springBouncy, opacity: { duration: 0.15 } }}
                >
                  <div className="relative flex items-center justify-center">
                    {/* Outer pulse ring */}
                    <motion.div
                      className="absolute w-48 h-48 rounded-full"
                      style={{ background: "radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)" }}
                      animate={{ scale: [1, 1.28, 1] }}
                      transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                    />
                    {/* Inner glow pulse */}
                    <motion.div
                      className="absolute w-36 h-36 rounded-full"
                      style={{ boxShadow: "0 0 48px rgba(255,255,255,0.07)" }}
                      animate={{ opacity: [0.3, 0.9, 0.3] }}
                      transition={{ duration: 0.75, repeat: Infinity, ease: "easeInOut" }}
                    />
                    {/* Box — escalating shake from gentle to violent */}
                    <motion.div
                      className="relative w-32 h-32 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center"
                      animate={{
                        x: [0, -3, 3, -3, 3, -7, 7, -11, 11, -15, 15, -11, 11, -7, 7, -3, 3, 0],
                        rotate: [0, -1, 1, -2, 2, -3, 3, -5, 5, -4, 4, -2, 2, 0],
                      }}
                      transition={{ duration: 1.4, ease: "linear", delay: 0.25 }}
                    >
                      <motion.span
                        className="text-6xl select-none"
                        animate={{ rotate: [-4, 4, -3, 3, -6, 6, -2, 2, 0] }}
                        transition={{ duration: 1.2, ease: "linear", delay: 0.25 }}
                      >
                        {openingBox.emoji}
                      </motion.span>
                    </motion.div>
                  </div>
                  <motion.p
                    className="text-white/35 text-xs font-medium tracking-[0.14em] uppercase"
                    animate={{ opacity: [0.2, 0.65, 0.2] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    Ouverture en cours...
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Rarity-colored flash */}
            <AnimatePresence>
              {showFlash && (
                <motion.div
                  key="flash"
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: RARITY_FLASH_COLORS[revealRarity || "common"] }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0.55, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.34, ease: "easeOut" }}
                />
              )}
            </AnimatePresence>

            {/* Result card — entrance varies by rarity */}
            <AnimatePresence>
              {result && (() => {
                const rarity = result.rolledRarity;
                const cardInitial = RARITY_CARD_INITIAL[rarity] ?? RARITY_CARD_INITIAL.common;
                const cardSpring = RARITY_CARD_SPRING[rarity] ?? RARITY_CARD_SPRING.common;
                return (
                  <motion.div
                    key="result-card"
                    className="relative w-full max-w-sm rounded-[40px] border p-10 flex flex-col items-center text-center gap-6 z-10"
                    style={{
                      background: "#FCFBFA",
                      borderColor: `${result.rarityColor}44`,
                      boxShadow: `0 0 60px ${result.rarityColor}20, 0 32px 64px rgba(0,0,0,0.45)`,
                    }}
                    initial={cardInitial}
                    animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
                    exit={{ scale: 0.85, opacity: 0 }}
                    transition={cardSpring}
                  >
                    {/* Particles */}
                    {particles.map((p, idx) => (
                      <motion.div
                        key={idx}
                        className="absolute rounded-full pointer-events-none"
                        style={{ width: p.size, height: p.size, background: p.color, left: "50%", top: "50%" }}
                        initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
                        animate={{ x: p.x, y: p.y - 100, opacity: 0, scale: 0, rotate: p.rotation }}
                        transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
                      />
                    ))}

                    {/* Close */}
                    <button
                      onClick={dismissResult}
                      className="absolute top-6 right-6 w-8 h-8 rounded-full flex items-center justify-center bg-[#F3F0EE] hover:bg-[#E8E4E0]"
                      aria-label="Fermer"
                    >
                      <X className="w-4 h-4 text-[#696969]" />
                    </button>

                    {/* Emoji with pulsing glow */}
                    <motion.div
                      className="relative w-24 h-24 rounded-full flex items-center justify-center"
                      initial={{ scale: 0, rotate: rarity === "unique" ? -180 : -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: rarity === "unique" ? 180 : 300,
                        damping: rarity === "unique" ? 12 : 18,
                        delay: 0.08,
                      }}
                    >
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.22, 1] }}
                        transition={{ duration: rarity === "unique" ? 1.4 : 2, repeat: Infinity, ease: "easeInOut" }}
                        style={{ boxShadow: `0 0 48px ${result.rarityColor}55, 0 0 96px ${result.rarityColor}22` }}
                      />
                      <div
                        className="relative w-20 h-20 rounded-full flex items-center justify-center text-4xl z-10"
                        style={{ background: `linear-gradient(135deg, ${result.rarityColor}, ${result.rarityColor}88)` }}
                      >
                        {result.item.emoji}
                      </div>
                    </motion.div>

                    {/* Details — staggered */}
                    <motion.div
                      className="space-y-2"
                      initial="hidden"
                      animate="visible"
                      variants={{ visible: { transition: { staggerChildren: 0.09, delayChildren: 0.22 } } }}
                    >
                      <motion.span
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-[0.06em]"
                        style={{
                          backgroundColor: `${result.rarityColor}22`,
                          color: result.rarityColor,
                          border: `1.5px solid ${result.rarityColor}44`,
                        }}
                        variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                      >
                        <Sparkles className="w-3 h-3" />
                        {RARITY_LABELS[result.rolledRarity] || result.rolledRarity}
                      </motion.span>

                      {/* Display style modifier */}
                      {result.displayStyle && result.displayStyle !== "default" && (() => {
                        const sd = getStyleDef(result.displayStyle);
                        const hex = RARITY_HEX[result.rolledRarity] ?? RARITY_HEX.common;
                        const label = DISPLAY_STYLE_LABELS[result.displayStyle] || result.displayStyle;
                        return (
                          <motion.span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.04em]"
                            style={sd.container(hex)}
                            variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                          >
                            <span className={sd.textClass} style={sd.textStyle(hex)}>
                              {label}
                            </span>
                          </motion.span>
                        );
                      })()}

                      <motion.h3
                        className="text-2xl font-medium tracking-[-0.02em] text-[#141413]"
                        variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                      >
                        {result.item.name}
                      </motion.h3>
                      <motion.p
                        className="text-sm text-[#696969] leading-relaxed max-w-xs"
                        variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                      >
                        {result.item.description}
                      </motion.p>
                      {result.item.base_value > 0 && (
                        <motion.p
                          className="text-xs text-[#696969]"
                          variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                        >
                          Valeur de base : {result.item.base_value.toLocaleString()} pts
                        </motion.p>
                      )}
                    </motion.div>

                    {!!result.item.qualifyable && (
                      <motion.div
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#F37338]/10 text-[#CF4500] text-xs font-medium"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6, ...springGentle }}
                      >
                        <Star className="w-3 h-3" />
                        Fusionnable (×2 → ★)
                      </motion.div>
                    )}

                    <motion.div
                      className="w-full"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.42 }}
                    >
                      <Button className="ink-pill w-full" onClick={dismissResult}>
                        Continuer
                      </Button>
                    </motion.div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
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

      {/* ─── Daily Deals ─── */}
      {dailyDeals.length > 0 && (
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-[#F37338]" />
              <h2 className="text-xl font-medium tracking-[-0.02em] text-[#141413]">Shop Éphémère</h2>
            </div>
            <span className="text-xs text-[#696969] tabular-nums">
              Nouveau dans{" "}
              {Math.floor(nextDealRefreshMs / 3600000)}h
              {String(Math.floor((nextDealRefreshMs % 3600000) / 60000)).padStart(2, "0")}m
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {dailyDeals.map((deal) => {
              const style = RARITY_CARD_STYLES[deal.rarity] || RARITY_CARD_STYLES.common;
              const label = RARITY_LABELS[deal.rarity] || deal.rarity;
              return (
                <motion.div
                  key={deal.id}
                  className={`relative bg-[#FCFBFA] border-2 rounded-[24px] p-5 flex flex-col items-center text-center gap-3 halo-soft transition-all ${
                    deal.purchased ? "opacity-50 border-gray-300" : style.border
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: deal.slot * 0.1, ...springGentle }}
                >
                  {deal.purchased && (
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#141413] text-[10px] font-bold text-[#F3F0EE] uppercase tracking-[0.04em]">
                      <Sparkles className="w-2.5 h-2.5" />
                      Acheté
                    </span>
                  )}

                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl ${
                      deal.purchased
                        ? "bg-[#E8E4E0]"
                        : `bg-gradient-to-br ${style.iconBg}`
                    }`}
                  >
                    {deal.emoji}
                  </div>

                  <div>
                    <p className="text-sm font-medium text-[#141413] leading-tight">{deal.name}</p>
                    <span className={`text-[10px] font-bold uppercase tracking-[0.04em] ${style.text}`}>
                      {label}
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F3F0EE] text-xs font-medium text-[#141413]">
                    {deal.price.toLocaleString()} pts
                  </div>

                  {!deal.purchased && (
                    <button
                      onClick={() => handleBuyDeal(deal.id)}
                      disabled={dealLoading === deal.id || player.nb_point < deal.price}
                      className={`w-full py-2 rounded-full text-xs font-bold transition-all ${
                        player.nb_point >= deal.price
                          ? "bg-[#141413] text-[#F3F0EE] hover:bg-[#141413]/80"
                          : "bg-[#E8E4E0] text-[#D1CDC7] cursor-not-allowed"
                      } disabled:opacity-50`}
                    >
                      {dealLoading === deal.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                      ) : player.nb_point >= deal.price ? (
                        "Acheter"
                      ) : (
                        "Pas assez de points"
                      )}
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── Opening history ─── */}
      <section className="pt-12 pb-8 border-t border-[#D1CDC7]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-[#696969]" />
            <h2 className="text-xl font-medium tracking-[-0.02em] text-[#141413]">Historique d&apos;ouverture</h2>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs font-medium text-[#696969] hover:text-[#141413] transition-colors"
          >
            {showHistory ? "Réduire" : "Voir tout"}
          </button>
        </div>

        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {boxHistory.length === 0 ? (
              <p className="text-sm text-[#D1CDC7] py-4">Aucune ouverture pour le moment.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {boxHistory.slice(0, 15).map((h, idx) => {
                  const style: Record<string, string> = {
                    unique: "border-yellow-400 bg-yellow-50",
                    exotic: "border-red-400 bg-red-50",
                    mythic: "border-fuchsia-400 bg-fuchsia-50",
                    legendary: "border-orange-400 bg-orange-50",
                    epic: "border-purple-400 bg-purple-50",
                    rare: "border-blue-400 bg-blue-50",
                    common: "border-gray-300 bg-gray-50",
                  };
                  const s = style[h.rarity] || style.common;
                  return (
                    <motion.div
                      key={`${h.name}-${idx}`}
                      className={`rounded-[12px] border ${s} p-2.5 flex items-center gap-2`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.03 }}
                    >
                      <span className="text-lg shrink-0">{h.emoji}</span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium text-[#141413] truncate">{h.name}</p>
                        <p className="text-[9px] text-[#696969]">{new Date(h.acquired_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </section>

      {/* ─── Info section ─── */}
      <div className="pt-16 border-t border-[#D1CDC7] flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
        <div className="space-y-2 max-w-lg">
          <span className="eyebrow">Info</span>
          <h3 className="text-2xl md:text-3xl font-medium tracking-[-0.02em] text-[#141413]">
            Les objets rares sont limités. Chaque box est une chance.
          </h3>
          <p className="text-sm text-[#555555] max-w-md">
            Consultez votre inventaire depuis votre profil. Les items fusionnables (burgers) peuvent
            être améliorés (5 → 1★) puis revendus sur le marketplace.
          </p>
        </div>
      </div>
    </div>
  );
}
