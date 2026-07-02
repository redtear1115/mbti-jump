# MBTI Jump P2 次級畫面＋HUD 下移＋白色基底 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 成就頁兩欄徽章卡＋進度、趨勢空狀態果凍怪＋直接開局、次級按鈕統一 Button 元件、三個程式向量 icon 取代 emoji、GameScene HUD 下移至底部、`PLAYER_BASE_COLOR` 改微暖白。

**Architecture:** 新純邏輯只有 `Achievement.progress`（可單測）；icon 是 Phaser generateTexture 小模組；tilt 權限自 StartScene 抽共用給趨勢 CTA；其餘為場景繪製層改動與常數搬移。

**Tech Stack:** TypeScript strict、Phaser 3、vitest。

**Spec:** `docs/superpowers/specs/2026-07-02-mbti-jump-p2-secondary-design.md`

## Global Constraints

- TypeScript strict、`noUnusedLocals`、`noUnusedParameters`；指令在 repo root。
- 成就卡幾何：卡 198×126、圓角 12、左 margin 20、欄距 12（col x = 20 + col×210）、列高 138、網格自 y=120；徽章圓 r16 圓心 (卡x+28, 卡y+30)；進度條 4px 位於 卡y+卡高−16。
- 次級鈕：`bg PALETTE.surfaceAlt`、hover `0x3a3e58`、down `0x22243a`、白字、160×46、fontSize 16。破壞性鈕：`bg PALETTE.no`、hover `0xc95568`、down `0x9a3145`、白字、200×46。
- HUD 下移：卡 (0, 646..800)、上圓角 `{tl:16,tr:16,bl:0,br:0}`；banner y=664、關卡標籤 728、得分條 y0=746（票數字 757）、答案預覽文字 y=618。其餘 GameScene 邏輯不動。
- `PLAYER_BASE_COLOR = 0xf0f0f4`（微暖白）。
- i18n 五語同步（completeness 測試把關）；ja/es 新字串照慣例可標 needs-review。
- 既有 128 測試每 task 結束全綠；commit 用 conventional prefix，結尾加：
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: 向量 icon 模組 `src/ui/icons.ts`

**Files:**
- Create: `src/ui/icons.ts`

**Interfaces:**
- Consumes: 無
- Produces: `type IconKind = 'trophy' | 'lock' | 'chart'`；`ensureIconTexture(scene: Phaser.Scene, kind: IconKind): string`（24×24 白色圖形 texture、key `icon-<kind>`，使用端 setTint 上色；Task 4/6 使用）

- [ ] **Step 1: 建模組**

```ts
// src/ui/icons.ts
import Phaser from 'phaser';

export type IconKind = 'trophy' | 'lock' | 'chart';

/** 程式繪製 24×24 白色 icon texture（使用端 setTint 上色）。同 kind 快取。 */
export function ensureIconTexture(scene: Phaser.Scene, kind: IconKind): string {
  const key = `icon-${kind}`;
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0xffffff, 1);
  if (kind === 'trophy') {
    // 杯身＋杯腳＋底座
    g.fillRoundedRect(5, 3, 14, 10, { tl: 3, tr: 3, bl: 5, br: 5 });
    g.fillRect(10, 13, 4, 5);
    g.fillRoundedRect(6, 18, 12, 3, 1);
  } else if (kind === 'lock') {
    // 鎖環（半圓弧）＋鎖體
    g.lineStyle(2.5, 0xffffff, 1);
    g.beginPath();
    g.arc(12, 9, 5, Math.PI, 0, false);
    g.strokePath();
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(5, 9, 14, 11, 3);
  } else {
    // chart：三根高低長條
    g.fillRect(4, 12, 4, 8);
    g.fillRect(10, 7, 4, 13);
    g.fillRect(16, 10, 4, 10);
  }
  g.generateTexture(key, 24, 24);
  g.destroy();
  return key;
}
```

- [ ] **Step 2: 型檢＋全套測試**

Run: `npx tsc --noEmit && npm test`
Expected: 全 PASS（128）

- [ ] **Step 3: Commit**

