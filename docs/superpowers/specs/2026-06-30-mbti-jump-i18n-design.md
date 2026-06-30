# MBTI Jump — i18n 五語 + 原創題庫 設計文件

- 日期：2026-06-30
- 狀態：已通過 brainstorm，待寫實作計畫
- 關聯：延伸自 [`2026-06-30-mbti-jump-design.md`](./2026-06-30-mbti-jump-design.md) 與計畫 [`../plans/2026-06-30-mbti-jump.md`](../plans/2026-06-30-mbti-jump.md)

## 一句話描述

為 MBTI Jump 加上五國語言（繁中／簡中／英／日／西，**預設英文**）國際化：依瀏覽器語系自動偵測、可手動切換並記住選擇；題庫改為**原創自寫**（概念取材自網路流行 MBTI 題型），結構與譯文分離，邏輯核心（計分、物理）完全不動。

## 目標與範圍

### 要做
- 支援 5 個 locale：`en`（預設 / fallback）、`zh-Hant`、`zh-Hans`、`ja`、`es`。
- 瀏覽器語系自動偵測；使用者可手動切換，選擇以 `localStorage` 記住，優先於自動偵測。
- 全部使用者可見文字（UI、題目、台階選項、人格結算）走 i18n，不再寫死字串。
- 題庫原創自寫（概念參考流行題型），每題有穩定 `id`，五語以同一 id 對應。

### 明確不做（YAGNI）
- 不引入 i18next 等 i18n 函式庫（自製輕量機制即可）。
- 不做語言的 lazy-load / 動態載入（5 語字串量小，全部打包即可）。
- 不做 RTL、不做複數規則引擎、不做日期/數字 locale 格式化（本遊戲用不到）。
- 不做後端 / 帳號儲存語言偏好（純前端 `localStorage`）。

## 授權與題庫來源決策

| 來源 | 授權 | 結論 |
|---|---|---|
| OEJTS（openpsychometrics） | **CC-BY-NC-SA 4.0**（禁商用＋需標示＋ShareAlike 傳染） | ❌ 不採用其條目（NC/SA 限制商用與綁定授權；形容詞對格式亦不貼合機制） |
| IPIP | 公領域 | ❌ 為 Big Five 非 MBTI 四碼，不直接適用 |
| 16Personalities / 官方 MBTI | 專有 | ❌ 不可複製 |
| 流行 MBTI 測驗的「題型概念」 | 通用概念、非文字著作 | ✅ 僅作概念取材 |
| **自寫原創題庫** | 自有版權 | ✅ **採用**：貼合左 Yes／右 No 分叉機制、五語翻譯不受授權牽制 |

> 取材原則：只參考「常見題型主題」（如派對後充電/耗電、行程排好/隨興），改寫為原創情境題，**不照抄**任何來源的句子。OEJTS 等 NC/SA 來源一律不複製其文字。

## 架構決策

### A. i18n 機制：自製輕量（不引入 i18next）
- 一個 typed 字串字典 + `t(key, locale?)` 純函式查詢；缺 key 時 fallback 到 `en`。
- 理由：無外部依賴、bundle 不變胖、**純函式可單元測試且不 import Phaser**，延續既有「純資料/純邏輯與 Phaser 解耦」原則。i18next 對此小型靜態遊戲過重。

### B. 資料結構：結構與譯文分離
- `config/questions.ts` 只保留**結構**：`id`、`dimension`、`yes.side`、`no.side`，**不含任何顯示文字**。
- 每個 locale 一個字串檔（`i18n/strings/<locale>.ts`），含：UI 字串 + 題目文字 + 台階 label + 人格文案。
- 譯者（含日/西母語校稿）只需編輯自己的 locale 檔，互不干擾。
- 以**完整性單元測試**保證「每個 locale 涵蓋全部 key」「每個題目 id 都有對應譯文 key」，避免漏譯。

> 替代方案（內嵌 `Record<Locale,string>` 於每題）因檔案巨大、母語校稿困難而不採用。

## 模組切分

