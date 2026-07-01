# MBTI Jump — 成就系統（子專案 B）設計文件

- 日期：2026-07-01
- 狀態：已通過 brainstorm，待寫實作計畫
- 背景：三功能拆為 A(趨勢+持久化底座) → B(成就) → C(題庫擴充+隨機)。A 已完成，提供 `core/profile.ts`（`getPlays(): PlayRecord[]`）。本文件涵蓋 B，消費 A 的遊玩紀錄。

## 一句話描述

新增成就系統：8 個成就由歷次遊玩紀錄純函式推導；結算時偵測「新解鎖」並提示；開始頁進入成就頁，已解鎖高亮、未解鎖灰階顯示名稱與說明。純邏輯與 Phaser 解耦、可單測；遊戲流程與 A 的 profile 格式不動。

## 目標與範圍

### 要做
- 8 個成就定義與純函式解鎖判定（依 `PlayRecord[]`）。
- 結算頁「新解鎖」提示（淡入淡出；多個依序），以 localStorage 記住已提示者去重。
- 成就頁 `AchievementScene`：列出 8 個，已/未解鎖區分，含名稱＋說明。
- 開始頁「成就 🏆」入口鈕。
- 五語 i18n。

### 明確不做（YAGNI）
- 題庫擴充/隨機（子專案 C）。
- 成就進度條/百分比、分享成就、雲端同步。
- 更動 A 的 `profile` 儲存格式（避免版本遷移風險）。

## 模型：由歷史純推導 + 「已提示」持久化

- 成就解鎖狀態＝`getPlays()` 的純函式，不另存解鎖狀態（避免漂移）。
- 僅為結算頁提示去重，另存一份「已提示 id」到獨立 localStorage key `mbti-jump.achievements`（不動 profile）。

## 模組切分

```
src/
  core/
    achievements.ts        # 成就定義 + unlockedIds/newlyUnlocked（純函式）
    achievements.test.ts
    achievementStore.ts    # localStorage 已提示 id：getSeenIds/markSeen（薄層）
    achievementStore.test.ts
  scenes/
    AchievementScene.ts    # 成就列表頁（key 'Achievements'）
  ui/
    # 可選：Toast 於 ResultScene 內以本地方法實作（不新增檔案）
  # 改動：ResultScene（新解鎖提示 + markSeen）、StartScene（成就入口鈕）、main.ts（註冊 AchievementScene）
  i18n/strings/*.ts         # 新增成就字串 × 5 語
```

### 解耦不變量
- `achievements.ts` 純邏輯：import `PlayRecord`（`core/profile`）、`groupOf`（`core/temperament`）、`DIMENSIONS`（`config/questions`）；不 import Phaser；完整單測。
- `achievementStore.ts` 以 `globalThis.localStorage` + try/catch 保護（延續既有寫法），可 mock 單測。
- 不動 A 的 profile、遊戲流程、計分。

## 型別與介面

```ts
// core/achievements.ts
import type { PlayRecord } from './profile';

export interface Achievement {
  id: string;                              // 對應 i18n ach.<id>.name / ach.<id>.desc
  check: (plays: readonly PlayRecord[]) => boolean;
}
export const ACHIEVEMENTS: Achievement[]; // 8 個，固定順序（決定成就頁排列）
export function unlockedIds(plays: readonly PlayRecord[]): Set<string>;
export function newlyUnlocked(plays: readonly PlayRecord[], seen: readonly string[]): string[];
```
- `unlockedIds`：`ACHIEVEMENTS.filter(a => a.check(plays)).map(a=>a.id)` 組成 Set。
- `newlyUnlocked`：目前已解鎖但不在 `seen` 者（依 `ACHIEVEMENTS` 順序回傳，穩定）。

```ts
// core/achievementStore.ts
export const ACH_KEY = 'mbti-jump.achievements';
export function getSeenIds(): string[];    // 讀不到/壞 → []
export function markSeen(ids: readonly string[]): void; // 併集寫回（去重）
```
- 格式：`{ version: 1, seen: string[] }`；讀取容錯回 `[]`；`markSeen` 讀現有併新 id 去重寫回。

## 8 個成就（皆由 `PlayRecord[]` 推導）

