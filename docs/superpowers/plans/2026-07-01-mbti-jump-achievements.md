# MBTI Jump — 成就系統 (子專案 B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 8 個由歷次遊玩紀錄純函式推導的成就；結算時偵測新解鎖並提示；開始頁進入成就頁（已解鎖高亮、未解鎖灰階）；純邏輯與 Phaser 解耦、可單測，遊戲流程與 A 的 profile 格式不動。

**Architecture:** `core/achievements.ts` 純函式（`ACHIEVEMENTS` 8 定義 + `unlockedIds`/`newlyUnlocked`），消費 A 的 `PlayRecord[]`；`core/achievementStore.ts` 以獨立 localStorage key 記「已提示」id 去重；`AchievementScene` 顯示清單；`ResultScene` 在 `recordPlay` 後偵測新解鎖並淡入淡出提示。

**Tech Stack:** Vite, TypeScript (strict), Phaser 3, Vitest。純前端 localStorage。

## Global Constraints

- 純前端、直式 portrait 450×800；每個 task 後 `npm run build` 與 `npm test` 必須綠。
- 純模組（`achievements`）**不得 import Phaser**、須單元測試；場景不在此限。
- 成就解鎖狀態＝`getPlays()` 純函式，不另存解鎖狀態。僅「已提示」id 存 localStorage key `mbti-jump.achievements`（格式 `{ version:1, seen: string[] }`；讀取容錯回 `[]`）；**不得更動 A 的 `mbti-jump.profile` 格式**。
- 8 個成就 id 固定：`first_play`(≥1) `persistent`(≥10) `dedicated`(≥25) `collector`(16型) `four_realms`(4族群) `decisive`(某場某維度5-0) `torn`(某場某維度3-2) `creature_of_habit`(同型≥3次)。`ACHIEVEMENTS` 順序即成就頁排列與提示順序。
- i18n：每成就 `ach.<id>.name`/`ach.<id>.desc` + 通用 `ach.title`/`ach.cta`/`ach.unlocked`（`{0}`）× 五語；`en` 權威；完整性測試涵蓋。重用既有 `common.back`。
- 字體：標題/大字 `"Fredoka, system-ui, sans-serif"`；內文 `"Nunito, system-ui, sans-serif"`。
- 遊戲邏輯、計分、A 的 profile／趨勢不得更動。

---

### Task 1: 成就定義與解鎖判定（`core/achievements.ts`）

**Files:**
- Create: `src/core/achievements.ts`
- Test: `src/core/achievements.test.ts`

**Interfaces:**
- Consumes: `PlayRecord`（from `core/profile`）、`groupOf`（from `core/temperament`）、`DIMENSIONS`（from `config/questions`）
- Produces:
  - `interface Achievement { id: string; check: (plays: readonly PlayRecord[]) => boolean }`
  - `const ACHIEVEMENTS: Achievement[]`（8 個，固定順序）
  - `function unlockedIds(plays: readonly PlayRecord[]): Set<string>`
  - `function newlyUnlocked(plays: readonly PlayRecord[], seen: readonly string[]): string[]`

