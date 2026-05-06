import { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowUpRight, Loader2, Sparkles, Star, X, Gift, BarChart3, Clock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "@/lib/api";
import { cacheGet, cacheHas } from "@/lib/cache";
import { Button } from "@/components/ui/button";
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
  };
  rolledRarity: string;
  rarityColor: string;
  player: PlayerType;
}

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

const RARITY_FLASH_COLORS: Record<string, string> = {
  unique: "#FFD700",
  exotic: "#FF4444",
  mythic: "#E879F9",
  legendary: "#FB923C",
  epic: "#C084FC",
  rare: "#60A5FA",
  common: "#F8F8F8",
};

const RARITY_OVERLAY_TINT: Record<string, string> = {
  unique: "rgba(255,215,0,0.08)",
  exotic: "rgba(248,113,113,0.08)",
  mythic: "rgba(232,121,249,0.09)",
  legendary: "rgba(251,146,60,0.08)",
  epic: "rgba(192,132,252,0.09)",
  rare: "rgba(96,165,250,0.08)",
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

const RARITY_CARD_INITIAL: Record<string, object> = {
  common:    { scale: 0.85, opacity: 0 },
  rare:      { scale: 0.72, y: 32, opacity: 0 },
  epic:      { scale: 0.6, rotate: -8, opacity: 0 },
  legendary: { scale: 0.45, rotate: 12, opacity: 0 },
  mythic:    { scale: 0.3, rotate: -16, opacity: 0 },
  exotic:    { scale: 0.3, y: -40, rotate: 8, opacity: 0 },
  unique:    { scale: 0.1, opacity: 0 },
};

const RARITY_CARD_SPRING: Record<string, object> = {
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

// ─── Spring configs ───

const springBouncy = { type: "spring" as const, stiffness: 300, damping: 18 };
const springGentle = { type: "spring" as const, stiffness: 200, damping: 24 };
const springPop = { type: "spring" as const, stiffness: 400, damping: 12 };

// Shake keyframes
const shakeKeyframes = [0, -12, 10, -8, 6, -4, 2, 0, -2, 1, 0];

// ─── Confetti particles ───

const PARTICLE_COLORS = ["#FFD700", "#FF4444", "#FF44CC", "#FF8C00", "#9933FF", "#3399FF", "#F37338"];

function spawnParticles(count: number): Array<{ x: number; y: number; color: string; size: number; delay: number; duration: number; rotation: number }> {
  return Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * 300,
    y: (Math.random() - 0.5) * 300 - 40,
    color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    size: 4 + Math.random() * 8,
    delay: Math.random() * 0.3,
    duration: 0.8 + Math.random() * 0.6,
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

  // Phase 8: Pity system (localStorage)
  const [pityCounter, setPityCounter] = useState(() => {
    try { return parseInt(localStorage.getItem("ggg_pity") || "0", 10); } catch { return 0; }
  });
  const PITY_THRESHOLD = 60;
  const isPityActive = pityCounter >= PITY_THRESHOLD;

  // Phase 8: Collection progress
  const [inventory, setInventory] = useState<Array<{ name: string; category: string; emoji: string }>>([]);
  const [boxHistory, setBoxHistory] = useState<Array<{ name: string; emoji: string; rarity: string; acquired_at: string }>>([]);
  const [freeBoxAvailable, setFreeBoxAvailable] = useState(false);
  const [freeBoxLoading, setFreeBoxLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const TOTAL_FRUITS = 28;
  const collectedFruits = useMemo(() => {
    const fruitSet = new Set(inventory.filter((i) => i.category === "fruit").map((i) => i.name));
    return fruitSet.size;
  }, [inventory]);

  useEffect(() => {
    api.shop.boxes()
      .then((data) => setBoxes(data.boxes))
      .catch(console.error)
      .finally(() => setLoading(false));

    // Load inventory for collection tracker
    api.shop.inventory()
      .then((inv) => setInventory(inv as Array<{ name: string; category: string; emoji: string }>))
      .catch(() => {});

    // Load box history
    api.shop.boxHistory()
      .then((h) => setBoxHistory(h as Array<{ name: string; emoji: string; rarity: string; acquired_at: string }>))
      .catch(() => {});

    // Check free box availability
    checkFreeBox(player);
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

    // Phase 1: Shake (800ms)
    await new Promise((r) => setTimeout(r, 800));
    setShowShake(false);

    // Phase 2: Flash (200ms)
    setShowFlash(true);
    const apiPromise = api.shop.openBox(boxType);

    await new Promise((r) => setTimeout(r, 200));
    setShowFlash(false);

    // Phase 3: Reveal
    try {
      const data = await apiPromise;
      setResult(data);
      setParticles(spawnParticles(40));
      onPlayerUpdate(data.player);

      // Pity: update counter
      const isRare = ["unique", "exotic", "mythic", "legendary"].includes(data.rolledRarity);
      if (isRare) {
        setPityCounter(0);
        localStorage.setItem("ggg_pity", "0");
      } else {
        const next = pityCounter + 1;
        setPityCounter(next);
        localStorage.setItem("ggg_pity", String(next));
      }

      // Reload inventory & history
      api.shop.inventory()
        .then((inv) => setInventory(inv as Array<{ name: string; category: string; emoji: string }>))
        .catch(() => {});
      api.shop.boxHistory()
        .then((h) => setBoxHistory(h as Array<{ name: string; emoji: string; rarity: string; acquired_at: string }>))
        .catch(() => {});
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'ouverture");
      setOpening(false);
      setOpeningBoxKey(null);
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
    try {
      const data = await api.shop.dailyFreeBox();
      const boxResult: BoxResult = {
        item: data.item as BoxResult["item"],
        rolledRarity: data.rolledRarity,
        rarityColor: data.rarityColor,
        player: data.player,
      };
      setResult(boxResult);
      setParticles(spawnParticles(30));
      onPlayerUpdate(data.player);
      setFreeBoxAvailable(false);
      // Reload inventory & history
      api.shop.inventory()
        .then((inv) => setInventory(inv as Array<{ name: string; category: string; emoji: string }>))
        .catch(() => {});
      api.shop.boxHistory()
        .then((h) => setBoxHistory(h as Array<{ name: string; emoji: string; rarity: string; acquired_at: string }>))
        .catch(() => {});
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur box gratuite");
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
  }, []);

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

        {/* Collection progress */}
        <div className="bg-[#FCFBFA] border border-[#D1CDC7] rounded-[24px] p-5 flex items-center gap-4 halo-soft">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F37338] to-[#9A3A0A] flex items-center justify-center text-xl shrink-0">
            <span className="text-white text-lg">🍎</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#141413]">Collection fruits</p>
            <p className="text-xs tabular-nums text-[#696969]">
              {collectedFruits} / {TOTAL_FRUITS}
              {collectedFruits >= TOTAL_FRUITS && <span className="ml-1 text-[#F37338] font-bold">Complète !</span>}
            </p>
            <div className="mt-1 h-1 bg-[#E8E4E0] rounded-full overflow-hidden w-20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#F37338] to-[#9A3A0A] transition-all duration-300"
                style={{ width: `${(collectedFruits / TOTAL_FRUITS) * 100}%` }}
              />
            </div>
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
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0"
              style={{ background: "#141413" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: showFlash ? 1 : 0.85 }}
              exit={{ opacity: 0 }}
              transition={showFlash ? { duration: 0.1 } : { duration: 0.3 }}
            />

            {/* Shake phase — box trembles */}
            <AnimatePresence>
              {showShake && openingBox && (
                <motion.div
                  key="shake"
                  className="relative flex flex-col items-center gap-8"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, x: shakeKeyframes }}
                  exit={{ scale: 1.2, opacity: 0 }}
                  transition={{
                    scale: { ...springBouncy },
                    x: { duration: 0.7, ease: "easeInOut" },
                    opacity: { duration: 0.15 },
                  }}
                >
                  <div className="w-32 h-32 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                    <motion.span
                      className="text-6xl"
                      animate={{ rotate: [-8, 8, -6, 6, -4, 4, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity }}
                    >
                      {openingBox.emoji}
                    </motion.span>
                  </div>
                  <motion.p
                    className="text-white/60 text-sm font-medium"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    Ouverture en cours...
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Flash phase — white burst */}
            <AnimatePresence>
              {showFlash && (
                <motion.div
                  key="flash"
                  className="absolute inset-0 bg-white"
                  initial={{ opacity: 0.8 }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </AnimatePresence>

            {/* Result phase — show card */}
            <AnimatePresence>
              {result && (
                <motion.div
                  key="result-card"
                  className="relative w-full max-w-sm rounded-[40px] border p-10 flex flex-col items-center text-center gap-6"
                  style={{
                    background: "#FCFBFA",
                    borderColor: `${result.rarityColor}44`,
                  }}
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={springBouncy}
                >
                  {/* Particles */}
                  {particles.map((p, idx) => (
                    <motion.div
                      key={idx}
                      className="absolute rounded-full pointer-events-none"
                      style={{
                        width: p.size,
                        height: p.size,
                        background: p.color,
                        left: "50%",
                        top: "50%",
                      }}
                      initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
                      animate={{
                        x: p.x,
                        y: p.y - 100,
                        opacity: 0,
                        scale: 0,
                        rotate: p.rotation,
                      }}
                      transition={{
                        duration: p.duration,
                        delay: p.delay,
                        ease: "easeOut",
                      }}
                    />
                  ))}

                  {/* Close button */}
                  <button
                    onClick={dismissResult}
                    className="absolute top-6 right-6 w-8 h-8 rounded-full flex items-center justify-center bg-[#F3F0EE] hover:bg-[#E8E4E0]"
                    aria-label="Fermer"
                  >
                    <X className="w-4 h-4 text-[#696969]" />
                  </button>

                  {/* Rarity glow ring */}
                  <motion.div
                    className="w-24 h-24 rounded-full flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ ...springPop, delay: 0.1 }}
                    style={{
                      boxShadow: `0 0 40px ${result.rarityColor}44, 0 0 80px ${result.rarityColor}22`,
                    }}
                  >
                    <motion.div
                      className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
                      initial={{ rotate: -90 }}
                      animate={{ rotate: 0 }}
                      transition={{ ...springPop, delay: 0.2 }}
                      style={{
                        background: `linear-gradient(135deg, ${result.rarityColor}, ${result.rarityColor}88)`,
                      }}
                    >
                      {result.item.emoji}
                    </motion.div>
                  </motion.div>

                  {/* Pulsing glow on ring */}
                  <motion.div
                    className="absolute w-24 h-24 rounded-full pointer-events-none"
                    style={{
                      top: "calc(40px - 48px)",
                      boxShadow: `0 0 60px ${result.rarityColor}66`,
                    }}
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />

                  {/* Details — staggered */}
                  <motion.div
                    className="space-y-2"
                    initial="hidden"
                    animate="visible"
                    variants={{
                      visible: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } },
                    }}
                  >
                    <motion.span
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-[0.06em]"
                      style={{
                        backgroundColor: `${result.rarityColor}22`,
                        color: result.rarityColor,
                        border: `1.5px solid ${result.rarityColor}44`,
                      }}
                      variants={{
                        hidden: { opacity: 0, y: 10 },
                        visible: { opacity: 1, y: 0 },
                      }}
                    >
                      <Sparkles className="w-3 h-3" />
                      {RARITY_LABELS[result.rolledRarity] || result.rolledRarity}
                    </motion.span>
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

                  {/* Fusionnable badge */}
                  {result.item.category === "burger" && (
                    <motion.div
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#F37338]/10 text-[#CF4500] text-xs font-medium"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.7, ...springGentle }}
                    >
                      <Star className="w-3 h-3" />
                      Fusionnable (5 → 1★)
                    </motion.div>
                  )}

                  <motion.div
                    className="w-full"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Button className="ink-pill w-full" onClick={dismissResult}>
                      Continuer
                    </Button>
                  </motion.div>
                </motion.div>
              )}
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

      {/* ─── Opening history ─── */}
      <section className="pt-12 border-t border-[#D1CDC7]">
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
