# MBTI Jump 分享閉環 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 打通分享閉環——分享連結帶型別（`/t/<TYPE>?lang=<locale>`）、Cloudflare Worker 注入 16 型 × 5 語 OG meta（圖為預生成靜態 PNG）、結果頁合併為一顆 Web Share 主鈕、好友邀請打招呼＋結果對比。

**Architecture:** 純函式核心（型別驗證、邀請解析、對比、OG meta 組裝、OG 繪圖）放 `src/`，vitest 可測；Worker（`worker/index.ts`）只做路由與 HTMLRewriter，直接 import `src/` 純模組；OG 圖由 `scripts/generate-og.ts` 用 `@napi-rs/canvas` 預生成進 `public/og/`（進版控）。

**Tech Stack:** TypeScript strict、Phaser 3、Vite、vitest、Cloudflare Workers（assets + HTMLRewriter）、@napi-rs/canvas、tsx。

**Spec:** `docs/superpowers/specs/2026-07-02-mbti-jump-share-loop-design.md`

## Global Constraints

- TypeScript strict、`noUnusedLocals`、`noUnusedParameters`（tsconfig 現況）；所有指令在 repo root 跑。
- 五語 i18n：`en`、`zh-Hant`、`zh-Hans`、`ja`、`es`；`src/i18n/completeness.test.ts` 強制五語 key set 完全一致——加/刪 key 必須五個檔案同步。en 是權威來源（`StringKey = keyof typeof EN`）。ja/es 新字串加註 `// needs-review` 註解。
- 遊戲畫面 450×800（`GAME.width/height`）；字體 Fredoka（標題/按鈕）、Nunito（內文）。
- OG 圖固定 1200×630；OG `lang` 不合法時 fallback `zh-Hant`。
- 型別字串一律正規化為大寫 4 碼（如 `INFP`）。
- Commit message 用 conventional prefix（`feat:`/`docs:`/`refactor:`），結尾加：
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- 測試指令：`npm test`（vitest run）；單檔：`npx vitest run <path>`。
- 既有 85+ 測試在每個 task 結束時必須全綠。

---

### Task 1: 型別驗證純函式 `mbtiType`

**Files:**
- Create: `src/core/mbtiType.ts`
- Test: `src/core/mbtiType.test.ts`

**Interfaces:**
- Consumes: 無
- Produces: `normalizeMbtiType(raw: string): string | null`（大小寫不拘 → 大寫 4 碼或 null）；`MBTI_TYPES: readonly string[]`（16 型，Task 4/8/10 使用）

- [ ] **Step 1: 寫失敗測試**

```ts
// src/core/mbtiType.test.ts
import { describe, it, expect } from 'vitest';
import { normalizeMbtiType, MBTI_TYPES } from './mbtiType';

describe('normalizeMbtiType', () => {
  it('accepts valid types case-insensitively', () => {
    expect(normalizeMbtiType('INFP')).toBe('INFP');
    expect(normalizeMbtiType('infp')).toBe('INFP');
    expect(normalizeMbtiType('EsTj')).toBe('ESTJ');
  });

  it('rejects invalid input', () => {
    expect(normalizeMbtiType('ABCD')).toBeNull();
    expect(normalizeMbtiType('IN')).toBeNull();
    expect(normalizeMbtiType('INFPX')).toBeNull();
    expect(normalizeMbtiType('')).toBeNull();
    expect(normalizeMbtiType('IEFP')).toBeNull(); // 字母都合法但位置錯（第 2 位須為 S/N）
  });
});

describe('MBTI_TYPES', () => {
  it('has all 16 types', () => {
    expect(MBTI_TYPES).toHaveLength(16);
    expect(MBTI_TYPES).toContain('INFP');
    expect(MBTI_TYPES).toContain('ESTJ');
    expect(new Set(MBTI_TYPES).size).toBe(16);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/core/mbtiType.test.ts`
Expected: FAIL（模組不存在）

- [ ] **Step 3: 最小實作**

```ts
// src/core/mbtiType.ts
/** 四個維度的字母對，依位置排序。 */
const PAIRS: readonly (readonly [string, string])[] = [
  ['E', 'I'],
  ['S', 'N'],
  ['T', 'F'],
  ['J', 'P'],
];

/** 大小寫不拘的 4 碼字串 → 正規化大寫型別；不合法回 null。 */
export function normalizeMbtiType(raw: string): string | null {
  const s = raw.toUpperCase();
  if (s.length !== 4) return null;
  for (let i = 0; i < 4; i++) {
    if (s[i] !== PAIRS[i][0] && s[i] !== PAIRS[i][1]) return null;
  }
  return s;
}

/** 全部 16 型（EI×SN×TF×JP 展開）。 */
export const MBTI_TYPES: readonly string[] = PAIRS.reduce<string[]>(
  (acc, pair) => acc.flatMap((prefix) => pair.map((letter) => prefix + letter)),
  [''],
);
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run src/core/mbtiType.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/mbtiType.ts src/core/mbtiType.test.ts
git commit -m "feat: add normalizeMbtiType + MBTI_TYPES pure helpers"
```

---

### Task 2: i18n 新字串（11 keys × 5 語）

**Files:**
- Modify: `src/i18n/strings/en.ts`
- Modify: `src/i18n/strings/zh-Hant.ts`
- Modify: `src/i18n/strings/zh-Hans.ts`
- Modify: `src/i18n/strings/ja.ts`
- Modify: `src/i18n/strings/es.ts`

**Interfaces:**
- Consumes: 無
- Produces: StringKey `og.title`、`og.cta`、`share.action`、`share.doneFallback`、`share.fail`、`invite.greeting`、`compare.0`～`compare.4`（Task 6/11/12 使用；`{0}` 佔位一律是型別字串）

- [ ] **Step 1: 先只加 en，跑 completeness 測試確認失敗（證明測試在看管）**

在 `src/i18n/strings/en.ts` 的 `'card.tagline'` 行之後加入：

