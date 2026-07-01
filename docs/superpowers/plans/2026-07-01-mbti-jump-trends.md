# MBTI Jump — 人格趨勢 + 持久化底座 (子專案 A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增持久化玩家檔案（localStorage）與趨勢頁，顯示總遊玩次數、最常出現的人格類型、四維度累計偏向%、最近幾筆結果；純資料/純邏輯與 Phaser 解耦、可單測，遊戲核心邏輯不動。

**Architecture:** `core/profile.ts` 薄 localStorage 層存 `PlayRecord[]`；`core/trends.ts` 純函式彙整；`ScoreTracker` 記住各維度鎖定當下 tallies 並以 `allTallies()` 匯出；`ResultScene` 結算時 `recordPlay`；`TrendScene` 讀檔彙整並顯示。入口在開始頁與結算頁。

**Tech Stack:** Vite, TypeScript (strict), Phaser 3, Vitest。純前端 localStorage。

## Global Constraints

- 純前端、直式 portrait 450×800；每個 task 後 `npm run build` 與 `npm test` 必須綠。
- 純模組（`profile`、`trends`）**不得 import Phaser**、須單元測試；場景不在此限。
- localStorage key：`mbti-jump.profile`；儲存格式 `{ version: 1, plays: PlayRecord[] }`；上限 `MAX_PLAYS = 200`（超過丟最舊）。
- `getPlays()` 對讀不到/JSON 壞/版本不符 → 回 `[]`（不丟錯）；以 `globalThis.localStorage` + try/catch 保護。
- 偏向% = 歷次 tallies 相加；`secondPct = 100 - firstPct`（相加剛好 100）；分母 0 → 兩者 0。
- `topType`：出現最多的 4 碼；並列時取「最先達到該最大次數者」（依 plays 迭代序）。
- `RECENT_LIMIT = 5`（最近筆數，新→舊）。
- 字體：標題/大字 `"Fredoka, system-ui, sans-serif"`；內文 `"Nunito, system-ui, sans-serif"`。
- 遊戲邏輯（爬塔、計分結果、progression、i18n 既有）不得更動；`ScoreTracker` 只多存 tallies。

---

### Task 1: 玩家檔案持久化（`core/profile.ts`）

**Files:**
- Create: `src/core/profile.ts`
- Test: `src/core/profile.test.ts`

**Interfaces:**
- Consumes: `Dimension`（from `config/questions`）
- Produces:
  - `interface PlayRecord { at: number; type: string; tallies: Record<Dimension, [number, number]> }`
  - `const PROFILE_KEY = 'mbti-jump.profile'`、`const MAX_PLAYS = 200`
  - `function recordPlay(type: string, tallies: Record<Dimension,[number,number]>, at?: number): void`
  - `function getPlays(): PlayRecord[]`
  - `function clearPlays(): void`

- [ ] **Step 1: 寫失敗測試 `src/core/profile.test.ts`**

```ts
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { recordPlay, getPlays, clearPlays, PROFILE_KEY, MAX_PLAYS } from './profile';
import type { Dimension } from '../config/questions';

function mockStore() {
  const s: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => (k in s ? s[k] : null),
    setItem: (k: string, v: string) => { s[k] = v; },
    removeItem: (k: string) => { delete s[k]; },
  };
  return s;
}
const T: Record<Dimension, [number, number]> = { EI: [3, 2], SN: [4, 1], TF: [2, 3], JP: [5, 0] };
afterEach(() => { delete (globalThis as any).localStorage; });
beforeEach(() => mockStore());

describe('profile', () => {
  it('records and reads back plays', () => {
    recordPlay('ENFP', T, 1000);
    recordPlay('INTJ', T, 2000);
    const plays = getPlays();
    expect(plays).toHaveLength(2);
    expect(plays[0]).toEqual({ at: 1000, type: 'ENFP', tallies: T });
    expect(plays[1].type).toBe('INTJ');
  });

  it('caps at MAX_PLAYS, dropping oldest', () => {
    for (let i = 0; i < MAX_PLAYS + 5; i++) recordPlay('ENFP', T, i);
    const plays = getPlays();
    expect(plays).toHaveLength(MAX_PLAYS);
    expect(plays[0].at).toBe(5); // 最舊 5 筆被丟
    expect(plays[plays.length - 1].at).toBe(MAX_PLAYS + 4);
  });

  it('clearPlays empties history', () => {
    recordPlay('ENFP', T, 1);
    clearPlays();
    expect(getPlays()).toEqual([]);
  });

  it('returns [] on malformed / wrong-version / absent data', () => {
    expect(getPlays()).toEqual([]); // 空
    (globalThis as any).localStorage.setItem(PROFILE_KEY, 'not json');
    expect(getPlays()).toEqual([]);
    (globalThis as any).localStorage.setItem(PROFILE_KEY, JSON.stringify({ version: 99, plays: [] }));
    expect(getPlays()).toEqual([]);
  });

  it('is safe with no localStorage', () => {
    delete (globalThis as any).localStorage;
    expect(getPlays()).toEqual([]);
    expect(() => recordPlay('ENFP', T, 1)).not.toThrow();
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm test src/core/profile.test.ts`
Expected: FAIL — 找不到模組 `./profile`。

