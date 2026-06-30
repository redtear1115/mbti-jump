import { describe, it, expect } from 'vitest';
import { tiltToAxis } from './tilt';

describe('tiltToAxis', () => {
  it('returns 0 inside the dead zone', () => {
    expect(tiltToAxis(0)).toBe(0);
    expect(tiltToAxis(2)).toBe(0);
    expect(tiltToAxis(-2)).toBe(0);
  });

  it('clamps to 1 / -1 beyond max angle', () => {
    expect(tiltToAxis(90)).toBe(1);
    expect(tiltToAxis(-90)).toBe(-1);
  });

  it('is signed: positive tilt = right, negative = left', () => {
    expect(tiltToAxis(30)).toBeGreaterThan(0);
    expect(tiltToAxis(-30)).toBeLessThan(0);
  });

  it('scales roughly linearly between dead zone and max', () => {
    const mid = tiltToAxis(16); // 介於死區(3)與最大(30)之間
    expect(mid).toBeGreaterThan(0.3);
    expect(mid).toBeLessThan(0.7);
  });
});