```ts
  // --- 分享閉環 ---
  'og.title': "MBTI Jump — I'm {0}!",
  'og.cta': 'What type are you? Jump to find out!',
  'share.action': 'Share result ↗',
  'share.doneFallback': 'Copied ✓ Card downloaded',
  'share.fail': 'Share failed',
  'invite.greeting': 'Your friend is {0} — jump in and see how you two match!',
  'compare.0': 'You and {0} share no letters — perfect complements!',
  'compare.1': 'You and {0} share 1 letter — sparks from different worlds.',
  'compare.2': 'You and {0} share 2 letters — half alike, half surprising.',
  'compare.3': 'You and {0} share 3 letters — kindred spirits!',
  'compare.4': 'Same type as your friend {0} — soulmates!',
```

Run: `npx vitest run src/i18n/completeness.test.ts`
Expected: FAIL（四個 locale 缺 11 個 key）

- [ ] **Step 2: 加 zh-Hant**

在 `src/i18n/strings/zh-Hant.ts` 的 `'card.tagline'` 行之後加入：

```ts
  // --- 分享閉環 ---
  'og.title': 'MBTI Jump — 我是 {0}！',
  'og.cta': '你是什麼型？跳跳看就知道！',
  'share.action': '分享結果 ↗',
  'share.doneFallback': '已複製 ✓ 卡片已下載',
  'share.fail': '分享失敗',
  'invite.greeting': '你的朋友是 {0}，測測你們合不合！',
  'compare.0': '你和 {0} 四個字母全不同——完美互補！',
  'compare.1': '你和 {0} 有 1 個字母相同——來自不同世界的火花。',
  'compare.2': '你和 {0} 有 2 個字母相同——一半相似、一半驚喜。',
  'compare.3': '你和 {0} 有 3 個字母相同——靈魂近親！',
  'compare.4': '你和 {0} 是同型——根本靈魂雙胞胎！',
```

- [ ] **Step 3: 加 zh-Hans**

在 `src/i18n/strings/zh-Hans.ts` 的 `'card.tagline'` 行之後加入：

```ts
  // --- 分享闭环 ---
  'og.title': 'MBTI Jump — 我是 {0}！',
  'og.cta': '你是什么型？跳跳看就知道！',
  'share.action': '分享结果 ↗',
  'share.doneFallback': '已复制 ✓ 卡片已下载',
  'share.fail': '分享失败',
  'invite.greeting': '你的朋友是 {0}，测测你们合不合！',
  'compare.0': '你和 {0} 四个字母全不同——完美互补！',
  'compare.1': '你和 {0} 有 1 个字母相同——来自不同世界的火花。',
  'compare.2': '你和 {0} 有 2 个字母相同——一半相似、一半惊喜。',
  'compare.3': '你和 {0} 有 3 个字母相同——灵魂近亲！',
  'compare.4': '你和 {0} 是同型——简直灵魂双胞胎！',
```

- [ ] **Step 4: 加 ja（標 needs-review）**

在 `src/i18n/strings/ja.ts` 的 `'card.tagline'` 行之後加入：

```ts
  // --- 分享閉環（needs-review: AI 草稿，待母語校稿） ---
  'og.title': 'MBTI Jump — 私は{0}！',
  'og.cta': 'あなたは何タイプ？ジャンプして確かめよう！',
  'share.action': '結果をシェア ↗',
  'share.doneFallback': 'コピー済み ✓ カード保存済み',
  'share.fail': 'シェアに失敗しました',
  'invite.greeting': '友だちは{0}。相性をチェックしよう！',
  'compare.0': '{0}とは4文字すべて違う——完璧な補完関係！',
  'compare.1': '{0}と1文字が同じ——異なる世界の火花。',
  'compare.2': '{0}と2文字が同じ——半分似て半分サプライズ。',
  'compare.3': '{0}と3文字が同じ——魂の近縁！',
  'compare.4': '{0}と同じタイプ——ソウルメイト！',
```

- [ ] **Step 5: 加 es（標 needs-review）**

在 `src/i18n/strings/es.ts` 的 `'card.tagline'` 行之後加入：

```ts
  // --- 分享閉環（needs-review: AI 草稿，待母語校稿） ---
  'og.title': 'MBTI Jump — ¡Soy {0}!',
  'og.cta': '¿Qué tipo eres? ¡Salta y descúbrelo!',
  'share.action': 'Compartir resultado ↗',
  'share.doneFallback': 'Copiado ✓ Tarjeta descargada',
  'share.fail': 'Error al compartir',
  'invite.greeting': 'Tu amigo es {0}: ¡mide vuestra compatibilidad!',
  'compare.0': 'Tú y {0} no compartís ninguna letra: ¡complementos perfectos!',
  'compare.1': 'Tú y {0} compartís 1 letra: chispas de mundos distintos.',
  'compare.2': 'Tú y {0} compartís 2 letras: mitad parecidos, mitad sorpresa.',
  'compare.3': 'Tú y {0} compartís 3 letras: ¡almas afines!',
  'compare.4': '¡{0} y tú sois del mismo tipo: almas gemelas!',
```

- [ ] **Step 6: 跑全部測試確認通過**

Run: `npm test`
Expected: PASS（completeness 綠）

- [ ] **Step 7: Commit**

```bash
git add src/i18n/strings/
git commit -m "feat: add share-loop i18n strings (og/share/invite/compare, 5 locales)"
```

---

### Task 3: 繪圖工具抽取 `draw.ts` ＋ shareCard blob 重構

**Files:**
- Create: `src/share/draw.ts`
- Test: `src/share/draw.test.ts`
- Modify: `src/share/shareCard.ts`

**Interfaces:**
- Consumes: `ShareDim`（`src/share/shareCardModel.ts` 既有）
- Produces:
  - `hex(n: number): string`、`tintToward(color: number, amount: number): string`
  - `roundRect(ctx, x, y, w, h, r): void`、`wrapText(ctx, text, cx, y, maxWidth, lineHeight): void`
  - `drawDimBars(ctx: CanvasRenderingContext2D, dims: ShareDim[], opts: { x: number; y: number; w: number; barH: number; gap: number }): void`
  - `canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob>`、`downloadBlob(blob: Blob, filename: string): void`（Task 12 使用）
  - `downloadCard` 本 task 保留為薄包裝（ResultScene 仍在用），Task 12 移除。

