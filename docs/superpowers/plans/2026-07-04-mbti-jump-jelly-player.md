# MBTI Jump 主角果凍水滴＋速度驅動動感 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 主角材質重繪為晶亮果凍水滴（高光＋邊光＋底陰影＋暗邊，白色與染色皆成立）、跳躍改每幀速度驅動拉伸/壓扁＋落地阻尼晃動、開始頁與結果頁加落地投影。

**Architecture:** 材質與動畫都在 `Player.ts`（程式繪製 texture＋sprite scale/rotation 變形）；速度→scale 映射抽成純函式 `jellyStretch` 可單測；GameScene 每幀呼叫 `tickJelly`；投影是兩場景各一顆柔和橢圓。玩法、碰撞體 36×36、混色機制不動。

**Tech Stack:** TypeScript strict、Phaser 3、vitest。

**Spec:** `docs/superpowers/specs/2026-07-04-mbti-jump-jelly-player-design.md`

## Global Constraints

- TypeScript strict、`noUnusedLocals`、`noUnusedParameters`；指令在 repo root。
- 明暗相對身體色：高光白 alpha、陰影/暗邊黑 alpha、眼嘴固定 `0x2a2340`。同繪製函式對白基底與任一染色都成立。
- 碰撞體 `body.setSize(36,36)`、`PLAYER_BASE_COLOR = 0xf0f0f4`、`playerColorFor`、玩法參數不動。sprite setScale 只改視覺、不改 Arcade body。
- texture 尺寸 54×50；key 仍 `player-proc-<六位小寫hex>` 依色快取。
- reduced-motion（`prefersReducedMotion()`）：所有變形/晃動/投影淡入略過，靜態呈現。
- 既有 136 測試每 task 結束全綠；commit conventional prefix，結尾加：
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: 果凍水滴材質（`ensurePlayerTexture` 重寫）

**Files:**
- Modify: `src/entities/Player.ts`（`ensurePlayerTexture` 函式＋ `TEX_W`/`TEX_H` 常數）

**Interfaces:**
- Consumes: 無
- Produces: `ensurePlayerTexture(scene, bodyColor): string` 簽名不變；輸出改為果凍水滴（開始頁 hero、結果頁、遊戲中皆自動跟隨）

- [ ] **Step 1: 改常數與繪製函式**

`src/entities/Player.ts` 檔頂常數：

```ts
const TEX_W = 54;
const TEX_H = 50;
```

`ensurePlayerTexture` 整個函式換成：

```ts
/**
 * 程式美術：晶亮果凍水滴（帶 body 色參數）。
 * 明暗相對身體色：高光/邊光白 alpha、底陰影/暗邊黑 alpha、眼嘴固定深墨色。
 * → 同函式對白基底與任一染色都成立。texture key 依色值快取。
 */
export function ensurePlayerTexture(scene: Phaser.Scene, bodyColor: number): string {
  const key = PROC_KEY_PREFIX + bodyColor.toString(16).padStart(6, '0');
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const cx = 27;
  const cy = 26;
  const rx = 22; // 身體水平半徑
  const ry = 20; // 身體垂直半徑

  // 1. 身體（圓潤水滴橢圓）
  g.fillStyle(bodyColor, 1);
  g.fillEllipse(cx, cy, rx * 2, ry * 2);

  // 2. 底部半月陰影（體積）
  g.fillStyle(0x000000, 0.1);
  g.fillEllipse(cx, cy + ry * 0.32, rx * 1.6, ry * 1.2);

  // 3. 柔和暗邊（亮背景上仍分得出輪廓）
  g.lineStyle(1.2, 0x000000, 0.16);
  g.strokeEllipse(cx, cy, rx * 2, ry * 2);

  // 4. 主高光（左上大片）＋右上小閃點
  g.fillStyle(0xffffff, 0.85);
  g.fillEllipse(cx - rx * 0.34, cy - ry * 0.42, rx * 0.6, ry * 0.34);
  g.fillStyle(0xffffff, 0.9);
  g.fillEllipse(cx + rx * 0.32, cy - ry * 0.44, rx * 0.2, ry * 0.14);

  // 5. 上緣邊光（透亮玻璃/水珠光澤）
  g.lineStyle(rx * 0.12, 0xffffff, 0.22);
  g.beginPath();
  g.arc(cx, cy - ry * 0.06, rx * 0.86, Phaser.Math.DegToRad(208), Phaser.Math.DegToRad(332));
  g.strokePath();

  // 6. 臉：兩點深墨色眼＋寬淺微笑
  g.fillStyle(0x2a2340, 1);
  g.fillCircle(cx - rx * 0.26, cy - ry * 0.02, 2.4);
  g.fillCircle(cx + rx * 0.26, cy - ry * 0.02, 2.4);
  g.lineStyle(2, 0x2a2340, 1);
  g.beginPath();
  g.arc(cx, cy + ry * 0.12, rx * 0.5, Phaser.Math.DegToRad(35), Phaser.Math.DegToRad(145));
  g.strokePath();

  g.generateTexture(key, TEX_W, TEX_H);
  g.destroy();
  return key;
}
```

