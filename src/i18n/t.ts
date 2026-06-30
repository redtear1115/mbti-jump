import { EN } from './strings/en';
import type { StringKey } from './strings/en';
import { getLocale } from './store';
import type { Locale } from './locales';

export type { StringKey };

/**
 * locale → 字串表。Task 6 會把其他語言補進來。
 * 先以 EN 佔位，確保此檔可獨立編譯/測試。
 */
export const TABLES: Record<Locale, Record<StringKey, string>> = {
  en: EN,
  'zh-Hant': EN,
  'zh-Hans': EN,
  ja: EN,
  es: EN,
};

export function t(key: StringKey, locale: Locale = getLocale()): string {
  return TABLES[locale]?.[key] ?? EN[key] ?? String(key);
}

export function format(template: string, ...args: (string | number)[]): string {
  return template.replace(/\{(\d+)\}/g, (_, i) => {
    const v = args[Number(i)];
    return v === undefined ? '' : String(v);
  });
}

export function tf(key: StringKey, args: (string | number)[], locale?: Locale): string {
  return format(t(key, locale), ...args);
}