- [ ] **Step 1: 寫失敗測試（純函式部分）**

```ts
// src/share/draw.test.ts
import { describe, it, expect } from 'vitest';
import { hex, tintToward } from './draw';

describe('hex', () => {
  it('formats 24-bit color as css hex', () => {
    expect(hex(0x33a474)).toBe('#33a474');
    expect(hex(0x000012)).toBe('#000012');
  });
});

describe('tintToward', () => {
  it('amount 0 keeps color, amount 1 reaches white', () => {
    expect(tintToward(0x000000, 0)).toBe('rgb(0,0,0)');
    expect(tintToward(0x000000, 1)).toBe('rgb(255,255,255)');
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/share/draw.test.ts`
Expected: FAIL（模組不存在）

- [ ] **Step 3: 建 `src/share/draw.ts`（自 shareCard.ts 搬移＋新增 drawDimBars）**

```ts
// src/share/draw.ts
import type { ShareDim } from './shareCardModel';

export const hex = (n: number): string => '#' + n.toString(16).padStart(6, '0');

/** 把 24-bit 色與白色以 amount 混合，回傳 CSS 字串（做放射漸變中心提亮）。 */
export function tintToward(color: number, amount: number): string {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const words = text.split(/\s+/);
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, cx, yy);
      line = word;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, cx, yy);
}

/** 四維度傾向條：左右字母色漸變 + 白色分隔線（分享卡直式與 OG 橫式共用）。 */
export function drawDimBars(
  ctx: CanvasRenderingContext2D,
  dims: ShareDim[],
  opts: { x: number; y: number; w: number; barH: number; gap: number },
): void {
  let y = opts.y;
  for (const d of dims) {
    const grd = ctx.createLinearGradient(opts.x, 0, opts.x + opts.w, 0);
    grd.addColorStop(0, hex(d.leftColor));
    grd.addColorStop(1, hex(d.rightColor));
    ctx.fillStyle = grd;
    roundRect(ctx, opts.x, y, opts.w, opts.barH, opts.barH / 2);
    ctx.fill();
    const dx = opts.x + d.dividerFrac * opts.w;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(dx - 2, y - 3, 4, opts.barH + 6);
    y += opts.barH + opts.gap;
  }
}
```

- [ ] **Step 4: 重構 `src/share/shareCard.ts` 使用 draw.ts ＋ blob 函式**

整檔改為：

```ts
// src/share/shareCard.ts
import type { ShareCardModel } from './shareCardModel';
import { hex, tintToward, wrapText, drawDimBars } from './draw';

const W = 1080;
const H = 1350;

export function renderShareCard(model: ShareCardModel): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');

  // 放射漸變底（族群色 → 深底）
  const grd = ctx.createRadialGradient(W / 2, H * 0.32, 60, W / 2, H * 0.32, H * 0.8);
  grd.addColorStop(0, tintToward(model.groupColor, 0.25));
  grd.addColorStop(1, '#101018');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';

  // 型別
  ctx.fillStyle = hex(model.groupColor);
  ctx.font = '800 210px Fredoka, system-ui, sans-serif';
  ctx.fillText(model.type, W / 2, H * 0.30);

  // 族群名
  ctx.fillStyle = '#ffffffcc';
  ctx.font = '600 46px Fredoka, system-ui, sans-serif';
  ctx.fillText(model.groupName, W / 2, H * 0.37);

  // 描述（自動換行）
  ctx.fillStyle = '#ffffff';
  ctx.font = '400 40px Nunito, system-ui, sans-serif';
  wrapText(ctx, model.description, W / 2, H * 0.45, W - 160, 56);

  // 四維度傾向條
  drawDimBars(ctx, model.dims, { x: 100, y: H * 0.66, w: W - 200, barH: 34, gap: 26 });

  // 底部標語
  ctx.fillStyle = '#ffffff88';
  ctx.font = '400 32px Nunito, system-ui, sans-serif';
  ctx.fillText(model.tagline, W / 2, H - 56);

  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('toBlob returned null'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** @deprecated Task 12（結果頁分享鈕合併）後移除；目前 ResultScene 仍使用。 */
export async function downloadCard(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  downloadBlob(await canvasToBlob(canvas), filename);
}
```

- [ ] **Step 5: 跑全部測試＋型檢**

Run: `npm test && npx tsc --noEmit`
Expected: 全 PASS（行為不變，ResultScene 的 `downloadCard` 呼叫照舊）

- [ ] **Step 6: Commit**

```bash
git add src/share/draw.ts src/share/draw.test.ts src/share/shareCard.ts
git commit -m "refactor: extract share drawing helpers to draw.ts, add canvasToBlob/downloadBlob"
```

---

### Task 4: 邀請解析與存取 `invite.ts`

**Files:**
- Create: `src/core/invite.ts`
- Test: `src/core/invite.test.ts`

**Interfaces:**
- Consumes: `normalizeMbtiType`（Task 1）、`isLocale`/`Locale`（`src/i18n/locales.ts` 既有）
- Produces:
  - `parseInvite(pathname: string, search: string): { type: string; locale: Locale | null } | null`（Task 11 `main.ts` 使用）
  - `saveInvite(type: string): void`、`getInvite(): string | null`（sessionStorage；Task 11/12 使用）
  - `INVITE_KEY = 'mbti-jump.invite'`

- [ ] **Step 1: 寫失敗測試**

