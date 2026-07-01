# MBTI Jump — 分享卡 + 色彩系統翻新 設計

日期：2026-07-01

## 概述

本次一併處理一組互相關聯的視覺/功能改動。核心是一套**從四個族群原色混出的八字母色盤**（共同基礎），其餘四項功能都建立在它之上：

1. **八字母 MBTI 色盤**（共同基礎）
2. **得分條**：把頂部黃色純文字 `E 2 · I 1` 換成單維度兩側漸變得分條，改善黑底上黃/灰對比不足
3. **答案台階配色**：左右答案由亮紅/亮綠改為各自字母色
4. **極光動態背景**：深底上兩團維度色柔光緩慢飄移，取代目前的深色純色背景
5. **結算分享卡**：Result 畫面新增按鈕，把結果渲染成直式分享卡並下載成 PNG

觸發點：分享卡在**最終結算（Result）**畫面，不是每過一個維度。

## 非目標（YAGNI）

- 不做 Web Share API / 複製到剪貼簿 / 二維碼（本次只做「下載 PNG」）
- 不新增背景美術圖檔（極光為程序生成，無資產依賴）
- 不改動題庫、成就、趨勢、物理手感
- 不改 GameOver 畫面

---

## 1. 八字母 MBTI 色盤（共同基礎）

在 `src/theme/palette.ts` 新增字母色對照。這些色由四原色（explorer 黃、diplomat 綠、analyst 紫、sentinel 藍）語意混出（brainstorm 方案 B）：

```ts
/** 八字母語意色（由四族群原色混出）。供答案台階、得分條、分享卡沿用。 */
export const LETTER_COLORS: Record<Letter, number> = {
  E: 0xf0b84a, I: 0x2e6d86,   // 外向暖黃 / 內向深藍
  S: 0x8fb14a, N: 0x6e79b0,   // 務實黃綠 / 抽象紫藍
  T: 0x8a5fa0, F: 0x33a474,   // 邏輯紫 / 和諧綠
  J: 0x3a9a9a, P: 0xe09a3a,   // 秩序青 / 隨性橙
};
```

同時提供字串版 helper（Text style 用）：`letterHex(letter): string` → `'#rrggbb'`。

- **職責**：提供全遊戲單一的字母→色來源，避免各處硬編色碼。
- **相依**：`Letter` 型別（`src/config/questions.ts`）。
- **測試**：8 個字母都有色；`letterHex` 輸出 7 字元 `#` 格式且與數字色一致。

---

## 2. 得分條（取代頂部票數文字）

`src/scenes/GameScene.ts`：把 `this.tally`（黃字 `E 2 · I 1`）換成 graphics 繪製的得分條。

- 版面：置於維度標籤下方（約 y=126 區），寬 ~180、高 20、置中、`setScrollFactor(0)`、`setDepth(20)`。
- 底色漸變：由目前維度第一字母色 → 第二字母色（例：E/I → 金→深藍）。以水平線性漸變填滿（Phaser 無原生漸變填色，改用 canvas 生成一張漸變材質，或以多段矩形近似；實作階段擇一）。
- 白色分隔線：位置 = `na / (na + nb)`；`na+nb === 0` 時置中。標示目前領先比例。
- 兩側票數：左顯示 `第一字母 na`、右顯示 `第二字母 nb`，用高對比深/淺字（深色底端用淺字、淺色底端用深字），解決原本黃/灰對比不足。
- 每次 `updateTally()` 重繪分隔線與票數文字。維度切換時整條重建為新維度雙色。

抽出純函式 `scoreBarModel(na, nb): { dividerFrac, leftLabel, rightLabel }` 便於測試（`0,0 → 0.5`；`2,1 → 0.666…`）。

- **相依**：`ScoreTracker.tallyFor`、`LETTERS_OF`、`LETTER_COLORS`。
- **測試**：`scoreBarModel` 的分隔比例與邊界（雙零置中）。

---

## 3. 答案台階配色（字母色取代紅/綠）

`src/entities/Platform.ts`：`makeQuestion` 目前用固定綠(Yes)/紅(No)材質。改為依 `opts.side`（字母）上色：

- 以 `LETTER_COLORS[side]` 對台階 sprite `setTint(color)`（程序材質與未來美術圖皆適用）。
- 對應地，`GameScene` 的 `previewLeft`/`previewRight` 答案預覽色，改用該題兩側字母色（取代目前的 `#5effa0`/`#ff8a99`）。

- **相依**：`LETTER_COLORS`。
- **測試**：既有 Platform 測試不回歸；tint 由字母決定（可測 `makeQuestion` 後 sprite 的 tint 值）。

---

## 4. 極光動態背景

新增 `src/gfx/AuroraBackground.ts`。目標：深底上兩團維度色柔光緩慢飄移（brainstorm 背景方案 2）。

