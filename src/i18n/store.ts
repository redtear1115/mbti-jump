import { detectLocale } from './detect';
import { isLocale, DEFAULT_LOCALE } from './locales';
import type { Locale } from './locales';

export const STORAGE_KEY = 'mbti-jump.locale';

let cached: Locale | null = null;

function readStored(): string | null {
  try {
    return (globalThis as any).localStorage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

function writeStored(value: string): void {
  try {
    (globalThis as any).localStorage?.setItem(STORAGE_KEY, value);
  } catch {
    /* localStorage 不可用時略過 */
  }
}

function navLangs(): string[] {
  const nav = (globalThis as any).navigator;
  if (nav?.languages?.length) return nav.languages as string[];
  if (nav?.language) return [nav.language as string];
  return [];
}

function resolve(): Locale {
  const stored = readStored();
  if (stored && isLocale(stored)) return stored;
  const langs = navLangs();
  return langs.length ? detectLocale(langs) : DEFAULT_LOCALE;
}

export function getLocale(): Locale {
  if (cached === null) cached = resolve();
  return cached;
}

export function setLocale(l: Locale): void {
  cached = l;
  writeStored(l);
}

/** 測試用：清除快取，讓下次 getLocale 重新解析。 */
export function _resetForTest(): void {
  cached = null;
}