- [ ] **Step 3: 實作 `src/core/profile.ts`**

```ts
import type { Dimension } from '../config/questions';

export interface PlayRecord {
  at: number; // 時間戳（毫秒）
  type: string; // 4 碼人格
  tallies: Record<Dimension, [number, number]>; // 各維度 [第一字母數, 第二字母數]
}

export const PROFILE_KEY = 'mbti-jump.profile';
export const MAX_PLAYS = 200;
const VERSION = 1;

interface ProfileData {
  version: number;
  plays: PlayRecord[];
}

function read(): ProfileData {
  try {
    const raw = (globalThis as any).localStorage?.getItem(PROFILE_KEY);
    if (!raw) return { version: VERSION, plays: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== VERSION || !Array.isArray(parsed.plays)) {
      return { version: VERSION, plays: [] };
    }
    return parsed as ProfileData;
  } catch {
    return { version: VERSION, plays: [] };
  }
}

function write(data: ProfileData): void {
  try {
    (globalThis as any).localStorage?.setItem(PROFILE_KEY, JSON.stringify(data));
  } catch {
    /* localStorage 不可用時略過 */
  }
}

export function getPlays(): PlayRecord[] {
  return read().plays;
}

export function recordPlay(
  type: string,
  tallies: Record<Dimension, [number, number]>,
  at: number = Date.now(),
): void {
  const data = read();
  data.plays.push({ at, type, tallies });
  if (data.plays.length > MAX_PLAYS) {
    data.plays = data.plays.slice(data.plays.length - MAX_PLAYS);
  }
  write(data);
}

export function clearPlays(): void {
  write({ version: VERSION, plays: [] });
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npm test`
Expected: PASS（含 profile 5 測試；其餘既有測試不變）。

- [ ] **Step 5: Commit**

```bash
git add src/core/profile.ts src/core/profile.test.ts
git commit -m "feat: add localStorage player profile (play history)"
```

---

### Task 2: 趨勢彙整（`core/trends.ts`）

**Files:**
- Create: `src/core/trends.ts`
- Test: `src/core/trends.test.ts`

**Interfaces:**
- Consumes: `DIMENSIONS`, `Dimension`（from `config/questions`）、`PlayRecord`（from `core/profile`）
- Produces:
  - `interface DimensionLean { first: number; second: number; firstPct: number; secondPct: number }`
  - `interface Trends { totalPlays: number; topType: string | null; dimensionLean: Record<Dimension, DimensionLean>; recent: PlayRecord[] }`
  - `const RECENT_LIMIT = 5`
  - `function computeTrends(plays: readonly PlayRecord[]): Trends`

