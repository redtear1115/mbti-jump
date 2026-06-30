export type Locale = 'en' | 'zh-Hant' | 'zh-Hans' | 'ja' | 'es';

export const SUPPORTED_LOCALES: Locale[] = ['en', 'zh-Hant', 'zh-Hans', 'ja', 'es'];

export const DEFAULT_LOCALE: Locale = 'en';

/** 語言選單顯示用：各以該語言自稱 */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  'zh-Hant': '繁體中文',
  'zh-Hans': '简体中文',
  ja: '日本語',
  es: 'Español',
};

export function isLocale(v: string): v is Locale {
  return (SUPPORTED_LOCALES as string[]).includes(v);
}