- [ ] **Step 2: 型檢＋全套測試**

Run: `npx tsc --noEmit && npm test`
Expected: 全 PASS（136；無 Player 單元測試，行為由後續截圖驗收）

- [ ] **Step 3: Commit**

```bash
git add src/entities/Player.ts
git commit -m "feat: redraw player as glossy jelly droplet (highlight + rim-light + shadow)"
```

---

### Task 2: 速度→scale 純函式 `jellyStretch`

**Files:**
- Modify: `src/entities/Player.ts`（新增 exported 純函式與常數）
- Test: `src/entities/Player.test.ts`（新建）

**Interfaces:**
- Consumes: 無
- Produces: `JELLY_MAX_STRETCH = 0.28`、`jellyStretch(vy: number): { scaleX: number; scaleY: number }`（Task 3 使用；保體積 scaleX = 1/scaleY，|vy| 越大越縱長，封頂）

- [ ] **Step 1: 寫失敗測試**

```ts
// src/entities/Player.test.ts
import { describe, it, expect } from 'vitest';
import { jellyStretch, JELLY_MAX_STRETCH } from './Player';

describe('jellyStretch', () => {
  it('is round (1,1) at zero velocity', () => {
    expect(jellyStretch(0)).toEqual({ scaleX: 1, scaleY: 1 });
  });

  it('stretches taller and narrower as |vy| grows, preserving volume', () => {
    const s = jellyStretch(400);
    expect(s.scaleY).toBeGreaterThan(1);
    expect(s.scaleX).toBeLessThan(1);
    expect(s.scaleX * s.scaleY).toBeCloseTo(1, 5); // 保體積
  });

  it('is symmetric in sign (rising vs falling)', () => {
    expect(jellyStretch(300)).toEqual(jellyStretch(-300));
  });

  it('caps at JELLY_MAX_STRETCH for large |vy|', () => {
    const s = jellyStretch(100000);
    expect(s.scaleY).toBeCloseTo(1 + JELLY_MAX_STRETCH, 5);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/entities/Player.test.ts`
Expected: FAIL（`jellyStretch` 未匯出）

- [ ] **Step 3: 實作（加在 `Player.ts`，class 之外、檔案上方 import 之後）**

```ts
/** 果凍縱向拉伸上限（0.28 → 最多拉長 28%）。 */
export const JELLY_MAX_STRETCH = 0.28;

/** 依垂直速度算果凍變形：|vy| 越大越縱長，橫向收窄保體積，封頂。 */
export function jellyStretch(vy: number): { scaleX: number; scaleY: number } {
  const s = Math.min(JELLY_MAX_STRETCH, Math.abs(vy) * 0.00055);
  const scaleY = 1 + s;
  return { scaleX: 1 / scaleY, scaleY };
}
```

- [ ] **Step 4: 跑測試確認通過＋全套**

Run: `npx vitest run src/entities/Player.test.ts && npm test`
Expected: PASS（140）

- [ ] **Step 5: Commit**

```bash
git add src/entities/Player.ts src/entities/Player.test.ts
git commit -m "feat: add jellyStretch pure velocity-to-scale helper"
```

---

### Task 3: 速度驅動果凍動畫（`Player.tickJelly`／`bounce`／`recolor` ＋ GameScene 接線）

**Files:**
- Modify: `src/entities/Player.ts`（欄位、`bounce`、`recolor`、新增 `tickJelly`）
- Modify: `src/scenes/GameScene.ts`（`update` 簽名 + 呼叫 `tickJelly`）

**Interfaces:**
- Consumes: `jellyStretch`（Task 2）
- Produces: `Player.tickJelly(dt: number): void`（GameScene 每幀呼叫）；`bounce()` 觸發落地晃動；`recolor()` 換膚＋軟晃動

- [ ] **Step 1: Player 欄位與方法改寫**

`src/entities/Player.ts` 的 class 內：把 `private wobble?: Phaser.Tweens.Tween;` 換成晃動狀態欄位：

```ts
  private jiggling = false;
  private jiggleT = 0; // 已經過秒數
  private static readonly JIGGLE_DUR = 0.42;
  private static readonly LEAN_MAX = 0.12; // rad
```

`bounce()` 整個換成：

```ts
  bounce(): void {
    this.setVelocityY(GAME.jumpVelocity);
    if (this.reduced) return;
    // 落地衝擊：開啟阻尼晃動（由 tickJelly 每幀渲染，從壓扁彈回）
    this.jiggling = true;
    this.jiggleT = 0;
  }
```

`recolor()` 整個換成：

```ts
  /** 依混色結果換膚（texture 帶色重生成）＋軟晃動；點陣資產模式 no-op。 */
  recolor(color: number): void {
    if (this.scene.textures.exists(ASSET_KEYS.player)) return;
    this.setTexture(ensurePlayerTexture(this.scene, color));
    if (this.reduced) return;
    this.jiggling = true;
    this.jiggleT = 0;
  }
```

新增 `tickJelly`（放在 `wrapHorizontally` 之前）：