```bash
git add src/ui/icons.ts
git commit -m "feat: add proc-drawn icon textures (trophy/lock/chart)"
```

---

### Task 2: 成就 progress 純函式

**Files:**
- Modify: `src/core/achievements.ts`
- Test: `src/core/achievements.test.ts`（append）

**Interfaces:**
- Consumes: 既有 `Achievement`/`ACHIEVEMENTS`/`PlayRecord`
- Produces: `Achievement.progress?: (plays: readonly PlayRecord[]) => { current: number; target: number }`——六個可計數成就實作（first_play/persistent/dedicated/collector/four_realms/creature_of_habit），current 以 target 封頂；decisive/torn 不提供（Task 6 使用）

- [ ] **Step 1: 寫失敗測試（append 到 `src/core/achievements.test.ts` 檔尾；沿用檔內既有 `mk`/`repeat`/`ALL16` fixtures）**

```ts
describe('progress', () => {
  const byId = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
  const prog = (id: string, plays: PlayRecord[]) => byId.get(id)!.progress!(plays);

  it('event-based achievements have no progress', () => {
    expect(byId.get('decisive')!.progress).toBeUndefined();
    expect(byId.get('torn')!.progress).toBeUndefined();
  });

  it('play-count achievements count plays and cap at target', () => {
    expect(prog('first_play', [])).toEqual({ current: 0, target: 1 });
    expect(prog('first_play', repeat(mk('ENFP'), 3))).toEqual({ current: 1, target: 1 });
    expect(prog('persistent', repeat(mk('ENFP'), 4))).toEqual({ current: 4, target: 10 });
    expect(prog('persistent', repeat(mk('ENFP'), 12))).toEqual({ current: 10, target: 10 });
    expect(prog('dedicated', repeat(mk('ENFP'), 25))).toEqual({ current: 25, target: 25 });
  });

  it('collector counts distinct types', () => {
    expect(prog('collector', [mk('ENFP'), mk('ENFP'), mk('INTJ')])).toEqual({ current: 2, target: 16 });
    expect(prog('collector', ALL16.map((t) => mk(t)))).toEqual({ current: 16, target: 16 });
  });

  it('four_realms counts distinct groups', () => {
    // ENFP=diplomat, INTJ=analyst → 2 族群
    expect(prog('four_realms', [mk('ENFP'), mk('INTJ')])).toEqual({ current: 2, target: 4 });
    expect(prog('four_realms', [mk('ENFP'), mk('INTJ'), mk('ISTJ'), mk('ESTP')])).toEqual({ current: 4, target: 4 });
  });

  it('creature_of_habit tracks max same-type count', () => {
    expect(prog('creature_of_habit', [])).toEqual({ current: 0, target: 3 });
    expect(prog('creature_of_habit', [mk('ENFP'), mk('INTJ'), mk('ENFP')])).toEqual({ current: 2, target: 3 });
    expect(prog('creature_of_habit', repeat(mk('ENFP'), 5))).toEqual({ current: 3, target: 3 });
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/core/achievements.test.ts`
Expected: FAIL（progress undefined / not a function）

- [ ] **Step 3: 實作**

`src/core/achievements.ts`：

介面加欄位：

```ts
export interface Achievement {
  id: string;
  check: (plays: readonly PlayRecord[]) => boolean;
  /** 可計數成就的進度（current 以 target 封頂）；事件型成就（decisive/torn）不提供。 */
  progress?: (plays: readonly PlayRecord[]) => { current: number; target: number };
}
```

`distinctTypes` 之後加 helpers：

```ts
function distinctGroups(plays: readonly PlayRecord[]): Set<string> {
  return new Set(plays.map((p) => groupOf(p.type)));
}

function maxSameTypeCount(plays: readonly PlayRecord[]): number {
  const counts = new Map<string, number>();
  let max = 0;
  for (const p of plays) {
    const c = (counts.get(p.type) ?? 0) + 1;
    counts.set(p.type, c);
    if (c > max) max = c;
  }
  return max;
}

const capped = (current: number, target: number) => ({ current: Math.min(current, target), target });
```

