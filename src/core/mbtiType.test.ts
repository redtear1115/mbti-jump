import { describe, it, expect } from 'vitest';
import { normalizeMbtiType, MBTI_TYPES } from './mbtiType';

describe('normalizeMbtiType', () => {
  it('accepts valid types case-insensitively', () => {
    expect(normalizeMbtiType('INFP')).toBe('INFP');
    expect(normalizeMbtiType('infp')).toBe('INFP');
    expect(normalizeMbtiType('EsTj')).toBe('ESTJ');
  });

  it('rejects invalid input', () => {
    expect(normalizeMbtiType('ABCD')).toBeNull();
    expect(normalizeMbtiType('IN')).toBeNull();
    expect(normalizeMbtiType('INFPX')).toBeNull();
    expect(normalizeMbtiType('')).toBeNull();
    expect(normalizeMbtiType('IEFP')).toBeNull(); // 字母都合法但位置錯（第 2 位須為 S/N）
  });
});

describe('MBTI_TYPES', () => {
  it('has all 16 types', () => {
    expect(MBTI_TYPES).toHaveLength(16);
    expect(MBTI_TYPES).toContain('INFP');
    expect(MBTI_TYPES).toContain('ESTJ');
    expect(new Set(MBTI_TYPES).size).toBe(16);
  });
});