- [ ] **Step 1: 寫失敗測試 `src/core/achievements.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS, unlockedIds, newlyUnlocked } from './achievements';
import type { PlayRecord } from './profile';
import type { Dimension } from '../config/questions';

const Z: Record<Dimension, [number, number]> = { EI: [0, 0], SN: [0, 0], TF: [0, 0], JP: [0, 0] };
const mk = (type: string, tallies: Partial<Record<Dimension, [number, number]>> = {}): PlayRecord => ({ at: 1, type, tallies: { ...Z, ...tallies } });
const repeat = (rec: PlayRecord, n: number): PlayRecord[] => Array.from({ length: n }, () => rec);
const ALL16 = ['E', 'I'].flatMap((a) => ['S', 'N'].flatMap((b) => ['T', 'F'].flatMap((c) => ['J', 'P'].map((d) => `${a}${b}${c}${d}`))));

describe('achievements', () => {
  it('has exactly the 8 expected ids in order', () => {
    expect(ACHIEVEMENTS.map((a) => a.id)).toEqual([
      'first_play', 'persistent', 'dedicated', 'collector', 'four_realms', 'decisive', 'torn', 'creature_of_habit',
    ]);
  });

  it('play-count thresholds', () => {
    expect(unlockedIds([]).has('first_play')).toBe(false);
    expect(unlockedIds([mk('ENFP')]).has('first_play')).toBe(true);
    expect(unlockedIds(repeat(mk('ENFP'), 9)).has('persistent')).toBe(false);
    expect(unlockedIds(repeat(mk('ENFP'), 10)).has('persistent')).toBe(true);
    expect(unlockedIds(repeat(mk('ENFP'), 25)).has('dedicated')).toBe(true);
  });

  it('collector needs all 16 types', () => {
    const fifteen = ALL16.slice(0, 15).map((t) => mk(t));
    expect(unlockedIds(fifteen).has('collector')).toBe(false);
    expect(unlockedIds(ALL16.map((t) => mk(t))).has('collector')).toBe(true);
  });

  it('four_realms needs a type from each of the 4 groups', () => {
    // ESFP explorer, ENFP diplomat, ENTP analyst — only 3 groups
    const three = [mk('ESFP'), mk('ENFP'), mk('ENTP')];
    expect(unlockedIds(three).has('four_realms')).toBe(false);
    const four = [...three, mk('ESTJ')]; // sentinel
    expect(unlockedIds(four).has('four_realms')).toBe(true);
  });

  it('decisive needs a 5-0 dimension; torn needs a 3-2 dimension', () => {
    expect(unlockedIds([mk('ENFP', { EI: [4, 1] })]).has('decisive')).toBe(false);
    expect(unlockedIds([mk('ENFP', { EI: [5, 0] })]).has('decisive')).toBe(true);
    expect(unlockedIds([mk('ENFP', { EI: [0, 5] })]).has('decisive')).toBe(true);
    expect(unlockedIds([mk('ENFP', { EI: [5, 0] })]).has('torn')).toBe(false);
    expect(unlockedIds([mk('ENFP', { EI: [3, 2] })]).has('torn')).toBe(true);
  });

  it('creature_of_habit needs the same type 3 times', () => {
    expect(unlockedIds(repeat(mk('INTJ'), 2)).has('creature_of_habit')).toBe(false);
    expect(unlockedIds(repeat(mk('INTJ'), 3)).has('creature_of_habit')).toBe(true);
  });

  it('newlyUnlocked returns unlocked-but-unseen in ACHIEVEMENTS order', () => {
    const plays = repeat(mk('ENFP'), 10); // unlocks first_play + persistent
    expect(newlyUnlocked(plays, [])).toEqual(['first_play', 'persistent']);
    expect(newlyUnlocked(plays, ['first_play'])).toEqual(['persistent']);
    expect(newlyUnlocked(plays, ['first_play', 'persistent'])).toEqual([]);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm test src/core/achievements.test.ts`
Expected: FAIL — 找不到模組 `./achievements`。

- [ ] **Step 3: 實作 `src/core/achievements.ts`**

