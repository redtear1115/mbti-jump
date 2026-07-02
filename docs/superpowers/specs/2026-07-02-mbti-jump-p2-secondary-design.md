# MBTI Jump — P2 次級畫面＋HUD 下移＋白色基底 設計文件

- 日期：2026-07-02
- 狀態：已通過 brainstorm（含使用者兩項追加：HUD 下移、主角基底改白），待寫實作計畫
- 背景：UI/UX 審查 P2 項（成就徽章化、趨勢空狀態、按鈕一致性、emoji→向量）；使用者追加遊戲體驗回饋：往上跳需要上方視野 → HUD 移到下方；主角改「從白紙開始染色」。

## 一句話描述

成就頁改兩欄徽章卡＋進度、趨勢空狀態給果凍怪＋直接開局 CTA、次級按鈕統一 Button 元件、三個程式繪製向量 icon 取代 emoji；GameScene HUD 整卡下移至畫面底部；`PLAYER_BASE_COLOR` 改微暖白。

## 設計決策

### 1. 成就頁徽章化（`src/scenes/AchievementScene.ts`＋`src/core/achievements.ts`）
- **兩欄徽章卡**：8 張卡、卡寬 198 高 126、圓角 12、水平 margin 20、間距 12；網格自 y=120 起（列高 138）。
- 卡底 `PALETTE.surfaceAlt`；**已解鎖**：`PALETTE.accent` 描邊 2px、彩色獎盃徽章（28px 圓底 accent＋trophy icon）、名稱 `#ffe066`；**未解鎖**：無描邊、灰鎖徽章（圓底 `#ffffff22`＋lock icon）、名稱 `#ffffff66`、描述 `#ffffff44`。
- 卡內版式：徽章圓心 (28, 30)；名稱 15px 起點 x=52 y=22；描述 11px x=14 y=56 起（wordWrap 寬 卡寬-28、useAdvancedWrap）。
- **進度**：`Achievement` 介面加 `progress?: (plays: readonly PlayRecord[]) => { current: number; target: number }`。六個可計數成就實作：`first_play`（場次/1）、`persistent`（場次/10）、`dedicated`（場次/25）、`collector`（不同型數/16）、`four_realms`（族群數/4）、`creature_of_habit`（同型最大次數/3）；`decisive`/`torn` 不加（事件型）。current 以 target 封頂。
- 有 progress 的卡：卡底內緣 4px 進度條（底 `#ffffff22`、fill accent、寬 卡寬-28、y=卡高-16）＋右下 `current/target` 10px 小字。
- **總進度**：標題下 y=84「已解鎖 {0}/{1}」（新 i18n key `ach.progress`×5 語）＋其下 y=100 一條 200×10 總進度條（同色系）。
- 返回鈕改 `Button`（次級樣式，見 §3），y=758。

### 2. 趨勢頁空狀態＋按鈕（`src/scenes/TrendScene.ts`）
- `totalPlays === 0` 時：基底色果凍怪（`ensurePlayerTexture(this, PLAYER_BASE_COLOR)`、scale 1.6、(cx, 300)）＋既有 `trend.empty` 文案 (cx, 400)＋**主 CTA `Button`**（`start.cta` 字串、240×54、預設綠、(cx, 480)）onClick `this.scene.start('Game', { score: new ScoreTracker() })`。
- 空狀態**不渲染**「清除紀錄」鈕；返回鈕照常。
- 「清除紀錄」改 `Button` destructive：`bg: PALETTE.no`（0xb13e53）、hover 亮一階 0xc95568、down 0x9a3145、白字、200×46、(cx, 690)；兩步確認邏輯與字串不變（`setLabel` 換文案）。
- 「返回」（趨勢 y=748、成就 y=758）改 `Button` 次級樣式：`bg: PALETTE.surfaceAlt`（0x2a2d42）、hover 0x3a3e58、down 0x22243a、白字（`textColor: '#ffffff'`）、160×46、fontSize 16。

