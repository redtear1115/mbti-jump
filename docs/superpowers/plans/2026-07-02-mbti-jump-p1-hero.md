# MBTI Jump P1 記憶點包 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 果凍怪隨鎖定維度變色（純函式混色＋texture 帶色重生成）、開始頁 hero 果凍怪 idle 呼吸、結果頁升級為族群色 glow＋最終色果凍怪＋動畫維度傾向條的分享舞台。

**Architecture:** 純邏輯（`playerColorFor`/`lerpColor`、`ScoreTracker.lockedLetters`）進 core 接受 vitest；`Player.ensureTexture` 參數化 body 色並以色值當 texture key；glow texture 生成自 `AuroraBackground` 抽成共用 `gfx/glowTexture.ts`；三個場景各自小幅接線。全部程式繪製、無新資產。

**Tech Stack:** TypeScript strict、Phaser 3、vitest。

**Spec:** `docs/superpowers/specs/2026-07-02-mbti-jump-p1-hero-design.md`

## Global Constraints

- TypeScript strict、`noUnusedLocals`、`noUnusedParameters`；指令在 repo root。
- 基底色 `PLAYER_BASE_COLOR = 0xc0aee2`；混色 `lerpColor(base, avg(LETTER_COLORS), 0.75 * k / 4)`；texture key `player-proc-<六位小寫hex>`；眼/嘴 `0x2a2340` 與白高光不變。
- 點陣資產（`ASSET_KEYS.player` texture 存在）模式：不變色、不重生成（no-op），與現有 fallback 慣例一致。
- reduced-motion（`prefersReducedMotion()`）：所有新動畫（呼吸、pop、維度條 tween）直接呈現最終狀態。
- 結果頁版面：heading y=48（16px）→ 果凍怪 (cx,120) scale 2 → 型別 210 → 族群 268 → 維度條 310 起四條（260×16、pitch 30）→ 描述 470 → 好友對比 535 → 按鈕 585/650/712。開始頁 hero (cx,92) scale 1.8，其餘元素座標不動。
- 既有 119 測試每 task 結束全綠；commit 用 conventional prefix，結尾加：
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: 混色純函式 `src/core/playerColor.ts`

**Files:**
- Create: `src/core/playerColor.ts`
- Test: `src/core/playerColor.test.ts`

**Interfaces:**
- Consumes: `LETTER_COLORS`（`src/theme/palette.ts`）、`Letter`（`src/config/questions.ts`）
- Produces: `PLAYER_BASE_COLOR = 0xc0aee2`、`lerpColor(a: number, b: number, t: number): number`、`playerColorFor(letters: Letter[]): number`（Task 4/5/6 使用）

- [ ] **Step 1: 寫失敗測試**

```ts
// src/core/playerColor.test.ts
import { describe, it, expect } from 'vitest';
import { lerpColor, playerColorFor, PLAYER_BASE_COLOR } from './playerColor';

describe('lerpColor', () => {
  it('returns endpoints at t=0 and t=1', () => {
    expect(lerpColor(0x000000, 0xffffff, 0)).toBe(0x000000);
    expect(lerpColor(0x000000, 0xffffff, 1)).toBe(0xffffff);
  });

  it('interpolates per channel with rounding', () => {
    expect(lerpColor(0x000000, 0xffffff, 0.5)).toBe(0x808080); // 127.5 → 128
    expect(lerpColor(0x102030, 0x304050, 0.5)).toBe(0x203040);
  });
});

describe('playerColorFor', () => {
  it('returns base color with no locked letters', () => {
    expect(playerColorFor([])).toBe(PLAYER_BASE_COLOR);
  });

  it('moves 18.75% toward the letter color after one lock', () => {
    // base c0aee2 (192,174,226) → E f0b84a (240,184,74)，t=0.75*1/4=0.1875
    // r=192+48*.1875=201, g=174+10*.1875≈176, b=226-152*.1875≈198 → 0xc9b0c6
    expect(playerColorFor(['E'])).toBe(0xc9b0c6);
  });

  it('lands at 75% of the four-letter average after four locks', () => {
    // INFP: I 2e6d86, N 6e79b0, F 33a474, P e09a3a → avg (108,137,121)
    // t=0.75: r=192-63=129, g=174-27.75≈146, b=226-78.75≈147 → 0x819293
    expect(playerColorFor(['I', 'N', 'F', 'P'])).toBe(0x819293);
  });

  it('each channel stays between base and target', () => {
    const c = playerColorFor(['E']);
    const ch = (n: number, s: number) => (n >> s) & 0xff;
    for (const s of [16, 8, 0]) {
      const lo = Math.min(ch(PLAYER_BASE_COLOR, s), ch(0xf0b84a, s));
      const hi = Math.max(ch(PLAYER_BASE_COLOR, s), ch(0xf0b84a, s));
      expect(ch(c, s)).toBeGreaterThanOrEqual(lo);
      expect(ch(c, s)).toBeLessThanOrEqual(hi);
    }
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/core/playerColor.test.ts`
Expected: FAIL（模組不存在）

