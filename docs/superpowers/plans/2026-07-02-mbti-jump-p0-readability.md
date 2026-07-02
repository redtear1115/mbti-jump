# MBTI Jump P0 遊戲內可讀性 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** GameScene 資訊層加深色底襯卡、答案預覽改實心膠囊 chip、台階材質立體化、得分條票數改字母色圓章、極光降亮 15%——五個純視覺改動，玩法與佈局座標不變。

**Architecture:** 唯一的新純邏輯（膠囊幾何 `chipRect`）進 `src/core/hud.ts` 接受 vitest；其餘全是 Phaser 繪製層修改（`Platform.ensureTextures`、`GameScene.create/update/drawScoreBar`、`AuroraBackground` 常數），以型檢＋全測試＋瀏覽器截圖驗證。

**Tech Stack:** TypeScript strict、Phaser 3、vitest。

**Spec:** `docs/superpowers/specs/2026-07-02-mbti-jump-p0-readability-design.md`

## Global Constraints

- TypeScript strict、`noUnusedLocals`、`noUnusedParameters`；指令都在 repo root。
- 玩法參數、佈局座標（banner y=40、levelLabel y=108、得分條 (125,128) 200×22、預覽 y=158、平台尺寸/碰撞體）一律不動。
- 色票一律經 `src/theme/palette.ts` 的 `PALETTE`/`LETTER_COLORS`；新常數值照 spec：HUD 卡 `PALETTE.surface` 72% 不透明、高 154、底圓角 16；普通台階底 `0x3d4a7a`、頂線 `0x8fa0d8` 2px、底暗帶黑 25% 3px；chip 內距 10×6 圓角 12；圓章內距 8×3；極光 alpha stops ×0.85（0.9→0.765、0.32→0.272）。
- reduced-motion：chip 顯隱不走 tween，直接 setAlpha（比照既有 `prefersReducedMotion()` 用法）。
- 既有 116 測試每個 task 結束時全綠；commit message 用 conventional prefix，結尾加：
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: 膠囊幾何純函式 `src/core/hud.ts`

**Files:**
- Create: `src/core/hud.ts`
- Test: `src/core/hud.test.ts`

**Interfaces:**
- Consumes: 無
- Produces: `chipRect(textLeft: number, textTop: number, textW: number, textH: number, opts?: { padX?: number; padY?: number; r?: number }): ChipRect`，`ChipRect = { x, y, w, h, r }`；預設 padX=10、padY=6、r=12。Task 4（答案 chip）用預設值；Task 5（得分條圓章）用 `{ padX: 8, padY: 3, r: (textH + 6) / 2 }`。

- [ ] **Step 1: 寫失敗測試**

```ts
// src/core/hud.test.ts
import { describe, it, expect } from 'vitest';
import { chipRect } from './hud';

describe('chipRect', () => {
  it('pads text bounds with defaults (10x6, r12)', () => {
    expect(chipRect(12, 158, 100, 20)).toEqual({ x: 2, y: 152, w: 120, h: 32, r: 12 });
  });

  it('accepts custom padding and radius', () => {
    expect(chipRect(135, 132, 30, 14, { padX: 8, padY: 3, r: 10 })).toEqual({
      x: 127, y: 129, w: 46, h: 20, r: 10,
    });
  });

  it('clamps radius to half the chip height', () => {
    // h = 10 + 6*2 = 22 → r 上限 11
    expect(chipRect(0, 0, 40, 10).r).toBe(11);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/core/hud.test.ts`
Expected: FAIL（模組不存在）

- [ ] **Step 3: 最小實作**

```ts
// src/core/hud.ts
export interface ChipRect {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
}

/** 依文字包框（左上角＋寬高）計算膠囊底的幾何；r 超過高度一半時取一半（保持膠囊形）。 */
export function chipRect(
  textLeft: number,
  textTop: number,
  textW: number,
  textH: number,
  opts?: { padX?: number; padY?: number; r?: number },
): ChipRect {
  const padX = opts?.padX ?? 10;
  const padY = opts?.padY ?? 6;
  const h = textH + padY * 2;
  const r = Math.min(opts?.r ?? 12, h / 2);
  return { x: textLeft - padX, y: textTop - padY, w: textW + padX * 2, h, r };
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run src/core/hud.test.ts`
Expected: PASS（3 tests）