- [ ] **Step 1: 寫失敗測試 `src/core/trends.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { computeTrends, RECENT_LIMIT } from './trends';
import type { PlayRecord } from './profile';
import type { Dimension } from '../config/questions';

const mk = (type: string, at: number, tallies: Record<Dimension, [number, number]>): PlayRecord => ({ at, type, tallies });
const T = (ei: [number, number]): Record<Dimension, [number, number]> => ({ EI: ei, SN: [0, 0], TF: [0, 0], JP: [0, 0] });

describe('computeTrends', () => {
  it('handles empty history', () => {
    const r = computeTrends([]);
    expect(r.totalPlays).toBe(0);
    expect(r.topType).toBeNull();
    expect(r.recent).toEqual([]);
    expect(r.dimensionLean.EI).toEqual({ first: 0, second: 0, firstPct: 0, secondPct: 0 });
  });

  it('counts plays and picks the most frequent type', () => {
    const r = computeTrends([mk('ENFP', 1, T([3, 2])), mk('ENFP', 2, T([1, 4])), mk('INTJ', 3, T([2, 3]))]);
    expect(r.totalPlays).toBe(3);
    expect(r.topType).toBe('ENFP');
  });

  it('on a tie, keeps the type that reached the max count first', () => {
    // ENFP 到 2 早於 INTJ 到 2
    const r = computeTrends([mk('ENFP', 1, T([0, 0])), mk('INTJ', 2, T([0, 0])), mk('ENFP', 3, T([0, 0])), mk('INTJ', 4, T([0, 0]))]);
    expect(r.topType).toBe('ENFP');
  });

  it('sums tallies per dimension into percentages (second = 100 - first)', () => {
    const r = computeTrends([mk('X', 1, T([6, 2])), mk('Y', 2, T([2, 0]))]); // EI 合計 8:2 → 80/20
    expect(r.dimensionLean.EI).toEqual({ first: 8, second: 2, firstPct: 80, secondPct: 20 });
  });

  it('returns the most recent RECENT_LIMIT plays, newest first', () => {
    const plays = Array.from({ length: RECENT_LIMIT + 3 }, (_, i) => mk('ENFP', i, T([0, 0])));
    const r = computeTrends(plays);
    expect(r.recent).toHaveLength(RECENT_LIMIT);
    expect(r.recent[0].at).toBe(RECENT_LIMIT + 2); // 最新
    expect(r.recent[RECENT_LIMIT - 1].at).toBe(3);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm test src/core/trends.test.ts`
Expected: FAIL — 找不到模組 `./trends`。

- [ ] **Step 3: 實作 `src/core/trends.ts`**

