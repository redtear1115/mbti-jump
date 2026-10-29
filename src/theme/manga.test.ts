import { describe, it, expect } from 'vitest';
import { INK, INK_CSS, PAPER, PAPER_CSS, mixInk } from './manga';

describe('manga theme', () => {
  it('INK and PAPER match their CSS hex representations', () => {
    expect('#' + INK.toString(16).padStart(6, '0')).toBe(INK_CSS);
    expect('#' + PAPER.toString(16).padStart(6, '0')).toBe(PAPER_CSS);
  });

  it('mixInk returns original color at t=0 and INK at t=1', () => {
    expect(mixInk(0xffffff, 0)).toBe(0xffffff);
    expect(mixInk(0xffffff, 1)).toBe(INK);
    expect(mixInk(0x33a474, 0)).toBe(0x33a474);
    expect(mixInk(0x33a474, 1)).toBe(INK);
  });

  it('mixInk interpolates intermediate values darkened toward INK', () => {
    const mid = mixInk(0xffffff, 0.5);
    expect(mid).toBeGreaterThan(INK);
    expect(mid).toBeLessThan(0xffffff);
  });
});
