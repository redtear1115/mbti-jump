# MBTI Jump P3 打磨包 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 傾向條由跨色漸變改分段實色（遊戲得分條／結果頁維度條／分享卡＋OG 共用繪製，OG 重生成）；桌面 letterbox CSS 妝點；語言 chips 與靜音鈕觸控 ≥44pt（靜音鈕換向量 icon）；海鷗剪影加大改 M 形。

**Architecture:** 純視覺包。canvas 2D 版分段填色用 clip（邊緣完美）；Phaser Graphics 版用「整條右色圓角＋左段 per-corner 圓角覆蓋」。無新純函式，以既有測試全綠＋截圖驗收。

**Tech Stack:** TypeScript strict、Phaser 3、vitest、@napi-rs/canvas（OG 重生成）。

**Spec:** `docs/superpowers/specs/2026-07-03-mbti-jump-p3-polish-design.md`

## Global Constraints

- TypeScript strict、`noUnusedLocals`、`noUnusedParameters`；指令在 repo root。
- 分段實色定義：分隔位置 frac（0..1）左側填左字母 `LETTER_COLORS` 純色、右側填右字母純色、硬邊交界；白色分隔線樣式（粗細/旋鈕）與條的位置尺寸圓角一律不變。frac=0 → 全右色；frac=1 → 全左色。
- 靜音鈕：icon 顯示 22×22、tint `0xaab0cc`、44×44 透明 Zone 接輸入、depth 50/51、位置不變。
- 語言 chips：padding x 6→10、y 12→14；fixedWidth 76、chipPitch 84 不變。
- 海鷗：texture 30×14、線寬 2.2、弧心 (8,9)/(22,9) r7、弧角 200°–340°。
- letterbox：body 放射漸變 `radial-gradient(circle at 50% 38%, #232640 0%, #14162a 55%, #0d0e1c 100%)`；`@media (min-width: 500px)` canvas `border-radius: 18px` + `box-shadow: 0 24px 80px rgba(0,0,0,0.55)`。
- 既有 133 測試每 task 結束全綠；commit conventional prefix，結尾加：
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: `drawDimBars` 分段實色（canvas 2D 共用）

**Files:**
- Modify: `src/share/draw.ts`（`drawDimBars` 函式）

**Interfaces:**
- Consumes: 既有 `ShareDim`（leftColor/rightColor/dividerFrac）、`hex`、`roundRect`
- Produces: `drawDimBars` 簽名不變；填色改分段實色（分享卡與 OG 卡自動跟隨；Task 3 重生成 OG）

- [ ] **Step 1: 改寫 `drawDimBars`**

`src/share/draw.ts` 的 `drawDimBars` 整個函式換成：

```ts
/** 四維度傾向條：分隔線左右各填純字母色（分段實色，無跨色漸變）＋白色分隔線。 */
export function drawDimBars(
  ctx: CanvasRenderingContext2D,
  dims: ShareDim[],
  opts: { x: number; y: number; w: number; barH: number; gap: number },
): void {
  let y = opts.y;
  for (const d of dims) {
    // 整條先填右色，再以 clip 把左段蓋上左色（clip 保證圓角邊緣乾淨）
    ctx.fillStyle = hex(d.rightColor);
    roundRect(ctx, opts.x, y, opts.w, opts.barH, opts.barH / 2);
    ctx.fill();
    const lw = d.dividerFrac * opts.w;
    if (lw > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(opts.x, y, lw, opts.barH);
      ctx.clip();
      ctx.fillStyle = hex(d.leftColor);
      roundRect(ctx, opts.x, y, opts.w, opts.barH, opts.barH / 2);
      ctx.fill();
      ctx.restore();
    }
    const dx = opts.x + d.dividerFrac * opts.w;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(dx - 2, y - 3, 4, opts.barH + 6);
    y += opts.barH + opts.gap;
  }
}
```

- [ ] **Step 2: 型檢＋全套測試**

Run: `npx tsc --noEmit && npm test`
Expected: 全 PASS（133；draw.test 只測 hex/tintToward/wrapText，不受影響）

- [ ] **Step 3: Commit**

```bash
git add src/share/draw.ts
git commit -m "feat: dim bars use solid two-segment fill instead of cross-color gradient"
```

---

### Task 2: GameScene 得分條 ＋ ResultScene 維度條 分段實色

**Files:**
- Modify: `src/scenes/GameScene.ts`（`drawScoreBar()` 填色段）
- Modify: `src/scenes/ResultScene.ts`（`drawBars` closure 填色段）

**Interfaces:**
- Consumes: 既有 `scoreBarModel`（dividerFrac）、`buildShareCardModel` dims、`LETTER_COLORS`
- Produces: 兩處條改分段實色；圓章、分隔線、動畫邏輯不變

- [ ] **Step 1: GameScene `drawScoreBar()`**

把其中的漸變段：