- [ ] **Step 3: 最小實作**

```ts
// src/core/playerColor.ts
import { LETTER_COLORS } from '../theme/palette';
import type { Letter } from '../config/questions';

/** 果凍怪基底色（百變怪淡紫）。 */
export const PLAYER_BASE_COLOR = 0xc0aee2;

/** RGB 各通道線性插值（t 0..1），逐通道四捨五入。 */
export function lerpColor(a: number, b: number, t: number): number {
  const ch = (sa: number, sb: number) => Math.round(sa + (sb - sa) * t);
  const r = ch((a >> 16) & 0xff, (b >> 16) & 0xff);
  const g = ch((a >> 8) & 0xff, (b >> 8) & 0xff);
  const bl = ch(a & 0xff, b & 0xff);
  return (r << 16) | (g << 8) | bl;
}

/**
 * 已鎖定字母 → 果凍怪身體色。
 * 基底紫向「已鎖字母色的 RGB 平均」靠近 0.75*k/4：
 * 四關鎖完 = 75% 字母混色 + 25% 基底（保留角色識別）。
 */
export function playerColorFor(letters: Letter[]): number {
  if (letters.length === 0) return PLAYER_BASE_COLOR;
  let r = 0;
  let g = 0;
  let b = 0;
  for (const l of letters) {
    const c = LETTER_COLORS[l];
    r += (c >> 16) & 0xff;
    g += (c >> 8) & 0xff;
    b += c & 0xff;
  }
  const n = letters.length;
  const avg = (Math.round(r / n) << 16) | (Math.round(g / n) << 8) | Math.round(b / n);
  return lerpColor(PLAYER_BASE_COLOR, avg, 0.75 * (n / 4));
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run src/core/playerColor.test.ts`
Expected: PASS（5 tests）。若第 3/4 個測試因 ±1 進位差 FAIL：以實作輸出為準修測試期望值（逐通道 `Math.round` 是規格，手算值僅供對照），並在 commit message 註明。

- [ ] **Step 5: 全套測試＋commit**

Run: `npm test`
Expected: 124 tests PASS

```bash
git add src/core/playerColor.ts src/core/playerColor.test.ts
git commit -m "feat: add playerColorFor/lerpColor pure color-mix helpers"
```

---

### Task 2: `ScoreTracker.lockedLetters()`

**Files:**
- Modify: `src/core/ScoreTracker.ts`
- Test: `src/core/ScoreTracker.test.ts`（append）

**Interfaces:**
- Consumes: 既有 `locked: Map<Dimension, Letter>`、`DIMENSIONS`
- Produces: `lockedLetters(): Letter[]`——依 `DIMENSIONS` 順序回傳已鎖定維度的字母，未鎖定略過（Task 4 使用）

- [ ] **Step 1: 寫失敗測試（append 到既有 describe 外層新 describe）**

```ts
// src/core/ScoreTracker.test.ts 檔尾 append
describe('lockedLetters', () => {
  it('is empty before any lock', () => {
    expect(new ScoreTracker().lockedLetters()).toEqual([]);
  });

  it('returns letters in DIMENSIONS order as levels lock', () => {
    const s = new ScoreTracker();
    s.recordAnswer('I');
    s.completeLevel('EI');
    expect(s.lockedLetters()).toEqual(['I']);
    s.recordAnswer('N');
    s.completeLevel('SN');
    expect(s.lockedLetters()).toEqual(['I', 'N']);
  });
});
```