```ts
  /** 每幀更新果凍變形：晃動期用阻尼餘弦，否則依垂直速度拉伸；水平速度給微傾。 */
  tickJelly(dt: number): void {
    if (this.reduced) return;
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (this.jiggling) {
      this.jiggleT += dt;
      const p = this.jiggleT / Player.JIGGLE_DUR;
      if (p >= 1) {
        this.jiggling = false;
      } else {
        const damp = Math.cos(p * Math.PI * 3) * Math.exp(-p * 4);
        this.setScale(1 + 0.35 * damp, 1 - 0.32 * damp);
        this.applyLean(body.velocity.x, dt);
        return;
      }
    }

    // 速度驅動：目標 scale 以指數平滑趨近（避免抖動）
    const target = jellyStretch(body.velocity.y);
    const a = 1 - Math.exp(-dt * 20);
    this.setScale(
      this.scaleX + (target.scaleX - this.scaleX) * a,
      this.scaleY + (target.scaleY - this.scaleY) * a,
    );
    this.applyLean(body.velocity.x, dt);
  }

  private applyLean(vx: number, dt: number): void {
    const target = Phaser.Math.Clamp(vx * 0.00032, -Player.LEAN_MAX, Player.LEAN_MAX);
    const a = 1 - Math.exp(-dt * 12);
    this.rotation += (target - this.rotation) * a;
  }
```

（`prefersReducedMotion` import 保留；`Phaser.Tweens.Tween` 型別若不再被引用不影響——import 的是 `Phaser` 命名空間，無需改。）

- [ ] **Step 2: GameScene 每幀呼叫**

`src/scenes/GameScene.ts` 的 `update()` 改簽名並在開頭呼叫（`delta` 為毫秒）：

```ts
  update(_time: number, delta: number) {
    this.player.tickJelly(delta / 1000);
    this.player.setAxis(this.controls.axis);
    this.player.wrapHorizontally();
```

（其餘 update 內容不動。）

- [ ] **Step 3: 型檢＋全套測試**

Run: `npx tsc --noEmit && npm test`
Expected: 全 PASS（140）

- [ ] **Step 4: Commit**

```bash
git add src/entities/Player.ts src/scenes/GameScene.ts
git commit -m "feat: velocity-driven jelly squash-stretch + landing jiggle + lean"
```

---

### Task 4: 落地投影（開始頁 hero ＋ 結果頁）

**Files:**
- Modify: `src/scenes/StartScene.ts`
- Modify: `src/scenes/ResultScene.ts`

**Interfaces:**
- Consumes: 無
- Produces: hero 與結果頁果凍下方各一顆柔和橢圓投影

- [ ] **Step 1: StartScene hero 投影**

`src/scenes/StartScene.ts`，在 `const hero = this.add.image(...)`（y=92）**之前**插入（先畫陰影 → 在 hero 之下）：

```ts
    // Hero 落地投影（白角色不浮在深底上）
    const heroShadow = this.add.graphics();
    heroShadow.fillStyle(0x000000, 0.28);
    heroShadow.fillEllipse(cx, 138, 80, 16);
```

（`cx` 已在 create 內定義。reduced-motion 不影響投影本身；投影靜態。）

- [ ] **Step 2: ResultScene 果凍投影**

`src/scenes/ResultScene.ts`，在 `const jelly = this.add.image(cx, 120, ...)` **之前**插入：

```ts
    // 果凍落地投影
    const jellyShadow = this.add.graphics();
    jellyShadow.fillStyle(0x000000, 0.28);
    jellyShadow.fillEllipse(cx, 172, 92, 18);
    if (!reduce) {
      jellyShadow.setAlpha(0);
      this.tweens.add({ targets: jellyShadow, alpha: 1, duration: 500 });
    }
```

（`reduce` 為既有 `const reduce = prefersReducedMotion();`；`cx` 既有。投影 depth 預設在 jelly image 之前建立即在其下。）

- [ ] **Step 3: 型檢＋全套測試**

Run: `npx tsc --noEmit && npm test`
Expected: 全 PASS

- [ ] **Step 4: Commit**

```bash
git add src/scenes/StartScene.ts src/scenes/ResultScene.ts
git commit -m "feat: soft contact shadow under hero + result jelly"
```

---

### Task 5: 整體驗證 ＋ 截圖 ＋ 部署（controller 執行）

**Files:**
- Modify: `docs/TODO.md`（完成註記）

- [ ] **Step 1:** `npm test && npx tsc --noEmit && npm run build` 全綠。
- [ ] **Step 2:** 截圖驗收：開始頁 hero（白果凍水滴＋高光/邊光＋投影）；遊戲中跳躍（連續兩三張看拉伸/壓扁；`?dev` 不需要，直接玩到跳躍中截）；結果頁最終色果凍＋投影；抽查染色態（`?dev=result` 比照前例，驗完還原 `src/main.ts`）確認高光/邊光在染色上讀得出。對照 spec 驗收標準 1–5。
- [ ] **Step 3:** 截圖給使用者確認 → merge → push（CI 自動部署；等 Actions run 綠）→ 線上抽查。
- [ ] **Step 4:** `docs/TODO.md` 加一行主角改版完成註記，commit（push 觸發部署）。
