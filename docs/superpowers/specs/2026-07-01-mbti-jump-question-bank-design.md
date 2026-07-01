# MBTI Jump — 題庫擴充 + 隨機題組（子專案 C）設計文件

- 日期：2026-07-01
- 狀態：已通過 brainstorm，待寫實作計畫
- 背景：三功能拆為 A(趨勢) → B(成就) → C(題庫擴充+隨機)。A、B 已完成。C 獨立於持久化，主要動題庫資料與抽題邏輯。

## 一句話描述

每維度題庫由 5 擴充到 10 題（共 40）；每場每維度以純函式從池中隨機抽 5 題（維持奇數不平手）；新題原創、五語翻譯（日西標 `needs-review`）。抽題純函式可測；計分與爬塔流程、A/B 皆不受影響。

## 目標與範圍

### 要做
- `config/questions.ts`：每維度 5 → 10 題（新增 20 個 `QuestionDef`）。
- `core/pickQuestions.ts`：純函式隨機抽題（注入 rng）。
- GameScene 每場每維度隨機抽 5 題。
- 20 個新題 × `q.<id>.text/yes/no` × 五語 i18n。

### 明確不做（YAGNI）
- 難度分級、題目權重、避免近期重複的記憶（純隨機即可）。
- 每場題數改變（維持 5，奇數不平手）。
- 動 A/B（趨勢、成就）或計分邏輯。

## 資料擴充

- 每維度 10 題，id：`ei_1..ei_10`、`sn_1..sn_10`、`tf_1..tf_10`、`jp_1..jp_10`（現有 1..5 保留，新增 6..10）。
- `QuestionDef` 結構不變；`yes.side` = 維度第一字母（E/S/T/J），`no.side` = 第二字母（I/N/F/P）。
- `questionsForDimension(d)` 回傳該維度全部 10 題（不變的簽名）。

## 抽題（`core/pickQuestions.ts`）

```ts
import type { QuestionDef } from '../config/questions';

/**
 * 從 pool 隨機抽 count 題（不重複、不變動 pool）。
 * 用注入的 rng()（回 [0,1)）做 Fisher-Yates 洗牌，取前 count；count>=pool.length 回全部（洗過）。
 */
export function pickQuestions(
  pool: readonly QuestionDef[],
  count: number,
  rng: () => number,
): QuestionDef[];
```
- 實作：複製 pool → Fisher-Yates（`j = Math.floor(rng() * (i+1))`）→ `slice(0, count)`。
- 純函式、不 import Phaser、不動輸入陣列、可用固定序列 rng 單測（決定性）。

### GameScene 整合
- 目前 `init`/`advanceDimension` 以 `questionsForDimension(dim)` 取該維度全部題。改為：
  ```ts
  this.questions = pickQuestions(questionsForDimension(dim), GAME.questionsPerLevel, Math.random);
  ```
  （`GAME.questionsPerLevel` 維持 5。）init（本維度）與 advanceDimension（下一維度）各抽一次。
- 其餘爬塔/計分/HUD 不變（仍 5 題/維度、奇數不平手）。

## i18n（+20 題 × 五語）

- 為 20 個新 id 各新增 `q.<id>.text`、`q.<id>.yes`、`q.<id>.no`（共 60 key）× 五語。
- `en` 為權威來源；`ja`/`es` 檔頭已標 `needs-review`（新題沿用該狀態），值為 AI 草稿待母語校稿。
- 題目原創、概念取材常見 MBTI 題型（延續現有情境題風格）；實作計畫會附完整五語內容。
- 完整性測試（`completeness.test.ts`）自動要求每題 id 在每語都有 text/yes/no。

## 測試策略

- **`pickQuestions`**（純函式）：
  - 抽出數量 == count；皆為相異題（無重複）；全部來自 pool；不變動輸入 pool（呼叫後 pool 不變）。
  - `count >= pool.length` → 回全部（長度 == pool.length）。
  - 注入決定性 rng（如固定序列）→ 產出可預期、順序穩定。
- **`questions` 結構測試**：每維度 10 題（更新既有斷言 `5`→`10`）；40 題 id 唯一；每題 `yes.side`=第一字母、`no.side`=第二字母。
- 既有 `mapping.test.ts`、`ScoreTracker`、`completeness` 仍適用（completeness 涵蓋新題 key）。

## 對既有程式的影響

- `config/questions.ts`：+20 defs、`questions.test.ts` 斷言 5→10。
- `core/pickQuestions.ts`（新）+ 測試。
- `scenes/GameScene.ts`：取題改為 `pickQuestions(...)`（init 與 advanceDimension 兩處）。
- i18n 五語 +60 key。
- 計分、progression、爬塔流程、A(趨勢)/B(成就) 不變。

## 待後續（非本子專案）
- 題目難度/主題分類、避免近期重複、玩家自訂題數等（視需要再議）。
- `ja`/`es` 新題母語校稿（沿用既有 needs-review 流程）。