（檔案既有 import 已含 `ScoreTracker`；若 `describe/it/expect` 用具名 import，沿用檔內現況。）

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/core/ScoreTracker.test.ts`
Expected: FAIL（`lockedLetters is not a function`）

- [ ] **Step 3: 實作（`lockedCount()` 方法後加）**

```ts
  /** 已鎖定維度的字母，依 DIMENSIONS 順序（未鎖定略過）。 */
  lockedLetters(): Letter[] {
    return DIMENSIONS.filter((d) => this.locked.has(d)).map((d) => this.locked.get(d)!);
  }
```

- [ ] **Step 4: 跑測試確認通過＋全套**

Run: `npx vitest run src/core/ScoreTracker.test.ts && npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/ScoreTracker.ts src/core/ScoreTracker.test.ts
git commit -m "feat: expose ScoreTracker.lockedLetters accessor"
```

---

### Task 3: glow texture 抽共用 `src/gfx/glowTexture.ts`

**Files:**
- Create: `src/gfx/glowTexture.ts`
- Modify: `src/gfx/AuroraBackground.ts`

**Interfaces:**
- Consumes: 無
- Produces: `ensureGlowTexture(scene: Phaser.Scene): string`（回傳 texture key `'radial-glow'`；Task 6 ResultScene 使用）；AuroraBackground 行為不變（同一張漸變圖）

- [ ] **Step 1: 建共用模組（內容自 AuroraBackground 搬移，含 P0 調暗後的 alpha stops）**

```ts
// src/gfx/glowTexture.ts
import Phaser from 'phaser';

const GLOW_KEY = 'radial-glow';

/** 256×256 白色放射漸變 texture（中心亮→邊緣透明），tint 後做色暈。回傳 texture key。 */
export function ensureGlowTexture(scene: Phaser.Scene): string {
  if (scene.textures.exists(GLOW_KEY)) return GLOW_KEY;
  const size = 256;
  const canvas = scene.textures.createCanvas(GLOW_KEY, size, size);
  if (!canvas) return GLOW_KEY;
  const ctx = canvas.getContext();
  const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  // 亮度整體 ×0.85（P0 可讀性：前景圖底分離），氛圍仍在
  grd.addColorStop(0, 'rgba(255,255,255,0.765)');
  grd.addColorStop(0.5, 'rgba(255,255,255,0.272)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  canvas.refresh();
  return GLOW_KEY;
}
```

- [ ] **Step 2: AuroraBackground 改用共用模組**

`src/gfx/AuroraBackground.ts`：
- 刪除檔內 `const GLOW_KEY = 'aurora-glow';` 與整個 `ensureGlowTexture` 函式。
- import 加：`import { ensureGlowTexture } from './glowTexture';`
- constructor 開頭 `ensureGlowTexture(scene);` 改為 `const glowKey = ensureGlowTexture(scene);`，`mk()` 內 `scene.add.image(0, 0, GLOW_KEY)` 改為 `scene.add.image(0, 0, glowKey)`。

- [ ] **Step 3: 型檢＋全套測試**

Run: `npx tsc --noEmit && npm test`
Expected: 全 PASS

- [ ] **Step 4: Commit**

```bash
git add src/gfx/glowTexture.ts src/gfx/AuroraBackground.ts
git commit -m "refactor: extract shared radial glow texture from AuroraBackground"
```

---

### Task 4: Player 帶色 texture ＋ recolor ＋ GameScene 接線

**Files:**
- Modify: `src/entities/Player.ts`
- Modify: `src/scenes/GameScene.ts`（`create()` 的 Player 建構、`completeCurrentDimension()`）

**Interfaces:**
- Consumes: `PLAYER_BASE_COLOR`、`playerColorFor`（Task 1）、`lockedLetters`（Task 2）
- Produces: `ensurePlayerTexture(scene: Phaser.Scene, bodyColor: number): string`（exported，Task 5/6 場景直接畫果凍怪用）；`Player` constructor 第 4 參數 `color?: number`；`Player.recolor(color: number): void`

- [ ] **Step 1: 改寫 `src/entities/Player.ts`**

整檔換成：

```ts
import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { ASSET_KEYS } from '../config/assets';
import { prefersReducedMotion } from '../ui/reducedMotion';
import { PLAYER_BASE_COLOR } from '../core/playerColor';

const PROC_KEY_PREFIX = 'player-proc-';
const TEX_W = 48;
const TEX_H = 44;

export class Player extends Phaser.Physics.Arcade.Sprite {
  private reduced = prefersReducedMotion();
  private wobble?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number, color: number = PLAYER_BASE_COLOR) {
    const key = scene.textures.exists(ASSET_KEYS.player)
      ? ASSET_KEYS.player
      : ensurePlayerTexture(scene, color);
    super(scene, x, y, key);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(36, 36);
    body.setCollideWorldBounds(false);
  }

  setAxis(axis: number): void {
    this.setVelocityX(axis * GAME.playerMaxSpeedX);
  }

  bounce(): void {
    this.setVelocityY(GAME.jumpVelocity);
    // 液體感：落地瞬間壓扁 → 彈性回彈略微拉長，像果凍史萊姆
    if (this.reduced) return;
    this.wobble?.stop();
    this.setScale(1.35, 0.68);
    this.wobble = this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 420,
      ease: 'Elastic.easeOut',
      easeParams: [1.1, 0.45],
    });
  }

  /** 依混色結果換膚（texture 帶色重生成）＋彈性 pop；點陣資產模式 no-op。 */
  recolor(color: number): void {
    if (this.scene.textures.exists(ASSET_KEYS.player)) return;
    this.setTexture(ensurePlayerTexture(this.scene, color));
    if (this.reduced) return;
    this.wobble?.stop();
    this.setScale(1.18);
    this.wobble = this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });
  }

  wrapHorizontally(): void {
    if (this.x < 0) this.x = GAME.width;
    else if (this.x > GAME.width) this.x = 0;
  }
}