```ts
    g.fillGradientStyle(LETTER_COLORS[a], LETTER_COLORS[b], LETTER_COLORS[a], LETTER_COLORS[b], 1);
    g.fillRoundedRect(x0, y0, w, h, 11);
```

換成（Phaser Graphics 無 clip：整條右色圓角、左段用 per-corner 圓角覆蓋）：

```ts
    // 分段實色：整條先填右字母色，再以左圓角矩形蓋出左段（無跨色漸變髒段）
    g.fillStyle(LETTER_COLORS[b], 1);
    g.fillRoundedRect(x0, y0, w, h, 11);
    const lw = m.dividerFrac * w;
    if (lw > 0) {
      g.fillStyle(LETTER_COLORS[a], 1);
      g.fillRoundedRect(x0, y0, lw, h, { tl: 11, bl: 11, tr: 0, br: 0 });
    }
```

（後續 `const dx = x0 + m.dividerFrac * w;` 起的圓章/分隔線程式不動。）

- [ ] **Step 2: ResultScene `drawBars`**

closure 內每條的：

```ts
        barGfx.fillGradientStyle(d.leftColor, d.rightColor, d.leftColor, d.rightColor, 1);
        barGfx.fillRoundedRect(barX, y, barW, barH, 8);
        const frac = 0.5 + (d.dividerFrac - 0.5) * progress;
```

換成（frac 先算，分段以動畫當前位置為切點）：

```ts
        const frac = 0.5 + (d.dividerFrac - 0.5) * progress;
        // 分段實色：右色整條＋左段 per-corner 圓角覆蓋（無跨色漸變髒段）
        barGfx.fillStyle(d.rightColor, 1);
        barGfx.fillRoundedRect(barX, y, barW, barH, 8);
        const lw = frac * barW;
        if (lw > 0) {
          barGfx.fillStyle(d.leftColor, 1);
          barGfx.fillRoundedRect(barX, y, lw, barH, { tl: 8, bl: 8, tr: 0, br: 0 });
        }
```

（其後白色分隔線兩行不動。）

- [ ] **Step 3: 型檢＋全套測試**

Run: `npx tsc --noEmit && npm test`
Expected: 全 PASS

- [ ] **Step 4: Commit**

```bash
git add src/scenes/GameScene.ts src/scenes/ResultScene.ts
git commit -m "feat: in-game score bar + result dim bars use solid two-segment fill"
```

---

### Task 3: OG 圖重生成 ＋ 目視抽查

**Files:**
- Modify: `public/og/**/*.png`（81 張重生成）

**Interfaces:**
- Consumes: Task 1 的 `drawDimBars`；既有 `npm run generate:og` 管線
- Produces: 分段實色版 OG 圖進版控

- [ ] **Step 1: 重生成**

Run: `npm run generate:og`
Expected: `generated 80 type cards + default.png`

- [ ] **Step 2: 目視抽查（Read 工具開圖）**

`public/og/zh-Hant/INFP.png`、`public/og/ja/ENTJ.png`、`public/og/en/ESTJ.png`：維度條左右皆純色、交界乾淨、白分隔線在交界上、無漸變髒段；其餘版面（型別字、描述、無豆腐字）不變。

- [ ] **Step 3: Commit**

```bash
git add public/og/
git commit -m "chore: regenerate OG images with solid-segment dim bars"
```

---

### Task 4: 靜音鈕向量 icon ＋ 44×44 觸控

**Files:**
- Modify: `src/ui/icons.ts`（IconKind 加 sound-on/sound-off）
- Modify: `src/ui/MuteButton.ts`（整檔改寫）

**Interfaces:**
- Consumes: 既有 `ensureIconTexture` 模式、`Sfx.toggleMute()`/`Sfx.isMuted()`
- Produces: `IconKind` 擴為 `'trophy' | 'lock' | 'chart' | 'sound-on' | 'sound-off'`；MuteButton 相同建構簽名、44×44 hit

- [ ] **Step 1: icons.ts 加兩個 kind**

`IconKind` 改為：

```ts
export type IconKind = 'trophy' | 'lock' | 'chart' | 'sound-on' | 'sound-off';
```

`ensureIconTexture` 的 if-chain 在 `chart`（else 分支）之前插入：

```ts
  } else if (kind === 'sound-on' || kind === 'sound-off') {
    // 喇叭：箱體＋錐面
    g.fillRect(3, 9, 5, 6);
    g.fillTriangle(8, 12, 13, 5, 13, 19);
    if (kind === 'sound-on') {
      // 兩道聲波弧
      g.lineStyle(2, 0xffffff, 1);
      g.beginPath();
      g.arc(14, 12, 4, Phaser.Math.DegToRad(-50), Phaser.Math.DegToRad(50));
      g.strokePath();
      g.beginPath();
      g.arc(14, 12, 7.5, Phaser.Math.DegToRad(-50), Phaser.Math.DegToRad(50));
      g.strokePath();
    } else {
      // 斜線（靜音）
      g.lineStyle(2.2, 0xffffff, 1);
      g.lineBetween(15, 6, 22, 18);
    }
```

