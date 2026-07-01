# MBTI Jump — 人格趨勢 + 持久化底座（子專案 A）設計文件

- 日期：2026-07-01
- 狀態：已通過 brainstorm，待寫實作計畫
- 背景：使用者要三個功能（成就、隨機題組+更多題庫、跨場次人格趨勢）。拆為三子專案，順序 **A(趨勢+持久化底座) → B(成就) → C(題庫擴充+隨機)**。本文件只涵蓋 A。B/C 之後各自 spec。

## 一句話描述

新增一個持久化的「玩家檔案」（localStorage 記錄歷次遊玩），以及一個趨勢頁：顯示總遊玩次數、最常出現的人格類型、四維度累計偏向百分比、最近幾筆結果。純資料/純邏輯與 Phaser 解耦、可單測；遊戲核心邏輯不動。

## 目標與範圍

### 要做
- 持久化玩家檔案（localStorage）：每次結算存一筆遊玩紀錄。
- 趨勢彙整純函式：總次數、最常型、四維度偏向%、最近 N 筆。
- 趨勢頁 `TrendScene`：完整內容顯示 + 清除紀錄（兩步確認）+ 返回。
- 入口：開始頁與結算頁各一顆「趨勢」鈕。
- 五語 i18n 字串。

### 明確不做（YAGNI）
- 成就系統（子專案 B）、題庫擴充/隨機題組（子專案 C）。
- 雲端同步 / 帳號（純前端 localStorage）。
- 圖表函式庫（用 Phaser 圖形畫簡單長條即可）。
- 匯出/分享趨勢（之後再議）。

### 偏向計算的定義（設計決策）
四維度偏向% 以「**歷次票數相加**」計算，而非「每場勝負字母」。例：EI 維度把所有場次的 E 票與 I 票各自加總，再算百分比 → 更細膩反映傾向強弱。

## 模組切分

```
src/
  core/
    profile.ts        # localStorage 玩家檔案：recordPlay/getPlays/clear（storage 薄層 + 型別）
    profile.test.ts
    trends.ts         # computeTrends(plays)：純函式彙整
    trends.test.ts
    ScoreTracker.ts   # 小改：鎖定時記住各維度 tallies + allTallies() getter
    ScoreTracker.test.ts  # 補測 allTallies
  scenes/
    TrendScene.ts     # 趨勢頁（key 'Trend'）
  # 改動：ResultScene（結算時 recordPlay + 「趨勢」鈕）、StartScene（「趨勢」鈕）、main.ts（註冊 TrendScene）
  i18n/strings/*.ts   # 新增趨勢頁字串 × 5 語
```

### 解耦不變量
- `profile.ts`、`trends.ts` 不 import Phaser、可單測（`profile` 以 `globalThis.localStorage` + try/catch 保護，延續 `i18n/store.ts` 寫法）。
- `trends.ts` 為純函式。
- `ScoreTracker` 只多存一份 tallies，計分/結果邏輯不變。

## 型別與介面

```ts
// core/profile.ts
import type { Dimension } from '../config/questions';

export interface PlayRecord {
  at: number;                                   // 時間戳（毫秒）
  type: string;                                 // 4 碼人格
  tallies: Record<Dimension, [number, number]>; // 各維度 [第一字母數, 第二字母數]
}
export const PROFILE_KEY = 'mbti-jump.profile';
export const MAX_PLAYS = 200;

export function recordPlay(type: string, tallies: Record<Dimension, [number, number]>, at?: number): void;
export function getPlays(): PlayRecord[];   // 讀不到或壞資料 → []
export function clearPlays(): void;
```
- 儲存格式：`{ version: 1, plays: PlayRecord[] }`（JSON）。`getPlays` 對版本/格式不符或 JSON 解析失敗回 `[]`（不丟錯）。
- `recordPlay` append 後若超過 `MAX_PLAYS` 丟棄最舊；`at` 預設呼叫端傳入或 `Date.now()`（app 端；測試傳明確值）。