/**
 * 程式美術：百變怪風格淡紫液體怪（帶 body 色參數）。
 * texture key 依色值快取（player-proc-<hex>）；眼/嘴深色與白高光不隨 body 色變。
 */
export function ensurePlayerTexture(scene: Phaser.Scene, bodyColor: number): string {
  const key = PROC_KEY_PREFIX + bodyColor.toString(16).padStart(6, '0');
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  // 由多個重疊圓形聯集出「有波浪凸起」的不定形身體
  g.fillStyle(bodyColor, 1);
  g.fillCircle(24, 28, 17); // 主體
  g.fillEllipse(24, 33, 42, 22); // 加寬下半身
  g.fillCircle(11, 16, 7); // 左上尖凸
  g.fillCircle(20, 11, 8); // 中左凸
  g.fillCircle(30, 12, 8); // 中右凸
  g.fillCircle(39, 17, 7); // 右上圓凸
  g.fillCircle(7, 25, 6); // 左側
  g.fillCircle(42, 27, 6); // 右側小凸
  // 頂部高光（果凍感）
  g.fillStyle(0xffffff, 0.16);
  g.fillEllipse(19, 18, 22, 11);
  // 眼睛：兩個深色小圓點
  g.fillStyle(0x2a2340, 1);
  g.fillCircle(19, 24, 2.3);
  g.fillCircle(31, 24, 2.3);
  // 嘴巴：寬而淺的微笑線（百變怪招牌憨笑）
  g.lineStyle(2, 0x2a2340, 1);
  g.beginPath();
  g.arc(25, 16, 14, Phaser.Math.DegToRad(55), Phaser.Math.DegToRad(125));
  g.strokePath();
  g.generateTexture(key, TEX_W, TEX_H);
  g.destroy();
  return key;
}
```

- [ ] **Step 2: GameScene 接線**

`src/scenes/GameScene.ts` import 加：

```ts
import { playerColorFor } from '../core/playerColor';
```

`create()` 內 Player 建構改為（重玩接續時開場即正確顏色）：

```ts
    this.player = new Player(this, GAME.width / 2, GAME.height - 90, playerColorFor(this.score.lockedLetters()));
```

`completeCurrentDimension()` 內 `this.score.completeLevel(...)` 之後、`Sfx.play('advance')` 之前加：

```ts
    this.player.recolor(playerColorFor(this.score.lockedLetters()));
