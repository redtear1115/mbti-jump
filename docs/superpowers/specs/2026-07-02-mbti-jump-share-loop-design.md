# MBTI Jump — 分享閉環（OG 預覽 + 型別連結 + 好友對比 + Web Share）設計文件

- 日期：2026-07-02
- 狀態：已通過 brainstorm，待寫實作計畫
- 背景：遊戲已上線 `mbti-jump.southern-light.dev`（Cloudflare Workers 靜態 assets）。目前分享迴路不通：`index.html` 無任何 OG meta（貼連結無預覽）、分享文案帶的是首頁裸連結（不含型別）、行動裝置分享要「下載 PNG → 手動貼」摩擦大。本專案打通整條分享閉環。

## 一句話描述

分享連結帶型別與語言（`/t/<TYPE>?lang=<locale>`），由 Cloudflare Worker 注入對應的 OG meta（圖為 build 時預生成的 16 型 × 5 語靜態 PNG）；結果頁合併為一顆主分享鈕（Web Share API 帶卡片圖，桌機 fallback 複製＋下載）；朋友點連結進來有打招呼、測完有兩人對比文案。

## 使用者決策（brainstorm 結論）

1. 好友對比深度：**打招呼＋結果對比**。開始頁顯示「你的朋友是 INFP，測測你們合不合」；朋友測完，結果頁多一行對比文案（依族群/字母重合度分檔，非 16×16 文案）。
2. OG 語言：**依分享者語言**，16 型 × 5 語 = 80 組 meta 與圖。
3. 結果頁按鈕：**合併成一顆主分享鈕**（複製文案＋儲存卡片兩鈕退役），畫面四鈕變三鈕。
4. 技術路線：**Worker 動態注入 meta**（非全靜態預生成頁）；圖仍為預生成靜態檔，Worker 不即時繪圖。

## 1. URL 與整體資料流

- 分享連結：`https://<host>/t/<TYPE>?lang=<locale>`，例 `/t/INFP?lang=zh-Hant`。
- `/t/*` 非實體檔案 → 進 Worker → 自 `env.ASSETS` 取 `index.html` → HTMLRewriter 注入該型別＋語言 OG meta → 回傳。
- 根路徑 `/` 與其他 asset 請求不經 Worker 邏輯（原樣 `env.ASSETS.fetch()` 放行），維持全靜態快取行為。
- 玩家點開 `/t/...`：SPA 照常啟動，`main.ts` 解析路徑與 `lang` → 設語言、記下好友型別 → StartScene。
- OG 圖為靜態 PNG：`/og/<locale>/<TYPE>.png`（80 張）＋首頁通用 `/og/default.png`，由 assets 直接服務。

## 2. Worker（新增 `worker/index.ts`）

- `wrangler.jsonc` 加 `main: "worker/index.ts"`；assets 綁定 `binding: "ASSETS"`（`not_found_handling: "single-page-application"` 保留）。
- 路由：
  - `GET /t/:type`（type ∈ 合法 16 型，不分大小寫、正規化為大寫）→ 注 meta。
  - 其餘請求 → `env.ASSETS.fetch(request)` 原樣放行。
- meta 組裝為純函式 `buildOgMeta(type, locale)`（放 `src/share/ogMeta.ts`，與其他純函式一起接受 vitest 測試；worker 只做路由與 HTMLRewriter），直接 import 既有純 TS 模組（`i18n/t`、`config/personalities`、`core/temperament`）——文案單一真相，不另外維護。
  - `og:title`：站名＋型別（例「MBTI Jump — 我是 INFP」，字串進 i18n）。
  - `og:description`：該型別 `describeType(type, locale)` ＋行動呼籲短句。
  - `og:image`：`https://<host>/og/<locale>/<TYPE>.png`（絕對網址）＋ `og:image:width/height`。
  - `twitter:card`: `summary_large_image`；另補 `og:url`、`og:type=website`。
- `lang` 不合法或缺省 → fallback `zh-Hant`。type 不合法 → 不注 meta，直接回一般 index.html（HTTP 200，SPA 正常跑）。
- 回應設 `cache-control: public, max-age=3600`，讓 CF edge 快取 80 種組合；HTML 主體與 assets 版本一致（來自 ASSETS，部署即更新）。

## 3. OG 圖生成管線（build script）

