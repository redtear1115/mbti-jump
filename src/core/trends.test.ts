import { describe, it, expect } from 'vitest';
import { computeTrends, RECENT_LIMIT } from './trends';
import type { PlayRecord } from './profile';
import type { Dimension } from '../config/questions';

const mk = (type: string, at: number, tallies: Record<Dimension, [number, number]>): PlayRecord => ({ at, type, tallies });
const T = (ei: [number, number]): Record<Dimension, [number, number]> => ({ EI: ei, SN: [0, 0], TF: [0, 0], JP: [0, 0] });

describe('computeTrends', () => {
  it('handles empty history', () => {
    const r = computeTrends([]);
    expect(r.totalPlays).toBe(0);
    expect(r.topType).toBeNull();
    expect(r.recent).toEqual([]);
    expect(r.dimensionLean.EI).toEqual({ first: 0, second: 0, firstPct: 0, secondPct: 0 });
  });

  it('counts plays and picks the most frequent type', () => {
    const r = computeTrends([mk('ENFP', 1, T([3, 2])), mk('ENFP', 2, T([1, 4])), mk('INTJ', 3, T([2, 3]))]);
    expect(r.totalPlays).toBe(3);
    expect(r.topType).toBe('ENFP');
  });

  it('on a tie, keeps the type that reached the max count first', () => {
    // ENFP 到 2 早於 INTJ 到 2
    const r = computeTrends([mk('ENFP', 1, T([0, 0])), mk('INTJ', 2, T([0, 0])), mk('ENFP', 3, T([0, 0])), mk('INTJ', 4, T([0, 0]))]);
    expect(r.topType).toBe('ENFP');
  });

  it('sums tallies per dimension into percentages (second = 100 - first)', () => {
    const r = computeTrends([mk('X', 1, T([6, 2])), mk('Y', 2, T([2, 0]))]); // EI 合計 8:2 → 80/20
    expect(r.dimensionLean.EI).toEqual({ first: 8, second: 2, firstPct: 80, secondPct: 20 });
  });

  it('returns the most recent RECENT_LIMIT plays, newest first', () => {
    const plays = Array.from({ length: RECENT_LIMIT + 3 }, (_, i) => mk('ENFP', i, T([0, 0])));
    const r = computeTrends(plays);
    expect(r.recent).toHaveLength(RECENT_LIMIT);
    expect(r.recent[0].at).toBe(RECENT_LIMIT + 2); // 最新
    expect(r.recent[RECENT_LIMIT - 1].at).toBe(3);
  });
});
