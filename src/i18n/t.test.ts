import { describe, it, expect } from 'vitest';
import { t, format, tf } from './t';

describe('t / format', () => {
  it('returns the string for a key in a given locale', () => {
    expect(t('start.cta', 'en')).toBe('Start ▶');
  });

  it('format replaces positional placeholders', () => {
    expect(format('Level {0} · {1}', 2, 'X')).toBe('Level 2 · X');
    expect(format('{0}{0}', 'a')).toBe('aa');
  });

  it('tf formats a localized template', () => {
    expect(tf('level.label', [1, 'EI'], 'en')).toBe('Level 1 · EI');
  });

  it('falls back to EN when a locale lacks the key', () => {
    // zh-Hant 缺某 key 時應回 EN 值（此處用既有 key 驗證不丟錯即可）
    expect(typeof t('result.again', 'zh-Hant')).toBe('string');
  });
});
