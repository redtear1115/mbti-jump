import { describe, it, expect } from 'vitest';
import { describeType, typeName } from './personalities';
import { MBTI_TYPES } from '../core/mbtiType';

describe('describeType', () => {
  it('returns the per-type copy, distinct across all 16 types', () => {
    const descs = MBTI_TYPES.map((t) => describeType(t, 'zh-Hant'));
    expect(new Set(descs).size).toBe(16);
    for (const d of descs) expect(d.length).toBeGreaterThan(10);
  });

  it('respects locale', () => {
    expect(describeType('INFP', 'en')).not.toBe(describeType('INFP', 'zh-Hant'));
  });

  it('throws on invalid type', () => {
    expect(() => describeType('ABCD')).toThrow();
    expect(() => describeType('INF')).toThrow();
  });
});

describe('typeName', () => {
  it('returns the per-type nickname, distinct across all 16 types', () => {
    const names = MBTI_TYPES.map((t) => typeName(t, 'zh-Hant'));
    expect(new Set(names).size).toBe(16);
  });

  it('throws on invalid type', () => {
    expect(() => typeName('XXXX')).toThrow();
  });
});