```ts
// src/core/invite.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { parseInvite, saveInvite, getInvite, INVITE_KEY } from './invite';

describe('parseInvite', () => {
  it('parses valid path with lang', () => {
    expect(parseInvite('/t/INFP', '?lang=ja')).toEqual({ type: 'INFP', locale: 'ja' });
  });

  it('normalizes case and trailing slash, missing lang → locale null', () => {
    expect(parseInvite('/t/infp/', '')).toEqual({ type: 'INFP', locale: null });
  });

  it('invalid lang → locale null', () => {
    expect(parseInvite('/t/INFP', '?lang=xx')).toEqual({ type: 'INFP', locale: null });
  });

  it('rejects non-invite paths and invalid types', () => {
    expect(parseInvite('/', '')).toBeNull();
    expect(parseInvite('/t/ABCD', '?lang=ja')).toBeNull();
    expect(parseInvite('/t/INFP/extra', '')).toBeNull();
  });
});

describe('saveInvite/getInvite', () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    (globalThis as any).sessionStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    };
  });

  it('round-trips a type', () => {
    saveInvite('INFP');
    expect(store.get(INVITE_KEY)).toBe('INFP');
    expect(getInvite()).toBe('INFP');
  });

  it('getInvite returns null when empty or tampered', () => {
    expect(getInvite()).toBeNull();
    store.set(INVITE_KEY, 'ZZZZ');
    expect(getInvite()).toBeNull();
  });

  it('survives missing sessionStorage', () => {
    delete (globalThis as any).sessionStorage;
    expect(() => saveInvite('INFP')).not.toThrow();
    expect(getInvite()).toBeNull();
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/core/invite.test.ts`
Expected: FAIL（模組不存在）

- [ ] **Step 3: 最小實作**

```ts
// src/core/invite.ts
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
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run src/core/invite.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/invite.ts src/core/invite.test.ts
git commit -m "feat: add invite link parsing + sessionStorage store"
```

---

### Task 5: 型別對比純函式 `compare.ts`

**Files:**
- Create: `src/core/compare.ts`
- Test: `src/core/compare.test.ts`

**Interfaces:**
- Consumes: `StringKey`（`src/i18n/t.ts` 既有）
- Produces: `sharedLetters(a: string, b: string): number`（0..4，同位同字母數）；`compareKey(shared: number): StringKey`（`compare.0`～`compare.4`；Task 12 使用）

- [ ] **Step 1: 寫失敗測試**

```ts
// src/core/compare.test.ts
import { describe, it, expect } from 'vitest';
import { sharedLetters, compareKey } from './compare';
import { EN } from '../i18n/strings/en';

describe('sharedLetters', () => {
  it('counts same-position matches', () => {
    expect(sharedLetters('INFP', 'INFP')).toBe(4);
    expect(sharedLetters('INFP', 'ESTJ')).toBe(0);
    expect(sharedLetters('INFP', 'ENFP')).toBe(3);
    expect(sharedLetters('INTJ', 'INFP')).toBe(2);
  });
});

describe('compareKey', () => {
  it('maps every possible count to an existing string key', () => {
    for (const n of [0, 1, 2, 3, 4]) {
      expect(EN[compareKey(n)]).toBeTypeOf('string');
    }
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/core/compare.test.ts`
Expected: FAIL（模組不存在）

- [ ] **Step 3: 最小實作**

```ts
// src/core/compare.ts
import type { StringKey } from '../i18n/t';

/** 兩個 4 碼型別在相同位置的相同字母數（0..4）。 */
export function sharedLetters(a: string, b: string): number {
  let n = 0;
  for (let i = 0; i < 4; i++) {
    if (a[i] === b[i]) n++;
  }
  return n;
}

/** 重合數 → 對比文案 key（compare.0 ~ compare.4）。 */
export function compareKey(shared: number): StringKey {
  return `compare.${shared}` as StringKey;
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run src/core/compare.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/compare.ts src/core/compare.test.ts
git commit -m "feat: add type comparison pure functions (sharedLetters/compareKey)"
```

---

### Task 6: OG meta 組裝 `ogMeta.ts`

**Files:**
- Create: `src/share/ogMeta.ts`
- Test: `src/share/ogMeta.test.ts`

**Interfaces:**
- Consumes: `describeType`（`src/config/personalities.ts`）、`t`/`tf`（`src/i18n/t.ts`）、`Locale`
- Produces: `buildOgMeta(type: string, locale: Locale, origin: string): OgMeta`，`OgMeta = { title, description, imageUrl, pageUrl }`（Task 10 Worker 使用）

- [ ] **Step 1: 寫失敗測試**

```ts
// src/share/ogMeta.test.ts
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
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/share/ogMeta.test.ts`
Expected: FAIL（模組不存在）

- [ ] **Step 3: 最小實作**

```ts
// src/share/ogMeta.ts
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
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run src/share/ogMeta.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/share/ogMeta.ts src/share/ogMeta.test.ts
git commit -m "feat: add buildOgMeta (pure OG meta assembly)"
```

---

### Task 7: OG 橫式繪圖 `ogCard.ts`

**Files:**
- Create: `src/share/ogCard.ts`
- Test: `src/share/ogCard.test.ts`

**Interfaces:**
- Consumes: `ShareCardModel`、`hex`/`tintToward`/`wrapText`/`drawDimBars`（Task 3）、`PALETTE`
- Produces: `OG_W = 1200`、`OG_H = 630`、`drawOgCard(ctx: CanvasRenderingContext2D, model: ShareCardModel): void`、`drawOgDefault(ctx: CanvasRenderingContext2D, tagline: string): void`（Task 8 生成 script 使用）

- [ ] **Step 1: 寫失敗測試（mock context 煙霧測試）**