```ts
// core/trends.ts
import type { Dimension } from '../config/questions';
import type { PlayRecord } from './profile';

export interface DimensionLean { first: number; second: number; firstPct: number; secondPct: number }
export interface Trends {
  totalPlays: number;
  topType: string | null;                        // 最常出現的 4 碼；並列時取最先達到者；無紀錄 null
  dimensionLean: Record<Dimension, DimensionLean>;
  recent: PlayRecord[];                          // 最近 N 筆（新→舊），N=RECENT_LIMIT
}
export const RECENT_LIMIT = 5;
export function computeTrends(plays: readonly PlayRecord[]): Trends; // 純函式
```
- `dimensionLean`：對每個維度加總各場 `tallies[dim]`，`firstPct = round(first/(first+second)*100)`；分母 0 時 first/second=0、pct=0。
- 空 `plays`：`totalPlays=0`、`topType=null`、各維度 0、`recent=[]`。

```ts
// core/ScoreTracker.ts（新增）
allTallies(): Record<Dimension, [number, number]>;  // 各維度鎖定當下的 [first, second]
```
- 實作：`completeLevel` 在 reset 前把 `[current[a], current[b]]` 存入 `private lockedTallies: Map<Dimension,[number,number]>`；`allTallies` 依 `DIMENSIONS` 組出物件（未鎖定的維度回 `[0,0]`）。`resetCurrentLevel`/新遊戲不清 lockedTallies？→ 由 ResultScene 只在完成時讀取；為求乾淨，`allTallies` 只回已鎖定維度的值，未鎖定回 `[0,0]`。

## 趨勢頁（`TrendScene`，key `'Trend'`）

- `create()`：`const trends = computeTrends(getPlays())`；渲染：
  - 標題 `t('trend.title')`。
  - 總次數 `tf('trend.totalPlays', [n])`；最常型（大字，若有則以其族群色，重用 `groupColorOf`；無則顯示 `t('trend.empty')`）。
  - 四維度偏向長條：每維度一列，顯示兩字母與百分比（如 `E 68% ─ I 32%`），用 Phaser 圖形畫比例條，維度名用既有 `dim.<code>`。
  - 最近結果：最多 5 筆，每筆顯示 4 碼（可附相對時間，MVP 可只列型別）。
- **清除鈕**：`t('trend.clear')`；第一次點 → 文字變 `t('trend.clearConfirm')`；再點 → `clearPlays()` 並重繪（回空狀態）。
- **返回鈕**：`t('common.back')` → `scene.start('Start')`。
- 靜音鈕（`MuteButton`）同其他場景放右上角，維持一致。

## 入口與記錄流程
- **記錄**：`ResultScene.create()` 計算 `type` 後 `recordPlay(type, data.score.allTallies())`（每場一次）。
- **入口**：
  - `StartScene`：新增「趨勢」次要鈕（`t('trend.cta')`）→ `scene.start('Trend')`。
  - `ResultScene`：新增「看趨勢」鈕 → `scene.start('Trend')`。
  - 版面沿用既有 `ui/Button`（實心圓角）風格；次要動作可用不同底色以區分主 CTA。

## i18n 新增字串（en 權威 + 五語）
keys：`trend.title`、`trend.cta`、`trend.totalPlays`（`{0}`）、`trend.topType`、`trend.recent`、`trend.clear`、`trend.clearConfirm`、`trend.cleared`、`trend.empty`、`common.back`。（維度名重用既有 `dim.*`。）完整性測試涵蓋。

## 測試策略
- **`profile`**：recordPlay 後 getPlays 取回、超過 MAX_PLAYS 丟最舊、clearPlays 清空、壞 JSON/版本不符回 []、無 localStorage 安全（mock globalThis）。
- **`trends`**：空清單、單筆、多筆彙整、topType（含並列取最先）、dimensionLean 百分比與四捨五入、recent 取最近 N 且新→舊。
- **`ScoreTracker.allTallies`**：鎖定後回正確 [first,second]；未鎖定維度回 [0,0]；死亡重玩（resetCurrentLevel）不污染已鎖定值。
- TrendScene、入口鈕：手動/截圖驗證。

## 對既有程式的影響
- `ResultScene`：加 recordPlay + 趨勢鈕（版面微調）。
- `StartScene`：加趨勢鈕。
- `main.ts`：註冊 `TrendScene`。
- `ScoreTracker`：加 lockedTallies + allTallies（不影響現有測試/行為）。
- 遊戲邏輯（爬塔、計分結果、i18n、progression）不變。

## 待後續（非本子專案）
- 成就系統（B，會消費 `profile` 資料）。
- 題庫擴充 + 隨機題組（C）。
- 趨勢的相對時間顯示、匯出/分享。