```ts
import type { PlayRecord } from './profile';
import { groupOf } from './temperament';
import { DIMENSIONS } from '../config/questions';

export interface Achievement {
  id: string;
  check: (plays: readonly PlayRecord[]) => boolean;
}

function distinctTypes(plays: readonly PlayRecord[]): Set<string> {
  return new Set(plays.map((p) => p.type));
}

/** 是否有任一場的任一維度 tally 符合 pred(first, second)。 */
function anyDimension(
  plays: readonly PlayRecord[],
  pred: (first: number, second: number) => boolean,
): boolean {
  for (const p of plays) {
    for (const d of DIMENSIONS) {
      const tt = p.tallies[d];
      if (tt && pred(tt[0], tt[1])) return true;
    }
  }
  return false;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_play', check: (p) => p.length >= 1 },
  { id: 'persistent', check: (p) => p.length >= 10 },
  { id: 'dedicated', check: (p) => p.length >= 25 },
  { id: 'collector', check: (p) => distinctTypes(p).size >= 16 },
  {
    id: 'four_realms',
    check: (p) => {
      const groups = new Set<string>();
      for (const play of p) groups.add(groupOf(play.type));
      return groups.size >= 4;
    },
  },
  { id: 'decisive', check: (p) => anyDimension(p, (a, b) => (a === 5 && b === 0) || (a === 0 && b === 5)) },
  { id: 'torn', check: (p) => anyDimension(p, (a, b) => a + b === 5 && Math.abs(a - b) === 1) },
  {
    id: 'creature_of_habit',
    check: (p) => {
      const counts = new Map<string, number>();
      for (const play of p) {
        const c = (counts.get(play.type) ?? 0) + 1;
        counts.set(play.type, c);
        if (c >= 3) return true;
      }
      return false;
    },
  },
];

export function unlockedIds(plays: readonly PlayRecord[]): Set<string> {
  return new Set(ACHIEVEMENTS.filter((a) => a.check(plays)).map((a) => a.id));
}

/** 目前已解鎖但不在 seen 者，依 ACHIEVEMENTS 順序回傳。 */
export function newlyUnlocked(plays: readonly PlayRecord[], seen: readonly string[]): string[] {
  const seenSet = new Set(seen);
  const unlocked = unlockedIds(plays);
  return ACHIEVEMENTS.filter((a) => unlocked.has(a.id) && !seenSet.has(a.id)).map((a) => a.id);
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npm test`
Expected: PASS（含 achievements 全數）。

- [ ] **Step 5: Commit**

```bash
git add src/core/achievements.ts src/core/achievements.test.ts
git commit -m "feat: add achievement definitions + pure unlock evaluation"
```

---

### Task 2: 已提示 id 儲存（`core/achievementStore.ts`）

**Files:**
- Create: `src/core/achievementStore.ts`
- Test: `src/core/achievementStore.test.ts`

**Interfaces:**
- Consumes: 無
- Produces:
  - `const ACH_KEY = 'mbti-jump.achievements'`
  - `function getSeenIds(): string[]`（讀不到/壞 → `[]`）
  - `function markSeen(ids: readonly string[]): void`（併集去重寫回）

- [ ] **Step 1: 寫失敗測試 `src/core/achievementStore.test.ts`**

```ts
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { getSeenIds, markSeen, ACH_KEY } from './achievementStore';

function mockStore() {
  const s: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => (k in s ? s[k] : null),
    setItem: (k: string, v: string) => { s[k] = v; },
  };
  return s;
}
afterEach(() => { delete (globalThis as any).localStorage; });
beforeEach(() => { mockStore(); });

describe('achievementStore', () => {
  it('starts empty and marks/unions seen ids', () => {
    expect(getSeenIds()).toEqual([]);
    markSeen(['first_play']);
    expect(getSeenIds()).toEqual(['first_play']);
    markSeen(['first_play', 'persistent']); // dedupe first_play
    expect(new Set(getSeenIds())).toEqual(new Set(['first_play', 'persistent']));
  });

  it('returns [] on malformed / wrong-version data', () => {
    (globalThis as any).localStorage.setItem(ACH_KEY, 'nope');
    expect(getSeenIds()).toEqual([]);
    (globalThis as any).localStorage.setItem(ACH_KEY, JSON.stringify({ version: 99, seen: ['x'] }));
    expect(getSeenIds()).toEqual([]);
  });

  it('is safe with no localStorage', () => {
    delete (globalThis as any).localStorage;
    expect(getSeenIds()).toEqual([]);
    expect(() => markSeen(['a'])).not.toThrow();
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm test src/core/achievementStore.test.ts`
Expected: FAIL — 找不到模組 `./achievementStore`。

- [ ] **Step 3: 實作 `src/core/achievementStore.ts`**

