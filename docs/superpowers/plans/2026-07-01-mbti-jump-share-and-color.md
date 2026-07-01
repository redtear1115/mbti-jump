# MBTI Jump — 分享卡 + 色彩系統翻新 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 導入一套八字母 MBTI 色盤，翻新遊戲得分條、答案台階配色與背景，並在結算畫面新增「下載分享卡 PNG」功能。

**Architecture:** 以 `LETTER_COLORS`（八字母→色）為共同基礎。純邏輯（色盤、得分條模型、分享卡資料模型）以 vitest TDD；Phaser 場景/繪圖與 DOM canvas 部分以 `tsc` 型別檢查 + 實機驗證（本專案慣例：不對 Phaser 場景寫單元測）。分享卡以獨立離屏 `<canvas>` 於 1080×1350 渲染後下載，與 Phaser 畫布解耦。

**Tech Stack:** TypeScript, Phaser 3.80, Vite, Vitest。

## Global Constraints

- 邏輯畫布為 `GAME.width=450 × GAME.height=800`（`src/config/gameConfig.ts`）。
- 八字母色（brainstorm 方案 B）為唯一色源，數值固定：`E 0xf0b84a`、`I 0x2e6d86`、`S 0x8fb14a`、`N 0x6e79b0`、`T 0x8a5fa0`、`F 0x33a474`、`J 0x3a9a9a`、`P 0xe09a3a`。
- `tsconfig` 啟用 `strict` + `noUnusedLocals` + `noUnusedParameters`：不得留下未使用的 import／變數。
- i18n：`src/i18n/completeness.test.ts` 強制五語系（en / zh-Hant / zh-Hans / ja / es）鍵集合完全一致；新增字串鍵必須同時加進五個檔案。
- 每個 Phaser/DOM 任務的驗收指令為 `npm run test`（不得回歸）+ `npx tsc --noEmit`（必須 exit 0）。
- 觸發點：分享卡只在 **Result** 畫面，且只做「下載 PNG」（不做 Web Share／剪貼簿／二維碼）。

---

### Task 1: 八字母色盤 `LETTER_COLORS` + `letterHex`

**Files:**
- Modify: `src/theme/palette.ts`
- Test: `src/theme/palette.test.ts` (create)

**Interfaces:**
- Consumes: `Letter`（`src/config/questions.ts`）
- Produces: `export const LETTER_COLORS: Record<Letter, number>`；`export function letterHex(letter: Letter): string`（回傳 `#rrggbb`）

- [ ] **Step 1: 寫失敗測試**

Create `src/theme/palette.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { LETTER_COLORS, letterHex } from './palette';

describe('LETTER_COLORS', () => {
  it('covers all 8 letters', () => {
    expect(Object.keys(LETTER_COLORS).sort()).toEqual(['E', 'F', 'I', 'J', 'N', 'P', 'S', 'T']);
  });

  it('letterHex matches the numeric colour', () => {
    expect(letterHex('E')).toBe('#f0b84a');
    expect(letterHex('I')).toBe('#2e6d86');
    expect(letterHex('F')).toBe('#33a474');
  });

  it('letterHex always returns a 7-char lowercase hex', () => {
    for (const l of Object.keys(LETTER_COLORS) as Array<keyof typeof LETTER_COLORS>) {
      expect(letterHex(l)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/theme/palette.test.ts`
Expected: FAIL（`LETTER_COLORS`/`letterHex` 尚未匯出）

- [ ] **Step 3: 實作**