- 新增 `src/share/ogCard.ts`：**純繪圖函式**，簽名吃 canvas 2D context ＋ `ShareCardModel`（瀏覽器 `CanvasRenderingContext2D` 與 `@napi-rs/canvas` API 相容），1200×630 橫式版型：族群色放射漸變底、型別大字、族群名、四維度傾向條、tagline。版型為既有 `shareCard.ts`（1080×1350 直式）的橫式改編；共用的繪圖小工具（`hex`、`tintToward`、`roundRect`、`wrapText`）抽到 `src/share/draw.ts` 供兩者共用。
- 維度條分隔線：預生成圖無真實 tallies，依型別字母固定偏向 **0.8 / 0.2**（明顯偏向但不極端）。`buildShareCardModel` 已支援任意 tallies，餵 `[4,1]`/`[1,4]` 即可，不改核心。
- 新增 `scripts/generate-og.ts`（devDependency 加 `tsx` 執行）：迴圈 16 型 × 5 語 → `@napi-rs/canvas` 畫 → 輸出 `public/og/<locale>/<TYPE>.png`；另產通用 `public/og/default.png`（無型別版：站名＋tagline＋四色元素）。
- 字體：Fredoka、Nunito TTF（皆 SIL OFL）放 `scripts/fonts/`，生成時以 `GlobalFonts.registerFromPath` 註冊。
- `package.json`：加 `generate:og` script；產出的 PNG **進版控**（`public/` 下），不強制每次 build 重跑（版型改動時手動重跑）。
- `index.html` 補基本 meta：`description`、`og:title/description/image(=default.png)/url`、`twitter:card`——首頁裸連結也有預覽。

## 4. 前端改動

### 分享鈕合併（ResultScene）
- 移除「複製文案」「儲存卡片」兩顆鈕，新增一顆主鈕「分享結果」（沿用主 CTA 樣式）。畫面剩三鈕：分享結果／再玩一次／趨勢。
- 行為：
  1. 產卡片 PNG blob（既有 `renderShareCard`）＋分享文案＋連結 `origin + /t/<TYPE>?lang=<locale>`。
  2. `navigator.canShare({ files })` 支援 → `navigator.share({ files, text, url })` 開系統分享面板。
  3. 不支援（多數桌機）→ fallback：複製「文案＋連結」到剪貼簿 ＋ 自動下載卡片 PNG，鈕上顯示「已複製・卡片已下載」。
- 分享文案字串 `result.share` 改為帶新連結格式（既有 i18n key 沿用，佔位參數改傳新 URL）。

### 好友邀請（新 `src/core/invite.ts`，純函式＋sessionStorage）
- `parseInvite(pathname, search)`：解析 `/t/:type` 與 `lang` → `{ type, locale } | null`（type 驗證 16 型、大小寫正規化）。
- `saveInvite(type)` / `getInvite()`：sessionStorage 存取（同分頁有效即可；不用 localStorage 以免跨場次殘留）。
- `main.ts` 啟動時：`parseInvite()` → 有效則 `setLocale(locale)`（尊重 lang 參數）＋ `saveInvite(type)`。
- StartScene：`getInvite()` 有值 → 標語下方多一行「你的朋友是 INFP，測測你們合不合」（i18n）。

### 結果對比（新 `src/core/compare.ts`，純函式）
- `compareTypes(a, b)`：回傳 `{ sharedLetters: 0..4, sameGroup: boolean }`。
- 對比文案分五檔（重合 0/1/2/3/4 字母），每檔一句 × 5 語（25 條新字串）；同型（重合 4）用專屬句。`sameGroup` 可在句中帶族群名增味，第一版先只用重合數分檔。
- ResultScene：`getInvite()` 有值 → 描述文案下方多一行對比句（用好友族群色或白色，避免版面大改）。

### i18n 新字串（× 5 語）
- `invite.greeting`（帶型別佔位）、`compare.0`～`compare.4`、`og.title`、`og.cta`（description 尾句）、`share.action`（分享結果）、`share.doneFallback`（已複製・卡片已下載）、`share.fail`。ja/es 照慣例標 needs-review。

## 5. 錯誤處理

- Worker：非法 type/lang → 回一般 index.html，不報錯；HTMLRewriter 僅對 `head` append，不動既有節點；`env.ASSETS` 失敗交給 CF 預設錯誤。
- 前端：`navigator.share` 使用者取消（`AbortError`）→ 靜默不變鈕面；其他錯誤 → 落回複製＋下載 fallback；剪貼簿也失敗 → 鈕顯示 `share.fail`。
- `parseInvite` 對任何非法輸入回 `null`，遊戲照常。

## 6. 測試

- `ogMeta.test.ts`：title/description/image URL 對 16 型 × 5 語抽查、非法輸入 fallback。
- `invite.test.ts`：路徑解析（合法/非法/大小寫/缺 lang）、save/get。
- `compare.test.ts`：重合數計算、五檔文案 key 對應。
- `ogCard`：純繪圖函式以 mock context 驗證關鍵呼叫（fillText 含型別字等），比照 `shareCard` 現況（若無既有測試則做煙霧測試：不丟例外）。
- i18n completeness 測試自動涵蓋新 key。
- 手動驗證：`wrangler dev` 打 `/t/INFP?lang=ja` 檢查 meta；上線後用 FB Sharing Debugger / LINE 抽查；手機實測 Web Share 面板帶圖。

## 明確不做（YAGNI）

- Worker 即時繪圖（satori/resvg）——未來要做「好友對比動態 OG 圖」再升級，URL 結構可沿用。
- 16×16 配對文案、配對分數/百分比。
- 短網址、分享次數統計後端。
- OG 圖自動隨 build 重生成（手動 script 即可）。

## 部署變更

部署從純 assets 變成 Worker＋assets：`wrangler deploy` 照跑，第一次會建立 Worker script。`compatibility_date` 沿用 `2026-07-01`。
