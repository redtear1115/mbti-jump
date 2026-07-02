import { describe, it, expect } from 'vitest';
import { buildOgMeta } from './ogMeta';
import { SUPPORTED_LOCALES } from '../i18n/locales';
import { MBTI_TYPES } from '../core/mbtiType';

describe('buildOgMeta', () => {
  it('builds locale-specific urls and copy', () => {
    const m = buildOgMeta('INFP', 'ja', 'https://example.com');
    expect(m.imageUrl).toBe('https://example.com/og/ja/INFP.png');
    expect(m.pageUrl).toBe('https://example.com/t/INFP?lang=ja');
    expect(m.title).toContain('INFP');
    expect(m.description.length).toBeGreaterThan(10);
  });

  it('produces non-empty copy for all 16 types × 5 locales', () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const type of MBTI_TYPES) {
        const m = buildOgMeta(type, locale, 'https://x.dev');
        expect(m.title).toContain(type);
        expect(m.description.length).toBeGreaterThan(0);
      }
    }
  });
});
