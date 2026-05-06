import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCompactPoints(points: number): string {
  const abs = Math.abs(points);
  if (abs < 10_000) return points.toLocaleString();

  const format = (val: number): string => (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1));

  if (abs < 1_000_000) return `${format(points / 1_000)}k`;
  if (abs < 1_000_000_000) return `${format(points / 1_000_000)}M`;
  return `${format(points / 1_000_000_000)}Md`;
}