`ACHIEVEMENTS` 改為（check 邏輯不變，four_realms/creature_of_habit 改用新 helpers 消重複）：

```ts
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_play', check: (p) => p.length >= 1, progress: (p) => capped(p.length, 1) },
  { id: 'persistent', check: (p) => p.length >= 10, progress: (p) => capped(p.length, 10) },
  { id: 'dedicated', check: (p) => p.length >= 25, progress: (p) => capped(p.length, 25) },
  { id: 'collector', check: (p) => distinctTypes(p).size >= 16, progress: (p) => capped(distinctTypes(p).size, 16) },
  { id: 'four_realms', check: (p) => distinctGroups(p).size >= 4, progress: (p) => capped(distinctGroups(p).size, 4) },
  { id: 'decisive', check: (p) => anyDimension(p, (a, b) => (a === 5 && b === 0) || (a === 0 && b === 5)) },
  { id: 'torn', check: (p) => anyDimension(p, (a, b) => a + b === 5 && Math.abs(a - b) === 1) },
  { id: 'creature_of_habit', check: (p) => maxSameTypeCount(p) >= 3, progress: (p) => capped(maxSameTypeCount(p), 3) },
];
```

- [ ] **Step 4: 跑測試確認通過＋全套**

Run: `npx vitest run src/core/achievements.test.ts && npm test`
Expected: PASS（既有成就測試不受影響——check 行為等價）

- [ ] **Step 5: Commit**

```bash
git add src/core/achievements.ts src/core/achievements.test.ts
git commit -m "feat: add countable achievement progress accessors"
```

---

### Task 3: i18n 清 emoji ＋ `ach.progress`（×5 語）

**Files:**
- Modify: `src/i18n/strings/en.ts`、`zh-Hant.ts`、`zh-Hans.ts`、`ja.ts`、`es.ts`

**Interfaces:**
- Consumes: 無
- Produces: `trend.cta`/`ach.cta` 無 emoji、`ach.unlocked` 無 🏆 前綴、新 key `ach.progress`（`{0}`=已解鎖數、`{1}`=總數；Task 6 使用）

- [ ] **Step 1: 五個檔案各改三處＋加一 key**

每檔（值以該檔語言為準）：
- `trend.cta`：移除尾端 ` 📊`（如 zh-Hant `'趨勢 📊'` → `'趨勢'`）。
- `ach.cta`：移除尾端 ` 🏆`。
- `ach.unlocked`：移除 `'🏆 '` 前綴（如 en `'🏆 Unlocked: {0}'` → `'Unlocked: {0}'`；zh-Hant `'🏆 解鎖：{0}'` → `'解鎖：{0}'`）。
- 在 `ach.title` 之後加 `ach.progress`：
  - en: `'ach.progress': 'Unlocked {0}/{1}',`
  - zh-Hant: `'ach.progress': '已解鎖 {0}/{1}',`
  - zh-Hans: `'ach.progress': '已解锁 {0}/{1}',`
  - ja: `'ach.progress': '解除済み {0}/{1}',`
  - es: `'ach.progress': 'Desbloqueados {0}/{1}',`

- [ ] **Step 2: 全套測試（completeness 把關五語同步）**

Run: `npm test`
Expected: 全 PASS

- [ ] **Step 3: Commit**

```bash
git add src/i18n/strings/
git commit -m "feat: replace emoji icons in strings, add ach.progress key (5 locales)"
```

---

### Task 4: Button icon 參數 ＋ 開始頁 icon 鈕

**Files:**
- Modify: `src/ui/Button.ts`
- Modify: `src/scenes/StartScene.ts`（趨勢/成就兩顆 Button）

**Interfaces:**
- Consumes: `ensureIconTexture`/`IconKind`（Task 1）
- Produces: `ButtonOptions.icon?: IconKind`——16×16 icon 置文字左側間距 6、tint 同文字色、icon＋文字整體置中；無 icon 行為不變。注意：帶 icon 的按鈕不支援 `setLabel` 後重新置中（現無此需求）。