在 `src/theme/palette.ts` 最上方加入 import，並於檔尾新增：
```ts
import type { Letter } from '../config/questions';
```
```ts
/** 八字母語意色（由四族群原色混出，brainstorm 方案 B）。供答案台階、得分條、分享卡沿用。 */
export const LETTER_COLORS: Record<Letter, number> = {
  E: 0xf0b84a, I: 0x2e6d86, // 外向暖黃 / 內向深藍
  S: 0x8fb14a, N: 0x6e79b0, // 務實黃綠 / 抽象紫藍
  T: 0x8a5fa0, F: 0x33a474, // 邏輯紫 / 和諧綠
  J: 0x3a9a9a, P: 0xe09a3a, // 秩序青 / 隨性橙
};

/** 字母色的 CSS 字串版，供 Phaser Text style 使用。 */
export function letterHex(letter: Letter): string {
  return '#' + LETTER_COLORS[letter].toString(16).padStart(6, '0');
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/theme/palette.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/theme/palette.ts src/theme/palette.test.ts
git commit -m "feat: add LETTER_COLORS eight-letter MBTI palette"
```

---

### Task 2: 得分條資料模型 `scoreBarModel`

**Files:**
- Create: `src/core/scoreBar.ts`
- Test: `src/core/scoreBar.test.ts` (create)

**Interfaces:**
- Produces: `export interface ScoreBarModel { dividerFrac: number; leftLabel: string; rightLabel: string }`；`export function scoreBarModel(firstLetter: string, na: number, secondLetter: string, nb: number): ScoreBarModel`

- [ ] **Step 1: 寫失敗測試**

Create `src/core/scoreBar.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { scoreBarModel } from './scoreBar';

describe('scoreBarModel', () => {
  it('centres the divider when both sides are zero', () => {
    expect(scoreBarModel('E', 0, 'I', 0).dividerFrac).toBe(0.5);
  });

  it('sets dividerFrac to the first letter share', () => {
    expect(scoreBarModel('E', 2, 'I', 1).dividerFrac).toBeCloseTo(2 / 3, 5);
    expect(scoreBarModel('S', 0, 'N', 3).dividerFrac).toBe(0);
  });

  it('formats side labels as "<letter> <count>"', () => {
    const m = scoreBarModel('T', 1, 'F', 2);
    expect(m.leftLabel).toBe('T 1');
    expect(m.rightLabel).toBe('F 2');
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/core/scoreBar.test.ts`
Expected: FAIL（模組不存在）

- [ ] **Step 3: 實作**

Create `src/core/scoreBar.ts`:
```ts
export interface ScoreBarModel {
  /** 第一字母（左側）占比 0..1；雙零時為 0.5。 */
  dividerFrac: number;
  leftLabel: string;
  rightLabel: string;
}

export function scoreBarModel(
  firstLetter: string,
  na: number,
  secondLetter: string,
  nb: number,
): ScoreBarModel {
  const total = na + nb;
  return {
    dividerFrac: total === 0 ? 0.5 : na / total,
    leftLabel: `${firstLetter} ${na}`,
    rightLabel: `${secondLetter} ${nb}`,
  };
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/core/scoreBar.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/scoreBar.ts src/core/scoreBar.test.ts
git commit -m "feat: add scoreBarModel for HUD score bar"
```

---

### Task 3: GameScene 得分條（取代票數文字）

**Files:**
- Modify: `src/scenes/GameScene.ts`

**Interfaces:**
- Consumes: `LETTER_COLORS`（Task 1）、`scoreBarModel`（Task 2）、`ScoreTracker.tallyFor`、`LETTERS_OF`
- Produces: 私有方法 `drawScoreBar(): void`（取代 `updateTally`）

- [ ] **Step 1: 換掉 import 與欄位**

在 `src/scenes/GameScene.ts` 檔頭 import 區加入：
```ts
import { LETTER_COLORS } from '../theme/palette';
import { scoreBarModel } from '../core/scoreBar';
```
將欄位宣告
```ts
  private tally!: Phaser.GameObjects.Text; // 目前維度即時取向，例如 "E 2 · I 1"
```
改為：
```ts
  private scoreBar!: Phaser.GameObjects.Graphics; // 得分條底＋分隔線
  private scoreLeft!: Phaser.GameObjects.Text; // 左側票數
  private scoreRight!: Phaser.GameObjects.Text; // 右側票數
```