```ts
import { DIMENSIONS } from '../config/questions';
import type { Dimension } from '../config/questions';
import type { PlayRecord } from './profile';

export interface DimensionLean {
  first: number;
  second: number;
  firstPct: number;
  secondPct: number;
}

export interface Trends {
  totalPlays: number;
  topType: string | null;
  dimensionLean: Record<Dimension, DimensionLean>;
  recent: PlayRecord[];
}

export const RECENT_LIMIT = 5;

export function computeTrends(plays: readonly PlayRecord[]): Trends {
  const totalPlays = plays.length;

  // 最常出現的型；並列時取最先達到最大次數者
  const counts = new Map<string, number>();
  let topType: string | null = null;
  let topCount = 0;
  for (const p of plays) {
    const c = (counts.get(p.type) ?? 0) + 1;
    counts.set(p.type, c);
    if (c > topCount) {
      topCount = c;
      topType = p.type;
    }
  }

  const dimensionLean = {} as Record<Dimension, DimensionLean>;
  for (const d of DIMENSIONS) {
    let first = 0;
    let second = 0;
    for (const p of plays) {
      const tt = p.tallies[d];
      if (tt) {
        first += tt[0];
        second += tt[1];
      }
    }
    const total = first + second;
    const firstPct = total > 0 ? Math.round((first / total) * 100) : 0;
    dimensionLean[d] = { first, second, firstPct, secondPct: total > 0 ? 100 - firstPct : 0 };
  }

  const recent = plays.slice(Math.max(0, plays.length - RECENT_LIMIT)).reverse();

  return { totalPlays, topType, dimensionLean, recent };
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npm test`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/core/trends.ts src/core/trends.test.ts
git commit -m "feat: add pure trends aggregation (totals, top type, lean %, recent)"
```

---

### Task 3: ScoreTracker 記住各維度 tallies（`core/ScoreTracker.ts`）

**Files:**
- Modify: `src/core/ScoreTracker.ts`
- Test: `src/core/ScoreTracker.test.ts`（新增測試）

**Interfaces:**
- Consumes: `DIMENSIONS`, `Dimension`（既有 import）
- Produces（新增）: `allTallies(): Record<Dimension, [number, number]>`

- [ ] **Step 1: 在 `ScoreTracker.test.ts` 末尾（`describe` 內、最後一個 `it` 後）新增測試**

```ts
  it('allTallies records each dimension\'s counts at lock time', () => {
    const s = new ScoreTracker();
    s.recordAnswer('E'); s.recordAnswer('E'); s.recordAnswer('I'); s.completeLevel('EI'); // EI 2:1
    s.recordAnswer('N'); s.recordAnswer('N'); s.completeLevel('SN'); // SN S0:N2
    const all = s.allTallies();
    expect(all.EI).toEqual([2, 1]);
    expect(all.SN).toEqual([0, 2]);
    expect(all.TF).toEqual([0, 0]); // 未鎖定 → [0,0]
    expect(all.JP).toEqual([0, 0]);
  });

  it('allTallies keeps locked dimensions after resetCurrentLevel', () => {
    const s = new ScoreTracker();
    s.recordAnswer('E'); s.completeLevel('EI'); // 鎖定 EI 1:0
    s.recordAnswer('S'); s.resetCurrentLevel(); // 進行中死亡重來
    expect(s.allTallies().EI).toEqual([1, 0]); // 已鎖定的不受影響
    expect(s.allTallies().SN).toEqual([0, 0]);
  });
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm test src/core/ScoreTracker.test.ts`
Expected: FAIL — `s.allTallies` 不是函式。

- [ ] **Step 3: 實作**

在 `src/core/ScoreTracker.ts`：加欄位（在 `private current` 附近）：
```ts
  private lockedTallies = new Map<Dimension, [number, number]>();
```
在 `completeLevel` 內、`this.current = freshCounts();` **之前**，加：
```ts
    this.lockedTallies.set(d, [this.current[a], this.current[b]]);
```
（`a`/`b` 即該函式已解構的 `const [a, b] = LETTERS_OF[d];`。）
在 `resetCurrentLevel` 下方（或 `isComplete` 之前）新增方法：
```ts
  /** 各維度鎖定當下的 [first, second]；未鎖定的維度回 [0, 0]。 */
  allTallies(): Record<Dimension, [number, number]> {
    const out = {} as Record<Dimension, [number, number]>;
    for (const d of DIMENSIONS) out[d] = this.lockedTallies.get(d) ?? [0, 0];
    return out;
  }
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npm test`
Expected: PASS（既有 ScoreTracker 測試 + 2 新測試）。

- [ ] **Step 5: Commit**

```bash
git add src/core/ScoreTracker.ts src/core/ScoreTracker.test.ts
git commit -m "feat: ScoreTracker.allTallies() exposes per-dimension counts at lock time"
```

---

### Task 4: 趨勢頁 i18n 字串（五語）

**Files:**
- Modify: `src/i18n/strings/en.ts`, `zh-Hant.ts`, `zh-Hans.ts`, `ja.ts`, `es.ts`
- Test: 既有 `src/i18n/completeness.test.ts` 自動涵蓋新 key

**Interfaces:**
- Produces（每語新增 key）：`trend.title`、`trend.cta`、`trend.totalPlays`（`{0}`）、`trend.topType`、`trend.recent`、`trend.clear`、`trend.clearConfirm`、`trend.cleared`、`trend.empty`、`common.back`

> `en` 為權威來源；其他語言為 `Record<StringKey,string>`，缺 key 會編譯或完整性測試失敗——五檔都要加。

- [ ] **Step 1: `en.ts` 新增（於 `EN` 物件內，`'result.groupLabel'` 之後）**

```ts
  'trend.title': 'Your Trends',
  'trend.cta': 'Trends 📊',
  'trend.totalPlays': 'Played {0} times',
  'trend.topType': 'Most often',
  'trend.recent': 'Recent',
  'trend.clear': 'Clear history',
  'trend.clearConfirm': 'Tap again to confirm',
  'trend.cleared': 'History cleared',
  'trend.empty': 'No plays yet — play a round!',
  'common.back': '◀ Back',