```ts
// src/share/ogCard.test.ts
import { describe, it, expect } from 'vitest';
import { drawOgCard, drawOgDefault, OG_W, OG_H } from './ogCard';
import { buildShareCardModel } from './shareCardModel';
import type { Dimension } from '../config/questions';

/** 記錄 fillText 呼叫的最小 2D context 替身。 */
function mockCtx() {
  const texts: string[] = [];
  const gradient = { addColorStop: () => {} };
  const ctx = {
    fillStyle: '' as unknown,
    font: '',
    textAlign: '',
    createRadialGradient: () => gradient,
    createLinearGradient: () => gradient,
    fillRect: () => {},
    fillText: (s: string) => void texts.push(s),
    measureText: (s: string) => ({ width: s.length * 12 }),
    beginPath: () => {},
    moveTo: () => {},
    arcTo: () => {},
    arc: () => {},
    closePath: () => {},
    fill: () => {},
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, texts };
}

const TALLIES: Record<Dimension, [number, number]> = {
  EI: [1, 4],
  SN: [1, 4],
  TF: [1, 4],
  JP: [1, 4],
};

describe('ogCard', () => {
  it('has OG dimensions', () => {
    expect(OG_W).toBe(1200);
    expect(OG_H).toBe(630);
  });

  it('drawOgCard renders type text without throwing', () => {
    const { ctx, texts } = mockCtx();
    drawOgCard(ctx, buildShareCardModel('INFP', TALLIES, 'zh-Hant'));
    expect(texts).toContain('INFP');
  });

  it('drawOgDefault renders site name and tagline', () => {
    const { ctx, texts } = mockCtx();
    drawOgDefault(ctx, 'jump out your personality');
    expect(texts).toContain('MBTI Jump');
    expect(texts).toContain('jump out your personality');
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/share/ogCard.test.ts`
Expected: FAIL（模組不存在）

- [ ] **Step 3: 最小實作**

```ts
// src/share/ogCard.ts
import type { ShareCardModel } from './shareCardModel';
import { hex, tintToward, wrapText, drawDimBars } from './draw';
import { PALETTE } from '../theme/palette';

export const OG_W = 1200;
export const OG_H = 630;

/**
 * 1200×630 橫式 OG 圖：左半型別大字＋族群名，右半描述＋四維度條。
 * 只用 CanvasRenderingContext2D 介面，瀏覽器與 @napi-rs/canvas 皆可餵。
 */
export function drawOgCard(ctx: CanvasRenderingContext2D, model: ShareCardModel): void {
  const grd = ctx.createRadialGradient(
    OG_W * 0.3, OG_H * 0.45, 60,
    OG_W * 0.3, OG_H * 0.45, OG_W * 0.65,
  );
  grd.addColorStop(0, tintToward(model.groupColor, 0.25));
  grd.addColorStop(1, '#101018');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, OG_W, OG_H);

  ctx.textAlign = 'center';

  // 左半：型別大字＋族群名
  ctx.fillStyle = hex(model.groupColor);
  ctx.font = '800 200px Fredoka, sans-serif';
  ctx.fillText(model.type, OG_W * 0.3, OG_H * 0.48);
  ctx.fillStyle = '#ffffffcc';
  ctx.font = '600 40px Fredoka, sans-serif';
  ctx.fillText(model.groupName, OG_W * 0.3, OG_H * 0.58);

  // 右半：描述（換行）＋四維度條
  ctx.fillStyle = '#ffffff';
  ctx.font = '400 30px Nunito, sans-serif';
  wrapText(ctx, model.description, OG_W * 0.72, OG_H * 0.22, OG_W * 0.4, 42);
  drawDimBars(ctx, model.dims, {
    x: OG_W * 0.55, y: OG_H * 0.52, w: OG_W * 0.34, barH: 24, gap: 16,
  });

  // 底部標語
  ctx.fillStyle = '#ffffff88';
  ctx.font = '400 26px Nunito, sans-serif';
  ctx.fillText(model.tagline, OG_W / 2, OG_H - 30);
}

/** 首頁通用 OG 圖：站名＋四族群色圓點＋標語。 */
export function drawOgDefault(ctx: CanvasRenderingContext2D, tagline: string): void {
  const grd = ctx.createRadialGradient(
    OG_W / 2, OG_H * 0.42, 60,
    OG_W / 2, OG_H * 0.42, OG_W * 0.6,
  );
  grd.addColorStop(0, '#2a2d42');
  grd.addColorStop(1, '#101018');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, OG_W, OG_H);

  ctx.textAlign = 'center';
  ctx.fillStyle = hex(PALETTE.accent);
  ctx.font = '800 120px Fredoka, sans-serif';
  ctx.fillText('MBTI Jump', OG_W / 2, OG_H * 0.45);

  const groupColors = [PALETTE.explorer, PALETTE.diplomat, PALETTE.analyst, PALETTE.sentinel];
  groupColors.forEach((c, i) => {
    ctx.fillStyle = hex(c);
    ctx.beginPath();
    ctx.arc(OG_W / 2 + (i - 1.5) * 70, OG_H * 0.58, 18, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#ffffffcc';
  ctx.font = '400 34px Nunito, sans-serif';
  ctx.fillText(tagline, OG_W / 2, OG_H * 0.74);
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run src/share/ogCard.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/share/ogCard.ts src/share/ogCard.test.ts
git commit -m "feat: add landscape OG card renderer (drawOgCard/drawOgDefault)"
```

---

### Task 8: OG 圖生成管線（fonts + script + 81 張 PNG）

**Files:**
- Create: `scripts/generate-og.ts`
- Create: `scripts/fonts/Fredoka-Bold.ttf`、`scripts/fonts/Nunito-Regular.ttf`（下載）
- Create: `public/og/<locale>/<TYPE>.png` × 80、`public/og/default.png`（產出，進版控）
- Modify: `package.json`（devDeps＋script）

**Interfaces:**
- Consumes: `drawOgCard`/`drawOgDefault`/`OG_W`/`OG_H`（Task 7）、`buildShareCardModel`、`MBTI_TYPES`（Task 1）、`SUPPORTED_LOCALES`、`DIMENSIONS`/`LETTERS_OF`、`t`
- Produces: 靜態檔 `/og/<locale>/<TYPE>.png`、`/og/default.png`（Task 9/10 引用其 URL）；npm script `generate:og`

- [ ] **Step 1: 安裝依賴**

```bash
npm i -D @napi-rs/canvas tsx
```

- [ ] **Step 2: 下載字體（Google Fonts css2 API 以 curl UA 取得 static TTF）**

