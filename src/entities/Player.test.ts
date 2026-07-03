import { describe, it, expect } from 'vitest';
import { jellyStretch, JELLY_MAX_STRETCH } from './Player';

describe('jellyStretch', () => {
  it('is round (1,1) at zero velocity', () => {
    expect(jellyStretch(0)).toEqual({ scaleX: 1, scaleY: 1 });
  });

  it('stretches taller and narrower as |vy| grows, preserving volume', () => {
    const s = jellyStretch(400);
    expect(s.scaleY).toBeGreaterThan(1);
    expect(s.scaleX).toBeLessThan(1);
    expect(s.scaleX * s.scaleY).toBeCloseTo(1, 5); // 保體積
  });

  it('is symmetric in sign (rising vs falling)', () => {
    expect(jellyStretch(300)).toEqual(jellyStretch(-300));
  });

  it('caps at JELLY_MAX_STRETCH for large |vy|', () => {
    const s = jellyStretch(100000);
    expect(s.scaleY).toBeCloseTo(1 + JELLY_MAX_STRETCH, 5);
  });
});