- [ ] **Step 2: 在 create() 建立得分條物件**

將 `create()` 中建立 `this.tally` 的整段（`this.tally = this.add.text(...` 到該 `.setDepth(20);`）替換為：
```ts
    this.scoreBar = this.add.graphics().setScrollFactor(0).setDepth(20);
    const scoreLabelStyle = {
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      fontFamily: 'Nunito, system-ui, sans-serif',
    };
    this.scoreLeft = this.add
      .text(135, 139, '', scoreLabelStyle)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(21);
    this.scoreRight = this.add
      .text(315, 139, '', scoreLabelStyle)
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(21);
```
（得分條寬 200、置中：x0 = (450−200)/2 = 125，y0 = 128；標籤在條內縮 10px、垂直置中 y=139。）

- [ ] **Step 3: 以 drawScoreBar 取代 updateTally**

將方法
```ts
  /** 更新目前維度兩側即時票數，例如 "E 2 · I 1"（MBTI 字母跨語言通用，不需翻譯）。 */
  private updateTally(): void {
    const dimCode = DIMENSIONS[this.dimIndex];
    const [a, b] = LETTERS_OF[dimCode];
    const [na, nb] = this.score.tallyFor(dimCode);
    this.tally.setText(`${a} ${na} · ${b} ${nb}`);
  }
```
改為：
```ts
  /** 依目前維度票數重繪得分條（雙色漸變底＋白色分隔線＋兩側高對比票數）。 */
  private drawScoreBar(): void {
    const dimCode = DIMENSIONS[this.dimIndex];
    const [a, b] = LETTERS_OF[dimCode];
    const [na, nb] = this.score.tallyFor(dimCode);
    const m = scoreBarModel(a, na, b, nb);

    const w = 200;
    const h = 22;
    const x0 = (GAME.width - w) / 2;
    const y0 = 128;
    const g = this.scoreBar;
    g.clear();
    g.fillGradientStyle(LETTER_COLORS[a], LETTER_COLORS[b], LETTER_COLORS[a], LETTER_COLORS[b], 1);
    g.fillRoundedRect(x0, y0, w, h, 11);
    const dx = x0 + m.dividerFrac * w;
    g.fillStyle(0xffffff, 1);
    g.fillRect(dx - 1.5, y0 - 2, 3, h + 4);

    this.scoreLeft.setText(m.leftLabel);
    this.scoreRight.setText(m.rightLabel);
  }
```

- [ ] **Step 4: 更新三處呼叫點**

把 `create()`、`onLand`、`advanceDimension()` 中三處 `this.updateTally();` 全部改成 `this.drawScoreBar();`（共三處）。

- [ ] **Step 5: 型別檢查 + 測試不回歸**

Run: `npx tsc --noEmit && npm run test`
Expected: tsc exit 0；`Tests 91 passed`（Task 1/2 已各加 3 個測試；本任務無新測試、無回歸）

- [ ] **Step 6: 實機驗證**

Run: `npm run dev`，開始遊戲。確認頂部黃字已換成漸變得分條：左右票數清楚（白字黑邊）、白色分隔線隨作答左右移動、換維度時整條變為新維度雙色。

- [ ] **Step 7: Commit**

```bash
git add src/scenes/GameScene.ts
git commit -m "feat: replace tally text with gradient score bar"
```

---

### Task 4: 答案台階與預覽改用字母色

**Files:**
- Modify: `src/entities/Platform.ts`
- Modify: `src/scenes/GameScene.ts`

**Interfaces:**
- Consumes: `LETTER_COLORS`、`letterHex`（Task 1）
- Produces: 無新公開介面（`makeQuestion` 行為改為依字母上色）

- [ ] **Step 1: Platform 依字母色 tint**

