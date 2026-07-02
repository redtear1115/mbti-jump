import { isLocale } from '../i18n/locales';
import type { Locale } from '../i18n/locales';
import { normalizeMbtiType } from './mbtiType';

export const INVITE_KEY = 'mbti-jump.invite';

export interface Invite {
  type: string;
  locale: Locale | null;
}

/** 解析 /t/<TYPE>?lang=<locale> 邀請連結；非邀請路徑或型別不合法回 null。 */
export function parseInvite(pathname: string, search: string): Invite | null {
  const m = pathname.match(/^\/t\/([A-Za-z]{4})\/?$/);
  if (!m) return null;
  const type = normalizeMbtiType(m[1]);
  if (!type) return null;
  const lang = new URLSearchParams(search).get('lang');
  return { type, locale: lang !== null && isLocale(lang) ? lang : null };
}

export function saveInvite(type: string): void {
  try {
    (globalThis as any).sessionStorage?.setItem(INVITE_KEY, type);
  } catch {
    /* sessionStorage 不可用時略過 */
  }
}

export function getInvite(): string | null {
  try {
    const raw = (globalThis as any).sessionStorage?.getItem(INVITE_KEY) ?? null;
    return raw !== null ? normalizeMbtiType(raw) : null;
  } catch {
    return null;
  }
}