```bash
mkdir -p scripts/fonts
curl -sL "$(curl -s 'https://fonts.googleapis.com/css2?family=Fredoka:wght@700' | grep -o 'https://fonts.gstatic.com/[^)]*\.ttf' | head -1)" -o scripts/fonts/Fredoka-Bold.ttf
curl -sL "$(curl -s 'https://fonts.googleapis.com/css2?family=Nunito:wght@400' | grep -o 'https://fonts.gstatic.com/[^)]*\.ttf' | head -1)" -o scripts/fonts/Nunito-Regular.ttf
file scripts/fonts/*.ttf
```

Expected: 兩檔皆顯示 `TrueType Font data`。若 css2 回應抓不到 `.ttf` URL（Google 偶爾變更行為），改從 https://github.com/google/fonts/tree/main/ofl/{fredoka,nunito} 下載對應 TTF。

- [ ] **Step 3: 寫生成 script**

```ts
// scripts/generate-og.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { MBTI_TYPES } from '../src/core/mbtiType';
import { SUPPORTED_LOCALES } from '../src/i18n/locales';
import { buildShareCardModel } from '../src/share/shareCardModel';
import { drawOgCard, drawOgDefault, OG_W, OG_H } from '../src/share/ogCard';
import { DIMENSIONS, LETTERS_OF } from '../src/config/questions';
import type { Dimension } from '../src/config/questions';
import { t } from '../src/i18n/t';

GlobalFonts.registerFromPath('scripts/fonts/Fredoka-Bold.ttf', 'Fredoka');
GlobalFonts.registerFromPath('scripts/fonts/Nunito-Regular.ttf', 'Nunito');

/** 預生成圖無真實 tallies：每維度朝該型別字母偏 4:1（dividerFrac 0.8/0.2）。 */
function talliesFor(type: string): Record<Dimension, [number, number]> {
  const rec = {} as Record<Dimension, [number, number]>;
  DIMENSIONS.forEach((d, i) => {
    const [first] = LETTERS_OF[d];
    rec[d] = type[i] === first ? [4, 1] : [1, 4];
  });
  return rec;
}

function draw(fn: (ctx: CanvasRenderingContext2D) => void): Buffer {
  const canvas = createCanvas(OG_W, OG_H);
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
  fn(ctx);
  return canvas.toBuffer('image/png');
}

let count = 0;
for (const locale of SUPPORTED_LOCALES) {
  mkdirSync(`public/og/${locale}`, { recursive: true });
  for (const type of MBTI_TYPES) {
    const model = buildShareCardModel(type, talliesFor(type), locale);
    writeFileSync(`public/og/${locale}/${type}.png`, draw((ctx) => drawOgCard(ctx, model)));
    count++;
  }
}
writeFileSync('public/og/default.png', draw((ctx) => drawOgDefault(ctx, t('card.tagline', 'en'))));
console.log(`generated ${count} type cards + default.png`);
```

- [ ] **Step 4: 加 npm script**

在 `package.json` 的 `scripts` 加：

```json
    "generate:og": "tsx scripts/generate-og.ts"
```

- [ ] **Step 5: 執行並驗證**

```bash
npm run generate:og
ls public/og/zh-Hant | wc -l   # 期望 16
ls public/og | sort            # 期望 5 個 locale 目錄 + default.png
```

Expected: 輸出 `generated 80 type cards + default.png`。

- [ ] **Step 6: 目視檢查（必做——CJK 字型 fallback 靠 macOS 系統字型）**

打開 `public/og/zh-Hant/INFP.png`、`public/og/ja/ENTJ.png`、`public/og/en/ESTJ.png`、`public/og/default.png` 目視：型別大字清楚、中日文描述沒有豆腐字（□）、四維度條分隔線偏向正確。若 CJK 出現豆腐字：從 google/fonts 下載 `NotoSansTC[wght].ttf`、`NotoSansJP[wght].ttf` 放 `scripts/fonts/` 並在 script 加兩行 `GlobalFonts.registerFromPath(..., 'Noto Sans TC'/'Noto Sans JP')`，且 `ogCard.ts` 的 font 字串在 `sans-serif` 前加 `'Noto Sans TC', 'Noto Sans JP',`，重跑。

- [ ] **Step 7: 跑全部測試（確保 script 引用未破壞任何東西）**

Run: `npm test`
Expected: PASS

- [ ] **Step 8: Commit（PNG 進版控）**

```bash
git add scripts/ public/og/ package.json package-lock.json
git commit -m "feat: pre-generate 16x5 OG images + default via @napi-rs/canvas"
```

---

### Task 9: index.html 靜態 OG meta

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `public/og/default.png`（Task 8）
- Produces: 首頁裸連結的預設 OG 預覽；Worker（Task 10）會移除這組再注入型別版

- [ ] **Step 1: 在 `<title>MBTI Jump</title>` 之後加入**

```html
    <meta name="description" content="MBTI Jump — 用跳的測人格！左 Yes 右 No，四關跳出你的 MBTI。" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="MBTI Jump" />
    <meta property="og:description" content="用跳的測人格！左 Yes 右 No，四關跳出你的 MBTI。" />
    <meta property="og:image" content="https://mbti-jump.southern-light.dev/og/default.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="https://mbti-jump.southern-light.dev/" />
    <meta name="twitter:card" content="summary_large_image" />
```

- [ ] **Step 2: 驗證 build**