- [ ] **Step 1: 改 `src/ui/Button.ts`**

import 加：

```ts
import { ensureIconTexture } from './icons';
import type { IconKind } from './icons';
```

`ButtonOptions` 加：

```ts
  icon?: IconKind; // 文字左側 16px 向量 icon（tint 同文字色）
```

constructor 內、`this.draw(this.bg);` 之後、`this.zone = ...` 之前加：

```ts
    if (opts.icon) {
      const tintColor = Phaser.Display.Color.HexStringToColor(opts.textColor ?? PALETTE.textOn).color;
      const iconImg = scene.add
        .image(0, y, ensureIconTexture(scene, opts.icon))
        .setDisplaySize(16, 16)
        .setTint(tintColor)
        .setDepth(11);
      // icon(16) + 間距(6) + 文字：整體置中；帶 icon 的鈕不支援 setLabel 重排
      const totalW = 16 + 6 + this.label.width;
      iconImg.setX(x - totalW / 2 + 8);
      this.label.setOrigin(0, 0.5).setX(x - totalW / 2 + 22);
    }
```

- [ ] **Step 2: StartScene 兩顆鈕加 icon**

「趨勢」Button 的 opts 加 `icon: 'chart',`；「成就」Button 的 opts 加 `icon: 'trophy',`（其餘參數不動）。

- [ ] **Step 3: 型檢＋全套測試**

Run: `npx tsc --noEmit && npm test`
Expected: 全 PASS

- [ ] **Step 4: Commit**

```bash
git add src/ui/Button.ts src/scenes/StartScene.ts
git commit -m "feat: Button icon option + vector icons on start-screen buttons"
```

---

### Task 5: tilt 權限抽共用 ＋ 趨勢頁空狀態與按鈕

**Files:**
- Create: `src/input/tiltPermission.ts`
- Modify: `src/scenes/StartScene.ts`（改用共用函式、刪私有版）
- Modify: `src/scenes/TrendScene.ts`

**Interfaces:**
- Consumes: `Button`、`ensurePlayerTexture`（`src/entities/Player.ts`）、`PLAYER_BASE_COLOR`、`ScoreTracker`
- Produces: `requestTiltPermission(): Promise<void>`（共用）；趨勢空狀態＋destructive/次級按鈕

- [ ] **Step 1: 建 `src/input/tiltPermission.ts`（自 StartScene 搬移）**

```ts
// src/input/tiltPermission.ts
type OrientationPermissionApi = {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

/** iOS 13+ 需在使用者手勢中請求體感權限；其他平台略過。 */
export async function requestTiltPermission(): Promise<void> {
  const api = window.DeviceOrientationEvent as unknown as OrientationPermissionApi | undefined;
  if (api && typeof api.requestPermission === 'function') {
    try {
      await api.requestPermission();
    } catch {
      /* 被拒：交給點擊左右半邊備援 */
    }
  }
}
```

- [ ] **Step 2: StartScene 改用共用**

- 刪除 StartScene 檔頭的 `type OrientationPermissionApi = {...}` 與類內私有 `requestTiltPermission` 方法。
- import 加 `import { requestTiltPermission } from '../input/tiltPermission';`
- 主 CTA onClick 的 `await this.requestTiltPermission();` 改 `await requestTiltPermission();`

- [ ] **Step 3: TrendScene 空狀態＋按鈕**

import 加：

```ts
import { Button } from '../ui/Button';
import { ensurePlayerTexture } from '../entities/Player';
import { PLAYER_BASE_COLOR } from '../core/playerColor';
import { ScoreTracker } from '../core/ScoreTracker';
import { requestTiltPermission } from '../input/tiltPermission';
```

空狀態分支（`trends.totalPlays === 0`）整段換成：