```
src/
  i18n/
    locales.ts        # Locale 型別、SUPPORTED_LOCALES、DEFAULT_LOCALE='en'
    detect.ts         # detectLocale(langs: string[]): Locale  ← 純函式、可單測
    store.ts          # 目前語系 state + localStorage 持久化 + setLocale()/getLocale()
    t.ts              # t(key, locale?) 取字串；缺 key fallback 到 en
    strings/
      en.ts
      zh-Hant.ts
      zh-Hans.ts
      ja.ts
      es.ts
    index.ts          # 匯總 re-export
  config/
    questions.ts      # 改：只留結構（id/dimension/side），移除文字
    personalities.ts  # 改：letter traits 與描述句改由各 locale 提供
  core/
    ScoreTracker.ts   # 不動（只處理字母，與語言無關）
  scenes/ ...         # 改：寫死字串 → t('key')；StartScene 加語言選單
```

### 解耦不變量
- `ScoreTracker` 與遊戲物理**完全不依賴語言**。維度字母 E/I/S/N/T/F/J/P 與 `side` 皆為 locale-independent。
- 換語言只影響「呈現層」與「字串資料」，不動遊戲邏輯。

## 型別與介面

```ts
// i18n/locales.ts
export type Locale = 'en' | 'zh-Hant' | 'zh-Hans' | 'ja' | 'es';
export const SUPPORTED_LOCALES: Locale[] = ['en', 'zh-Hant', 'zh-Hans', 'ja', 'es'];
export const DEFAULT_LOCALE: Locale = 'en';
/** 語言選單顯示用的自稱名（各以該語言書寫） */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English', 'zh-Hant': '繁體中文', 'zh-Hans': '简体中文', ja: '日本語', es: 'Español',
};
```

```ts
// i18n/detect.ts — 純函式
export function detectLocale(langs: readonly string[]): Locale;
```

```ts
// i18n/store.ts
export function getLocale(): Locale;              // localStorage > navigator > default
export function setLocale(l: Locale): void;       // 寫入 localStorage 並更新 state
const STORAGE_KEY = 'mbti-jump.locale';
```

```ts
// i18n/t.ts
export type StringKey = string; // 由 strings 的 key union 推導（實作時用 keyof typeof en）
export function t(key: StringKey, locale?: Locale): string; // 預設用 getLocale()
```

```ts
// config/questions.ts（改後，結構 only）
export type Dimension = 'EI' | 'SN' | 'TF' | 'JP';
export type Letter = 'E'|'I'|'S'|'N'|'T'|'F'|'J'|'P';
export interface QuestionDef {
  id: string;              // 穩定 id，如 'ei_1'
  dimension: Dimension;
  yes: { side: Letter };   // 左台階
  no:  { side: Letter };   // 右台階
}
export const QUESTIONS: QuestionDef[];            // 20 題（每維度 5 題）
export const DIMENSIONS: Dimension[];             // ['EI','SN','TF','JP']
export const LETTERS_OF: Record<Dimension, [Letter, Letter]>;
```

文字以 key 對應，命名慣例：
- 題幹：`q.<id>.text`（例 `q.ei_1.text`）
- 左台階：`q.<id>.yes`、右台階：`q.<id>.no`
- 字母特質：`trait.E`、`trait.I`…
- 人格描述模板：`personality.template`（各語自有句法，內含 `{0}{1}{2}{3}` 佔位）
- UI：`start.title`、`start.cta`、`start.tagline`、`level.banner`、`result.heading`、`result.copy`、`result.copied`、`result.again`、`gameover.title`、`transition.next`、`transition.seeResult` 等。

## 語系偵測規則（detect.ts）

解析順序：**localStorage 手動選擇 ＞ `navigator.languages` 逐一比對 ＞ `en`**。
`detectLocale` 只負責 `navigator.languages → Locale` 的純映射（store 再疊上 localStorage 優先）。