Run: `npm run build && grep -c 'og:' dist/index.html`
Expected: build 成功；grep 輸出 ≥ 6

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add default OG/twitter meta to index.html"
```

---

### Task 10: Cloudflare Worker（meta 注入）＋ wrangler 設定

**Files:**
- Create: `worker/index.ts`
- Create: `worker/tsconfig.json`
- Modify: `wrangler.jsonc`
- Modify: `package.json`（devDeps＋`typecheck:worker` script）

**Interfaces:**
- Consumes: `buildOgMeta`（Task 6）、`normalizeMbtiType`（Task 1）、`isLocale`/`Locale`
- Produces: `GET /t/<TYPE>?lang=<locale>` 回注入 meta 的 index.html；其餘請求原樣走 assets（SPA fallback 不變）

- [ ] **Step 1: 安裝依賴**

```bash
npm i -D wrangler @cloudflare/workers-types
```

- [ ] **Step 2: 寫 Worker**

```ts
// worker/index.ts
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
    const remove = { element: (el: Element) => el.remove() };
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
    res.headers.set('cache-control', 'public, max-age=3600');
    return res;
  },
};
```

- [ ] **Step 3: worker tsconfig ＋ typecheck script**

```json
// worker/tsconfig.json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "types": ["@cloudflare/workers-types"],
    "lib": ["ES2020"]
  },
  "include": ["index.ts"]
}
```

`package.json` scripts 加：

```json
    "typecheck:worker": "tsc -p worker"
```

Run: `npm run typecheck:worker`
Expected: 無錯誤（worker 只拉純 TS 模組，無 DOM 依賴；若 `src/i18n/store.ts` 等處報 DOM 型別錯，維持其 `(globalThis as any)` 寫法即可）

- [ ] **Step 4: 更新 wrangler.jsonc**

```jsonc
{
  "name": "mbti-jump",
  "main": "worker/index.ts",
  "compatibility_date": "2026-07-01",
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application",
    "binding": "ASSETS"
  }
}
```

- [ ] **Step 5: 本機驗證**

```bash
npm run build
npx wrangler dev --port 8788 &   # 背景啟動
sleep 5
curl -s http://localhost:8788/t/INFP?lang=ja | grep -o '<meta property="og:[^>]*>'
curl -s http://localhost:8788/t/INFP?lang=ja | grep -c 'og:title'      # 期望 1（無重複）
curl -s http://localhost:8788/ | grep -o 'og:image" content="[^"]*"'   # 期望 default.png
curl -s -o /dev/null -w '%{http_code}' http://localhost:8788/og/ja/INFP.png  # 期望 200
curl -s http://localhost:8788/t/ZZZZ | grep -c 'og:title'              # 期望 1（回預設 meta）
kill %1
```

Expected: `/t/INFP?lang=ja` 的 og:title 含 INFP、og:image 指向 `/og/ja/INFP.png`、og:title 恰一個；根路徑仍是 default meta；PNG 200。

- [ ] **Step 6: 跑全部測試**

Run: `npm test && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add worker/ wrangler.jsonc package.json package-lock.json
git commit -m "feat: add Cloudflare Worker injecting per-type OG meta on /t/:type"
```

---

### Task 11: main.ts 邀請解析 ＋ StartScene 打招呼

**Files:**
- Modify: `src/main.ts`
- Modify: `src/scenes/StartScene.ts`

**Interfaces:**
- Consumes: `parseInvite`/`saveInvite`/`getInvite`（Task 4）、`setLocale`、`tf`、`groupColorOf`、i18n key `invite.greeting`（Task 2）
- Produces: 開啟 `/t/INFP?lang=ja` 時語言切為 ja、sessionStorage 存好友型別、開始頁顯示打招呼行

- [ ] **Step 1: main.ts 開頭（`new Phaser.Game` 之前）加入**

```ts
import { parseInvite, saveInvite } from './core/invite';
import { setLocale } from './i18n/store';
```

```ts
// 邀請連結 /t/<TYPE>?lang=<locale>：尊重 lang、記下好友型別（本分頁有效）
const invite = parseInvite(location.pathname, location.search);
if (invite) {
  if (invite.locale) setLocale(invite.locale);
  saveInvite(invite.type);
}
```

- [ ] **Step 2: StartScene 加打招呼行**

imports 加：

```ts
import { tf } from '../i18n/t';
import { getInvite } from '../core/invite';
import { groupColorOf } from '../core/temperament';
```

（注意：既有 `import { t } from '../i18n/t';` 改成 `import { t, tf } from '../i18n/t';`）

在 tagline 文字（y=250 那段 `this.add.text(...)`）之後加入：

```ts
    // 好友邀請打招呼（tagline 與語言選單之間）
    const friend = getInvite();
    if (friend) {
      const friendHex = '#' + groupColorOf(friend).toString(16).padStart(6, '0');
      this.add
        .text(cx, 302, tf('invite.greeting', [friend]), {
          fontSize: '15px',
          color: friendHex,
          align: 'center',
          wordWrap: { width: GAME.width - 60 },
          fontFamily: 'Nunito, system-ui, sans-serif',
        })
        .setOrigin(0.5);
    }
```

- [ ] **Step 3: 型檢＋測試**

Run: `npx tsc --noEmit && npm test`
Expected: PASS

- [ ] **Step 4: 瀏覽器驗證**

```bash
npm run dev &
```

開 `http://localhost:5173/t/INFP?lang=ja`：介面應為日文、tagline 下出現「友だちはINFP。相性をチェックしよう！」（外交官綠色字）。開 `http://localhost:5173/` 則無此行。驗完 `kill %1`。

（Vite dev server 對未知路徑 `/t/INFP` 預設回 index.html——`appType: 'spa'` 是預設值，若 404 則在 `vite.config.ts` 確認未改 appType。）

- [ ] **Step 5: Commit**

```bash
git add src/main.ts src/scenes/StartScene.ts
git commit -m "feat: parse invite link on boot + friend greeting on start screen"
```

---

### Task 12: ResultScene 分享鈕合併 ＋ 對比行 ＋ 移除舊 keys

**Files:**
- Modify: `src/scenes/ResultScene.ts`
- Modify: `src/share/shareCard.ts`（移除 `downloadCard`）
- Modify: `src/i18n/strings/en.ts`、`zh-Hant.ts`、`zh-Hans.ts`、`ja.ts`、`es.ts`（移除 6 個舊 key）

