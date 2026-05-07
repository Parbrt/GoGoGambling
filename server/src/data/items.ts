// ─── Rarity definition ───
export type Rarity = "unique" | "exotic" | "mythic" | "legendary" | "epic" | "rare" | "common";

export interface RarityInfo {
  key: Rarity;
  label: string;
  color: string;       // hex for UI
  bgClass: string;      // Tailwind bg
  textClass: string;    // Tailwind text
  borderClass: string;  // Tailwind border
  minValue: number;
  maxValue: number;
}

export const RARITIES: Rarity[] = [
  "unique", "exotic", "mythic", "legendary", "epic", "rare", "common",
];

export const RARITY_MAP: Record<Rarity, RarityInfo> = {
  unique:    { key: "unique",    label: "Unique",    color: "#FFD700", bgClass: "bg-yellow-400",    textClass: "text-yellow-400",    borderClass: "border-yellow-400",    minValue: Infinity, maxValue: Infinity },
  exotic:    { key: "exotic",    label: "Exotique",  color: "#FF4444", bgClass: "bg-red-500",       textClass: "text-red-500",       borderClass: "border-red-500",       minValue: 500000, maxValue: Infinity },
  mythic:    { key: "mythic",    label: "Mythique",  color: "#FF44CC", bgClass: "bg-fuchsia-500",   textClass: "text-fuchsia-500",   borderClass: "border-fuchsia-500",   minValue: 250000, maxValue: 500000 },
  legendary: { key: "legendary", label: "Légendaire",color: "#FF8C00", bgClass: "bg-orange-500",    textClass: "text-orange-500",    borderClass: "border-orange-500",    minValue: 100000, maxValue: 250000 },
  epic:      { key: "epic",      label: "Épique",    color: "#9933FF", bgClass: "bg-purple-500",   textClass: "text-purple-500",   borderClass: "border-purple-500",   minValue: 50000,  maxValue: 100000 },
  rare:      { key: "rare",      label: "Rare",      color: "#3399FF", bgClass: "bg-blue-500",     textClass: "text-blue-500",     borderClass: "border-blue-500",     minValue: 1000,   maxValue: 50000 },
  common:    { key: "common",    label: "Commun",    color: "#999999", bgClass: "bg-gray-400",     textClass: "text-gray-400",     borderClass: "border-gray-400",     minValue: 0,      maxValue: 1000 },
};

// ─── Category definition ───
export type ItemCategory = "people" | "fruit" | "title" | "burger" | "stock" | "points" | "loto_ticket" | "consumable";

// ─── Loot box types ───
export type BoxType = "GAMBLINGBOX" | "GOGOBOX" | "XBOX";

export interface BoxDefinition {
  key: BoxType;
  name: string;
  cost: number;
  emoji: string;
  description: string;
  probabilities: Record<Rarity, number>; // 0–100
}

export const LOOT_BOXES: BoxDefinition[] = [
  {
    key: "GAMBLINGBOX",
    name: "GAMBLINGBOX",
    cost: 250000,
    emoji: "🎰",
    description: "La box ultime pour les high-rollers. Chance de drop unique !",
    probabilities: {
      unique: 1, exotic: 3, mythic: 16, legendary: 30, epic: 50,
      rare: 0, common: 0,
    },
  },
  {
    key: "GOGOBOX",
    name: "GOGOBOX",
    cost: 100000,
    emoji: "📦",
    description: "Box intermédiaire. De l'exotique au rare.",
    probabilities: {
      unique: 0, exotic: 0.5, mythic: 2.5, legendary: 17, epic: 30, rare: 50,
      common: 0,
    },
  },
  {
    key: "XBOX",
    name: "XBOX",
    cost: 10000,
    emoji: "🎁",
    description: "Petite box accessible. Parfaite pour débuter.",
    probabilities: {
      unique: 0, exotic: 0.1, mythic: 0.4, legendary: 0.5, epic: 2.5, rare: 27, common: 69.5,
    },
  },
];

// ─── Catalog item definition ───
export interface CatalogItem {
  id?: number;
  name: string;
  category: ItemCategory;
  rarity: Rarity;
  base_value: number;
  qualifyable: boolean;
  emoji: string;
  description: string;
}

