import { describe, it, expect } from 'vitest';
import { buildShareCardModel } from './shareCardModel';
import type { Dimension } from '../config/questions';

const tallies: Record<Dimension, [number, number]> = {
  EI: [2, 1],
  SN: [3, 0],
  TF: [1, 2],
  JP: [0, 0],
};

describe('buildShareCardModel', () => {
  it('carries the type and four dimension bars', () => {
    const m = buildShareCardModel('ENFP', tallies, 'en');
    expect(m.type).toBe('ENFP');
    expect(m.dims).toHaveLength(4);
  });

  it('computes divider fractions from tallies (0-0 centred)', () => {
    const m = buildShareCardModel('ENFP', tallies, 'en');
    expect(m.dims[0].dividerFrac).toBeCloseTo(2 / 3, 5); // EI 2:1
    expect(m.dims[1].dividerFrac).toBe(1); // SN 3:0
    expect(m.dims[3].dividerFrac).toBe(0.5); // JP 0:0
  });

  it('resolves group name, description and tagline via i18n', () => {
    const m = buildShareCardModel('ENFP', tallies, 'en');
    expect(m.groupName).toContain('·');
    expect(m.groupName).toContain('a Diplomat');
    expect(m.description.length).toBeGreaterThan(0);
    expect(m.tagline.length).toBeGreaterThan(0);
  });
});