```

- [ ] **Step 2: 其餘四語新增對應 key**

`zh-Hant.ts`:
```ts
  'trend.title': '你的趨勢',
  'trend.cta': '趨勢 📊',
  'trend.totalPlays': '已玩 {0} 次',
  'trend.topType': '最常出現',
  'trend.recent': '最近',
  'trend.clear': '清除紀錄',
  'trend.clearConfirm': '再點一次確認',
  'trend.cleared': '已清除紀錄',
  'trend.empty': '還沒有紀錄 — 玩一場吧！',
  'common.back': '◀ 返回',
```
`zh-Hans.ts`:
```ts
  'trend.title': '你的趋势',
  'trend.cta': '趋势 📊',
  'trend.totalPlays': '已玩 {0} 次',
  'trend.topType': '最常出现',
  'trend.recent': '最近',
  'trend.clear': '清除记录',
  'trend.clearConfirm': '再点一次确认',
  'trend.cleared': '已清除记录',
  'trend.empty': '还没有记录 — 玩一场吧！',
  'common.back': '◀ 返回',
```
`ja.ts`:
```ts
  'trend.title': 'あなたの傾向',
  'trend.cta': '傾向 📊',
  'trend.totalPlays': '{0} 回プレイ',
  'trend.topType': '最も多い',
  'trend.recent': '最近',
  'trend.clear': '履歴を消去',
  'trend.clearConfirm': 'もう一度タップで確定',
  'trend.cleared': '履歴を消去しました',
  'trend.empty': 'まだ記録がありません — 一度遊んでみよう！',
  'common.back': '◀ 戻る',
```
`es.ts`:
```ts
  'trend.title': 'Tus tendencias',
  'trend.cta': 'Tendencias 📊',
  'trend.totalPlays': 'Jugado {0} veces',
  'trend.topType': 'Más frecuente',
  'trend.recent': 'Reciente',
  'trend.clear': 'Borrar historial',
  'trend.clearConfirm': 'Toca de nuevo para confirmar',
  'trend.cleared': 'Historial borrado',
  'trend.empty': 'Aún no hay partidas — ¡juega una!',
  'common.back': '◀ Atrás',
```

- [ ] **Step 3: 跑測試確認通過**

Run: `npm test`
Expected: PASS（completeness 測試涵蓋 10 新 key × 5 語）。

- [ ] **Step 4: Commit**

```bash
git add src/i18n/strings
git commit -m "feat: add trend-page i18n strings (5 locales)"
```

---

### Task 5: 趨勢頁場景 + 註冊 + 開始頁入口（`scenes/TrendScene.ts`, `main.ts`, `StartScene.ts`）

**Files:**
- Create: `src/scenes/TrendScene.ts`
- Modify: `src/main.ts`（註冊 TrendScene）, `src/scenes/StartScene.ts`（加趨勢入口鈕）

**Interfaces:**
- Consumes: `GAME`, `PALETTE`, `DIMENSIONS`, `LETTERS_OF`, `getPlays`, `clearPlays`, `computeTrends`, `groupColorOf`, `t`, `tf`, `MuteButton`, `Button`
- Produces: `class TrendScene extends Phaser.Scene`（key `'Trend'`）

- [ ] **Step 1: 實作 `src/scenes/TrendScene.ts`**

```ts
import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { PALETTE } from '../theme/palette';
import { DIMENSIONS, LETTERS_OF } from '../config/questions';
import { getPlays, clearPlays } from '../core/profile';
import { computeTrends } from '../core/trends';
import { groupColorOf } from '../core/temperament';
import { t, tf } from '../i18n/t';
import { MuteButton } from '../ui/MuteButton';

const TITLE_FONT = 'Fredoka, system-ui, sans-serif';
const BODY_FONT = 'Nunito, system-ui, sans-serif';