在 `src/entities/Platform.ts` 檔頭加入：
```ts
import { LETTER_COLORS } from '../theme/palette';
```
把常數區
```ts
const NORMAL_KEY = 'platform-normal';
const YES_KEY = 'platform-yes';
const NO_KEY = 'platform-no';
```
改為：
```ts
const NORMAL_KEY = 'platform-normal';
const QUESTION_KEY = 'platform-question'; // 中性白底，供依字母 tint
```
把 `makeQuestion` 內
```ts
    const realKey = opts.isYes ? ASSET_KEYS.platformYes : ASSET_KEYS.platformNo;
    const procKey = opts.isYes ? YES_KEY : NO_KEY;
    const key = scene.textures.exists(realKey) ? realKey : procKey;
    if (key === procKey) ensureTextures(scene);
    const p = new Platform(scene, x, y, key);
    p.kind = 'question';
    p.side = opts.side;
    p.questionId = opts.questionId;
```
改為：
```ts
    const realKey = opts.isYes ? ASSET_KEYS.platformYes : ASSET_KEYS.platformNo;
    const key = scene.textures.exists(realKey) ? realKey : QUESTION_KEY;
    if (key === QUESTION_KEY) ensureTextures(scene);
    const p = new Platform(scene, x, y, key);
    p.kind = 'question';
    p.side = opts.side;
    p.questionId = opts.questionId;
    p.setTint(LETTER_COLORS[opts.side]); // 依 MBTI 字母上色（取代固定紅/綠）
```
把 `ensureTextures` 內
```ts
  make(NORMAL_KEY, 0x5d6b9e);
  make(YES_KEY, 0x38b764); // 綠 = Yes
  make(NO_KEY, 0xb13e53); // 紅 = No
```
改為：
```ts
  make(NORMAL_KEY, 0x5d6b9e);
  make(QUESTION_KEY, 0xffffff); // 中性白底，實際顏色由 setTint 決定
```

- [ ] **Step 2: GameScene 預覽色改字母色**

在 `src/scenes/GameScene.ts` 檔頭把
```ts
import { LETTER_COLORS } from '../theme/palette';
```
改為（合併匯入 `letterHex`）：
```ts
import { LETTER_COLORS, letterHex } from '../theme/palette';
```
`previewLeft`/`previewRight` 建立時的 `color` 值（原本 `'#5effa0'` 與 `'#ff8a99'`）改為中性 `'#ffffff'`（實際色在 `updatePreview` 動態設定）。即：
```ts
    this.previewLeft = this.add
      .text(12, 158, '', { ...previewStyle, color: '#ffffff', align: 'left' })
```
```ts
    this.previewRight = this.add
      .text(GAME.width - 12, 158, '', { ...previewStyle, color: '#ffffff', align: 'right' })
```
把 `updatePreview` 改為依字母動態設色：
```ts
  private updatePreview(questionIdx: number): void {
    const q = this.questions[questionIdx];
    if (!q) return;
    this.previewLeft.setText(`◀ ${t(`q.${q.id}.yes` as StringKey)}`).setColor(letterHex(q.yes.side));
    this.previewRight.setText(`${t(`q.${q.id}.no` as StringKey)} ▶`).setColor(letterHex(q.no.side));
  }
```

- [ ] **Step 3: 型別檢查 + 測試不回歸**

Run: `npx tsc --noEmit && npm run test`
Expected: tsc exit 0；`Tests 91 passed`

- [ ] **Step 4: 實機驗證**

Run: `npm run dev`。確認左右答案台階顏色改為該維度兩字母色（例：EI 關左金右深藍），且左右答案預覽文字顏色與對應台階一致。

- [ ] **Step 5: Commit**

```bash
git add src/entities/Platform.ts src/scenes/GameScene.ts
git commit -m "feat: colour answer platforms and previews by MBTI letter"
```

---

### Task 5: 極光動態背景 `AuroraBackground`

**Files:**
- Create: `src/gfx/AuroraBackground.ts`
- Modify: `src/scenes/GameScene.ts`

