# MBTI Jump — P3 打磨包（傾向條分段實色＋letterbox＋觸控目標＋海鷗）設計文件

- 日期：2026-07-03
- 狀態：已通過 brainstorm，待寫實作計畫
- 背景：UI/UX 路線圖 P3 小項＋使用者回饋「混色有點髒髒的——關卡中的傾向呈現以及結算卡的呈現」。髒感來源確認為傾向條的**跨字母色線性漸變**（如 E 黃→I 藍中段必然過渡為灰綠），出現在遊戲 HUD 得分條、結果頁維度條、分享卡／OG 圖維度條三處。

## 一句話描述

傾向條由「左右色漸變」改為「分隔線兩側各填純色」的分段實色畫法（三處＋OG 重生成）；桌面 letterbox 加 CSS 妝點；語言 chips 與靜音鈕觸控目標達 44pt（靜音鈕順便換程式向量 icon）；海鷗剪影加大改 M 形。

## 設計決策

### 1. 傾向條分段實色（核心修正）
- **畫法**：條底以分隔位置切成兩段——左段填左字母 `LETTER_COLORS` 純色、右段填右字母純色，硬邊交界；白色分隔線（既有粗細/旋鈕樣式）壓在交界上。圓角維持既有（用整條圓角遮罩效果：先畫整條左色圓角矩形、再以矩形填右段蓋右半，最後右端以右色圓角矩形補圓角——或等效簡化：左色整條圓角底＋右色「右段矩形＋右端圓角」兩筆）。
- 實作註記（三處同一策略，程式各自對應）：
  - `src/scenes/GameScene.ts` `drawScoreBar()`：替換 `fillGradientStyle` 段。字母圓章、分隔線＋旋鈕、位置尺寸不變。
  - `src/scenes/ResultScene.ts` `drawBars(progress)`：替換每條的 `fillGradientStyle` 段；divider 動畫（0.5→dividerFrac）不變，分段填色以**當前動畫位置**為切點（動畫過程左右佔比跟著動）。
  - `src/share/draw.ts` `drawDimBars()`：替換 `createLinearGradient` 段（canvas 2D 版）；直式分享卡與 OG 圖共用。
- **OG 重生成**：`npm run generate:og` 重產 81 張 PNG 進版控；目視抽查 3 張（zh-Hant/ja/en 各一）。

### 2. 桌面 letterbox 妝點（`index.html` 純 CSS）
- `body` 背景改深色放射漸變：`radial-gradient(circle at 50% 38%, #232640 0%, #14162a 55%, #0d0e1c 100%)`（surface 色系加深）。
- `@media (min-width: 500px)`：`#app canvas { border-radius: 18px; box-shadow: 0 24px 80px rgba(0,0,0,0.55); }`——寬螢幕如懸浮裝置；行動裝置（<500px）不套用、維持滿版。
- 不動 viewport meta、不動 Phaser Scale 設定。

### 3. 觸控目標 ≥44pt
- **語言 chips**（`StartScene`）：`padding` x 6→10、y 12→14（13px 字＋上下 14 → 高約 45px）；`fixedWidth: 76` 與 `chipPitch: 84` 不變（間距仍 8px）。
- **靜音鈕**（`src/ui/MuteButton.ts`）：
  - 🔊/🔇 emoji 換成 `src/ui/icons.ts` 新增兩個 kind：`'sound-on'`（喇叭＋兩道聲波弧）、`'sound-off'`（喇叭＋斜線），24×24 白色繪製、使用端 `setTint(0xaab0cc)`。
  - 顯示尺寸 22×22；輸入改掛在 **44×44 透明 Zone**（中心同座標），點擊切換 mute 並換 texture。
  - depth 50、scrollFactor 0、右上角位置不變；全站最後一個 emoji icon 清除。

### 4. 海鷗剪影加大
- `src/gfx/Background.ts` `TEX.bird`：22×10 → **30×14**；線寬 1.8 → **2.2**；雙弧圓心改為 (8,9) 與 (22,9)、半徑 7，弧角維持 200°–340°，兩弧在中點 (15) 相接成「M」形剪影；顏色透明度不變。

## 明確不做（YAGNI）

- 果凍怪本體混色（P2 白基底＋族群色終態已定；髒感來源為傾向條，非主角）。
- 其他背景氛圍元素調整、分享卡版式變動（只換條的填色）。
- 行動版 canvas 圓角。

## 測試與驗證

- 純視覺包，無新純函式；既有 133 測試全綠、`tsc --noEmit` 乾淨。
- 截圖驗收：遊戲得分條（有票數狀態）、結果頁維度條（動畫結束態）、新分享卡維度條（下載 PNG 或 OG 抽查）、桌面寬視窗 letterbox、靜音鈕新 icon。
- OG 抽查：`public/og/zh-Hant/INFP.png`、`ja/ENTJ.png`、`en/ESTJ.png` 目視——維度條左右純色、無漸變髒段。

## 驗收標準

1. 三處傾向條左右皆為純字母色、交界乾淨、無灰濁過渡；divider 動畫仍順。
2. 寬螢幕 letterbox 有質感（漸變底＋圓角陰影 canvas）；手機滿版不變。
3. 語言 chips 與靜音鈕觸控高度 ≥44px；靜音鈕為向量 icon。
4. 海鷗一眼可辨為鳥。
