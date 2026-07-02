# MBTI Jump — P1 記憶點包（hero 果凍怪＋結果舞台＋隨維度混色）設計文件

- 日期：2026-07-02
- 狀態：已通過 brainstorm（推薦值定案），待寫實作計畫
- 背景：UI/UX 審查 P1 項。果凍怪是全遊戲最有記憶點的資產但開始頁沒有牠；結果頁是分享轉換的舞台但目前純文字；測驗進度沒有可見的情感回饋。三項共用「果凍怪 texture 帶色重生成」機制，做成一包。

## 一句話描述

果凍怪隨鎖定維度逐步「變成你的顏色」（純函式混色＋texture 重生成）、開始頁標題上方加 idle 呼吸的 hero 果凍怪、結果頁升級為族群色 glow ＋最終色果凍怪＋四維度傾向條的「分享舞台」。

## 設計決策

### 1. 變色機制（`src/entities/Player.ts`）
- `ensureTexture(scene, bodyColor)`：現有 Ditto 繪製函式加 body 色參數，texture key 改為 `player-proc-<hex>`（六位小寫 hex）；眼/嘴深色 `0x2a2340` 與白色高光不變。
- **不用 `setTint`**：乘法混色會弄髒淡紫，重生成才是真變色。
- `Player` constructor 加可選 `color`（預設基底紫）；新增 `recolor(color: number): void`——確保 texture 存在後 `setTexture`，非 reduced-motion 時配 300ms scale pop（1.18 → 1，`Back.easeOut`）。
- 點陣資產（`ASSET_KEYS.player`）存在時維持原行為（不變色、不重生成）——與現有 fallback 慣例一致。

### 2. 混色模型（新 `src/core/playerColor.ts`，純函式）
- `PLAYER_BASE_COLOR = 0xc0aee2`。
- `lerpColor(a: number, b: number, t: number): number`——RGB 各通道線性插值、四捨五入。
- `playerColorFor(letters: Letter[]): number`——`letters` 為已鎖定字母（0..4 個）：
  - 0 個 → 基底色。
  - k 個 → `lerpColor(base, avg, 0.75 * k / 4)`，`avg` = 各字母 `LETTER_COLORS` 的 RGB 平均（四捨五入）。
  - 四關鎖完 = 75% 字母平均色＋25% 基底紫（保留角色識別）。

### 3. 鎖定字母 accessor（`src/core/ScoreTracker.ts`）
- 新增 `lockedLetters(): Letter[]`——依 `DIMENSIONS` 順序回傳已鎖定維度的字母（未鎖定的略過）。
- GameScene：
  - `completeCurrentDimension()` 鎖定後 `player.recolor(playerColorFor(score.lockedLetters()))`。
  - `create()` 建 Player 時以 `playerColorFor(score.lockedLetters())` 為初始色（重玩接續時開場即正確顏色）。

### 4. 開始頁 hero（`src/scenes/StartScene.ts`）
- 基底紫果凍怪靜態影像（同 proc texture）置於標題上方：cx, y=92，scale 1.8。
- idle 呼吸：`scaleY` 0.94↔1.03、yoyo、1200ms、Sine.easeInOut，同時 y ±4 浮動（同一 tween 或兩個並行皆可）；`prefersReducedMotion()` 時完全靜態。
- 其他元素（標題 170、tagline 250、邀請 302、語言 356/392、按鈕）全部不動。

### 5. 結果頁分享舞台（`src/scenes/ResultScene.ts`）
- **glow 抽共用**：`AuroraBackground` 的 `ensureGlowTexture` 抽到新 `src/gfx/glowTexture.ts`（`export function ensureGlowTexture(scene): string` 回傳 key），AuroraBackground 改 import；ResultScene 用同 texture 做族群色 radial glow：置中 (cx, 300)、displaySize 900、SCREEN blend、tint 族群色。
- **最終色果凍怪**：`playerColorFor(４字母)` 色，靜態影像 scale 2.0 於 (cx, 120)；入場 elastic pop（scale 0 → 2.0，500ms `Back.easeOut`）；reduced-motion 直接顯示。
- **四維度傾向條**（Phaser Graphics）：資料用既有 `buildShareCardModel(type, tallies, locale)` 的 `dims`（含 leftLetter/rightLetter/兩側色/dividerFrac）。每條 260×16、圓角 8、左右字母 13px 小字（`letterHex` 色）、白色分隔線 4px；四條由 y=310 起、間距 30（含條高）。入場：divider 位置從 0.5 tween 至 `dividerFrac` 400ms `Cubic.easeOut`（用 tween 一個 0..1 值每幀重繪 Graphics）；reduced-motion 直接畫在最終位置。
- **版面**（450×800，全部 setOrigin 0.5 置中）：heading y=48（fontSize 16）→ 果凍怪 120 → 型別 210（72px 不變）→ 族群標籤 268 → 維度條 310–425 → 描述 470（wordWrap 不變）→ 好友對比 535 → 按鈕 585 / 650 / 712（尺寸樣式不變）。成就 toast、MuteButton 不動。
- 分享卡 PNG（canvas 版）不動。

## 明確不做（YAGNI）

- 16 型專屬文案（內容包另做）。
- 新 SFX、GameOver 頁、開始頁其他改動。
- OG 圖重生成（分享卡視覺未變）。

## 測試與驗證

- `playerColor.test.ts`：`lerpColor` 端點與中點；`playerColorFor([])` = 基底；單字母 k=1 的期望值（手算）；四字母全鎖的期望值；k 遞增時與 avg 的距離單調遞減。
- `ScoreTracker.lockedLetters()`：空、部分鎖定（順序正確）、全鎖定。
- 場景繪製以截圖驗收：開始頁 hero、遊戲中鎖定第一維度後的變色、結果頁舞台（族群 glow＋果凍怪＋維度條）各一張。
- 既有 119 測試全綠、`tsc --noEmit` 乾淨。

## 驗收標準

1. 開始頁第一眼看到呼吸中的果凍怪 hero。
2. 每鎖定一個維度，果凍怪顏色明顯往該字母色靠近（有 pop 回饋）；重玩接續時顏色正確。
3. 結果頁：族群色 glow、你的顏色的果凍怪、四條會動的維度傾向條——與分享卡同一視覺語言。
4. reduced-motion 下所有新動畫皆靜態呈現，功能不缺。