```ts
    if (trends.totalPlays === 0) {
      // 空狀態：果凍怪＋文案＋直接開局（少走一步回開始頁）
      this.add.image(cx, 300, ensurePlayerTexture(this, PLAYER_BASE_COLOR)).setScale(1.6);
      this.add
        .text(cx, 400, t('trend.empty'), {
          fontFamily: BODY_FONT,
          fontSize: '18px',
          color: '#ffffffcc',
          align: 'center',
          wordWrap: { width: GAME.width - 60, useAdvancedWrap: true },
        })
        .setOrigin(0.5);
      new Button(this, cx, 480, t('start.cta'), {
        width: 240,
        height: 54,
        fontSize: 20,
        onClick: async () => {
          await requestTiltPermission();
          this.scene.start('Game', { score: new ScoreTracker() });
        },
      });
    } else {
```

清除鈕整段（原 `const clearBtn = this.add.text(...)` 至其 handler 結束）換成、且包在非空判斷內：

```ts
    // 清除鈕（兩步確認；空狀態無可清）
    if (trends.totalPlays > 0) {
      const clearBtn = new Button(this, cx, 690, t('trend.clear'), {
        width: 200,
        height: 46,
        fontSize: 16,
        bg: PALETTE.no,
        bgHover: 0xc95568,
        bgDown: 0x9a3145,
        textColor: '#ffffff',
        onClick: () => {
          if (!this.clearArmed) {
            this.clearArmed = true;
            clearBtn.setLabel(t('trend.clearConfirm'));
            return;
          }
          clearPlays();
          this.scene.restart();
        },
      });
    }
```

返回鈕整段換成：

```ts
    new Button(this, cx, 748, t('common.back'), {
      width: 160,
      height: 46,
      fontSize: 16,
      bg: PALETTE.surfaceAlt,
      bgHover: 0x3a3e58,
      bgDown: 0x22243a,
      textColor: '#ffffff',
      onClick: () => this.scene.start('Start'),
    });
```

- [ ] **Step 4: 型檢＋全套測試**

Run: `npx tsc --noEmit && npm test`
Expected: 全 PASS

- [ ] **Step 5: Commit**

```bash
git add src/input/tiltPermission.ts src/scenes/StartScene.ts src/scenes/TrendScene.ts
git commit -m "feat: trend empty-state with jelly + one-tap start, unified secondary/destructive buttons"
```

---

### Task 6: 成就頁徽章卡網格

**Files:**
- Modify: `src/scenes/AchievementScene.ts`（整檔改寫）

**Interfaces:**
- Consumes: `Achievement.progress`（Task 2）、`ach.progress` key（Task 3）、`ensureIconTexture`（Task 1）、`Button`
- Produces: 兩欄徽章卡＋每卡進度＋總進度＋次級返回鈕

- [ ] **Step 1: 整檔換成**