**Interfaces:**
- Consumes: `canvasToBlob`/`downloadBlob`（Task 3）、`getInvite`（Task 4）、`sharedLetters`/`compareKey`（Task 5）、i18n `share.action`/`share.doneFallback`/`share.fail`/`compare.*`（Task 2）
- Produces: 結果頁三鈕（分享結果／再玩一次／趨勢）＋（有邀請時）對比行；`result.copy/copied/copyFail/saveCard/saved/saveFail` 六 key 自五個 locale 檔移除

- [ ] **Step 1: 改 ResultScene**

imports 區改為（新增/調整的行）：

```ts
import { buildShareCardModel } from '../share/shareCardModel';
import { renderShareCard, canvasToBlob, downloadBlob } from '../share/shareCard';
import { getInvite } from '../core/invite';
import { sharedLetters, compareKey } from '../core/compare';
```

（移除 `downloadCard` 的 import；`getLocale` 已有。）

在描述文字（y=390 那段）之後加入對比行：

```ts
    // 好友對比（有邀請時）
    const friend = getInvite();
    if (friend) {
      this.add
        .text(cx, 458, tf(compareKey(sharedLetters(type, friend)), [friend]), {
          fontSize: '16px',
          color: '#ffe066',
          align: 'center',
          wordWrap: { width: GAME.width - 60 },
          fontFamily: 'Nunito, system-ui, sans-serif',
        })
        .setOrigin(0.5);
    }
```

把原本的 `copyBtn`（y=505）與 `saveBtn`（y=575）兩段整段刪除，換成一顆主分享鈕：

```ts
    const shareBtn = new Button(this, cx, 530, t('share.action'), {
      width: 240,
      height: 54,
      fontSize: 20,
      onClick: async () => {
        const locale = getLocale();
        const shareUrl = `${location.origin}/t/${type}?lang=${locale}`;
        const text = tf('result.share', [type, desc, shareUrl]);
        try {
          const model = buildShareCardModel(type, data.score.allTallies(), locale);
          const canvas = renderShareCard(model);
          const blob = await canvasToBlob(canvas);
          const file = new File([blob], `mbti-jump-${type}.png`, { type: 'image/png' });
          const nav = navigator as Navigator & {
            canShare?: (d: ShareData) => boolean;
          };
          if (nav.share && nav.canShare?.({ files: [file] })) {
            try {
              await nav.share({ files: [file], text });
              return;
            } catch (e) {
              if ((e as Error).name === 'AbortError') return; // 使用者取消：不動鈕面
              // 其他分享錯誤 → 落到下方複製＋下載 fallback
            }
          }
          await navigator.clipboard.writeText(text);
          downloadBlob(blob, `mbti-jump-${type}.png`);
          shareBtn.setLabel(t('share.doneFallback'));
        } catch {
          shareBtn.setLabel(t('share.fail'));
        }
      },
    });
```

「再玩一次」鈕 y 由 645 改 610；「趨勢」鈕 y 由 710 改 680。其餘不動。

- [ ] **Step 2: 移除 `downloadCard`**

刪除 `src/share/shareCard.ts` 末尾的 `downloadCard` 函式（含 `@deprecated` 註解）。

- [ ] **Step 3: 移除 6 個舊 i18n key × 5 檔**

自 `en.ts`、`zh-Hant.ts`、`zh-Hans.ts`、`ja.ts`、`es.ts` 各刪除這些 key 的行：
`result.copy`、`result.copied`、`result.copyFail`、`result.saveCard`、`result.saved`、`result.saveFail`。

- [ ] **Step 4: 型檢＋全測試（completeness 會抓漏刪）**

Run: `npx tsc --noEmit && npm test`
Expected: PASS（若 FAIL 檢查五檔 key 是否同步刪乾淨、ResultScene 是否還有舊 key 引用）

- [ ] **Step 5: 瀏覽器驗證**

`npm run dev` 開 `http://localhost:5173/t/ENFP?lang=zh-Hant` → 玩完（或快速答題）到結果頁：
- 三顆鈕：分享結果／再玩一次／趨勢；描述下方有黃色對比行（含 ENFP）。
- 桌機點「分享結果」→ 剪貼簿有文案（含 `/t/<TYPE>?lang=zh-Hant` 連結）＋ PNG 下載、鈕變「已複製 ✓ 卡片已下載」。

- [ ] **Step 6: Commit**

```bash
git add src/scenes/ResultScene.ts src/share/shareCard.ts src/i18n/strings/
git commit -m "feat: merge result actions into one Web Share button + friend compare line"
```

---

### Task 13: 整體驗證 ＋ 部署

**Files:**
- 無新檔（驗證與部署）

**Interfaces:**
- Consumes: 全部前置 task
- Produces: 上線的分享閉環

- [ ] **Step 1: 全套檢查**

```bash
npm test && npm run build && npm run typecheck:worker
```

Expected: 全綠、build 成功。

- [ ] **Step 2: wrangler dev 端到端**

```bash
npx wrangler dev --port 8788 &
sleep 5
curl -s 'http://localhost:8788/t/ENFP?lang=es' | grep 'og:title'   # 期望含 ENFP 與西文
curl -s -o /dev/null -w '%{http_code}' http://localhost:8788/og/es/ENFP.png  # 200
kill %1
```

- [ ] **Step 3: 部署（向使用者確認後執行）**

```bash
npx wrangler deploy
```

- [ ] **Step 4: 線上驗證**

```bash
curl -s 'https://mbti-jump.southern-light.dev/t/INFP?lang=zh-Hant' | grep 'og:'
curl -s -o /dev/null -w '%{http_code}' 'https://mbti-jump.southern-light.dev/og/zh-Hant/INFP.png'
```

Expected: meta 正確、圖 200。再以 FB Sharing Debugger（https://developers.facebook.com/tools/debug/）與 LINE 貼連結各抽查一組預覽；手機開結果頁按「分享結果」確認系統分享面板帶圖。

- [ ] **Step 5: 更新 TODO 並 commit**

`docs/TODO.md` Tier 3 勾掉「分享頁 OG image」項（部署項已完成可一併勾），加一行完成註記。

```bash
git add docs/TODO.md
git commit -m "docs: mark share-loop (OG + invite + web share) shipped"
```