| id | 名稱 key | 解鎖條件 |
|---|---|---|
| `first_play` | ach.first_play.name | `plays.length >= 1` |
| `persistent` | ach.persistent.name | `plays.length >= 10` |
| `dedicated` | ach.dedicated.name | `plays.length >= 25` |
| `collector` | ach.collector.name | 出現過的相異合法 4 碼型 == 16 種 |
| `four_realms` | ach.four_realms.name | `groupOf(type)` 覆蓋 explorer/diplomat/analyst/sentinel 四者 |
| `decisive` | ach.decisive.name | 某場某維度 tally 為 `[5,0]` 或 `[0,5]` |
| `torn` | ach.torn.name | 某場某維度 `first+second==5 && |first-second|==1`（3-2） |
| `creature_of_habit` | ach.creature_of_habit.name | 任一 type 累計出現 `>= 3` 次 |

> 判定細節：`collector` 以 `new Set(plays.map(p=>p.type))` 大小達 16（型皆為合法 4 碼，來源為 `ScoreTracker.result()`）。`four_realms` 對每場 `groupOf(p.type)` 收集成 Set，size==4。`decisive`/`torn` 對每場每維度檢查 `p.tallies[d]`。

## 流程與 UI

### 結算頁（`ResultScene`）
- 既有：`recordPlay(type, allTallies)`（A）。
- 新增（緊接其後）：
  ```
  const plays = getPlays();
  const fresh = newlyUnlocked(plays, getSeenIds());
  if (fresh.length) { showUnlockToast(fresh); markSeen(fresh); }
  ```
- `showUnlockToast(ids)`：畫面上方顯示 `tf('ach.unlocked', [t('ach.<id>.name')])`（🏆 圖示 + 名稱），淡入停留淡出（tween）；多個依序（間隔堆疊或排隊）。`prefersReducedMotion` 時直接顯示短暫後移除。

### 成就頁（`AchievementScene`，key `'Achievements'`）
- `create()`：`const unlocked = unlockedIds(getPlays())`；對 `ACHIEVEMENTS` 每一項一列：
  - 已解鎖：🏆 + `t('ach.<id>.name')`（亮）+ `t('ach.<id>.desc')`（次亮）。
  - 未解鎖：🔒 + 名稱（灰）+ 說明（灰）。
- 返回鈕 → `scene.start('Start')`；靜音鈕右上角；標題 `t('ach.title')`。
- 版面：8 列於 450×800 內排列（標題下起，每列約 76px），返回鈕置底。

### 開始頁（`StartScene`）
- 在「趨勢」鈕旁/下方加「成就 🏆」次要鈕（`t('ach.cta')`）→ `scene.start('Achievements')`。與趨勢鈕並列或堆疊，維持版面整齊。

## i18n 新增字串（en 權威 + 五語，完整性測試涵蓋）
- 通用：`ach.title`、`ach.cta`、`ach.unlocked`（`{0}` = 成就名）。
- 每成就（×8）：`ach.<id>.name`、`ach.<id>.desc`。
- 合計 3 + 16 = 19 key × 5 語。`en` 為權威來源。

## 測試策略
- **`achievements`**：8 個 predicate 各以「剛好達成/未達成」兩情境；`collector`（16 型齊/缺一）；`four_realms`（四族齊/缺一）；`decisive`（5-0 命中、4-1 不命中）；`torn`（3-2 命中、5-0 不命中）；`creature_of_habit`（某型 3 次）；`unlockedIds` 綜合；`newlyUnlocked` 與 seen 差集且順序穩定。
- **`achievementStore`**：getSeenIds 空/壞→[]；markSeen 併集去重、持久化；無 localStorage 安全。
- 成就頁、結算提示：手動/截圖驗證。

## 對既有程式的影響
- `ResultScene`：加新解鎖偵測 + 提示 + markSeen（不影響 A 的 recordPlay 與趨勢鈕）。
- `StartScene`：加成就入口鈕。
- `main.ts`：註冊 `AchievementScene`。
- 遊戲邏輯、計分、A 的 profile 格式不變。

## 待後續（非本子專案）
- 子專案 C：題庫擴充 + 隨機題組。
- 成就進階（進度、日期連續、分享）視需要再議。
