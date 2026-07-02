import { buildOgMeta } from '../src/share/ogMeta';
import { normalizeMbtiType } from '../src/core/mbtiType';
import { isLocale } from '../src/i18n/locales';
import type { Locale } from '../src/i18n/locales';

interface Env {
  ASSETS: Fetcher;
}

const FALLBACK_LOCALE: Locale = 'zh-Hant';

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function metaTags(type: string, locale: Locale, origin: string): string {
  const m = buildOgMeta(type, locale, origin);
  return [
    '<meta property="og:type" content="website">',
    `<meta property="og:title" content="${escapeAttr(m.title)}">`,
    `<meta property="og:description" content="${escapeAttr(m.description)}">`,
    `<meta property="og:image" content="${m.imageUrl}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    `<meta property="og:url" content="${escapeAttr(m.pageUrl)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="description" content="${escapeAttr(m.description)}">`,
  ].join('\n    ');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/t\/([A-Za-z]{4})\/?$/);
    const type = match ? normalizeMbtiType(match[1]) : null;
    if (!type) return env.ASSETS.fetch(request);

    const lang = url.searchParams.get('lang') ?? '';
    const locale: Locale = isLocale(lang) ? lang : FALLBACK_LOCALE;
    const index = await env.ASSETS.fetch(new Request(url.origin + '/'));

    // 先移除 index.html 的預設 og/twitter/description，再注入型別版，避免爬蟲讀到重複 tag
    const remove = {
      element(el: Element) {
        el.remove();
      },
    };
    const rewritten = new HTMLRewriter()
      .on('meta[property^="og:"]', remove)
      .on('meta[name="twitter:card"]', remove)
      .on('meta[name="description"]', remove)
      .on('head', {
        element(el) {
          el.append(metaTags(type, locale, url.origin), { html: true });
        },
      })
      .transform(index);

    const res = new Response(rewritten.body, rewritten);
    res.headers.set('cache-control', 'public, max-age=300');
    return res;
  },
};