```ts
import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { PALETTE } from '../theme/palette';
import { ACHIEVEMENTS, unlockedIds } from '../core/achievements';
import { getPlays } from '../core/profile';
import { t, tf } from '../i18n/t';
import type { StringKey } from '../i18n/t';
import { MuteButton } from '../ui/MuteButton';
import { Button } from '../ui/Button';
import { ensureIconTexture } from '../ui/icons';

const TITLE_FONT = 'Fredoka, system-ui, sans-serif';
const BODY_FONT = 'Nunito, system-ui, sans-serif';

const CARD_W = 198;
const CARD_H = 126;
const COL_PITCH = 210; // CARD_W + 欄距 12
const ROW_PITCH = 138; // CARD_H + 列距 12
const GRID_X = 20;
const GRID_Y = 120;

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

    const plays = getPlays();
    const unlocked = unlockedIds(plays);

    // 總進度：已解鎖 x/y ＋ 200×10 進度條
    this.add
      .text(cx, 84, tf('ach.progress', [unlocked.size, ACHIEVEMENTS.length]), {
        fontFamily: BODY_FONT,
        fontSize: '14px',
        color: PALETTE.textMuted,
      })
      .setOrigin(0.5);
    const totalG = this.add.graphics();
    const tw = 200;
    const tx = cx - tw / 2;
    totalG.fillStyle(0xffffff, 0.13);
    totalG.fillRoundedRect(tx, 100, tw, 10, 5);
    if (unlocked.size > 0) {
      totalG.fillStyle(PALETTE.accent, 1);
      totalG.fillRoundedRect(tx, 100, Math.max(10, (tw * unlocked.size) / ACHIEVEMENTS.length), 10, 5);
    }

    // 兩欄徽章卡
    ACHIEVEMENTS.forEach((a, i) => {
      const x = GRID_X + (i % 2) * COL_PITCH;
      const y = GRID_Y + Math.floor(i / 2) * ROW_PITCH;
      const on = unlocked.has(a.id);
      const g = this.add.graphics();
      g.fillStyle(PALETTE.surfaceAlt, 1);
      g.fillRoundedRect(x, y, CARD_W, CARD_H, 12);
      if (on) {
        g.lineStyle(2, PALETTE.accent, 1);
        g.strokeRoundedRect(x, y, CARD_W, CARD_H, 12);
      }

      // 徽章：彩色獎盃（解鎖）或灰鎖（未解鎖）
      const bx = x + 28;
      const by = y + 30;
      g.fillStyle(on ? PALETTE.accent : 0xffffff, on ? 1 : 0.13);
      g.fillCircle(bx, by, 16);
      this.add
        .image(bx, by, ensureIconTexture(this, on ? 'trophy' : 'lock'))
        .setDisplaySize(18, 18)
        .setTint(on ? 0x0f1220 : 0x8888aa);

      this.add
        .text(x + 52, y + 22, t(`ach.${a.id}.name` as StringKey), {
          fontFamily: TITLE_FONT,
          fontSize: '15px',
          color: on ? '#ffe066' : '#ffffff66',
          wordWrap: { width: CARD_W - 60, useAdvancedWrap: true },
        })
        .setOrigin(0, 0);
      this.add
        .text(x + 14, y + 56, t(`ach.${a.id}.desc` as StringKey), {
          fontFamily: BODY_FONT,
          fontSize: '11px',
          color: on ? '#ffffffcc' : '#ffffff44',
          wordWrap: { width: CARD_W - 28, useAdvancedWrap: true },
        })
        .setOrigin(0, 0);

      // 可計數成就：卡底進度條＋數字
      const prog = a.progress?.(plays);
      if (prog) {
        const pw = CARD_W - 28;
        const px = x + 14;
        const py = y + CARD_H - 16;
        g.fillStyle(0xffffff, 0.13);
        g.fillRoundedRect(px, py, pw, 4, 2);
        if (prog.current > 0) {
          g.fillStyle(PALETTE.accent, 1);
          g.fillRoundedRect(px, py, Math.max(4, (pw * prog.current) / prog.target), 4, 2);
        }
        this.add
          .text(x + CARD_W - 14, py - 4, `${prog.current}/${prog.target}`, {
            fontFamily: BODY_FONT,
            fontSize: '10px',
            color: '#ffffff88',
          })
          .setOrigin(1, 1);
      }
    });

    new Button(this, cx, 758, t('common.back'), {
      width: 160,
      height: 46,
      fontSize: 16,
      bg: PALETTE.surfaceAlt,
      bgHover: 0x3a3e58,
      bgDown: 0x22243a,
      textColor: '#ffffff',
      onClick: () => this.scene.start('Start'),
    });
  }
}
```

- [ ] **Step 2: 型檢＋全套測試**

Run: `npx tsc --noEmit && npm test`
Expected: 全 PASS

- [ ] **Step 3: Commit**

```bash
git add src/scenes/AchievementScene.ts
git commit -m "feat: achievement badge-card grid with per-card and total progress"
```

---

### Task 7: GameScene HUD 下移

**Files:**
- Modify: `src/scenes/GameScene.ts`（`create()` 內五處常數）

**Interfaces:**
- Consumes: 既有 HUD 元素
- Produces: HUD 卡貼齊畫面底部、上圓角；chips 在卡上緣之上；上方視野全開

- [ ] **Step 1: 常數搬移**

`create()` 內：

1. HUD scrim 兩行改為（含註解更新）：