export class TrendScene extends Phaser.Scene {
  private clearArmed = false;

  constructor() {
    super('Trend');
  }

  create() {
    this.clearArmed = false;
    this.cameras.main.setBackgroundColor(PALETTE.surface);
    const cx = GAME.width / 2;
    new MuteButton(this, GAME.width - 26, 26);

    this.add
      .text(cx, 48, t('trend.title'), { fontFamily: TITLE_FONT, fontSize: '30px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);

    const trends = computeTrends(getPlays());

    if (trends.totalPlays === 0) {
      this.add
        .text(cx, GAME.height / 2 - 40, t('trend.empty'), {
          fontFamily: BODY_FONT,
          fontSize: '18px',
          color: '#ffffffcc',
          align: 'center',
          wordWrap: { width: GAME.width - 60 },
        })
        .setOrigin(0.5);
    } else {
      this.add
        .text(cx, 108, tf('trend.totalPlays', [trends.totalPlays]), { fontFamily: BODY_FONT, fontSize: '18px', color: PALETTE.textMuted })
        .setOrigin(0.5);

      if (trends.topType) {
        this.add.text(cx, 150, t('trend.topType'), { fontFamily: BODY_FONT, fontSize: '14px', color: PALETTE.textMuted }).setOrigin(0.5);
        const hex = '#' + groupColorOf(trends.topType).toString(16).padStart(6, '0');
        this.add.text(cx, 188, trends.topType, { fontFamily: TITLE_FONT, fontSize: '44px', color: hex, fontStyle: 'bold' }).setOrigin(0.5);
      }

      let y = 250;
      for (const d of DIMENSIONS) {
        const [a, b] = LETTERS_OF[d];
        const lean = trends.dimensionLean[d];
        this.drawBar(cx, y, a, b, lean.firstPct, lean.secondPct);
        y += 56;
      }

      this.add.text(cx, 486, t('trend.recent'), { fontFamily: BODY_FONT, fontSize: '14px', color: PALETTE.textMuted }).setOrigin(0.5);
      trends.recent.forEach((r, i) => {
        this.add.text(cx, 514 + i * 26, r.type, { fontFamily: BODY_FONT, fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
      });
    }

    // 清除鈕（兩步確認）
    const clearBtn = this.add
      .text(cx, 690, t('trend.clear'), { fontFamily: BODY_FONT, fontSize: '16px', color: '#ffb0bd', backgroundColor: '#ffffff11', padding: { x: 14, y: 8 } })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    clearBtn.on('pointerup', () => {
      if (!this.clearArmed) {
        this.clearArmed = true;
        clearBtn.setText(t('trend.clearConfirm'));
        return;
      }
      clearPlays();
      this.scene.restart();
    });

    // 返回
    const backBtn = this.add
      .text(cx, 748, t('common.back'), { fontFamily: BODY_FONT, fontSize: '18px', color: '#ffffff', backgroundColor: '#ffffff11', padding: { x: 16, y: 8 } })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    backBtn.on('pointerup', () => this.scene.start('Start'));
  }

  /** 一維度的偏向比例條：左標 a 與 firstPct，右標 b 與 secondPct。 */
  private drawBar(cx: number, y: number, a: string, b: string, firstPct: number, secondPct: number): void {
    const w = 220;
    const h = 20;
    const x = cx - w / 2;
    const g = this.add.graphics();
    g.fillStyle(PALETTE.surfaceAlt, 1);
    g.fillRoundedRect(x, y, w, h, 6);
    g.fillStyle(PALETTE.accent, 1);
    const fw = Math.max(0, Math.min(w, (w * firstPct) / 100));
    if (fw > 0) g.fillRoundedRect(x, y, fw, h, 6);
    this.add.text(x - 8, y + h / 2, `${a} ${firstPct}%`, { fontFamily: BODY_FONT, fontSize: '13px', color: '#ffffff' }).setOrigin(1, 0.5);
    this.add.text(x + w + 8, y + h / 2, `${b} ${secondPct}%`, { fontFamily: BODY_FONT, fontSize: '13px', color: '#ffffff' }).setOrigin(0, 0.5);
  }
}
```

- [ ] **Step 2: `main.ts` 註冊 TrendScene**

`src/main.ts`：import 加 `import { TrendScene } from './scenes/TrendScene';`，把 `scene` 陣列末尾加入 `TrendScene`：
```ts
  scene: [BootScene, StartScene, GameScene, GameOverScene, ResultScene, TrendScene],
```

- [ ] **Step 3: `StartScene.ts` 加趨勢入口鈕**

`src/scenes/StartScene.ts`：確認已 import `Button`（Task 已有）。在 Start 主鈕（`new Button(this, cx, 478, …)`）之後、`requestTiltPermission` 方法之前，加一顆次要鈕：
```ts
    new Button(this, cx, 558, t('trend.cta'), {
      width: 200,
      height: 50,
      fontSize: 20,
      bg: 0x4298b4, // 藍，區分主 CTA
      bgHover: 0x54aec9,
      bgDown: 0x3a86a0,
      onClick: () => this.scene.start('Trend'),
    });
```
（`t` 已 import。）

- [ ] **Step 4: 驗證編譯、建置、測試**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -1 && npm test 2>&1 | tail -3`
Expected: 無型別錯誤、`✓ built`、測試全綠。

- [ ] **Step 5: 手動驗證**

Run: `npm run dev`
Expected: 開始頁出現藍色「趨勢 📊」鈕；點入趨勢頁；尚無紀錄時顯示空狀態；返回回開始頁；清除鈕需點兩次。

- [ ] **Step 6: Commit**

```bash
git add src/scenes/TrendScene.ts src/main.ts src/scenes/StartScene.ts
git commit -m "feat: add TrendScene + start-screen entry"
```

---

### Task 6: 結算時記錄 + 結算頁入口（`scenes/ResultScene.ts`）

**Files:**
- Modify: `src/scenes/ResultScene.ts`

**Interfaces:**
- Consumes: `recordPlay`（from `core/profile`）、`ScoreTracker.allTallies`、`t`、`Button`
- Produces: 無新介面（結算時存一筆 + 一顆趨勢鈕）

- [ ] **Step 1: 記錄本場結果**

`src/scenes/ResultScene.ts`：import 加 `import { recordPlay } from '../core/profile';`。在 `create(data)` 內、計算出 `type` 之後（`const type = data.score.result();` 之下）加：
```ts
    recordPlay(type, data.score.allTallies());
```

- [ ] **Step 2: 加「看趨勢」鈕**

在既有「再玩一次」鈕（`new Button(this, cx, 575, t('result.again'), …)`）之後加：
```ts
    new Button(this, cx, 640, t('trend.cta'), {
      width: 240,
      height: 50,
      fontSize: 18,
      bg: 0x4298b4,
      bgHover: 0x54aec9,
      bgDown: 0x3a86a0,
      onClick: () => this.scene.start('Trend'),
    });
```
（`t` 已 import；`Button` 已 import。）

- [ ] **Step 3: 驗證編譯、建置、測試**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -1 && npm test 2>&1 | tail -3`
Expected: 無型別錯誤、`✓ built`、測試全綠。

- [ ] **Step 4: 手動驗證完整流程**

Run: `npm run dev`，玩完一場（或用鍵盤爬完）。
Expected：
1. 到結算頁 → 已悄悄存一筆。
2. 點「趨勢 📊」→ 趨勢頁顯示：已玩 1 次、最常型（族群色）、四維度偏向% 條、最近 1 筆。
3. 再玩幾場 → 次數與偏向% 累積更新。
4. 清除 → 兩次點擊後回空狀態。

- [ ] **Step 5: Commit**

```bash
git add src/scenes/ResultScene.ts
git commit -m "feat: record each play + trend entry on result screen"
```

---

## 完成後（手動）
- 實機各語言/裝置抽測趨勢頁排版（長條、百分比、最近清單、清除兩步）。
- 之後子專案：B 成就系統（消費 `profile` 資料）、C 題庫擴充 + 隨機題組。