// ─── Complete catalog ───
export const ITEMS_CATALOG: CatalogItem[] = [
  // ▸▸▸ PEOPLE (Unique) — CSV
  { name: "Jules",       category: "people", rarity: "unique", base_value: 0, qualifyable: false, emoji: "👤", description: "Une personne unique. Collection inestimable." },
  { name: "Thomas",      category: "people", rarity: "unique", base_value: 0, qualifyable: false, emoji: "👤", description: "Une personne unique. Collection inestimable." },
  { name: "Noé",         category: "people", rarity: "unique", base_value: 0, qualifyable: false, emoji: "👤", description: "Une personne unique. Collection inestimable." },
  { name: "Alexandre",   category: "people", rarity: "unique", base_value: 0, qualifyable: false, emoji: "👤", description: "Une personne unique. Collection inestimable." },
  { name: "Clémence",    category: "people", rarity: "unique", base_value: 0, qualifyable: false, emoji: "👤", description: "Une personne unique. Collection inestimable." },
  { name: "Chloé",       category: "people", rarity: "unique", base_value: 0, qualifyable: false, emoji: "👤", description: "Une personne unique. Collection inestimable." },
  { name: "Alex",        category: "people", rarity: "unique", base_value: 0, qualifyable: false, emoji: "👤", description: "Une personne unique. Collection inestimable." },
  { name: "Paul-Aimé",   category: "people", rarity: "unique", base_value: 0, qualifyable: false, emoji: "👤", description: "Une personne unique. Collection inestimable." },
  { name: "Fabio",       category: "people", rarity: "unique", base_value: 0, qualifyable: false, emoji: "👤", description: "Une personne unique. Collection inestimable." },
  { name: "Laurent",     category: "people", rarity: "unique", base_value: 0, qualifyable: false, emoji: "👤", description: "Une personne unique. Collection inestimable." },
  { name: "Adeline",     category: "people", rarity: "unique", base_value: 0, qualifyable: false, emoji: "👤", description: "Une personne unique. Collection inestimable." },

  // ▸▸▸ FRUITS (Legendary) — CSV
  { name: "Apple",           category: "fruit", rarity: "legendary", base_value: 100000, qualifyable: true, emoji: "🍎", description: "Une pomme légendaire. La base de toute collection." },
  { name: "Apricot",         category: "fruit", rarity: "legendary", base_value: 100000, qualifyable: true, emoji: "🍑", description: "Un abricot rare et juteux." },
  { name: "Banana",          category: "fruit", rarity: "legendary", base_value: 100000, qualifyable: true, emoji: "🍌", description: "Une banane au potentiel de glisse infini." },
  { name: "Blackberry",      category: "fruit", rarity: "legendary", base_value: 100000, qualifyable: true, emoji: "🫐", description: "Une mûre sombre et mystérieuse." },
  { name: "Blueberry",       category: "fruit", rarity: "legendary", base_value: 100000, qualifyable: true, emoji: "🫐", description: "Une myrtille éclatante de fraîcheur." },
  { name: "Cantaloup",       category: "fruit", rarity: "legendary", base_value: 175000, qualifyable: true, emoji: "🍈", description: "Un melon majestueux au goût royal." },
  { name: "Cherry",          category: "fruit", rarity: "legendary", base_value: 100000, qualifyable: true, emoji: "🍒", description: "Une cerise rouge passion." },
  { name: "Clementine",      category: "fruit", rarity: "legendary", base_value: 100000, qualifyable: true, emoji: "🍊", description: "Une clémentine gorgée de soleil." },
  { name: "Cranberry",       category: "fruit", rarity: "legendary", base_value: 100000, qualifyable: true, emoji: "🫐", description: "Une canneberge acidulée et précieuse." },
  { name: "Dates",           category: "fruit", rarity: "legendary", base_value: 100000, qualifyable: true, emoji: "🌴", description: "Des dattes venues du désert." },
  { name: "Durian",          category: "fruit", rarity: "legendary", base_value: 200000, qualifyable: true, emoji: "🫨", description: "Le roi des fruits. Odeur légendaire, valeur suprême." },
  { name: "Figs",            category: "fruit", rarity: "legendary", base_value: 125000, qualifyable: true, emoji: "🪷", description: "Des figues douces comme le miel." },
  { name: "Grapes",          category: "fruit", rarity: "legendary", base_value: 100000, qualifyable: true, emoji: "🍇", description: "Une grappe de raisins divins." },
  { name: "Kiwi",            category: "fruit", rarity: "legendary", base_value: 100000, qualifyable: true, emoji: "🥝", description: "Un kiwi exotique et vitaminé." },
  { name: "Lemon",           category: "fruit", rarity: "legendary", base_value: 100000, qualifyable: true, emoji: "🍋", description: "Un citron qui vaut de l'or." },
  { name: "Lime",            category: "fruit", rarity: "legendary", base_value: 100000, qualifyable: true, emoji: "🍋‍🟩", description: "Un citron vert rafraîchissant." },
  { name: "Lychee",          category: "fruit", rarity: "legendary", base_value: 125000, qualifyable: true, emoji: "🫧", description: "Un litchi translucide et délicat." },
  { name: "Mandarin",        category: "fruit", rarity: "legendary", base_value: 100000, qualifyable: true, emoji: "🍊", description: "Une mandarine facile à éplucher, dure à obtenir." },
  { name: "Mango",           category: "fruit", rarity: "legendary", base_value: 175000, qualifyable: true, emoji: "🥭", description: "Une mangue tropicale d'exception." },
  { name: "Nectarine",       category: "fruit", rarity: "legendary", base_value: 100000, qualifyable: true, emoji: "🍑", description: "Une nectarine lisse et sucrée." },
  { name: "Orange",          category: "fruit", rarity: "legendary", base_value: 100000, qualifyable: true, emoji: "🍊", description: "Une orange pleine de vitalité." },
  { name: "Passion-Fruit",   category: "fruit", rarity: "legendary", base_value: 125000, qualifyable: true, emoji: "💜", description: "Un fruit de la passion intense." },
  { name: "Peach",           category: "fruit", rarity: "legendary", base_value: 100000, qualifyable: true, emoji: "🍑", description: "Une pêche veloutée et généreuse." },
  { name: "Pear",            category: "fruit", rarity: "legendary", base_value: 100000, qualifyable: true, emoji: "🍐", description: "Une poire juteuse à souhait." },
  { name: "Pineapple",       category: "fruit", rarity: "legendary", base_value: 175000, qualifyable: true, emoji: "🍍", description: "Un ananas couronné de prestige." },
  { name: "Raspberry",       category: "fruit", rarity: "legendary", base_value: 100000, qualifyable: true, emoji: "🫐", description: "Une framboise délicate et parfumée." },
  { name: "Strawberry",      category: "fruit", rarity: "legendary", base_value: 100000, qualifyable: true, emoji: "🍓", description: "Une fraise rouge passion." },
  { name: "Tangerine",       category: "fruit", rarity: "legendary", base_value: 100000, qualifyable: true, emoji: "🍊", description: "Une tangerine au goût d'enfance." },
  { name: "Watermelon",      category: "fruit", rarity: "legendary", base_value: 150000, qualifyable: true, emoji: "🍉", description: "Une pastèque rafraîchissante et massive." },

  // ▸▸▸ BURGERS (Epic) — CSV
  { name: "Whopper",                      category: "burger", rarity: "epic", base_value: 50000,  qualifyable: true, emoji: "🍔", description: "Le classique intemporel. 5★ = Whopper Suprême." },
  { name: "Bacon & Cheese Whopper",       category: "burger", rarity: "epic", base_value: 60000,  qualifyable: true, emoji: "🥓", description: "Bacon + fromage = bonheur." },
  { name: "Double Whopper",               category: "burger", rarity: "epic", base_value: 70000,  qualifyable: true, emoji: "🍔", description: "Deux steaks, deux fois plus de gloire." },
  { name: "Triple Whopper",               category: "burger", rarity: "epic", base_value: 80000,  qualifyable: true, emoji: "🍔", description: "Trois steaks. Pour les vrais." },
  { name: "Impossible Whopper",           category: "burger", rarity: "epic", base_value: 90000,  qualifyable: true, emoji: "🥬", description: "Le burger végétal légendaire." },
  { name: "Bacon King",                   category: "burger", rarity: "epic", base_value: 60000,  qualifyable: true, emoji: "👑", description: "Le roi du bacon." },
  { name: "Single Quarter Pound King",    category: "burger", rarity: "epic", base_value: 70000,  qualifyable: true, emoji: "🍔", description: "Un quart de livre de pur plaisir." },
  { name: "Double Quarter King",          category: "burger", rarity: "epic", base_value: 80000,  qualifyable: true, emoji: "🍔", description: "Une demi-livre de puissance." },
  { name: "Single Stacker King",          category: "burger", rarity: "epic", base_value: 75000,  qualifyable: true, emoji: "🥞", description: "Empilé avec soin." },
  { name: "Double Stacker King",          category: "burger", rarity: "epic", base_value: 85000,  qualifyable: true, emoji: "🥞", description: "Double empilement de saveurs." },
  { name: "Hamburger",                    category: "burger", rarity: "epic", base_value: 50000,  qualifyable: true, emoji: "🍔", description: "L'original. Simple, efficace." },
  { name: "Cheeseburger",                 category: "burger", rarity: "epic", base_value: 50000,  qualifyable: true, emoji: "🧀", description: "Le fromage change tout." },
  { name: "Double Hamburger",             category: "burger", rarity: "epic", base_value: 60000,  qualifyable: true, emoji: "🍔", description: "Double steak, double fun." },
  { name: "Double Cheeseburger",          category: "burger", rarity: "epic", base_value: 60000,  qualifyable: true, emoji: "🧀", description: "Double fromage pour double plaisir." },
  { name: "Extra long Cheeseburger",      category: "burger", rarity: "epic", base_value: 70000,  qualifyable: true, emoji: "📏", description: "Un cheeseburger qui n'en finit plus." },
  { name: "Bacon Cheeseburger",           category: "burger", rarity: "epic", base_value: 60000,  qualifyable: true, emoji: "🥓", description: "Bacon croustillant sur fromage fondant." },
  { name: "Bacon Double Cheeseburger",    category: "burger", rarity: "epic", base_value: 70000,  qualifyable: true, emoji: "🥓", description: "Deux fois plus de tout." },
  { name: "Crispy Chicken",               category: "burger", rarity: "epic", base_value: 50000,  qualifyable: true, emoji: "🍗", description: "Poulet croustillant doré." },
  { name: "Spicy Crispy Chicken",         category: "burger", rarity: "epic", base_value: 60000,  qualifyable: true, emoji: "🌶️", description: "Le piquant qui réveille." },
  { name: "Bacon & Cheese Crispy Chicken",category: "burger", rarity: "epic", base_value: 60000,  qualifyable: true, emoji: "🍗", description: "Poulet, bacon, fromage : la sainte trinité." },
  { name: "BBQ Bacon Crispy Chicken",     category: "burger", rarity: "epic", base_value: 60000,  qualifyable: true, emoji: "🔥", description: "Sauce BBQ fumée, bacon grillé." },
  { name: "Chicken Nuggets",              category: "burger", rarity: "epic", base_value: 50000,  qualifyable: true, emoji: "🍗", description: "Les nuggets légendaires. Trempette incluse." },
  { name: "Spicy Chicken Nuggets",        category: "burger", rarity: "epic", base_value: 60000,  qualifyable: true, emoji: "🌶️", description: "Nuggets qui piquent, valeur qui grimpe." },
  { name: "Chicken Fries",                category: "burger", rarity: "epic", base_value: 50000,  qualifyable: true, emoji: "🍟", description: "Des frites de poulet croustillantes." },
  { name: "Crispy Taco",                  category: "burger", rarity: "epic", base_value: 50000,  qualifyable: true, emoji: "🌮", description: "Un taco croustillant inattendu." },
  { name: "BIG FISH",                     category: "burger", rarity: "epic", base_value: 50000,  qualifyable: true, emoji: "🐟", description: "Le poisson qui mord à l'hameçon." },
  { name: "Steakhouse",                   category: "burger", rarity: "epic", base_value: 60000,  qualifyable: true, emoji: "🥩", description: "Un burger digne des meilleures tables." },
  { name: "Onion Rings",                  category: "burger", rarity: "epic", base_value: 50000,  qualifyable: true, emoji: "🧅", description: "Des rondelles d'oignon croustillantes à souhait." },

  // ▸▸▸ TITLES — Common
  { name: "Joueur du Dimanche",  category: "title", rarity: "common", base_value: 100, qualifyable: true,  emoji: "🎮", description: "Il vient surtout pour l'ambiance." },
  { name: "Le Curieux",          category: "title", rarity: "common", base_value: 100, qualifyable: true,  emoji: "👀", description: "Il ouvre des box juste pour voir." },
  { name: "Tocard Heureux",      category: "title", rarity: "common", base_value: 100, qualifyable: true,  emoji: "🍀", description: "Même un pigeon peut avoir de la chance." },
  { name: "Flambeur Débutant",   category: "title", rarity: "common", base_value: 100, qualifyable: true,  emoji: "💸", description: "Il mise petit mais il mise." },

  // ▸▸▸ TITLES — Rare
  { name: "Lucky Luke",          category: "title", rarity: "rare", base_value: 2000, qualifyable: true, emoji: "🤠", description: "Plus rapide que son ombre." },
  { name: "Parieur Aguerri",     category: "title", rarity: "rare", base_value: 2000, qualifyable: true, emoji: "🎯", description: "Il a vu assez de box pour savoir." },
  { name: "Dompteur de RNG",     category: "title", rarity: "rare", base_value: 2000, qualifyable: true, emoji: "🎲", description: "Il parle au hasard et le hasard répond." },
  { name: "Surfeur de la Chance",category: "title", rarity: "rare", base_value: 2000, qualifyable: true, emoji: "🏄", description: "Il surfe sur les probabilités." },
  { name: "L'Insomniaque",       category: "title", rarity: "rare", base_value: 2000, qualifyable: true, emoji: "🦉", description: "La nuit, il ouvre des box." },

  // ▸▸▸ TITLES — Epic
  { name: "High Roller",         category: "title", rarity: "epic", base_value: 50000, qualifyable: true,  emoji: "🎩", description: "Quand il mise, la table tremble." },
  { name: "Maître du Casino",    category: "title", rarity: "epic", base_value: 50000, qualifyable: true,  emoji: "🏛️", description: "Le casino, c'est chez lui." },
  { name: "Le Visionnaire",      category: "title", rarity: "epic", base_value: 50000, qualifyable: true,  emoji: "🔮", description: "Il voit les raretés avant qu'elles n'apparaissent." },
  { name: "Croupier Suprême",    category: "title", rarity: "epic", base_value: 50000, qualifyable: true,  emoji: "🃏", description: "Il distribue la chance." },
  { name: "Serial Opener",       category: "title", rarity: "epic", base_value: 50000, qualifyable: true,  emoji: "📦", description: "Des centaines de box ouvertes, jamais rassasié." },

  // ▸▸▸ TITLES — Legendary
  { name: "Roi du GOGO",        category: "title", rarity: "legendary", base_value: 150000, qualifyable: true, emoji: "👑", description: "Le roi incontesté du gambling." },
  { name: "L'Élu de la Chance",  category: "title", rarity: "legendary", base_value: 150000, qualifyable: true, emoji: "✨", description: "La chance l'a choisi." },
  { name: "La Légende",          category: "title", rarity: "legendary", base_value: 150000, qualifyable: true, emoji: "🌟", description: "On raconte encore ses exploits." },
  { name: "Dieu du Gambling",    category: "title", rarity: "legendary", base_value: 150000, qualifyable: true, emoji: "⚡", description: "Les probas se plient à sa volonté." },
  { name: "Collectionneur Fou",  category: "title", rarity: "legendary", base_value: 150000, qualifyable: true, emoji: "🧩", description: "Il lui faut TOUS les items." },

  // ▸▸▸ TITLES — Mythic
  { name: "Dragon de Jade",      category: "title", rarity: "mythic", base_value: 350000, qualifyable: true, emoji: "🐉", description: "Une créature mythique aux griffes de chance." },
  { name: "Prophète du RNG",     category: "title", rarity: "mythic", base_value: 350000, qualifyable: true, emoji: "📜", description: "Il a prédit chaque drop." },
  { name: "Être Cosmique",       category: "title", rarity: "mythic", base_value: 350000, qualifyable: true, emoji: "🌌", description: "Son existence défie les probabilités." },
  { name: "L'Insaisissable",     category: "title", rarity: "mythic", base_value: 350000, qualifyable: true, emoji: "👻", description: "On le voit rarement, on ne l'oublie jamais." },

  // ▸▸▸ TITLES — Exotic
  { name: "Astral",              category: "title", rarity: "exotic", base_value: 750000, qualifyable: true, emoji: "🌠", description: "Une présence venue d'ailleurs." },
  { name: "Nébuleux",            category: "title", rarity: "exotic", base_value: 750000, qualifyable: true, emoji: "🌫️", description: "Entouré de mystère et de rareté." },
  { name: "Flamboyant",          category: "title", rarity: "exotic", base_value: 750000, qualifyable: true, emoji: "🔥", description: "Son style brûle le leaderboard." },
  { name: "Phénix",              category: "title", rarity: "exotic", base_value: 750000, qualifyable: true, emoji: "🦅", description: "Renaît de ses cendres, toujours plus fort." },

  // ▸▸▸ TITLES — Unique
  { name: "L'Incontournable",    category: "title", rarity: "unique", base_value: 0, qualifyable: false, emoji: "💎", description: "Impossible de passer à côté de lui." },
  { name: "Le Sans Égal",        category: "title", rarity: "unique", base_value: 0, qualifyable: false, emoji: "🏆", description: "Aucun autre joueur n'arrive à sa cheville." },
  { name: "L'Unique",            category: "title", rarity: "unique", base_value: 0, qualifyable: false, emoji: "☝️", description: "Unique. Le mot parle de lui-même." },

  // ▸▸▸ STOCKS / ACTIONS (Rare)
  { name: "GOGO Coin",     category: "stock", rarity: "rare", base_value: 25000, qualifyable: false, emoji: "🪙", description: "Une action GOGO. Prend de la valeur avec le temps." },
  { name: "GAMBLING Coin", category: "stock", rarity: "rare", base_value: 25000, qualifyable: false, emoji: "🎰", description: "Une action GAMBLING. Investissement volatile." },

  // ▸▸▸ CONSUMABLES (Common)
  { name: "Ticket de Loto", category: "consumable", rarity: "common", base_value: 500, qualifyable: false, emoji: "🎟️", description: "Participe à la loterie hebdomadaire." },
  { name: "Recharge de Poulets", category: "consumable", rarity: "common", base_value: 300, qualifyable: false, emoji: "🔋", description: "Restaure toutes vos charges de combat de poulets." },
];

