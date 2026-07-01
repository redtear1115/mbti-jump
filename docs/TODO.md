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

## Tier 2 — 美術 & 音效 ✅ 完成（程式管線）
實作見 `docs/superpowers/plans/2026-07-01-mbti-jump-art-audio.md`（10 tasks，全數審查通過，最終 whole-branch review = READY）。
- [x] BootScene 容錯載入管線 + 網頁字體（Fredoka/Nunito）
- [x] `config/assets.ts` asset key 清單
- [x] 四族群色票 `theme/palette.ts` + `core/temperament.ts`（結算族群色 + 族群名稱五語）
- [x] 視差背景 `gfx/Background.ts`（缺圖降純色）
- [x] Player/Platform 真 texture 優先（缺檔用程式美術）
- [x] SFX 觸發點 + 靜音鈕（缺音檔靜音、no-op）
- [ ] **⚠️ 剩下：把二進位素材放進 `public/assets/`** 才會看到真美術/音效（程式已就緒，drop-in 自動生效）：
  - 圖 `public/assets/sprites/`：`player.png`、`platform-normal|yes|no.png`、`bg-sky|clouds|hills.png`（Kenney CC0）
  - 音 `public/assets/audio/`：`bounce|select|advance|result|gameover.ogg`（Kenney/Freesound CC0）
  - 取用 CC-BY 素材更新 `CREDITS.md`；來源見 `docs/assets-resources.md`
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
