import { describe, it, expect } from 'vitest';
import { layoutResultButtons } from './resultLayout';

describe('layoutResultButtons', () => {
  it('keeps ≥16px between content bottom and Share top', () => {
    const contentBottom = 571;
    const { ys, overflow } = layoutResultButtons(contentBottom);
    expect(overflow).toBe(0);
    const shareTop = ys[0] - 54 / 2;
    expect(shareTop - contentBottom).toBeGreaterThanOrEqual(16);
  });

  it('keeps ≥8px between the three buttons', () => {
    const { ys } = layoutResultButtons(500);
    const gap01 = ys[1] - 54 / 2 - (ys[0] + 54 / 2);
    const gap12 = ys[2] - 50 / 2 - (ys[1] + 54 / 2);
    expect(gap01).toBeGreaterThanOrEqual(8);
    expect(gap12).toBeGreaterThanOrEqual(8);
  });

  it('shifts up and reports overflow when content is too low', () => {
    const { ys, overflow } = layoutResultButtons(720);
    expect(overflow).toBeGreaterThan(0);
    expect(ys[2] + 50 / 2).toBeLessThanOrEqual(800 - 8);
  });
});