**Interfaces:**
- Consumes: `LETTER_COLORS`、`LETTERS_OF`、`DIMENSIONS`、`GAME`
- Produces: `export class AuroraBackground`；`constructor(scene, reducedMotion: boolean)`；`retint(dimIndex: number): void`

- [ ] **Step 1: 建立 AuroraBackground**

Create `src/gfx/AuroraBackground.ts`:
```ts
import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { LETTER_COLORS } from '../theme/palette';
import { DIMENSIONS, LETTERS_OF } from '../config/questions';

const GLOW_KEY = 'aurora-glow';

/**
 * 深底上兩團維度色柔光緩慢飄移的程序背景（無美術資產）。
 * 兩團柔光以 SCREEN 疊加在深色相機底上；retint 依維度換色。
 */
export class AuroraBackground {
  private glowA: Phaser.GameObjects.Image;
  private glowB: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, reducedMotion: boolean) {
    ensureGlowTexture(scene);
    const mk = () =>
      scene.add
        .image(0, 0, GLOW_KEY)
        .setScrollFactor(0)
        .setDepth(-10)
        .setBlendMode(Phaser.BlendModes.SCREEN)
        .setDisplaySize(GAME.width * 1.7, GAME.width * 1.7);
    this.glowA = mk();
    this.glowB = mk();

    this.glowA.setPosition(GAME.width * 0.2, GAME.height * 0.25);
    this.glowB.setPosition(GAME.width * 0.8, GAME.height * 0.75);

    if (!reducedMotion) {
      scene.tweens.add({
        targets: this.glowA,
        x: GAME.width * 0.6,
        y: GAME.height * 0.5,
        duration: 9000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      scene.tweens.add({
        targets: this.glowB,
        x: GAME.width * 0.35,
        y: GAME.height * 0.45,
        duration: 11000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  /** 依維度更新兩團柔光顏色。 */
  retint(dimIndex: number): void {
    const [a, b] = LETTERS_OF[DIMENSIONS[dimIndex]];
    this.glowA.setTint(LETTER_COLORS[a]);
    this.glowB.setTint(LETTER_COLORS[b]);
  }
}

function ensureGlowTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(GLOW_KEY)) return;
  const size = 256;
  const canvas = scene.textures.createCanvas(GLOW_KEY, size, size);
  if (!canvas) return;
  const ctx = canvas.getContext();
  const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, 'rgba(255,255,255,0.9)');
  grd.addColorStop(0.5, 'rgba(255,255,255,0.32)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  canvas.refresh();
}
```

- [ ] **Step 2: GameScene 整合（移除 LEVEL_BG 純色，改用極光）**

在 `src/scenes/GameScene.ts`：
移除已不再使用的 import：
```ts
import { LEVEL_BG } from '../theme/palette';
```
新增：
```ts
import { AuroraBackground } from '../gfx/AuroraBackground';
```
新增欄位（放在 `private background!: Background;` 附近）：
```ts
  private aurora!: AuroraBackground;
```
在 `create()` 中把
```ts
    this.cameras.main.setBackgroundColor(LEVEL_BG[this.dimIndex]);
    this.background = new Background(this);
```
改為：
```ts
    this.cameras.main.setBackgroundColor(0x141a24); // 深底，色彩由極光提供
    this.aurora = new AuroraBackground(this, this.reducedMotion);
    this.aurora.retint(this.dimIndex);
    this.background = new Background(this);
```
在 `advanceDimension()` 中把
```ts
    this.cameras.main.setBackgroundColor(LEVEL_BG[this.dimIndex]);
```
改為：
```ts
    this.aurora.retint(this.dimIndex);
```

- [ ] **Step 3: 型別檢查 + 測試不回歸**

Run: `npx tsc --noEmit && npm run test`
Expected: tsc exit 0（確認 `LEVEL_BG` 已無殘留引用，否則 `noUnusedLocals` 會報錯）；`Tests 91 passed`

- [ ] **Step 4: 實機驗證**