```ts
export const ACH_KEY = 'mbti-jump.achievements';
const VERSION = 1;

interface AchData {
  version: number;
  seen: string[];
}

function read(): AchData {
  try {
    const raw = (globalThis as any).localStorage?.getItem(ACH_KEY);
    if (!raw) return { version: VERSION, seen: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== VERSION || !Array.isArray(parsed.seen)) {
      return { version: VERSION, seen: [] };
    }
    return parsed as AchData;
  } catch {
    return { version: VERSION, seen: [] };
  }
}

function write(data: AchData): void {
  try {
    (globalThis as any).localStorage?.setItem(ACH_KEY, JSON.stringify(data));
  } catch {
    /* localStorage 不可用時略過 */
  }
}

export function getSeenIds(): string[] {
  return read().seen;
}

export function markSeen(ids: readonly string[]): void {
  const set = new Set(read().seen);
  for (const id of ids) set.add(id);
  write({ version: VERSION, seen: [...set] });
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npm test`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/core/achievementStore.ts src/core/achievementStore.test.ts
git commit -m "feat: add achievement seen-id store (toast dedup)"
```

---

### Task 3: 成就 i18n 字串（五語）

**Files:**
- Modify: `src/i18n/strings/en.ts`, `zh-Hant.ts`, `zh-Hans.ts`, `ja.ts`, `es.ts`
- Test: 既有 `src/i18n/completeness.test.ts` 自動涵蓋

**Interfaces:**
- Produces（每語新增 19 key）：`ach.title`、`ach.cta`、`ach.unlocked`（`{0}`）、以及 8 個成就各 `ach.<id>.name`/`ach.<id>.desc`。

> `en` 權威；其他語言 `Record<StringKey,string>`，五檔都要加。

- [ ] **Step 1: `en.ts` 新增（於 `EN` 物件內，`'common.back'` 之後）**

```ts
  'ach.title': 'Achievements',
  'ach.cta': 'Achievements 🏆',
  'ach.unlocked': '🏆 Unlocked: {0}',
  'ach.first_play.name': 'First Steps',
  'ach.first_play.desc': 'Finish your first game',
  'ach.persistent.name': 'Persistent',
  'ach.persistent.desc': 'Play 10 games',
  'ach.dedicated.name': 'Dedicated',
  'ach.dedicated.desc': 'Play 25 games',
  'ach.collector.name': 'Collector',
  'ach.collector.desc': 'Discover all 16 types',
  'ach.four_realms.name': 'Four Realms',
  'ach.four_realms.desc': 'Get a type from all 4 groups',
  'ach.decisive.name': 'Decisive',
  'ach.decisive.desc': 'Sweep a dimension 5–0 in one game',
  'ach.torn.name': 'Torn',
  'ach.torn.desc': 'Split a dimension 3–2 in one game',
  'ach.creature_of_habit.name': 'Creature of Habit',
  'ach.creature_of_habit.desc': 'Get the same type 3 times',
```

- [ ] **Step 2: `zh-Hant.ts` 新增**

```ts
  'ach.title': '成就',
  'ach.cta': '成就 🏆',
  'ach.unlocked': '🏆 解鎖：{0}',
  'ach.first_play.name': '初次啟程',
  'ach.first_play.desc': '完成第一場遊戲',
  'ach.persistent.name': '樂此不疲',
  'ach.persistent.desc': '遊玩 10 場',
  'ach.dedicated.name': '死忠玩家',
  'ach.dedicated.desc': '遊玩 25 場',
  'ach.collector.name': '蒐集狂',
  'ach.collector.desc': '集滿全部 16 型',
  'ach.four_realms.name': '四族巡禮',
  'ach.four_realms.desc': '四大族群都拿過',
  'ach.decisive.name': '立場堅定',
  'ach.decisive.desc': '單場某維度 5–0 全票',
  'ach.torn.name': '天人交戰',
  'ach.torn.desc': '單場某維度 3–2 接近',
  'ach.creature_of_habit.name': '老樣子',
  'ach.creature_of_habit.desc': '同一型拿到 3 次',
