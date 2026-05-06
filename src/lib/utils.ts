import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCompactPoints(points: number): string {
  const abs = Math.abs(points);
  if (abs < 10_000) return points.toLocaleString();
  if (abs < 1_000_000) return `${(points / 1_000).toFixed(1)}k`;
  if (abs < 1_000_000_000) return `${(points / 1_000_000).toFixed(1)}M`;
  return `${(points / 1_000_000_000).toFixed(1)}Md`;
}
