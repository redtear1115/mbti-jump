# MBTI Jump — 美術 & 音效（Tier 2）設計文件

- 日期：2026-07-01
- 狀態：已通過 brainstorm，待寫實作計畫
- 關聯：延續核心遊戲（i18n、無縫爬塔、T0/T1 完成）。素材來源見 [`docs/assets-resources.md`](../../assets-resources.md)、授權見 [`CREDITS.md`](../../../CREDITS.md)。

## 一句話描述

以「漸進增強」把遊戲從程式美術升級：導入 **16Personalities 四族群色（黃/綠/紫/藍）為基底色票**、族群色結算、Fredoka/Nunito 字體、視差多層背景、SFX 音效與資源載入管線（BootScene）。所有程式先寫好並保持 build 綠、隨時可玩；Kenney 精靈與音效檔放進 `public/assets/` 即自動生效，缺檔則優雅降級。

## 目標與範圍

### 要做
- **色票系統**：四族群色為基底，套用到關卡背景、按鈕、HUD、結算。
- **族群色邏輯**（純函式，可單測）：4 碼人格 → 族群 → 顏色；結算頁以玩家族群色上色。
- **字體**：Fredoka（標題）+ Nunito（內文），網頁字體、無需二進位素材。
- **視差背景**：多層 `tileSprite` 隨相機上升飄移；缺圖 fallback 到族群色純色底。
- **音效**：跳躍/選答/過關/結算/掉落 SFX + 靜音鈕（localStorage 記住）。
- **資源管線**：`BootScene` preload + `config/assets.ts` 資源清單；缺檔 loaderror 跳過。
- **精靈整合**：`Player`/`Platform` 有真 texture 就用，否則沿用程式美術。

### 明確不做（YAGNI）
- **BGM 背景音樂**（本輪只做 SFX，之後再議）。
- 動畫精靈逐格動畫（先用靜態貼圖）。
- 音量細調 UI（只有靜音開關）。
- 自行下載/內建 Kenney 二進位素材（見「素材採購」——由使用者放檔）。

### 核心原則：漸進增強 + 優雅降級
每一項真素材（精靈、音效、字體）都有 fallback：
- 精靈缺 → 現有 `ensureTexture` 程式美術。
- 音效缺（或靜音）→ `Sfx.play` no-op。
- 字體未載入 → 系統字體（`fontFamily` 帶 fallback 串）。
- 視差圖缺 → 族群色純色背景。

結果：**任何時刻 `npm run build` 綠、遊戲可玩**；素材放進去就自動變好。

## 四族群色（基底）

16Personalities 慣例：

| 族群 | 中文 | 條件（4 碼） | 顏色 |
|---|---|---|---|
| Explorers | 探險家 | S 且 P | 黃 `#E4AE3A` |
| Diplomats | 外交官 | N 且 F | 綠 `#33A474` |
| Analysts | 分析師 | N 且 T | 紫 `#88619A` |
| Sentinels | 守護者 | S 且 J | 藍 `#4298B4` |

分組規則：先看 N/S；N→(F→外交官綠 / T→分析師紫)，S→(J→守護者藍 / P→探險家黃)。

## 模組切分

```
src/
  theme/
    palette.ts        # 語意色票（四族群色 + surface/text/yes/no…），數字色值集中
  core/
    temperament.ts    # groupOf(type)→Group、colorOf(group)→number（純函式，可單測）
    temperament.test.ts
  config/
    assets.ts         # ASSET_KEYS + 載入清單（key→路徑）+ SFX key
  gfx/
    Background.ts      # 視差多層背景（tileSprite/程式圖形），scrollFactor<1；缺圖降級純色
  audio/
    Sfx.ts             # play(key)/mute 切換/localStorage；未載入或靜音時 no-op
    Sfx.test.ts        # mute 狀態切換（可 mock）
  scenes/
    BootScene.ts       # preload 圖/音 + 等字體 → scene.start('Start')
  ui/
    MuteButton.ts      # 右上角小靜音鈕（各場景可放）
  # 改動：Player/Platform（真 texture 優先）、各 Scene（色票/字體/SFX/背景）、main.ts（加 BootScene）
index.html            # 引入 Fredoka + Nunito 網頁字體
public/assets/        # 使用者放素材處（sprites/ audio/ 由 assets.ts 對應）
```

### 解耦不變量
- `temperament.ts` 純邏輯、不 import Phaser、完整單測（延續 ScoreTracker 風格）。
- `palette.ts` 純常數。
- 色票/字體/音效為呈現層，換素材不動遊戲邏輯（計分、爬塔、i18n 不受影響）。

## 型別與介面

```ts
// core/temperament.ts
export type Group = 'explorer' | 'diplomat' | 'analyst' | 'sentinel';
export function groupOf(type: string): Group;      // 4 碼 → 族群；格式錯誤丟錯
export function colorOf(group: Group): number;      // → 色票色值
export function groupColorOf(type: string): number; // 便捷：groupOf → colorOf
export const GROUP_COLORS: Record<Group, number>;
```

```ts
// theme/palette.ts
export const PALETTE = {
  explorer: 0xe4ae3a, diplomat: 0x33a474, analyst: 0x88619a, sentinel: 0x4298b4,
  surface: 0x1a1c2c, surfaceAlt: 0x2a2d42,
  textOn: '#0f1220', textLight: '#ffffff', textMuted: '#ffffffaa',
  yes: 0x38b764, no: 0xb13e53, accent: 0xffcc00,
} as const;
/** 四個維度背景（族群色的深化版，僅美術用途、非語意對應維度） */
export const LEVEL_BG: readonly [number, number, number, number];
```

