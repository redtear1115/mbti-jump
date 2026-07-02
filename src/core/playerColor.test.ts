import { describe, it, expect } from 'vitest';
import { lerpColor, playerColorFor, PLAYER_BASE_COLOR } from './playerColor';

describe('lerpColor', () => {
  it('returns endpoints at t=0 and t=1', () => {
    expect(lerpColor(0x000000, 0xffffff, 0)).toBe(0x000000);
    expect(lerpColor(0x000000, 0xffffff, 1)).toBe(0xffffff);
  });

  it('interpolates per channel with rounding', () => {
    expect(lerpColor(0x000000, 0xffffff, 0.5)).toBe(0x808080); // 127.5 → 128
    expect(lerpColor(0x102030, 0x304050, 0.5)).toBe(0x203040);
  });
});

describe('playerColorFor', () => {
  it('returns base color with no locked letters', () => {
    expect(playerColorFor([])).toBe(PLAYER_BASE_COLOR);
  });

  it('moves 18.75% toward the letter color after one lock', () => {
    // base f0f0f4 (240,240,244) → E f0b84a (240,184,74)，t=0.75*1/4=0.1875
    // r=240, g=240−10.5=229.5→230, b=244−31.875=212.125→212 → 0xf0e6d4
    expect(playerColorFor(['E'])).toBe(0xf0e6d4);
  });

  it('lands at 75% of the group color after four locks (avoids muddy-gray average)', () => {
    // INFP → diplomat group color 0x33a474 (51,164,116); base (240,240,244); t=0.75
    // r=240−141.75=98.25→98, g=240−57=183, b=244−96=148 → 0x62b794
    expect(playerColorFor(['I', 'N', 'F', 'P'])).toBe(0x62b794);
  });

  it('still uses the average path for three locked letters', () => {
    // I 2e6d86, N 6e79b0, F 33a474 → avg r=69, g≈131.33→131, b=142
    // t=0.75*3/4=0.5625: r=240−96.1875→144, g=240−61.3125→179, b=244−57.375→187 → 0x90b3bb
    const three = playerColorFor(['I', 'N', 'F']);
    expect(three).toBe(0x90b3bb);
    expect(three).not.toBe(playerColorFor(['I', 'N', 'F', 'P']));
  });

  it('each channel stays between base and target', () => {
    const c = playerColorFor(['E']);
    const ch = (n: number, s: number) => (n >> s) & 0xff;
    for (const s of [16, 8, 0]) {
      const lo = Math.min(ch(PLAYER_BASE_COLOR, s), ch(0xf0b84a, s));
      const hi = Math.max(ch(PLAYER_BASE_COLOR, s), ch(0xf0b84a, s));
      expect(ch(c, s)).toBeGreaterThanOrEqual(lo);
      expect(ch(c, s)).toBeLessThanOrEqual(hi);
    }
  });
});
