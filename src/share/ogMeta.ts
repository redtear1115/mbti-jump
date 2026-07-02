import { describeType } from '../config/personalities';
import { t, tf } from '../i18n/t';
import type { Locale } from '../i18n/locales';

export interface OgMeta {
  title: string;
  description: string;
  imageUrl: string;
  pageUrl: string;
}

/** 組出 /t/<TYPE> 頁的 OG meta 內容；不碰 DOM，Worker 與測試共用。 */
export function buildOgMeta(type: string, locale: Locale, origin: string): OgMeta {
  return {
    title: tf('og.title', [type], locale),
    description: `${describeType(type, locale)} ${t('og.cta', locale)}`,
    imageUrl: `${origin}/og/${locale}/${type}.png`,
    pageUrl: `${origin}/t/${type}?lang=${locale}`,
  };
}