```ts
// config/assets.ts
export const ASSET_KEYS = {
  player: 'player', platformNormal: 'platform-normal',
  platformYes: 'platform-yes', platformNo: 'platform-no',
  bgSky: 'bg-sky', bgClouds: 'bg-clouds', bgHills: 'bg-hills',
} as const;
export const SFX_KEYS = {
  bounce: 'sfx-bounce', select: 'sfx-select',
  advance: 'sfx-advance', result: 'sfx-result', gameover: 'sfx-gameover',
} as const;
/** BootScene 依此載入；檔案缺失時 loaderror 略過，改用 fallback */
export const IMAGE_MANIFEST: { key: string; path: string }[];
export const AUDIO_MANIFEST: { key: string; path: string }[];
```

```ts
// audio/Sfx.ts
export const Sfx = {
  init(scene: Phaser.Scene): void;   // 綁定 scene.sound
  play(key: keyof typeof SFX_KEYS): void; // 未載入或靜音 → no-op
  isMuted(): boolean;
  toggleMute(): boolean;             // 回傳新狀態，寫入 localStorage('mbti-jump.muted')
};
```

## 各項設計細節

### BootScene（key `'Boot'`，main 場景陣列第一個）
- `preload()`：依 `IMAGE_MANIFEST`/`AUDIO_MANIFEST` 載入；註冊 `this.load.on('loaderror', …)` 記錄缺檔（不致命）。
- 等網頁字體：`await document.fonts.ready`（在 `create()` 以 async 包裝，或用 `WebFont`/`document.fonts.load`）。就緒後 `this.scene.start('Start')`。
- 不在此請求 iOS 體感權限（需使用者手勢，維持在 Start 按鈕內）。

### 字體
- `index.html` 加 `<link>` 載 Fredoka + Nunito（`display=swap`）。
- 場景文字 `fontFamily: "Fredoka, system-ui, sans-serif"`（標題）／`"Nunito, system-ui, sans-serif"`（內文）。未載入時 fallback 系統字體，不破版。

### 視差背景（`gfx/Background.ts`）
- 2–3 層 `tileSprite`（天空/雲/丘陵），`setScrollFactor(<1)` 使其隨相機上升緩慢飄移；`create` 時建立，`update` 時依 `cameras.main.scrollY` 調整 `tilePositionY`。
- 缺圖：不建立 tileSprite，改用目前 `LEVEL_BG` 純色（現行行為）。
- GameScene 呼叫；Start/Result 可選用簡化背景或純色。

### 音效（`audio/Sfx.ts`）觸發點
- `bounce`：玩家彈跳（`Player.bounce()` 之後；輕音、避免吵）。
- `select`：`GameScene.onLand` 記錄一題答案時。
- `advance`：`completeCurrentDimension` 鎖定並換維度時。
- `result`：進入 ResultScene。
- `gameover`：掉落進 GameOverScene。
- 靜音鈕（`ui/MuteButton`）：Start 與遊玩畫面右上角；`toggleMute` 寫入 localStorage，跨場景記住。

### 結算頁族群色
- `ResultScene`：`const color = groupColorOf(type)`；背景與大字用族群色調（例如 4 碼字色/底色帶族群色），呼應「你屬於哪一族」。
- 可加一行族群名稱（i18n key `group.explorer/diplomat/analyst/sentinel`，五語）。

### 精靈整合（Player/Platform）
- 建構時：`const key = scene.textures.exists(REAL_KEY) ? REAL_KEY : PROC_KEY`；程式美術 `ensureTexture` 只在真 texture 不存在時產生。
- 換素材＝把檔案放進 `public/assets/` 並在 `IMAGE_MANIFEST` 對應；不動實體邏輯。

## 素材採購（由使用者提供二進位檔）

程式全包；**素材檔需放入 `public/assets/`**。實作計畫會附精確清單，包含：
- 圖：Kenney（Jumper Pack / Platformer Pack / Background Elements，CC0）→ `public/assets/sprites/*.png`，檔名對應 `IMAGE_MANIFEST`。
- 音：Kenney Interface/Digital/Impact Sounds（CC0）或 Freesound（過濾 CC0）→ `public/assets/audio/*.ogg|wav`，對應 `AUDIO_MANIFEST`。
- 取用 CC-BY 素材時更新 `CREDITS.md`。

> 未放檔前遊戲以程式美術 + 靜音運作；放檔後自動升級。交付順序：先合併純程式部分（色票/族群色/字體/視差程式圖/管線），素材之後 drop-in。

## 測試策略
- **`temperament.groupOf/colorOf/groupColorOf`**：16 型全覆蓋分組、colorOf 對應、格式錯誤丟錯（純函式）。
- **`Sfx`**：mute 預設、toggle 切換、持久化（mock localStorage）；未 init 時 play 不丟錯。
- **`assets.ts`**：`ASSET_KEYS`/`SFX_KEYS` 值唯一。
- 其餘（BootScene、視差、字體、精靈替換）以手動/截圖驗證。

## 對既有程式的影響
- `main.ts`：場景陣列最前面加 `BootScene`。
- `Player`/`Platform`：真 texture 優先的小改。
- 各 Scene：色值改由 `palette`、字體帶 `fontFamily`、加 SFX 呼叫；ResultScene 加族群色。
- `gameConfig.levelColors` 移到 `theme/palette.ts` 的 `LEVEL_BG`（或由其匯出），維持單一來源。
- 遊戲邏輯（ScoreTracker、questions、i18n、progression、爬塔流程）不變。

## 待後續（非本輪）
- BGM 背景音樂。
- 正式逐格動畫精靈、粒子特效。
- 部署與分享 OG image（Tier 3）。