- [ ] **Step 5: 全套測試＋commit**

Run: `npm test`
Expected: 119 tests PASS

```bash
git add src/core/hud.ts src/core/hud.test.ts
git commit -m "feat: add chipRect pure pill-geometry helper"
```

---

### Task 2: 台階材質立體化

**Files:**
- Modify: `src/entities/Platform.ts`（`ensureTextures` 函式，檔尾 68-79 行）

**Interfaces:**
- Consumes: 無
- Produces: 視覺變更——`platform-normal` texture 深底＋頂亮線＋底暗帶；`platform-question` texture 灰白底＋純白頂線＋底暗帶（tint 後頂線比體色亮、暗帶比體色暗）。texture key、尺寸、圓角 6、碰撞體不變。

- [ ] **Step 1: 改寫 `ensureTextures`**

把 `src/entities/Platform.ts` 的 `ensureTextures` 整個函式換成：

```ts
function ensureTextures(scene: Phaser.Scene): void {
  const W = GAME.platformWidth;
  const H = GAME.platformHeight;
  const R = 6;
  /** 立體化台階底：主體色＋頂邊 2px 亮線＋底部 3px 暗帶（圖底分離）。 */
  const make = (key: string, body: number, topLine: number) => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(body, 1);
    g.fillRoundedRect(0, 0, W, H, R);
    g.fillStyle(topLine, 1);
    g.fillRect(R, 0, W - R * 2, 2);
    g.fillStyle(0x000000, 0.25);
    g.fillRect(R, H - 3, W - R * 2, 3);
    g.generateTexture(key, W, H);
    g.destroy();
  };
  make(NORMAL_KEY, 0x3d4a7a, 0x8fa0d8);
  // 中性偏灰白底＋純白頂線：setTint 後頂線成為「比體色亮一階」的立體亮邊
  make(QUESTION_KEY, 0xe8e8e8, 0xffffff);
}
```

（`GAME` 已在檔頭 import；`QUESTION_KEY` 行上的既有註解「中性白底，實際顏色由 setTint 決定」改為「中性灰白底，實際顏色由 setTint 決定」。）

- [ ] **Step 2: 型檢＋全測試**

Run: `npx tsc --noEmit && npm test`
Expected: 全 PASS

- [ ] **Step 3: Commit**

```bash
git add src/entities/Platform.ts
git commit -m "feat: platform textures with top highlight + bottom shade (figure-ground lift)"
```

---

### Task 3: HUD 一體式深色底襯卡 ＋ 題目去描邊

**Files:**
- Modify: `src/scenes/GameScene.ts`（`create()` 內 banner 建立處與其前）

**Interfaces:**
- Consumes: `PALETTE`（`src/theme/palette.ts`，需把 GameScene 的 palette import 加上 `PALETTE`）
- Produces: depth 19 的 HUD scrim（0..450 × 0..154、底圓角 16、surface 72%）；banner 無描邊。Task 4/5 的元素（depth 20/21）疊其上。

- [ ] **Step 1: 加 scrim、去 banner 描邊**

GameScene 的 palette import 改為：

```ts
import { LEVEL_BG, PALETTE, LETTER_COLORS, letterHex } from '../theme/palette';
```

（原本兩行 palette import 併成一行；`LEVEL_BG` 原在第 3 行、`LETTER_COLORS, letterHex` 原在第 19 行——合併後刪掉多餘那行。）

`create()` 內，`this.banner = this.add.text(...)` 之前插入：

