import { DEFAULT_LOCALE } from './locales';
import type { Locale } from './locales';

function matchOne(raw: string): Locale | null {
  const lc = raw.toLowerCase();
  if (lc.startsWith('zh')) {
    if (lc.includes('hant') || lc.includes('tw') || lc.includes('hk') || lc.includes('mo')) {
      return 'zh-Hant';
    }
    return 'zh-Hans'; // zh, zh-cn, zh-sg, zh-hans 等
  }
  if (lc.startsWith('ja')) return 'ja';
  if (lc.startsWith('es')) return 'es';
  if (lc.startsWith('en')) return 'en';
  return null;
}

/** 把 navigator.languages 純映射為 Locale；都對不上回 DEFAULT_LOCALE。 */
export function detectLocale(langs: readonly string[]): Locale {
  for (const raw of langs) {
    const m = matchOne(raw);
    if (m) return m;
  }
  return DEFAULT_LOCALE;
}
