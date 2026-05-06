const RANK_TITLES = [
  {
    title: "Le Pigeon de Service",
    description: "Il cherche encore où insérer ses pièces de 2 centimes.",
  },
  {
    title: "Donateur Bénévole",
    description: "Il vient surtout pour financer la nouvelle moquette du casino.",
  },
  {
    title: "Parieur du Dimanche",
    description: "Son plus gros frisson ? Gagner un jeton au bingo de la salle des fêtes.",
  },
  {
    title: "Abonné au Buffet",
    description: "Il joue peu, mais il a déjà rentabilisé son entrée avec les cacahuètes gratuites.",
  },
  {
    title: "Flambeur de Ticket Resto",
    description: "Il commence à miser sérieusement, mais garde un œil sur son budget déjeuner.",
  },
  {
    title: 'Le Chevalier du "Tout-Pile"',
    description: "Adepte du tapis (All-in) sauvage, souvent par pure panique.",
  },
  {
    title: "Requin de Baignoire",
    description: "Il se croit redoutable, mais il stagne encore dans le petit bain.",
  },
  {
    title: "Baleine à Jetons",
    description: "Quand il s'assoit, le niveau de la mer (et de la banque) monte d'un coup.",
  },
  {
    title: "Le Cauchemar du Croupier",
    description: "Il compte les cartes plus vite qu'une calculatrice et ne sourit jamais.",
  },
  {
    title: "Actionnaire (Malgré Lui)",
    description: "Il a tellement perdu (ou gagné) qu'une des machines à sous porte son nom de famille.",
  },
];

const MAX_LEVEL = 100;

function computeThresholds(): number[] {
  const thresholds: number[] = [0]; // Level 1 starts at 0
  for (let level = 2; level <= MAX_LEVEL; level++) {
    thresholds.push(Math.round(100 * Math.pow(1.30, level - 2)));
  }
  return thresholds;
}

const THRESHOLDS = computeThresholds();

export interface RankInfo {
  level: number;
  title: string;
  description: string;
  currentThreshold: number;
  nextThreshold: number | null;
  progress: number; // 0 to 1
}

export function getRankInfo(peakNetWorth: number): RankInfo {
  let level = 1;
  for (let i = THRESHOLDS.length - 1; i >= 0; i--) {
    if (peakNetWorth >= THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }

  const titleIndex = (level - 1) % RANK_TITLES.length;
  const rankTitle = RANK_TITLES[titleIndex];

  const currentThreshold = THRESHOLDS[level - 1];
  const nextThreshold = level < MAX_LEVEL ? THRESHOLDS[level] : null;

  const progress = nextThreshold
    ? Math.min(1, Math.max(0, (peakNetWorth - currentThreshold) / (nextThreshold - currentThreshold)))
    : 1;

  return {
    level,
    title: rankTitle.title,
    description: rankTitle.description,
    currentThreshold,
    nextThreshold,
    progress,
  };
}

export function getRankThresholds(): number[] {
  return THRESHOLDS;
}