```ts
    // HUD 底襯：資訊層（題目/關卡/得分條）與遊戲層分家，亮背景下仍可讀
    const hudScrim = this.add.graphics().setScrollFactor(0).setDepth(19);
    hudScrim.fillStyle(PALETTE.surface, 0.72);
    hudScrim.fillRoundedRect(0, 0, GAME.width, 154, { tl: 0, tr: 0, bl: 16, br: 16 });
```

banner 的 text style 移除這兩行（有底襯後不需要描邊）：

```ts
        stroke: '#000000',
        strokeThickness: 4,
```

- [ ] **Step 2: 型檢＋全測試**

Run: `npx tsc --noEmit && npm test`
Expected: 全 PASS

- [ ] **Step 3: Commit**

```bash
git add src/scenes/GameScene.ts
git commit -m "feat: dark HUD scrim card behind question/level/score, drop banner stroke"
```

---

### Task 4: 答案預覽 → 實心膠囊 chip ＋ 200ms 快速顯隱

**Files:**
- Modify: `src/scenes/GameScene.ts`（previewLeft/Right 建立、`updatePreview`、`update()` 的 alpha 邏輯）

**Interfaces:**
- Consumes: `chipRect`（Task 1，預設 padX10/padY6/r12）、`LETTER_COLORS`、`PALETTE.textOn`
- Produces: `chipLeft`/`chipRight`（Graphics，depth 19.5）、`drawPreviewChip()`、`setPreviewVisible()`；`update()` 不再做距離漸變。

- [ ] **Step 1: 建 chip Graphics、改 preview 樣式**

GameScene import 區加：

```ts
import { chipRect } from '../core/hud';
```

class 欄位區（`previewRight` 宣告之後）加：

```ts
  private chipLeft!: Phaser.GameObjects.Graphics;
  private chipRight!: Phaser.GameObjects.Graphics;
  private previewShown = false;
```

`create()` 中 previewStyle 與兩個 preview text 整段換成（要點：字色改 `PALETTE.textOn` 深色、移除描邊、chip Graphics depth 19.5 墊在文字 depth 20 下）：

```ts
    const previewStyle = {
      fontSize: '17px',
      fontStyle: 'bold',
      color: PALETTE.textOn,
      wordWrap: { width: GAME.width * 0.44 },
      fontFamily: 'Nunito, system-ui, sans-serif',
    };
    this.chipLeft = this.add.graphics().setScrollFactor(0).setDepth(19.5).setAlpha(0);
    this.chipRight = this.add.graphics().setScrollFactor(0).setDepth(19.5).setAlpha(0);
    this.previewLeft = this.add
      .text(12, 158, '', { ...previewStyle, align: 'left' })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(20)
      .setAlpha(0);
    this.previewRight = this.add
      .text(GAME.width - 12, 158, '', { ...previewStyle, align: 'right' })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(20)
      .setAlpha(0);
```

（`previewShown` 初值 false；`init()` 若重玩重入，需在 `init()` 末尾加 `this.previewShown = false;`——注意 `init()` 在 `create()` 之前跑、Graphics 尚未建立，所以只重置旗標，不碰物件。）

- [ ] **Step 2: 加 `drawPreviewChip` 與 `setPreviewVisible`，改 `updatePreview` 與 `update()`**

新增兩個 private 方法（放 `updatePreview` 附近）：

```ts
  /** 依文字實際包框重畫膠囊底（字母色實心、深字在上）。 */
  private drawPreviewChip(gfx: Phaser.GameObjects.Graphics, text: Phaser.GameObjects.Text, side: Letter): void {
    gfx.clear();
    if (!text.text) return;
    const textLeft = text.originX === 1 ? text.x - text.displayWidth : text.x;
    const r = chipRect(textLeft, text.y, text.displayWidth, text.displayHeight);
    gfx.fillStyle(LETTER_COLORS[side], 1);
    gfx.fillRoundedRect(r.x, r.y, r.w, r.h, r.r);
  }

  /** 預覽（文字＋chip）快速顯隱：200ms 淡入淡出；reduced-motion 直接切換。 */
  private setPreviewVisible(visible: boolean): void {
    if (visible === this.previewShown) return;
    this.previewShown = visible;
    const targets = [this.previewLeft, this.previewRight, this.chipLeft, this.chipRight];
    if (this.reducedMotion) {
      targets.forEach((t) => t.setAlpha(visible ? 1 : 0));
      return;
    }
    this.tweens.add({ targets, alpha: visible ? 1 : 0, duration: 200 });
  }
```