```

- [ ] **Step 3: 型檢＋全套測試**

Run: `npx tsc --noEmit && npm test`
Expected: 全 PASS

- [ ] **Step 4: Commit**

```bash
git add src/entities/Player.ts src/scenes/GameScene.ts
git commit -m "feat: player recolors toward locked letter colors per dimension"
```

---

### Task 5: 開始頁 hero 果凍怪

**Files:**
- Modify: `src/scenes/StartScene.ts`

**Interfaces:**
- Consumes: `ensurePlayerTexture`（Task 4）、`PLAYER_BASE_COLOR`（Task 1）、`prefersReducedMotion`（既有 `src/ui/reducedMotion.ts`）
- Produces: 開始頁標題上方 idle 呼吸的果凍怪；其餘元素不動

- [ ] **Step 1: 加 hero**

`src/scenes/StartScene.ts` import 加：

```ts
import { ensurePlayerTexture } from '../entities/Player';
import { PLAYER_BASE_COLOR } from '../core/playerColor';
import { prefersReducedMotion } from '../ui/reducedMotion';
```

`create()` 內（`const current = getLocale();` 之後、標題 text 之前）加：

```ts
    // Hero 果凍怪：標題上方 idle 呼吸（reduced-motion 靜態）
    const hero = this.add
      .image(cx, 92, ensurePlayerTexture(this, PLAYER_BASE_COLOR))
      .setScale(1.8);
    if (!prefersReducedMotion()) {
      this.tweens.add({
        targets: hero,
        scaleY: { from: 1.8 * 0.94, to: 1.8 * 1.03 },
        y: { from: 96, to: 88 },
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
```

- [ ] **Step 2: 型檢＋全套測試**

Run: `npx tsc --noEmit && npm test`
Expected: 全 PASS

- [ ] **Step 3: Commit**

```bash
git add src/scenes/StartScene.ts
git commit -m "feat: breathing hero jelly on start screen"
```

---

### Task 6: 結果頁分享舞台

**Files:**
- Modify: `src/scenes/ResultScene.ts`

**Interfaces:**
- Consumes: `ensureGlowTexture`（Task 3）、`ensurePlayerTexture`（Task 4）、`playerColorFor`（Task 1）、`buildShareCardModel`/`getLocale`/`groupColorOf`/`prefersReducedMotion`（既有 import）、`letterHex`（`src/theme/palette.ts`）、`Letter`（`src/config/questions.ts`）
- Produces: 結果頁族群色 glow＋最終色果凍怪＋四條動畫維度傾向條＋新版面

- [ ] **Step 1: import 區加**

```ts
import { ensureGlowTexture } from '../gfx/glowTexture';
import { ensurePlayerTexture } from '../entities/Player';
import { playerColorFor } from '../core/playerColor';
import { letterHex } from '../theme/palette';
import type { Letter } from '../config/questions';
```

（`buildShareCardModel`、`getLocale`、`groupColorOf`、`prefersReducedMotion`、`GAME` 均已在 import 中。）

- [ ] **Step 2: create() 開頭視覺段改寫**

`this.cameras.main.setBackgroundColor('#1a1c2c');` 起、到描述文字（y=390 的 `desc` text）為止整段換成：

```ts
    this.cameras.main.setBackgroundColor('#101018');
    const cx = GAME.width / 2;
    const reduce = prefersReducedMotion();

    // 族群色 radial glow（與分享卡同視覺語言）
    this.add
      .image(cx, 300, ensureGlowTexture(this))
      .setDisplaySize(900, 900)
      .setBlendMode(Phaser.BlendModes.SCREEN)
      .setTint(groupColorOf(type));

    // 最終色果凍怪：你的顏色，elastic pop 入場
    const jelly = this.add
      .image(cx, 120, ensurePlayerTexture(this, playerColorFor(type.split('') as Letter[])))
      .setScale(2);
    if (!reduce) {
      jelly.setScale(0);
      this.tweens.add({ targets: jelly, scale: 2, duration: 500, ease: 'Back.easeOut' });
    }

    this.add
      .text(cx, 48, t('result.heading'), {
        fontSize: '16px',
        color: '#ffffffaa',
        fontFamily: 'Fredoka, system-ui, sans-serif',
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 210, type, {
        fontSize: '72px',
        color: groupHex,
        fontStyle: 'bold',
        fontFamily: 'Fredoka, system-ui, sans-serif',
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 268, tf('result.groupLabel', [t(`group.${group}` as StringKey)]), {
        fontFamily: 'Fredoka, system-ui, sans-serif',
        fontSize: '20px',
        color: groupHex,
      })
      .setOrigin(0.5);

    // 四維度傾向條（分享卡視覺的 Phaser 版；divider 由中點動畫到實際位置）
    const model = buildShareCardModel(type, data.score.allTallies(), getLocale());
    const barGfx = this.add.graphics();
    const barX = cx - 130;
    const barW = 260;
    const barH = 16;
    const topY = 310;
    const pitch = 30;
    model.dims.forEach((d, i) => {
      const y = topY + i * pitch + barH / 2;
      const labelStyle = {
        fontSize: '13px',
        fontStyle: 'bold',
        fontFamily: 'Nunito, system-ui, sans-serif',
      };
      this.add
        .text(barX - 10, y, d.leftLetter, { ...labelStyle, color: letterHex(d.leftLetter) })
        .setOrigin(1, 0.5);
      this.add
        .text(barX + barW + 10, y, d.rightLetter, { ...labelStyle, color: letterHex(d.rightLetter) })
        .setOrigin(0, 0.5);
    });
    const drawBars = (progress: number) => {
      barGfx.clear();
      model.dims.forEach((d, i) => {
        const y = topY + i * pitch;
        barGfx.fillGradientStyle(d.leftColor, d.rightColor, d.leftColor, d.rightColor, 1);
        barGfx.fillRoundedRect(barX, y, barW, barH, 8);
        const frac = 0.5 + (d.dividerFrac - 0.5) * progress;
        barGfx.fillStyle(0xffffff, 1);
        barGfx.fillRect(barX + frac * barW - 2, y - 2, 4, barH + 4);
      });
    };
    if (reduce) {
      drawBars(1);
    } else {
      const anim = { p: 0 };
      drawBars(0);
      this.tweens.add({
        targets: anim,
        p: 1,
        duration: 400,
        ease: 'Cubic.easeOut',
        onUpdate: () => drawBars(anim.p),
      });
    }

    this.add
      .text(cx, 470, desc, {
        fontSize: '18px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: GAME.width - 60 },
        fontFamily: 'Nunito, system-ui, sans-serif',
      })
      .setOrigin(0.5);
```

（`type`/`desc`/`group`/`groupHex` 的計算與 `recordPlay`/成就 toast 段維持在前面不動。原 heading 180 / type 250 / group 320 / desc 390 的四段 text 即被上述取代。）

- [ ] **Step 3: 對比行與按鈕移位**

- 好友對比行 y `458` → `535`（其樣式不變）。
- 分享鈕 y `530` → `585`；再玩一次 `610` → `650`；趨勢 `680` → `712`。

- [ ] **Step 4: 型檢＋全套測試**

Run: `npx tsc --noEmit && npm test`
Expected: 全 PASS

- [ ] **Step 5: Commit**

```bash
git add src/scenes/ResultScene.ts
git commit -m "feat: result screen share-stage — group glow, colored jelly, animated dim bars"
```

---

### Task 7: 整體驗證 ＋ 截圖 ＋ 部署（controller 執行）

**Files:**
- Modify: `docs/TODO.md`（完成註記）

**Interfaces:**
- Consumes: 全部前置 task
- Produces: 驗收截圖；使用者確認後 merge → deploy → 線上抽查

- [ ] **Step 1: 全套檢查**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: 全綠

- [ ] **Step 2: 瀏覽器截圖驗收（對照 spec 驗收標準 1–4）**

dev server 開 `/`：開始頁 hero 呼吸果凍怪；點開始踩到第一組答案後看變色（可玩到鎖定第一維度）；結果頁需完整局——若手動跳關不可行，以 sessionStorage/既有 profile 注入或直接玩滿一局驗證舞台（glow、變色果凍怪、維度條動畫）。

- [ ] **Step 3: 截圖給使用者確認 → merge → `npx wrangler deploy` → 線上抽查**

- [ ] **Step 4: `docs/TODO.md` P1 打勾＋完成註記，commit**

```bash
git add docs/TODO.md
git commit -m "docs: mark P1 hero/stage/color-shift shipped"
```