// ─── Helper: get items by category ───
export function getItemsByRarity(rarity: Rarity): CatalogItem[] {
  return ITEMS_CATALOG.filter((i) => i.rarity === rarity);
}

export function getItemsByCategory(category: ItemCategory): CatalogItem[] {
  return ITEMS_CATALOG.filter((i) => i.category === category);
}

// ─── Roll item from a box ───
export function rollBoxItem(
  boxKey: BoxType,
  excludeNames: string[] = []
): {
  item: CatalogItem;
  rolledRarity: Rarity | null;
} {
  const box = LOOT_BOXES.find((b) => b.key === boxKey);
  if (!box) throw new Error(`Box ${boxKey} not found`);

  // 1. Roll rarity
  const roll = Math.random() * 100;
  let cumulative = 0;
  let rolledRarity: Rarity = "common";
  const excludeSet = new Set(excludeNames);

  for (const rarity of RARITIES) {
    const prob = box.probabilities[rarity];
    if (!prob || prob === 0) continue;
    cumulative += prob;
    if (roll < cumulative) {
      rolledRarity = rarity;
      break;
    }
  }

  // 2. Pick a random item of that rarity (excluding "points" category and excluded names)
  //    For unique items, fall through to lower rarities if all are excluded
  const currentRarity: Rarity = rolledRarity;
  const rarityOrder = RARITIES.slice(RARITIES.indexOf(currentRarity));

  for (const rarity of rarityOrder) {
    const candidates = ITEMS_CATALOG.filter(
      (i) =>
        i.rarity === rarity &&
        i.category !== "points" &&
        !excludeSet.has(i.name)
    );

    if (candidates.length > 0) {
      const item =
        candidates[Math.floor(Math.random() * candidates.length)];
      return { item, rolledRarity: item.rarity };
    }
  }

  // No items available at all — return null to signal caller
  return { item: undefined as unknown as CatalogItem, rolledRarity: null };
}