### 3. 向量 icon（新 `src/ui/icons.ts`＋`src/ui/Button.ts` 擴充＋i18n）
- `ensureIconTexture(scene: Phaser.Scene, kind: 'trophy' | 'lock' | 'chart'): string`——程式繪製 24×24 texture（key `icon-<kind>`，白色圖形、使用端 `setTint` 上色）：
  - trophy：杯身（上寬下窄梯形/圓弧）＋杯腳＋底座；lock：圓角方鎖體＋半圓鎖環；chart：三根高低長條。
  - 白色繪製＋tint 的組合讓同一 texture 可做彩色（accent）與灰（`#8888aa`）兩態。
- `Button` 加可選 `icon?: 'trophy' | 'lock' | 'chart'`：icon（16×16、tint 同文字色）置於文字左側、間距 6，icon＋文字整體置中；無 icon 時行為完全不變。
- 開始頁：「趨勢」鈕 `icon: 'chart'`、「成就」鈕 `icon: 'trophy'`。
- i18n（×5 語）：`trend.cta` 去「 📊」、`ach.cta` 去「 🏆」、`ach.unlocked` 去「🏆 」前綴；新增 `ach.progress`（en: `'Unlocked {0}/{1}'`、zh-Hant: `'已解鎖 {0}/{1}'`、zh-Hans: `'已解锁 {0}/{1}'`、ja: `'解除済み {0}/{1}'`、es: `'Desbloqueados {0}/{1}'`）。
- 保留 `▶ ◀ ↗ ↻` 等單色文字符號（非彩色 emoji）。

### 4. HUD 下移（`src/scenes/GameScene.ts`）
- 深色卡由 (0, 0..154) 移至 **(0, 646..800)**，圓角改上緣 `{ tl: 16, tr: 16, bl: 0, br: 0 }`；其餘（surface 72%、depth 19）不變。
- 卡內元素鏡像下移（維持原內部節奏）：題目 banner y 40→**664**、關卡標籤 108→**728**、得分條 y0 128→**746**（票數文字 y 139→**757**）。
- **答案 chips**（previewLeft/Right 文字 y 158→**618**）：移到卡上緣之上、貼近遊戲區與拇指區；chip 幾何與顯隱 latch 邏輯不變。
- MuteButton（右上）、掉落判定、鏡頭邏輯全部不動。

### 5. 主角基底色改白（`src/core/playerColor.ts`）
- `PLAYER_BASE_COLOR`：`0xc0aee2` → **`0xf0f0f4`**（微暖白；不用純白以保留高光層次、避免融入極光亮心）。
- 敘事：「從白紙開始，四關染成你的顏色」。混色公式不變；開始頁 hero、遊戲中混色、結果頁最終色自動跟隨。
- `playerColor.test.ts` 期望值按新基底重算（實作計畫內含手算值）。

## 明確不做（YAGNI）

- 成就條件新增/修改、趨勢資料結構變動。
- `▶◀↗↻` 符號替換、GameOver 頁、分享卡/OG 圖變動（果凍怪不在卡上）。
- Button icon 支援 icon-only 或右側 icon（目前只需左側）。

## 測試與驗證

- `achievements.test.ts` 擴充：六個 `progress` 各測空場次、中途、達標（封頂）；`decisive`/`torn` 無 progress。
- `playerColor.test.ts` 期望值更新（白基底）。
- 既有測試全綠、`tsc --noEmit` 乾淨。
- 截圖驗收：成就頁（混合解鎖狀態＋總進度）、趨勢空狀態、開始頁（icon 鈕＋白 hero）、遊戲畫面（下方 HUD＋白果凍怪）、結果頁（白基底最終色）。

## 驗收標準

1. 成就頁一眼看出「收集進度」：總進度條＋每卡進度，解鎖/未解鎖視覺差異明顯。
2. 趨勢空狀態有情感（果凍怪）且一鍵開局。
3. 全站按鈕同一族（實心圓角 Button；破壞性紅、次級深灰）。
4. 開始頁鈕用向量 icon；全站無彩色 emoji 作 icon。
5. 遊戲中上方視野開闊，HUD 穩定在下方、可讀性不退步。
6. 主角開局為白，隨維度漸染色。