```

- [ ] **Step 3: `zh-Hans.ts` 新增**

```ts
  'ach.title': '成就',
  'ach.cta': '成就 🏆',
  'ach.unlocked': '🏆 解锁：{0}',
  'ach.first_play.name': '初次启程',
  'ach.first_play.desc': '完成第一场游戏',
  'ach.persistent.name': '乐此不疲',
  'ach.persistent.desc': '游玩 10 场',
  'ach.dedicated.name': '死忠玩家',
  'ach.dedicated.desc': '游玩 25 场',
  'ach.collector.name': '收集狂',
  'ach.collector.desc': '集满全部 16 型',
  'ach.four_realms.name': '四族巡礼',
  'ach.four_realms.desc': '四大族群都拿过',
  'ach.decisive.name': '立场坚定',
  'ach.decisive.desc': '单场某维度 5–0 全票',
  'ach.torn.name': '天人交战',
  'ach.torn.desc': '单场某维度 3–2 接近',
  'ach.creature_of_habit.name': '老样子',
  'ach.creature_of_habit.desc': '同一型拿到 3 次',
```

- [ ] **Step 4: `ja.ts` 新增**

```ts
  'ach.title': '実績',
  'ach.cta': '実績 🏆',
  'ach.unlocked': '🏆 解除：{0}',
  'ach.first_play.name': 'はじめの一歩',
  'ach.first_play.desc': '初めてのゲームをクリア',
  'ach.persistent.name': '継続は力',
  'ach.persistent.desc': '10 回プレイ',
  'ach.dedicated.name': '熱心なプレイヤー',
  'ach.dedicated.desc': '25 回プレイ',
  'ach.collector.name': 'コレクター',
  'ach.collector.desc': '全 16 タイプを集める',
  'ach.four_realms.name': '四大制覇',
  'ach.four_realms.desc': '4 つのグループすべてを獲得',
  'ach.decisive.name': '決断力',
  'ach.decisive.desc': '1 ゲームで次元を 5–0 制覇',
  'ach.torn.name': '揺れる心',
  'ach.torn.desc': '1 ゲームで次元が 3–2 の僅差',
  'ach.creature_of_habit.name': 'いつもの',
  'ach.creature_of_habit.desc': '同じタイプを 3 回獲得',
```

- [ ] **Step 5: `es.ts` 新增**

```ts
  'ach.title': 'Logros',
  'ach.cta': 'Logros 🏆',
  'ach.unlocked': '🏆 Desbloqueado: {0}',
  'ach.first_play.name': 'Primeros pasos',
  'ach.first_play.desc': 'Termina tu primera partida',
  'ach.persistent.name': 'Persistente',
  'ach.persistent.desc': 'Juega 10 partidas',
  'ach.dedicated.name': 'Dedicado',
  'ach.dedicated.desc': 'Juega 25 partidas',
  'ach.collector.name': 'Coleccionista',
  'ach.collector.desc': 'Descubre los 16 tipos',
  'ach.four_realms.name': 'Cuatro reinos',
  'ach.four_realms.desc': 'Consigue un tipo de los 4 grupos',
  'ach.decisive.name': 'Decidido',
  'ach.decisive.desc': 'Arrasa una dimensión 5–0 en una partida',
  'ach.torn.name': 'Dividido',
  'ach.torn.desc': 'Divide una dimensión 3–2 en una partida',
  'ach.creature_of_habit.name': 'Animal de costumbres',
  'ach.creature_of_habit.desc': 'Consigue el mismo tipo 3 veces',