- **深底**：相機背景設為深色（沿用/加深 `LEVEL_BG` 或固定 `#16202b` 系）。
- **兩團柔光**：程序生成一張放射狀柔邊圓形材質（canvas radial gradient，中心不透明→邊緣透明，只生成一次）。加入兩個 `Image`，分別 `setTint` 為目前維度兩字母色，`setBlendMode(SCREEN)`（或 ADD），放大到覆蓋畫面，`setScrollFactor(0)`、`setDepth(-10)`。
- **飄移**：以 tween 讓兩團在畫面兩側之間來回位移/微縮放（各自不同週期，`yoyo`, `repeat:-1`）。
- **維度切換**：`retint(dimIndex)` 更新兩團顏色。
- **reduced-motion**：不啟動 tween，兩團置於固定對角位置（仍有繽紛靜態效果）。
- 既有視差 `Background`（美術圖層，目前未載入）維持不變，可疊在極光之上。

`GameScene.create/advanceDimension` 改用 AuroraBackground 提供顏色，取代單純 `setBackgroundColor(LEVEL_BG[...])`。

- **相依**：`LETTER_COLORS`、`LETTERS_OF`、`prefersReducedMotion`。
- **測試**：以行為為主，難以單元測（不強制）；至少確保建立/retint 不丟例外。

---

## 5. 結算分享卡（下載 PNG）

版型 A「英雄置中」。以獨立離屏 canvas 渲染高解析卡片（1080×1350），與 Phaser 畫布解耦。

### 5a. 純資料模型（可測）

`src/share/shareCardModel.ts`：
```ts
buildShareCardModel(type, tallies, locale): {
  type, groupName, groupHex, description,
  dims: Array<{ leftLetter, rightLetter, leftHex, rightHex, dividerFrac }>, // 4 條
  tagline,
}
```
- `tallies` 來自 `ScoreTracker.allTallies()`；`dividerFrac = first/(first+second)`，雙零置中。
- `groupName = t('group.'+groupOf(type))`、`description = describeType(type, locale)`、`tagline = t('card.tagline', locale)`。
- **純函式、無 DOM** → 可完整單元測試。

### 5b. Canvas 繪製 + 下載

`src/share/shareCard.ts`：
- `renderShareCard(model): HTMLCanvasElement` — 依模型繪製版型 A：族群色放射漸變底、大型別、族群名、描述（自動換行）、四條維度傾向漸變條（含白色分隔線）、底部標語。
- `downloadCard(canvas, filename)` — `canvas.toBlob` → `URL.createObjectURL` → 觸發 `<a download>`。檔名如 `mbti-jump-ENFP.png`。

### 5c. Result 畫面接線

`src/scenes/ResultScene.ts`：在既有「複製」與「再玩一次」之間新增按鈕 `result.saveCard`：
- onClick：`buildShareCardModel(type, data.score.allTallies(), currentLocale)` → `renderShareCard` → `downloadCard`。
- 成功後把按鈕文字暫改為 `result.saved`；失敗改 `result.saveFail`。

### 5d. i18n

新增字串鍵（五語系 en / zh-Hant / zh-Hans / ja / es）：
- `result.saveCard`（按鈕：下載分享卡）
- `result.saved`（已下載）
- `result.saveFail`（下載失敗）
- `card.tagline`（卡片底部標語，如「MBTI Jump · 玩一場，跳出你的人格」）

- **相依**：`personalities.describeType`、`temperament.groupOf/groupColorOf`、`LETTER_COLORS`、i18n。
- **測試**：`buildShareCardModel` 的族群名/描述/四條分隔比例；`renderShareCard` 產出正確尺寸 canvas 且不丟例外（jsdom 下 canvas 能力有限，僅驗尺寸與流程）。

---

## 檔案異動摘要

| 檔案 | 動作 |
|---|---|
| `src/theme/palette.ts` | 新增 `LETTER_COLORS` + `letterHex` |
| `src/scenes/GameScene.ts` | 得分條取代票數文字；預覽色改字母色；改用 AuroraBackground |
| `src/entities/Platform.ts` | 答案台階依字母色 tint |
| `src/gfx/AuroraBackground.ts` | 新增：極光動態背景 |
| `src/share/shareCardModel.ts` | 新增：純資料模型 |
| `src/share/shareCard.ts` | 新增：canvas 繪製 + 下載 |
| `src/scenes/ResultScene.ts` | 新增「下載分享卡」按鈕 |
| `src/i18n/strings/*.ts` | 新增分享卡/按鈕字串（5 語系） |

## 測試策略

沿用 vitest。純邏輯優先單元測：`scoreBarModel`、`buildShareCardModel`、`LETTER_COLORS`/`letterHex` 一致性。Canvas/Phaser 視覺部分做煙霧測（建立不丟例外、尺寸正確），視覺品質以實機確認。
