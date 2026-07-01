# MBTI Jump — TODO（介面 + 架構 review 彙整）

日期：2026-07-01
來源：ui-ux-pro-max 介面 review + 架構體檢 agent。核心遊戲（五語 i18n、無縫爬塔、鍵盤、取向 HUD、計分、結算）已完成且穩定；以下為改進項，依優先序分層。

> 兩份完整報告（暫存、未進版控）：`.claude/scratch-ui-review.md`、`.claude/scratch-arch-review.md`

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

## Tier 2 — 美術 & 音效（下一個主要階段）
> 前置：先做 BootScene，其餘才好接。
- [ ] **新增 `BootScene`**（`preload()` 載圖/載音 → `scene.start('Start')`；順便把 iOS 體感權限請求移過來）← 美術/音效的頭號 enabler
- [ ] （選）`config/assets.ts` 集中 asset key，避免字串打錯
- [ ] 替換程式美術為 Kenney 精靈：玩家、平台、Yes/No 台階、視差背景（`ensureTexture` 改為 preloaded key）
- [ ] **字體**：Fredoka（標題）+ Nunito（內文）或 Kenney 圓體
- [ ] **色票 `theme/palette.ts`**：語意色（primary/accent/yes/no/surface…），統一散落的硬編碼色；方向 claymorphism（柔和厚圓角、toy-like、深底提高彩度 + 金色 accent）
- [ ] **音訊**：BGM 循環 + 跳躍/落地/選答/過關 SFX
- [ ] 取用 CC-BY 素材時更新 `CREDITS.md`
- 素材來源：`docs/assets-resources.md`（Kenney CC0 等）

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
