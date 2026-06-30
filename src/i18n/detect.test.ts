import { describe, it, expect } from 'vitest';
import { detectLocale } from './detect';

describe('detectLocale', () => {
  it('maps Traditional Chinese regions to zh-Hant', () => {
    expect(detectLocale(['zh-TW'])).toBe('zh-Hant');
    expect(detectLocale(['zh-HK'])).toBe('zh-Hant');
    expect(detectLocale(['zh-MO'])).toBe('zh-Hant');
    expect(detectLocale(['zh-Hant'])).toBe('zh-Hant');
  });

  it('maps Simplified Chinese and bare zh to zh-Hans', () => {
    expect(detectLocale(['zh-CN'])).toBe('zh-Hans');
    expect(detectLocale(['zh-SG'])).toBe('zh-Hans');
    expect(detectLocale(['zh-Hans'])).toBe('zh-Hans');
    expect(detectLocale(['zh'])).toBe('zh-Hans');
  });

  it('maps ja and es by prefix', () => {
    expect(detectLocale(['ja-JP'])).toBe('ja');
    expect(detectLocale(['es-ES'])).toBe('es');
    expect(detectLocale(['es-419'])).toBe('es');
  });

  it('defaults unknown / empty to en', () => {
    expect(detectLocale(['en-US'])).toBe('en');
    expect(detectLocale(['fr'])).toBe('en');
    expect(detectLocale([])).toBe('en');
  });

  it('scans the list and returns the first supported match', () => {
    expect(detectLocale(['fr', 'de', 'zh-TW', 'en'])).toBe('zh-Hant');
    expect(detectLocale(['fr', 'en-GB'])).toBe('en');
  });

  it('is case-insensitive', () => {
    expect(detectLocale(['ZH-tw'])).toBe('zh-Hant');
    expect(detectLocale(['JA'])).toBe('ja');
  });
});