（`Letter` type 已由 `../config/questions` import——確認 import 行有 `Letter`，沒有就加 `import type { Letter } from '../config/questions';`。）

`updatePreview` 改為（setText/setColor 後重畫 chip；字色固定深色、不再 letterHex）：

```ts
  private updatePreview(questionIdx: number): void {
    const q = this.questions[questionIdx];
    if (!q) return;
    this.previewLeft.setText(`◀ ${t(`q.${q.id}.yes` as StringKey)}`);
    this.previewRight.setText(`${t(`q.${q.id}.no` as StringKey)} ▶`);
    this.drawPreviewChip(this.chipLeft, this.previewLeft, q.yes.side);
    this.drawPreviewChip(this.chipRight, this.previewRight, q.no.side);
  }
```

`update()` 內原本的距離漸變段：

```ts
      const dist = this.player.y - fork.y;
      const alpha = this.reducedMotion
        ? 1
        : Phaser.Math.Clamp((GAME.height * 1.5 - dist) / (GAME.height * 0.6), 0, 1);
      this.previewLeft.setAlpha(alpha);
      this.previewRight.setAlpha(alpha);
    } else {
      this.previewLeft.setAlpha(0);
      this.previewRight.setAlpha(0);
    }
```

換成（同一觸發點 dist < 1.5×畫面高）：

```ts
      const dist = this.player.y - fork.y;
      this.setPreviewVisible(dist < GAME.height * 1.5);
    } else {
      this.setPreviewVisible(false);
    }
```

（`letterHex` 若因此不再被 GameScene 使用，從 import 移除——`noUnusedLocals` 會抓。）

- [ ] **Step 3: 型檢＋全測試**

Run: `npx tsc --noEmit && npm test`
Expected: 全 PASS

- [ ] **Step 4: Commit**

```bash
git add src/scenes/GameScene.ts
git commit -m "feat: answer previews as solid letter-color pill chips with fast fade"
```

---

### Task 5: 得分條字母圓章 ＋ 加粗分隔線

**Files:**
- Modify: `src/scenes/GameScene.ts`（`create()` 的 scoreLabelStyle、`drawScoreBar()`）

**Interfaces:**
- Consumes: `chipRect`（Task 1，`{ padX: 8, padY: 3, r: (textH + 6) / 2 }`）、`LETTER_COLORS`、`PALETTE.textOn`
- Produces: 得分條兩端字母色圓章＋深字；分隔線 5px＋頂端 8px 圓頭旋鈕。`scoreBarModel` 不動。

- [ ] **Step 1: 改 scoreLabelStyle**

`create()` 內 `scoreLabelStyle` 改為（深字、去描邊）：

```ts
    const scoreLabelStyle = {
      fontSize: '14px',
      fontStyle: 'bold',
      color: PALETTE.textOn,
      fontFamily: 'Nunito, system-ui, sans-serif',
    };
```

- [ ] **Step 2: 改 `drawScoreBar`**

整個方法換成（先 setText 再量尺寸畫圓章；順序：漸變底 → 圓章 → 分隔線＋旋鈕，讓分隔線壓在圓章之上）：

