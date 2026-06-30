import { EN } from './strings/en';
import { ZH_HANT } from './strings/zh-Hant';
import { ZH_HANS } from './strings/zh-Hans';
import { JA } from './strings/ja';
import { ES } from './strings/es';
import type { StringKey } from './strings/en';
import { getLocale } from './store';
import type { Locale } from './locales';

export type { StringKey };

export const TABLES: Record<Locale, Record<StringKey, string>> = {
  en: EN,
  'zh-Hant': ZH_HANT,
  'zh-Hans': ZH_HANS,
  ja: JA,
  es: ES,
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