```ts
    // HUD 底襯（畫面底部）：往上跳的視野留給上方，資訊層固定在下方
    const hudScrim = this.add.graphics().setScrollFactor(0).setDepth(19);
    hudScrim.fillStyle(PALETTE.surface, 0.72);
    hudScrim.fillRoundedRect(0, 646, GAME.width, 154, { tl: 16, tr: 16, bl: 0, br: 0 });
```

2. banner `this.add.text(GAME.width / 2, 40, ...)` → y **664**。
3. levelLabel `this.add.text(GAME.width / 2, 108, ...)` → y **728**。
4. scoreLeft/scoreRight 建立處 y `139` → **757**（兩處）。
5. previewLeft/previewRight 建立處 y `158` → **618**（兩處）。
6. `drawScoreBar()` 內 `const y0 = 128;` → `const y0 = 746;`。

- [ ] **Step 2: 型檢＋全套測試**

Run: `npx tsc --noEmit && npm test`
Expected: 全 PASS

- [ ] **Step 3: Commit**

```bash
git add src/scenes/GameScene.ts
git commit -m "feat: move in-game HUD card to bottom of screen"
```

---

### Task 8: 基底色改微暖白

**Files:**
- Modify: `src/core/playerColor.ts`（一個常數＋註解）
- Modify: `src/core/playerColor.test.ts`（期望值重算）

**Interfaces:**
- Consumes: 無
- Produces: `PLAYER_BASE_COLOR = 0xf0f0f4`；hero/遊戲/結果全部自動跟隨

- [ ] **Step 1: 改常數**

```ts
/** 果凍怪基底色（微暖白——從白紙開始，四關染成你的顏色）。 */
export const PLAYER_BASE_COLOR = 0xf0f0f4;
```

- [ ] **Step 2: 重算測試期望值**

`src/core/playerColor.test.ts`（新基底 (240,240,244)，逐通道 Math.round）：
- `['E']`（t=0.1875，E f0b84a）：r=240、g=240−10.5=229.5→230、b=244−31.875=212.125→212 → **`0xf0e6d4`**
- `['I','N','F']`（avg (69,131,142)、t=0.5625）：r=240−96.1875→144、g=240−61.3125→179、b=244−57.375→187 → **`0x90b3bb`**
- `['I','N','F','P']`（group 0x33a474、t=0.75）：r=240−141.75=98.25→98、g=240−57=183、b=244−96=148 → **`0x62b794`**
- `lerpColor` 端點/中點測試與「channel 介於 base 與 target 之間」測試不需改值（後者引用 `PLAYER_BASE_COLOR` 常數）。
- 測試內引用 `0xc0aee2` 的註解一併更新為新值敘述。

若實作輸出與手算差 ±1：以實作輸出為準修期望值並在 commit message 註明。

- [ ] **Step 3: 跑測試**

Run: `npx vitest run src/core/playerColor.test.ts && npm test`
Expected: 全 PASS

- [ ] **Step 4: Commit**

```bash
git add src/core/playerColor.ts src/core/playerColor.test.ts
git commit -m "feat: player starts white — blank slate that takes on your colors"
```

---

### Task 9: 整體驗證 ＋ 截圖 ＋ 部署（controller 執行）

**Files:**
- Modify: `docs/TODO.md`（完成註記）

- [ ] **Step 1: 全套檢查**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: 全綠

- [ ] **Step 2: 截圖驗收（對照 spec 驗收標準 1–6）**

dev server：開始頁（icon 鈕＋白 hero）、成就頁（混合解鎖＋總進度；可先注入 plays 到 localStorage `mbti-jump.profile`）、趨勢空狀態、遊戲畫面（下方 HUD＋白果凍怪）、結果頁（dev hook 比照 P1 作法、驗完還原）。

- [ ] **Step 3: 截圖給使用者確認 → merge → `npx wrangler deploy` → 線上抽查**

- [ ] **Step 4: `docs/TODO.md` P2/P3 相應項打勾＋完成註記，commit**

```bash
git add docs/TODO.md
git commit -m "docs: mark P2 secondary screens + bottom HUD + white base shipped"
```