```ts
  /** 依目前維度票數重繪得分條（雙色漸變底＋字母色圓章票數＋加粗分隔線與圓頭旋鈕）。 */
  private drawScoreBar(): void {
    const dimCode = DIMENSIONS[this.dimIndex];
    const [a, b] = LETTERS_OF[dimCode];
    const [na, nb] = this.score.tallyFor(dimCode);
    const m = scoreBarModel(a, na, b, nb);

    this.scoreLeft.setText(m.leftLabel);
    this.scoreRight.setText(m.rightLabel);

    const w = 200;
    const h = 22;
    const x0 = (GAME.width - w) / 2;
    const y0 = 128;
    const g = this.scoreBar;
    g.clear();
    g.fillGradientStyle(LETTER_COLORS[a], LETTER_COLORS[b], LETTER_COLORS[a], LETTER_COLORS[b], 1);
    g.fillRoundedRect(x0, y0, w, h, 11);

    // 兩端字母色圓章（深字由 scoreLeft/Right text 疊在 depth 21）
    const badge = (text: Phaser.GameObjects.Text, letter: Letter) => {
      const textLeft = text.originX === 1 ? text.x - text.displayWidth : text.x;
      const textTop = text.y - text.displayHeight / 2;
      const r = chipRect(textLeft, textTop, text.displayWidth, text.displayHeight, {
        padX: 8,
        padY: 3,
        r: (text.displayHeight + 6) / 2,
      });
      g.fillStyle(LETTER_COLORS[letter], 1);
      g.fillRoundedRect(r.x, r.y, r.w, r.h, r.r);
    };
    badge(this.scoreLeft, a);
    badge(this.scoreRight, b);

    // 加粗分隔線＋頂端圓頭旋鈕
    const dx = x0 + m.dividerFrac * w;
    g.fillStyle(0xffffff, 1);
    g.fillRect(dx - 2.5, y0 - 2, 5, h + 4);
    g.fillCircle(dx, y0 - 2, 4);
  }
```

- [ ] **Step 3: 型檢＋全測試**

Run: `npx tsc --noEmit && npm test`
Expected: 全 PASS（`scoreBar.test.ts` 只測 `scoreBarModel`，不受影響）

- [ ] **Step 4: Commit**

```bash
git add src/scenes/GameScene.ts
git commit -m "feat: score bar letter badges + thicker divider with knob"
```

---

### Task 6: 極光降亮 15%

**Files:**
- Modify: `src/gfx/AuroraBackground.ts`（`ensureGlowTexture` 內 alpha stops，68-71 行）

**Interfaces:**
- Consumes: 無
- Produces: glow texture 中心/中段 alpha 0.9→0.765、0.32→0.272（×0.85），氛圍保留、前景圖底分離提升。

- [ ] **Step 1: 改 alpha stops**

```ts
  // 亮度整體 ×0.85（P0 可讀性：前景圖底分離），氛圍仍在
  grd.addColorStop(0, 'rgba(255,255,255,0.765)');
  grd.addColorStop(0.5, 'rgba(255,255,255,0.272)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
```

- [ ] **Step 2: 型檢＋全測試**

Run: `npx tsc --noEmit && npm test`
Expected: 全 PASS

- [ ] **Step 3: Commit**

```bash
git add src/gfx/AuroraBackground.ts
git commit -m "feat: dim aurora glow 15% for figure-ground separation"
```

---

### Task 7: 整體驗證 ＋ 截圖確認（controller 執行）

**Files:**
- 無新檔

**Interfaces:**
- Consumes: 全部前置 task
- Produces: 驗收證據（截圖）；使用者確認後才部署

- [ ] **Step 1: 全套檢查**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: 全綠

- [ ] **Step 2: 瀏覽器截圖驗收（controller 用 chrome-devtools 對照 spec 驗收標準）**

`npx vite --port 5173` → 開 `http://localhost:5173/` → 點開始 → 截「題目＋得分條＋HUD 卡」畫面；等分叉接近截「答案 chip」畫面。對照 spec 驗收標準 1–5：底襯存在且字可讀、chip 全不透明字母色底深字、台階頂亮線/底暗帶可見、圓章對比清楚、極光仍有氛圍。

- [ ] **Step 3: 截圖給使用者確認後，合併＋部署（比照前例：merge → wrangler deploy → 線上抽查）**

- [ ] **Step 4: `docs/TODO.md` 補一行 P0 完成註記，commit**

```bash
git add docs/TODO.md
git commit -m "docs: mark P0 in-game readability shipped"
```