```

- [ ] **Step 6: 跑測試確認通過**

Run: `npm test`
Expected: PASS（completeness 涵蓋 19 新 key × 5 語）。

- [ ] **Step 7: Commit**

```bash
git add src/i18n/strings
git commit -m "feat: add achievement i18n strings (5 locales)"
```

---

### Task 4: 成就頁 + 註冊 + 開始頁入口（`scenes/AchievementScene.ts`, `main.ts`, `StartScene.ts`）

**Files:**
- Create: `src/scenes/AchievementScene.ts`
- Modify: `src/main.ts`（註冊）, `src/scenes/StartScene.ts`（入口鈕）

**Interfaces:**
- Consumes: `GAME`, `PALETTE`, `ACHIEVEMENTS`, `unlockedIds`, `getPlays`, `t`, `StringKey`, `MuteButton`, `Button`
- Produces: `class AchievementScene extends Phaser.Scene`（key `'Achievements'`）

- [ ] **Step 1: 實作 `src/scenes/AchievementScene.ts`**

```ts
import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { PALETTE } from '../theme/palette';
import { ACHIEVEMENTS, unlockedIds } from '../core/achievements';
import { getPlays } from '../core/profile';
import { t } from '../i18n/t';
import type { StringKey } from '../i18n/t';
import { MuteButton } from '../ui/MuteButton';

const TITLE_FONT = 'Fredoka, system-ui, sans-serif';
const BODY_FONT = 'Nunito, system-ui, sans-serif';

export class AchievementScene extends Phaser.Scene {
  constructor() {
    super('Achievements');
  }

