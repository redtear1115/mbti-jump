import { describe, it, expect } from 'vitest';
import { clampInset, safeTopDelta } from './safeArea';

describe('clampInset', () => {
  it('enforces non-negative then min', () => {
    expect(clampInset(0, 12)).toBe(12);
    expect(clampInset(8, 12)).toBe(12);
    expect(clampInset(44, 12)).toBe(44);
    expect(clampInset(-3, 12)).toBe(12);
  });

  it('treats non-finite as min', () => {
    expect(clampInset(Number.NaN, 12)).toBe(12);
    expect(clampInset(Number.POSITIVE_INFINITY, 12)).toBe(12);
  });
});

describe('safeTopDelta', () => {
  it('is 0 when document is unavailable (node tests)', () => {
    expect(safeTopDelta(12)).toBe(0);
  });
});
