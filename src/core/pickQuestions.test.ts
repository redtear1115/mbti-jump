import { describe, it, expect } from 'vitest';
import { pickQuestions } from './pickQuestions';
import type { QuestionDef } from '../config/questions';

const pool: QuestionDef[] = Array.from({ length: 10 }, (_, i) => ({
  id: `q${i}`,
  dimension: 'EI',
  yes: { side: 'E' },
  no: { side: 'I' },
}));

/** 固定序列的假 rng（回 [0,1)），循環使用。 */
function seq(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('pickQuestions', () => {
  it('returns exactly count distinct questions from the pool', () => {
    const picked = pickQuestions(pool, 5, Math.random);
    expect(picked).toHaveLength(5);
    expect(new Set(picked.map((q) => q.id)).size).toBe(5);
    for (const q of picked) expect(pool).toContain(q);
  });

  it('does not mutate the input pool', () => {
    const before = pool.map((q) => q.id);
    pickQuestions(pool, 5, seq([0.1, 0.5, 0.9, 0.3, 0.7]));
    expect(pool.map((q) => q.id)).toEqual(before);
  });

  it('returns the whole pool (shuffled) when count >= pool length', () => {
    const picked = pickQuestions(pool, 20, seq([0.5]));
    expect(picked).toHaveLength(pool.length);
    expect(new Set(picked.map((q) => q.id))).toEqual(new Set(pool.map((q) => q.id)));
  });

  it('is deterministic for a fixed rng', () => {
    const nums = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
    const a = pickQuestions(pool, 5, seq(nums)).map((q) => q.id);
    const b = pickQuestions(pool, 5, seq(nums)).map((q) => q.id);
    expect(a).toEqual(b);
  });
});
