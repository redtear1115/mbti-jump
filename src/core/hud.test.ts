import { describe, it, expect } from 'vitest';
import { chipRect } from './hud';

describe('chipRect', () => {
  it('pads text bounds with defaults (10x6, r12)', () => {
    expect(chipRect(12, 158, 100, 20)).toEqual({ x: 2, y: 152, w: 120, h: 32, r: 12 });
  });

  it('accepts custom padding and radius', () => {
    expect(chipRect(135, 132, 30, 14, { padX: 8, padY: 3, r: 10 })).toEqual({
      x: 127, y: 129, w: 46, h: 20, r: 10,
    });
  });

  it('clamps radius to half the chip height', () => {
    // h = 10 + 6*2 = 22 → r 上限 11
    expect(chipRect(0, 0, 40, 10).r).toBe(11);
  });
});