Run: `npm run dev`。確認背景為深底 + 兩團維度色柔光緩慢飄移；換維度時柔光換色。若系統開啟「減少動態」，柔光應靜止於對角位置。

- [ ] **Step 5: Commit**

```bash
git add src/gfx/AuroraBackground.ts src/scenes/GameScene.ts
git commit -m "feat: add drifting aurora background per dimension"
```

---

### Task 6: 分享卡 i18n 字串（五語系）

**Files:**
- Modify: `src/i18n/strings/en.ts`
- Modify: `src/i18n/strings/zh-Hant.ts`
- Modify: `src/i18n/strings/zh-Hans.ts`
- Modify: `src/i18n/strings/ja.ts`
- Modify: `src/i18n/strings/es.ts`

**Interfaces:**
- Produces: 新 StringKey：`result.saveCard`、`result.saved`、`result.saveFail`、`card.tagline`

- [ ] **Step 1: 五語系各新增四個鍵**

在每個檔案的 `result.*` 區塊附近加入下列四行（鍵名完全一致，值依語系）。

`en.ts`：
```ts
  'result.saveCard': 'Save card 🖼',
  'result.saved': 'Saved ✓',
  'result.saveFail': 'Save failed',
  'card.tagline': 'MBTI Jump — jump out your personality',
```
`zh-Hant.ts`：
```ts
  'result.saveCard': '下載分享卡 🖼',
  'result.saved': '已下載 ✓',
  'result.saveFail': '下載失敗',
  'card.tagline': 'MBTI Jump · 玩一場，跳出你的人格',
```
`zh-Hans.ts`：
```ts
  'result.saveCard': '下载分享卡 🖼',
  'result.saved': '已下载 ✓',
  'result.saveFail': '下载失败',
  'card.tagline': 'MBTI Jump · 玩一场，跳出你的人格',
```
`ja.ts`：
```ts
  'result.saveCard': 'カードを保存 🖼',
  'result.saved': '保存しました ✓',
  'result.saveFail': '保存に失敗',
  'card.tagline': 'MBTI Jump — 跳んで性格を発見',
```
`es.ts`：
```ts
  'result.saveCard': 'Guardar tarjeta 🖼',
  'result.saved': 'Guardado ✓',
  'result.saveFail': 'Error al guardar',
  'card.tagline': 'MBTI Jump — salta y descubre tu personalidad',
```

- [ ] **Step 2: 完整性 + 型別檢查**

Run: `npx vitest run src/i18n/completeness.test.ts && npx tsc --noEmit`
Expected: PASS；tsc exit 0（五語系鍵集合一致）

- [ ] **Step 3: Commit**

```bash
git add src/i18n/strings/
git commit -m "feat: add share-card i18n strings (5 locales)"
```

---

### Task 7: 分享卡資料模型 `buildShareCardModel`

**Files:**
- Create: `src/share/shareCardModel.ts`
- Test: `src/share/shareCardModel.test.ts` (create)

**Interfaces:**
- Consumes: `describeType`、`groupOf`/`groupColorOf`、`DIMENSIONS`/`LETTERS_OF`、`LETTER_COLORS`、`t`、`card.tagline`（Task 6）
- Produces: `export interface ShareDim`、`export interface ShareCardModel`、`export function buildShareCardModel(type: string, tallies: Record<Dimension, [number, number]>, locale?: Locale): ShareCardModel`

- [ ] **Step 1: 寫失敗測試**

