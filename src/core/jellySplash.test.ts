import { describe, it, expect } from 'vitest';
import {
  splashDroplets,
  splashTravel,
  SPLASH_COUNT,
  SPLASH_LIFE_MS_MIN,
  SPLASH_LIFE_MS_MAX,
} from './jellySplash';

describe('splashDroplets', () => {
  it('returns the requested count', () => {
    expect(splashDroplets(0, () => 0.5)).toHaveLength(0);
    expect(splashDroplets(SPLASH_COUNT, () => 0.5)).toHaveLength(SPLASH_COUNT);
  });

  it('fans outward with upward bias (Phaser y+ down → mean vy < 0)', () => {
    let i = 0;
    const seq = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.15, 0.25, 0.35];
    const rng = () => seq[i++ % seq.length]!;
    const drops = splashDroplets(8, rng);
    const meanVy = drops.reduce((s, d) => s + d.vy, 0) / drops.length;
    expect(meanVy).toBeLessThan(0);
    expect(drops.some((d) => d.vx < 0)).toBe(true);
    expect(drops.some((d) => d.vx > 0)).toBe(true);
  });

  it('keeps lifeMs within the intentional splash window', () => {
    const drops = splashDroplets(12, () => 0.5);
    for (const d of drops) {
      expect(d.lifeMs).toBeGreaterThanOrEqual(SPLASH_LIFE_MS_MIN);
      expect(d.lifeMs).toBeLessThanOrEqual(SPLASH_LIFE_MS_MAX);
      expect(d.radius).toBeGreaterThan(0);
      expect(d.alpha).toBeGreaterThan(0);
      expect(d.alpha).toBeLessThanOrEqual(1);
    }
  });
});

describe('splashTravel', () => {
  it('moves left/up for negative vx/vy over the droplet lifetime', () => {
    const { dx, dy } = splashTravel({ vx: -100, vy: -200, lifeMs: 400 });
    expect(dx).toBeCloseTo(-40, 5);
    // -200*0.4 + 0.5*220*0.16 = -80 + 17.6 = -62.4
    expect(dy).toBeCloseTo(-62.4, 5);
  });
});
