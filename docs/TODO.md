# MBTI Jump — TODO（介面 + 架構 review 彙整）

日期：2026-07-01
來源：ui-ux-pro-max 介面 review + 架構體檢 agent。核心遊戲（五語 i18n、無縫爬塔、鍵盤、取向 HUD、計分、結算）已完成且穩定；以下為改進項，依優先序分層。

> 兩份完整報告（暫存、未進版控）：`.claude/scratch-ui-review.md`、`.claude/scratch-arch-review.md`

---

## 新功能路線（使用者要求：成就 / 隨機題庫 / 人格趨勢）
共用持久化底座；拆三子專案，順序 A → B → C。
- [x] **A. 人格趨勢 + 持久化底座** ✅（spec `2026-07-01-mbti-jump-trends-design.md`、plan `...-trends.md`，6 tasks，final review READY）
      profile(localStorage) + trends(純函式) + `ScoreTracker.allTallies` + TrendScene（總次數/最常型族群色/四維度偏向%/最近）+ 開始/結算入口 + 兩步清除 + 五語。browser 驗證通過。
      小尾巴（延後）：`trend.cleared` 死字串、bar label `%` 格式入 i18n。
- [x] **B. 成就系統** ✅（spec `...-achievements-design.md`、plan `...-achievements.md`，5 tasks，final review READY）
      8 個純函式成就（由 `getPlays()` 推導）+ `achievementStore`(去重) + `AchievementScene`(已/未解鎖) + 結算解鎖提示 + 開始頁入口 + 五語。browser 驗證（注入 11 場 → 5 解鎖/3 未解鎖，正確）。
      小尾巴（延後）：reduced-motion 提示時長、多解鎖 toast 堆疊、anyDimension 冗餘 guard。
- [x] **C. 題庫擴充 + 隨機題組** ✅（spec `...-question-bank-design.md`、plan `...-question-bank.md`，5 tasks，final review READY）
      `core/pickQuestions`（純函式 Fisher-Yates，注入 rng）+ `questions.ts` 每維度 5→10（共 40）+ 20 新題×五語 i18n（ja/es 沿用 needs-review）+ GameScene init/advanceDimension 每場隨機抽 5 題（奇數不平手不變）。85 tests 綠、tsc/build 通過。
      小尾巴（延後）：locale 檔內新題 key 排序非按維度分塊（純美觀、completeness 以 key set 比對不受影響）；ja/es 母語校稿。

---

## Tier 0 — 程式品質快修（小、低風險，隨時可做）
- [ ] `Controls.ts` 從 `core/` 移到 `input/` 或 `entities/`（它 import Phaser，破壞 core=純邏輯 的語意）
- [ ] 移除 `GameScene.answeredCount`，改用「本維度題目集」計數，消除與 `answeredIds` 的雙重真相
- [ ] 抽出「跳過題目自動過關」判斷式為純函式（`shouldAutoComplete(...)`）＋單元測試（目前藏在 `update()`、含 0.75 magic number、無測試）
- [ ] `LEVEL_COLORS` 從 `GameScene.ts` 移到 `gameConfig.ts`
- [ ] `tiltToAxis(gamma, dead=…, max=…)` 改吃參數，讓測試不依賴 config 值
- [ ] 場景 init 介面命名統一（`GameInit`/`Init` 混用）或共用 `ScenePayload { score }`
- [ ] （選）`personalities.ts` 移到 `core/`；`Platform` 的 label Text 加欄位參照

## Tier 1 — 介面手感（純程式，體感提升大，適合先做、不需試玩）
- [ ] **按鈕按下/hover 回饋**：語言鈕、Start、Copy、Again 加 `pointerover/pointerdown` 縮放或變色（150–250ms）
- [ ] **觸控目標 ≥44pt**：語言鈕與 CTA 加大可點區（padding 或 hitArea）
- [ ] **主 CTA 做成實心厚圓角按鈕**，每畫面一個明確主要動作
- [ ] **安全區**：確認 HUD 頂端在瀏海/Dynamic Island 下不被遮，必要時加上 inset
- [ ] **reduced-motion**：答案預覽淡入、維度名稱淡入判斷 `prefers-reduced-motion`

## Tier 2 — 美術 & 音效 ✅ 完成（程式管線）
實作見 `docs/superpowers/plans/2026-07-01-mbti-jump-art-audio.md`（10 tasks，全數審查通過，最終 whole-branch review = READY）。
- [x] BootScene 容錯載入管線 + 網頁字體（Fredoka/Nunito）
- [x] `config/assets.ts` asset key 清單
- [x] 四族群色票 `theme/palette.ts` + `core/temperament.ts`（結算族群色 + 族群名稱五語）
- [x] 視差背景 `gfx/Background.ts`（缺圖降純色）
- [x] Player/Platform 真 texture 優先（缺檔用程式美術）
- [x] SFX 觸發點 + 靜音鈕（缺音檔靜音、no-op）
- [x] **音效素材放進 `public/assets/audio/`** ✅ 5 段 .ogg（Juhani Junkala 512 SFX，CC0，ffmpeg 轉 Ogg Vorbis），browser 驗證解碼成功。
- [x] **美術：改用程式美術（proc art）** ✅ 使用者回饋 Kenney 點陣圖不好看 → 全數還原：
  - 主角：百變怪風格紫色液體怪（點點眼＋微笑），跳躍時 Elastic 壓扁回彈（果凍感）；reduced-motion 略過變形
  - 台階：還原純色圓角方塊（藍灰/綠 Yes/紅 No）
  - 背景：`gfx/Background.ts` 重寫為氛圍層——閃爍星點＋飄動蝴蝶/蜜蜂/小鳥＋各維度天象（0 流星／1 極光／2 下雨／3 螢火蟲），移除「一層層山」；MBTI 四色底透在最後（修正先前被深色 bg 蓋掉變黑的問題）
  - `IMAGE_MANIFEST` 清空（不載點陣圖）；ASSET_KEYS 與 fallback 判斷保留，日後要換回點陣素材可加回
  - 小尾巴（延後）：氛圍元素數量/顏色可再依喜好微調
- Tier 2 延後小項（final review 記錄，非阻斷）：Button hover/down 色入色票、BootScene 載入指示、Platform proc-key 常數清理。

## Tier 3 — 內容 & 上線
- [ ] `ja`/`es` 譯文母語校稿（目前 AI 草稿，已標 `needs-review`）
- [ ] 人格文案深度（現為四字母組句；可升級 16 型各自文案）
- [ ] 部署 Vercel / Cloudflare Pages（靜態 `dist/`）
- [ ] 分享頁 OG image（可能需輕量邊緣函式）

## 需要你的部分
- [ ] **實機試玩確認手感**：無縫維度轉場節奏、分叉間距、難度（自動化無法代替真人手感測試）

---

## 建議順序
Tier 1（介面手感）＋幾個 Tier 0 快修 → 先讓遊戲立即變好按、且不必等你試玩；
接著進 Tier 2 美術/音效（建議先 brainstorm 定風格/色票/音效觸發點，再實作，並加 BootScene）；
最後 Tier 3 內容與上線。