Create `src/share/shareCardModel.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildShareCardModel } from './shareCardModel';
import type { Dimension } from '../config/questions';

const tallies: Record<Dimension, [number, number]> = {
  EI: [2, 1],
  SN: [3, 0],
  TF: [1, 2],
  JP: [0, 0],
};

describe('buildShareCardModel', () => {
  it('carries the type and four dimension bars', () => {
    const m = buildShareCardModel('ENFP', tallies, 'en');
    expect(m.type).toBe('ENFP');
    expect(m.dims).toHaveLength(4);
  });

  it('computes divider fractions from tallies (0-0 centred)', () => {
    const m = buildShareCardModel('ENFP', tallies, 'en');
    expect(m.dims[0].dividerFrac).toBeCloseTo(2 / 3, 5); // EI 2:1
    expect(m.dims[1].dividerFrac).toBe(1); // SN 3:0
    expect(m.dims[3].dividerFrac).toBe(0.5); // JP 0:0
  });

  it('resolves group name, description and tagline via i18n', () => {
    const m = buildShareCardModel('ENFP', tallies, 'en');
    expect(m.groupName).toBe('a Diplomat');
    expect(m.description.length).toBeGreaterThan(0);
    expect(m.tagline.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/share/shareCardModel.test.ts`
Expected: FAIL（模組不存在）

- [ ] **Step 3: 實作**

Create `src/share/shareCardModel.ts`:
```ts
import type { Locale } from '../i18n/locales';
import { t } from '../i18n/t';
import type { StringKey } from '../i18n/t';
import { describeType } from '../config/personalities';
import { groupOf, groupColorOf } from '../core/temperament';
import { DIMENSIONS, LETTERS_OF } from '../config/questions';
import type { Dimension, Letter } from '../config/questions';
import { LETTER_COLORS } from '../theme/palette';

export interface ShareDim {
  leftLetter: Letter;
  rightLetter: Letter;
  leftColor: number;
  rightColor: number;
  dividerFrac: number; // 左字母占比 0..1；雙零置中 0.5
}

export interface ShareCardModel {
  type: string;
  groupName: string;
  groupColor: number;
  description: string;
  dims: ShareDim[];
  tagline: string;
}

export function buildShareCardModel(
  type: string,
  tallies: Record<Dimension, [number, number]>,
  locale?: Locale,
): ShareCardModel {
  const group = groupOf(type);
  const dims: ShareDim[] = DIMENSIONS.map((d) => {
    const [a, b] = LETTERS_OF[d];
    const [na, nb] = tallies[d];
    const total = na + nb;
    return {
      leftLetter: a,
      rightLetter: b,
      leftColor: LETTER_COLORS[a],
      rightColor: LETTER_COLORS[b],
      dividerFrac: total === 0 ? 0.5 : na / total,
    };
  });
  return {
    type,
    groupName: t(`group.${group}` as StringKey, locale),
    groupColor: groupColorOf(type),
    description: describeType(type, locale),
    dims,
    tagline: t('card.tagline', locale),
  };
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/share/shareCardModel.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/share/shareCardModel.ts src/share/shareCardModel.test.ts
git commit -m "feat: add buildShareCardModel (pure share-card data)"
```

---

### Task 8: 分享卡渲染與下載 `renderShareCard` / `downloadCard`

**Files:**
- Create: `src/share/shareCard.ts`

**Interfaces:**
- Consumes: `ShareCardModel`（Task 7）
- Produces: `export function renderShareCard(model: ShareCardModel): HTMLCanvasElement`；`export function downloadCard(canvas: HTMLCanvasElement, filename: string): Promise<void>`

- [ ] **Step 1: 實作渲染與下載**