| 瀏覽器語系（不分大小寫，前綴比對） | → Locale |
|---|---|
| `zh-Hant` / `zh-TW` / `zh-HK` / `zh-MO` | `zh-Hant` |
| `zh-Hans` / `zh-CN` / `zh-SG` / 裸 `zh` | `zh-Hans` |
| `ja` | `ja` |
| `es` | `es` |
| `en` / 其他任何未涵蓋者 / 空陣列 | `en`（預設） |

> 裸 `zh`（無地區）歸 `zh-Hans`。逐一掃 `navigator.languages`，回傳第一個能對應到 supported 的；都對不上則 `en`。

## UI 影響

- 各 Scene 文字一律改 `t('<key>')`；切換語言後重繪當前 Scene（最簡：`scene.restart()` 或重建文字物件）。
- `StartScene` 新增語言選單：5 個 `LOCALE_LABELS` 選項（橫排小按鈕或簡易下拉），點選 → `setLocale()` → 重繪。當前語言高亮。
- 題目 banner、台階 label、過關/失敗/結算文字全部走 `t()`。
- 結算「複製結果」分享字串也走 `t()`（各語一句模板，內插類型與說明）。

## 題庫

- 維持**每維度 5 題（奇數）、共 20 題**：Yes/No 必不平手，MVP 不需 tie-break。
- 每題穩定 `id`：`ei_1..ei_5`、`sn_1..sn_5`、`tf_1..tf_5`、`jp_1..jp_5`。
- `yes` 固定對應該維度第一字母（E/S/T/J 側）、`no` 對應第二字母（I/N/F/P 側）——與既有設計一致（左 Yes、右 No）。
- 概念取材（改寫為原創）涵蓋常見主題：
  - EI：派對充電/耗電、主動攀談/被動、獨處感受、群體/獨自、想法外放/內斂。
  - SN：事實/可能性、細節/全局、當下/未來、寫實/比喻、務實/點子。
  - TF：邏輯/和諧、對錯/感受、批評在意點、公平=一致/體諒、理性/心軟。
  - JP：計畫/隨興、提早/最後衝刺、整齊/彈性、要定論/留彈性、面對變動。

## 測試策略（延續純邏輯單測、不 import Phaser）

- **`detectLocale` 分支**：`zh-TW/zh-HK/zh-Hant→zh-Hant`、`zh-CN/zh-SG/裸 zh→zh-Hans`、`ja→ja`、`es→es`、未知/`en`/空陣列→`en`、多語清單取第一個可對應者。
- **譯文完整性**：對每個 `SUPPORTED_LOCALES`，斷言其字串檔涵蓋 `en` 的全部 key（以 `en` 為 key 的 source of truth）；無多餘 key。
- **題庫 ↔ 譯文對應**：每個 `QuestionDef.id` 都有 `q.<id>.text/yes/no` 三個 key 於每個 locale。
- **題庫結構**：每維度 5 題；`yes.side`/`no.side` 屬該維度字母對且相異。
- **`t()` fallback**：缺 key 時回傳 `en` 對應值（或 key 本身作為最後手段）。
- `ScoreTracker` 測試照舊（不受影響）。

## 翻譯產出與校稿

- 五語字串由 AI 先行草擇；**`ja`、`es` 標記 `needs-review`**（檔頭註記），待母語者校稿。
- `en` 為 key 的權威來源（source of truth）；新增字串先補 `en`，完整性測試會抓出其他語言缺項。

## 對既有計畫的影響

- 既有計畫 Task 2（題庫）與 Task 5（人格文案）需改為「結構 + 譯文分離」版本。
- 新增「i18n 模組（locales/detect/store/t/strings）」相關 Task。
- 各 Scene Task（9–13）的寫死字串改走 `t()`；`StartScene` 加語言選單。
- `ScoreTracker`（Task 4）、`gameConfig`（Task 3）、物理/實體（Task 7–8）不受影響。
- 細節由 writing-plans 產出更新後的實作計畫。

## 待後續決定（非本次）
- 是否提供 `?lang=` URL 參數覆寫（利於分享指定語言）——目前未納入，必要時再加。
- 人格說明文案的深度（目前以四字母特質組句；之後可改為 16 型各自完整文案）。
