import { describe, it, expect } from 'vitest';
import { groupOf, colorOf, groupColorOf, GROUP_COLORS } from './temperament';
import { PALETTE } from '../theme/palette';

describe('temperament grouping', () => {
  it('maps N+F types to diplomat', () => {
    for (const t of ['INFJ', 'INFP', 'ENFJ', 'ENFP']) expect(groupOf(t)).toBe('diplomat');
  });
  it('maps N+T types to analyst', () => {
    for (const t of ['INTJ', 'INTP', 'ENTJ', 'ENTP']) expect(groupOf(t)).toBe('analyst');
  });
  it('maps S+J types to sentinel', () => {
    for (const t of ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ']) expect(groupOf(t)).toBe('sentinel');
  });
  it('maps S+P types to explorer', () => {
    for (const t of ['ISTP', 'ISFP', 'ESTP', 'ESFP']) expect(groupOf(t)).toBe('explorer');
  });
  it('covers all 16 types (each maps to a group)', () => {
    const seen = new Set<string>();
    for (const a of ['E', 'I']) for (const b of ['S', 'N']) for (const c of ['T', 'F']) for (const d of ['J', 'P']) {
      seen.add(groupOf(`${a}${b}${c}${d}`));
    }
    expect(seen).toEqual(new Set(['explorer', 'diplomat', 'analyst', 'sentinel']));
  });
  it('colorOf / groupColorOf return palette colors', () => {
    expect(colorOf('analyst')).toBe(PALETTE.analyst);
    expect(groupColorOf('ENFP')).toBe(PALETTE.diplomat);
    expect(GROUP_COLORS.sentinel).toBe(PALETTE.sentinel);
  });
  it('throws on malformed type', () => {
    expect(() => groupOf('ABC')).toThrow();
    expect(() => groupOf('ENFPX')).toThrow();
  });
});