  create() {
    this.cameras.main.setBackgroundColor(PALETTE.surface);
    const cx = GAME.width / 2;
    new MuteButton(this, GAME.width - 26, 26);

    this.add
      .text(cx, 48, t('ach.title'), { fontFamily: TITLE_FONT, fontSize: '30px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);

    const unlocked = unlockedIds(getPlays());
    let y = 108;
    for (const a of ACHIEVEMENTS) {
      const on = unlocked.has(a.id);
      this.add.text(28, y, on ? '🏆' : '🔒', { fontSize: '22px' }).setOrigin(0, 0.5);
      this.add
        .text(64, y - 10, t(`ach.${a.id}.name` as StringKey), {
          fontFamily: TITLE_FONT,
          fontSize: '18px',
          color: on ? '#ffe066' : '#ffffff66',
        })
        .setOrigin(0, 0.5);
      this.add
        .text(64, y + 12, t(`ach.${a.id}.desc` as StringKey), {
          fontFamily: BODY_FONT,
          fontSize: '13px',
          color: on ? '#ffffffcc' : '#ffffff44',
          wordWrap: { width: GAME.width - 90 },
        })
        .setOrigin(0, 0.5);
      y += 80;
    }

    const backBtn = this.add
      .text(cx, 758, t('common.back'), { fontFamily: BODY_FONT, fontSize: '18px', color: '#ffffff', backgroundColor: '#ffffff11', padding: { x: 16, y: 8 } })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    backBtn.on('pointerup', () => this.scene.start('Start'));
  }
}
```

- [ ] **Step 2: `main.ts` 註冊 AchievementScene**

`src/main.ts`：import 加 `import { AchievementScene } from './scenes/AchievementScene';`，把 `scene` 陣列末尾加入 `AchievementScene`（目前末尾為 `TrendScene`）：
```ts
  scene: [BootScene, StartScene, GameScene, GameOverScene, ResultScene, TrendScene, AchievementScene],
```

- [ ] **Step 3: `StartScene.ts` 加成就入口鈕**

`src/scenes/StartScene.ts`：在既有「趨勢」鈕（`new Button(this, cx, 558, t('trend.cta'), …)`）之後加：
```ts
    new Button(this, cx, 620, t('ach.cta'), {
      width: 200,
      height: 50,
      fontSize: 20,
      bg: 0x88619a, // 紫，區分其他鈕
      bgHover: 0x9d78ae,
      bgDown: 0x76527f,
      onClick: () => this.scene.start('Achievements'),
    });
```

- [ ] **Step 4: 驗證編譯、建置、測試**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -1 && npm test 2>&1 | tail -3`
Expected: 無型別錯誤、`✓ built`、測試全綠。

- [ ] **Step 5: 手動驗證**

Run: `npm run dev`
Expected: 開始頁出現紫色「成就 🏆」鈕；點入成就頁，8 列（尚無紀錄時全為 🔒 灰階，名稱＋說明可見）；返回回開始頁。

- [ ] **Step 6: Commit**

```bash
git add src/scenes/AchievementScene.ts src/main.ts src/scenes/StartScene.ts
git commit -m "feat: add AchievementScene + start-screen entry"
```

---

### Task 5: 結算頁新解鎖提示（`scenes/ResultScene.ts`）

**Files:**
- Modify: `src/scenes/ResultScene.ts`

**Interfaces:**
- Consumes: `getPlays`（profile）、`newlyUnlocked`（achievements）、`getSeenIds`/`markSeen`（achievementStore）、`t`/`tf`/`StringKey`、`prefersReducedMotion`
- Produces: 無新介面（結算時偵測並提示新解鎖）

- [ ] **Step 1: 加入 import**

`src/scenes/ResultScene.ts` 頂部 import 區加：
```ts
import { getPlays } from '../core/profile';
import { newlyUnlocked } from '../core/achievements';
import { getSeenIds, markSeen } from '../core/achievementStore';
import { prefersReducedMotion } from '../ui/reducedMotion';
import type { StringKey } from '../i18n/t';
```
（`recordPlay` 已於子專案 A import；`t`/`tf`、`Button` 已 import。）

- [ ] **Step 2: 在 `recordPlay` 之後偵測並提示**

在 `create(data)` 內、`recordPlay(type, data.score.allTallies());`（A 加入）之後加：
```ts
    const fresh = newlyUnlocked(getPlays(), getSeenIds());
    if (fresh.length > 0) {
      this.showUnlockToast(fresh);
      markSeen(fresh);
    }
```

- [ ] **Step 3: 新增 `showUnlockToast` 方法**

在 `ResultScene` class 內（`create` 之後）加：
```ts
  /** 於畫面上方依序淡入淡出顯示新解鎖成就；reduced-motion 時直接顯示短暫後移除。 */
  private showUnlockToast(ids: string[]): void {
    const cx = GAME.width / 2;
    const reduce = prefersReducedMotion();
    ids.forEach((id, i) => {
      const label = this.add
        .text(cx, 44 + i * 46, tf('ach.unlocked', [t(`ach.${id}.name` as StringKey)]), {
          fontFamily: 'Fredoka, system-ui, sans-serif',
          fontSize: '18px',
          color: '#0f1220',
          backgroundColor: '#ffe066',
          padding: { x: 12, y: 8 },
          align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(60)
        .setAlpha(0);
      if (reduce) {
        label.setAlpha(1);
        this.time.delayedCall(2500 + i * 400, () => label.destroy());
        return;
      }
      this.tweens.add({
        targets: label,
        alpha: { from: 0, to: 1 },
        duration: 300,
        delay: i * 300,
        hold: 2000,
        yoyo: true,
        onComplete: () => label.destroy(),
      });
    });
  }
```

- [ ] **Step 4: 驗證編譯、建置、測試**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -1 && npm test 2>&1 | tail -3`
Expected: 無型別錯誤、`✓ built`、測試全綠。

- [ ] **Step 5: 手動驗證完整流程**

Run: `npm run dev`，玩完第一場（或用鍵盤爬完）。
Expected：
1. 結算頁上方淡入「🏆 Unlocked: First Steps」提示，停留後淡出。
2. 回開始頁 → 成就頁 → 「初次啟程」已解鎖（🏆＋亮色），其餘仍 🔒。
3. 再玩到達成條件（如集滿型、5-0）時，對應成就於結算提示且成就頁高亮；已提示者不再重複提示。

- [ ] **Step 6: Commit**

```bash
git add src/scenes/ResultScene.ts
git commit -m "feat: show newly-unlocked achievement toast on result"
```

---

## 完成後（手動）
- 實機各語言/裝置抽測成就頁排版（8 列名稱+說明）與結算提示（單/多解鎖）。
- 之後子專案：C 題庫擴充 + 隨機題組。
