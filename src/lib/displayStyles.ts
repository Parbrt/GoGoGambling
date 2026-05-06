import type { CSSProperties } from "react";

// ─── Rarity hex colors (match Tailwind values used in RARITY_TEXT) ───

export const RARITY_HEX: Record<string, string> = {
  unique:    "#FACC15",
  exotic:    "#EF4444",
  mythic:    "#D946EF",
  legendary: "#F97316",
  epic:      "#A855F7",
  rare:      "#3B82F6",
  common:    "#9CA3AF",
};

// ─── Style definition ───

export type DisplayStyleDef = {
  /** Dynamic CSS properties for the pill container */
  container: (hex: string) => CSSProperties;
  /** Tailwind classes for text formatting (weight, style, decoration) */
  textClass: string;
  /** Dynamic CSS properties for the text span (color or gradient) */
  textStyle: (hex: string) => CSSProperties;
};

export const DISPLAY_STYLE_CONFIG: Record<string, DisplayStyleDef> = {
  default: {
    container: () => ({ background: "#FFFFFF", border: "1px solid rgba(209,205,199,0.5)" }),
    textClass: "text-[10px] font-bold uppercase tracking-[0.03em]",
    textStyle: (hex) => ({ color: hex }),
  },
  bold: {
    container: () => ({ background: "#FFFFFF", border: "1px solid rgba(209,205,199,0.5)" }),
    textClass: "text-[10px] font-black uppercase tracking-[0.04em]",
    textStyle: (hex) => ({ color: hex }),
  },
  italic: {
    container: () => ({ background: "#FFFFFF", border: "1px solid rgba(209,205,199,0.5)" }),
    textClass: "text-[10px] font-bold italic tracking-[0.02em]",
    textStyle: (hex) => ({ color: hex }),
  },
  bold_italic: {
    container: () => ({ background: "#FFFFFF", border: "1px solid rgba(209,205,199,0.5)" }),
    textClass: "text-[10px] font-black italic tracking-[0.02em]",
    textStyle: (hex) => ({ color: hex }),
  },
  underline: {
    container: () => ({ background: "#FFFFFF", border: "1px solid rgba(209,205,199,0.5)" }),
    textClass: "text-[10px] font-bold uppercase tracking-[0.03em] underline underline-offset-2 decoration-1",
    textStyle: (hex) => ({ color: hex }),
  },
  strikethrough: {
    container: () => ({ background: "#FFFFFF", border: "1px solid rgba(209,205,199,0.5)" }),
    textClass: "text-[10px] font-bold uppercase tracking-[0.03em] line-through",
    textStyle: (hex) => ({ color: hex }),
  },
  tinted: {
    container: (hex) => ({ background: hex + "18", border: `1px solid ${hex}44` }),
    textClass: "text-[10px] font-bold uppercase tracking-[0.03em]",
    textStyle: (hex) => ({ color: hex }),
  },
  tinted_bold: {
    container: (hex) => ({ background: hex + "18", border: `1px solid ${hex}44` }),
    textClass: "text-[10px] font-black uppercase tracking-[0.04em]",
    textStyle: (hex) => ({ color: hex }),
  },
  glow: {
    container: (hex) => ({
      background: "#FFFFFF",
      border: `1px solid ${hex}80`,
      boxShadow: `0 0 8px ${hex}40, 0 0 16px ${hex}20`,
    }),
    textClass: "text-[10px] font-bold uppercase tracking-[0.03em]",
    textStyle: (hex) => ({ color: hex }),
  },
  glow_bold: {
    container: (hex) => ({
      background: "#FFFFFF",
      border: `1px solid ${hex}80`,
      boxShadow: `0 0 10px ${hex}50, 0 0 20px ${hex}25`,
    }),
    textClass: "text-[10px] font-black uppercase tracking-[0.04em]",
    textStyle: (hex) => ({ color: hex }),
  },
  solid: {
    container: (hex) => ({ background: hex, border: "1px solid transparent" }),
    textClass: "text-[10px] font-black uppercase tracking-[0.04em]",
    textStyle: () => ({ color: "#FFFFFF" }),
  },
  solid_italic: {
    container: (hex) => ({ background: hex, border: "1px solid transparent" }),
    textClass: "text-[10px] font-black italic tracking-[0.02em]",
    textStyle: () => ({ color: "#FFFFFF" }),
  },
  outlined: {
    container: (hex) => ({ background: "transparent", border: `1.5px solid ${hex}99` }),
    textClass: "text-[10px] font-bold uppercase tracking-[0.03em]",
    textStyle: (hex) => ({ color: hex }),
  },
  gradient: {
    container: (hex) => ({
      background: `linear-gradient(135deg, ${hex}DD 0%, ${hex}77 100%)`,
      border: "1px solid transparent",
    }),
    textClass: "text-[10px] font-bold uppercase tracking-[0.03em]",
    textStyle: () => ({ color: "#FFFFFF" }),
  },
  rainbow: {
    container: () => ({ background: "#FFFFFF", border: "1px solid rgba(250,204,21,0.4)" }),
    textClass: "text-[10px] font-black italic tracking-[0.02em]",
    textStyle: () => ({
      background: "linear-gradient(90deg,#FF4444,#FF8C00,#FFD700,#44CC88,#4488FF,#CC44FF)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
    } as CSSProperties),
  },
};

// ─── Roll pools per rarity (weighted) ───

const RARITY_STYLE_POOLS: Record<string, [string, number][]> = {
  common:    [["default",70],["bold",20],["italic",10]],
  rare:      [["default",50],["bold",20],["italic",15],["tinted",15]],
  epic:      [["default",40],["bold",15],["italic",15],["tinted",15],["underline",15]],
  legendary: [["default",30],["bold_italic",15],["tinted",15],["glow",15],["underline",15],["strikethrough",10]],
  mythic:    [["default",20],["tinted",15],["glow",15],["solid",15],["italic",15],["gradient",10],["outlined",10]],
  exotic:    [["default",20],["glow",15],["tinted_bold",15],["solid",15],["bold_italic",15],["gradient",10],["strikethrough",10]],
  unique:    [["glow",15],["gradient",15],["solid",15],["rainbow",15],["tinted_bold",15],["bold_italic",10],["outlined",10],["glow_bold",5]],
};

export function rollDisplayStyle(rarity: string): string {
  const pool = RARITY_STYLE_POOLS[rarity] ?? RARITY_STYLE_POOLS.common;
  const total = pool.reduce((sum, [, w]) => sum + w, 0);
  let rand = Math.random() * total;
  for (const [style, weight] of pool) {
    rand -= weight;
    if (rand <= 0) return style;
  }
  return "default";
}

/** Resolve a style def with fallback to default */
export function getStyleDef(code: string | null | undefined): DisplayStyleDef {
  return DISPLAY_STYLE_CONFIG[code ?? "default"] ?? DISPLAY_STYLE_CONFIG.default;
}
