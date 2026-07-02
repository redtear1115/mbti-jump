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
    // base c0aee2 (192,174,226) → E f0b84a (240,184,74)，t=0.75*1/4=0.1875
    // r=192+48*.1875=201, g=174+10*.1875≈176, b=226-152*.1875≈198 → 0xc9b0c6
    expect(playerColorFor(['E'])).toBe(0xc9b0c6);
  });

  it('lands at 75% of the group color after four locks (avoids muddy-gray average)', () => {
    // INFP → diplomat group color 0x33a474 (51,164,116); base (192,174,226); t=0.75
    // r=192-105.75=86.25→86, g=174-7.5=166.5→167, b=226-82.5=143.5→144 → 0x56a790
    expect(playerColorFor(['I', 'N', 'F', 'P'])).toBe(0x56a790);
  });

  it('still uses the average path for three locked letters', () => {
    // I 2e6d86, N 6e79b0, F 33a474 → avg r=69, g≈131.33→131, b=142
    // t=0.75*3/4=0.5625: r=192-123*0.5625≈123, g=174-43*0.5625≈150, b=226-84*0.5625≈179 → 0x7b96b3
    const three = playerColorFor(['I', 'N', 'F']);
    expect(three).toBe(0x7b96b3);
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
