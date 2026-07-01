import { describe, it, expect } from 'vitest';
import { scoreBarModel } from './scoreBar';

describe('scoreBarModel', () => {
  it('centres the divider when both sides are zero', () => {
    expect(scoreBarModel('E', 0, 'I', 0).dividerFrac).toBe(0.5);
  });

  it('sets dividerFrac to the first letter share', () => {
    expect(scoreBarModel('E', 2, 'I', 1).dividerFrac).toBeCloseTo(2 / 3, 5);
    expect(scoreBarModel('S', 0, 'N', 3).dividerFrac).toBe(0);
  });

  it('formats side labels as "<letter> <count>"', () => {
    const m = scoreBarModel('T', 1, 'F', 2);
    expect(m.leftLabel).toBe('T 1');
    expect(m.rightLabel).toBe('F 2');
  });
});
