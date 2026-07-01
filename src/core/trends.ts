import { DIMENSIONS } from '../config/questions';
import type { Dimension } from '../config/questions';
import type { PlayRecord } from './profile';

export interface DimensionLean {
  first: number;
  second: number;
  firstPct: number;
  secondPct: number;
}

export interface Trends {
  totalPlays: number;
  topType: string | null;
  dimensionLean: Record<Dimension, DimensionLean>;
  recent: PlayRecord[];
}

export const RECENT_LIMIT = 5;

export function computeTrends(plays: readonly PlayRecord[]): Trends {
  const totalPlays = plays.length;

  // 最常出現的型；並列時取最先達到最大次數者
  const counts = new Map<string, number>();
  let topType: string | null = null;
  let topCount = 0;
  for (const p of plays) {
    const c = (counts.get(p.type) ?? 0) + 1;
    counts.set(p.type, c);
    if (c > topCount) {
      topCount = c;
      topType = p.type;
    }
  }

  const dimensionLean = {} as Record<Dimension, DimensionLean>;
  for (const d of DIMENSIONS) {
    let first = 0;
    let second = 0;
    for (const p of plays) {
      const tt = p.tallies[d];
      if (tt) {
        first += tt[0];
        second += tt[1];
      }
    }
    const total = first + second;
    const firstPct = total > 0 ? Math.round((first / total) * 100) : 0;
    dimensionLean[d] = { first, second, firstPct, secondPct: total > 0 ? 100 - firstPct : 0 };
  }

  const recent = plays.slice(Math.max(0, plays.length - RECENT_LIMIT)).reverse();

  return { totalPlays, topType, dimensionLean, recent };
}