（原 `} else {`（chart）改為 `} else if (kind === 'chart') {`，尾端不需 else——或維持 chart 為最後 else 亦可，擇一使 TypeScript 窮舉正確即可。）

- [ ] **Step 2: MuteButton 整檔改寫**

```ts
import Phaser from 'phaser';
import { Sfx } from '../audio/Sfx';
import { ensureIconTexture } from './icons';

/** 右上角靜音切換（程式向量喇叭 icon；44×44 觸控區；點擊切換並記住）。 */
export class MuteButton {
  private readonly img: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.img = scene.add
      .image(x, y, ensureIconTexture(scene, this.kind()))
      .setDisplaySize(22, 22)
      .setTint(0xaab0cc)
      .setScrollFactor(0)
      .setDepth(50);
    const zone = scene.add
      .zone(x, y, 44, 44)
      .setScrollFactor(0)
      .setDepth(51)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      Sfx.toggleMute();
      this.img.setTexture(ensureIconTexture(scene, this.kind()));
      this.img.setDisplaySize(22, 22);
    });
  }

  private kind(): 'sound-on' | 'sound-off' {
    return Sfx.isMuted() ? 'sound-off' : 'sound-on';
  }
}
```

- [ ] **Step 3: 型檢＋全套測試**

Run: `npx tsc --noEmit && npm test`
Expected: 全 PASS

- [ ] **Step 4: Commit**

```bash
git add src/ui/icons.ts src/ui/MuteButton.ts
git commit -m "feat: vector speaker mute button with 44pt hit area (last emoji icon removed)"
```

---

### Task 5: 語言 chips 觸控 ＋ 海鷗 ＋ letterbox CSS

**Files:**
- Modify: `src/scenes/StartScene.ts`（chips padding）
- Modify: `src/gfx/Background.ts`（bird texture）
- Modify: `index.html`（style 區塊）

**Interfaces:**
- Consumes: 無
- Produces: 三個獨立小視覺改動

- [ ] **Step 1: chips padding**

StartScene 語言 chip 的 `padding: { x: 6, y: 12 },` → `padding: { x: 10, y: 14 },`

- [ ] **Step 2: 海鷗 texture**

`src/gfx/Background.ts` 的 bird 段：

```ts
  // 海鷗：對稱雙弧剪影（⌢⌢），無方向性
  make(TEX.bird, 22, 10, (g) => {
    g.lineStyle(1.8, 0x9aa0c0, 0.9);
    g.beginPath();
    g.arc(7, 7, 5, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340));
    g.strokePath();
    g.beginPath();
    g.arc(15, 7, 5, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340));
    g.strokePath();
  });
```

換成：

```ts
  // 海鷗：雙弧在中點相接的「M」形剪影，加大加粗更易辨識
  make(TEX.bird, 30, 14, (g) => {
    g.lineStyle(2.2, 0x9aa0c0, 0.9);
    g.beginPath();
    g.arc(8, 9, 7, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340));
    g.strokePath();
    g.beginPath();
    g.arc(22, 9, 7, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340));
    g.strokePath();
  });
```

- [ ] **Step 3: letterbox CSS**

`index.html` 的 `<style>` 內：

```css
      html, body { margin: 0; height: 100%; background: #1a1c2c; overflow: hidden; }
```

換成：

```css
      html, body {
        margin: 0;
        height: 100%;
        background: radial-gradient(circle at 50% 38%, #232640 0%, #14162a 55%, #0d0e1c 100%);
        overflow: hidden;
      }
```

並在 `canvas { display: block; }` 之後加：

```css
      @media (min-width: 500px) {
        #app canvas {
          border-radius: 18px;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.55);
        }
      }
```

- [ ] **Step 4: 型檢＋全套測試＋build**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: 全 PASS、build 成功

- [ ] **Step 5: Commit**

```bash
git add src/scenes/StartScene.ts src/gfx/Background.ts index.html
git commit -m "feat: 44pt language chips, bigger M-shaped seagull, desktop letterbox dressing"
```

---

### Task 6: 整體驗證 ＋ 截圖 ＋ 部署（controller 執行）

**Files:**
- Modify: `docs/TODO.md`（完成註記）

- [ ] **Step 1: 全套檢查**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: 全綠

- [ ] **Step 2: 截圖驗收（對照 spec 驗收標準 1–4）**

dev server：遊戲得分條（答一題後左右純色）、結果頁維度條（dev hook 比照前例、驗完還原）、寬視窗（>500px 桌面尺寸）letterbox、開始頁右上靜音 icon；OG 抽查已在 Task 3。

- [ ] **Step 3: 截圖給使用者確認 → merge → `npx wrangler deploy` → 線上抽查**

- [ ] **Step 4: `docs/TODO.md` P3 打勾＋完成註記，commit**

```bash
git add docs/TODO.md
git commit -m "docs: mark P3 polish shipped"
```