Create `src/share/shareCard.ts`:
```ts
import type { ShareCardModel } from './shareCardModel';

const W = 1080;
const H = 1350;

const hex = (n: number): string => '#' + n.toString(16).padStart(6, '0');

/** 把 24-bit 色與白色以 amount 混合，回傳 CSS 字串（做放射漸變中心提亮）。 */
function tintToward(color: number, amount: number): string {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

function wrapText(
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

function drawDims(ctx: CanvasRenderingContext2D, model: ShareCardModel): void {
  const barW = W - 200;
  const x0 = 100;
  const barH = 34;
  const gap = 26;
  let y = H * 0.66;
  for (const d of model.dims) {
    const grd = ctx.createLinearGradient(x0, 0, x0 + barW, 0);
    grd.addColorStop(0, hex(d.leftColor));
    grd.addColorStop(1, hex(d.rightColor));
    ctx.fillStyle = grd;
    roundRect(ctx, x0, y, barW, barH, barH / 2);
    ctx.fill();
    // 白色分隔線
    const dx = x0 + d.dividerFrac * barW;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(dx - 2, y - 3, 4, barH + 6);
    y += barH + gap;
  }
}

function roundRect(
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
  drawDims(ctx, model);

  // 底部標語
  ctx.fillStyle = '#ffffff88';
  ctx.font = '400 32px Nunito, system-ui, sans-serif';
  ctx.fillText(model.tagline, W / 2, H - 56);

  return canvas;
}

export function downloadCard(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('toBlob returned null'));
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      resolve();
    }, 'image/png');
  });
}
```

- [ ] **Step 2: 型別檢查 + 測試不回歸**

Run: `npx tsc --noEmit && npm run test`
Expected: tsc exit 0；`Tests 94 passed`（含 Task 1/2/7 各新增 3 個測試）

- [ ] **Step 3: Commit**

```bash
git add src/share/shareCard.ts
git commit -m "feat: render and download share card PNG"
```

---

### Task 9: Result 畫面接上「下載分享卡」按鈕

**Files:**
- Modify: `src/scenes/ResultScene.ts`

**Interfaces:**
- Consumes: `buildShareCardModel`（Task 7）、`renderShareCard`/`downloadCard`（Task 8）、`getLocale`、`result.saveCard`/`result.saved`/`result.saveFail`（Task 6）

- [ ] **Step 1: 匯入依賴**

在 `src/scenes/ResultScene.ts` 檔頭加入：
```ts
import { buildShareCardModel } from '../share/shareCardModel';
import { renderShareCard, downloadCard } from '../share/shareCard';
import { getLocale } from '../i18n/store';
```

- [ ] **Step 2: 調整既有按鈕 y 座標並插入新按鈕**

把 `create()` 中「再玩一次」與「趨勢」兩顆按鈕的 y 從 `575`、`640` 下移為 `645`、`710`，並在 `copyBtn`（y=505）之後、`result.again` 之前插入分享卡按鈕：
```ts
    const saveBtn = new Button(this, cx, 575, t('result.saveCard'), {
      width: 240,
      height: 54,
      fontSize: 20,
      bg: 0x33a474,
      bgHover: 0x3fb886,
      bgDown: 0x2b8a61,
      onClick: async () => {
        try {
          const model = buildShareCardModel(type, data.score.allTallies(), getLocale());
          const canvas = renderShareCard(model);
          await downloadCard(canvas, `mbti-jump-${type}.png`);
          saveBtn.setLabel(t('result.saved'));
        } catch {
          saveBtn.setLabel(t('result.saveFail'));
        }
      },
    });
```
（即：`copyBtn` y=505 → `saveBtn` y=575 → 「再玩一次」y=645 → 「趨勢」y=710，皆在畫布高 800 內。）

- [ ] **Step 3: 型別檢查 + 測試不回歸**

Run: `npx tsc --noEmit && npm run test`
Expected: tsc exit 0；`Tests 94 passed`

- [ ] **Step 4: 實機驗證**

Run: `npm run dev`，玩到結算畫面。點「下載分享卡」應下載 `mbti-jump-<型別>.png`；開啟該檔確認版型 A（大型別、族群色放射底、描述、四維度傾向條、底部標語）正確；按鈕文字變為「已下載 ✓」。切換語言後再玩，確認卡片文字隨語系。

- [ ] **Step 5: Commit**

```bash
git add src/scenes/ResultScene.ts
git commit -m "feat: add save-share-card button to result screen"
```

---

## 完成後總驗

Run: `npm run test && npm run build`
Expected: `Tests 94 passed`；build（`tsc && vite build`）成功。
