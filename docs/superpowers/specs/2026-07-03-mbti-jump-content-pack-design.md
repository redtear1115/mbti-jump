# MBTI Jump — 內容包（16 型專屬文案＋好友對比深化）設計文件

- 日期：2026-07-03
- 狀態：已通過 brainstorm（口味樣本已校準），待寫實作計畫
- 背景：分享含金量的內容槓桿。現行描述為四字母模板組句（乾）；好友對比僅五句「重合數」文案。本包給 16 型各自的原創綽號＋有梗描述（貫穿結果頁/分享文字/分享卡/OG），並把好友對比升級為「維度對照視覺＋族群配對文案」。

## 一句話描述

16 型各得原創綽號與被說中式描述（`type.<TYPE>.name/.desc`，貫穿所有分享面、OG 重生成）；有邀請時結果頁顯示族群配對句（10 種無序組合）＋四維度字母對照列。

## A. 16 型專屬文案

### 內容規格
- 每型兩欄位：`type.<TYPE>.name`（原創綽號，避開 16personalities 註冊名稱）、`type.<TYPE>.desc`（1–2 句，被說中感＋恭維＋自嘲梗）。
- 16 × 2 × 5 語 = 160 條。zh-Hant 為創作主稿（本 spec 定稿）；en 對應創作（非直譯，實作計畫內定稿）；zh-Hans 由 zh-Hant 轉換；ja/es AI 草稿標 needs-review。

### zh-Hant 主稿（定稿）

| 型 | name | desc |
|---|---|---|
| INTJ | 沉默軍師 | 你早就推演完三步後的局，只是懶得解釋。朋友不多，但每個都經過嚴格審核。 |
| INTP | 腦內宇宙 | 你的腦袋 24 小時都在跑實驗，回訊息除外。想通一件事的快樂，勝過十次聚會。 |
| ENTJ | 天生總指揮 | 你三歲就想接管幼稚園。地球沒照你的計畫轉，你認為是地球的問題。 |
| ENTP | 抬槓鬼才 | 你辯論不是為了贏，是為了好玩——雖然通常也贏了。點子多到自己都來不及用。 |
| INFJ | 溫柔預言家 | 你看得穿別人沒說出口的事，自己卻是一本上鎖的日記。溫柔，但底線硬得像鋼。 |
| INFP | 夢遊詩人 | 你在腦內開過一百場演唱會，散場時觀眾只有自己。溫柔是你的超能力——拖延也是。 |
| ENFJ | 暖場隊長 | 你天生知道怎麼讓每個人發光，卻常忘了留一盞燈給自己。朋友圈的黏著劑。 |
| ENFP | 人形煙火 | 你的熱情能點亮整條街，專注力大概能維持三分鐘。想到就衝，通常都沒事。 |
| ISTJ | 靠譜磐石 | 你說會做到的事，天塌下來也會做到。備份的備份都有備份。 |
| ISFJ | 人間暖爐 | 你記得所有人的生日和忌口，卻常忘了自己也需要被照顧。低調，但少了你全場會垮。 |
| ESTJ | 秩序隊長 | 你看到混亂就手癢，開會沒結論你會物理性不適。世界靠你這種人準時運轉。 |
| ESFJ | 全場管家 | 聚會是你辦的、場面是你圓的、大家的近況你都熟。你的愛具體到會出現在便當裡。 |
| ISTP | 冷面工匠 | 話不多，手很巧，東西壞了你先拆再說。冷靜到像沒在聽，其實全都記得。 |
| ISFP | 安靜藝術家 | 你不爭不搶，但審美從不妥協。世界太吵的時候，你就躲進自己的小宇宙創作。 |
| ESTP | 行動派玩家 | 先做再說是你的座右銘，計畫是別人的事。危機現場最冷靜的人，通常是你。 |
| ESFP | 派對主角 | 你一進場，氣氛就自動調亮兩度。人生是舞台，你從不怯場。 |

（en 樣本校準：INFP "The Daydream Poet — You've held a hundred concerts in your head, audience of one. Kindness is your superpower. So is procrastination."；ENTJ "The Born Commander — You tried to take over kindergarten at three. If Earth won't follow your plan, that's Earth's problem."）

### 貫穿接線（單一真相原則）
- `describeType(type, locale)` 內部改讀 `t('type.<TYPE>.desc')`；簽名與驗證（4 碼合法字母）不變 → 結果頁描述、`result.share` 文字、OG meta description 自動跟隨。
- 新 `typeName(type, locale)`（同檔 `personalities.ts`）讀 `type.<TYPE>.name`。
- **結果頁族群行**：`result.groupLabel` 顯示改為組合「`<name> · <群名>`」——實作於 `buildShareCardModel.groupName` 欄位改組合字串（分享卡＋OG 卡自動跟隨），ResultScene 族群行同步用組合字串；`group.*` keys 保留（invite 對比等處仍用）。
- **OG title**：`og.title` 佔位改傳「`<TYPE> <name>`」（如「我是 INFP 夢遊詩人！」）。
- 退役 keys（五語同步刪）：`personality.template`、`trait.E/I/S/N/T/F/J/P`（共 9 條）。
- **OG 80 張重生成**（描述與族群行變）。

## B. 好友對比深化（有邀請時的結果頁）

### 1. 族群配對文案（取代 compare.0–4）
- `pairKey(a: Group, b: Group): StringKey`——無序正規化（依固定順序 explorer<diplomat<analyst<sentinel 排序組合），共 10 種 `pair.<g1>_<g2>` key × 5 語 = 50 條；佔位 `{0}` = 重合字母數。
- zh-Hant 主稿（定稿）：

| 組合 | 文案 |
|---|---|
| diplomat_diplomat | 外交官 × 外交官——兩顆真心互相取暖，聊到天亮都嫌不夠（你們有 {0} 個字母相同） |
| analyst_analyst | 分析師 × 分析師——鬥智鬥得很開心，吵架都像學術研討（你們有 {0} 個字母相同） |
| sentinel_sentinel | 守護者 × 守護者——可靠遇上可靠，行程表都對得整整齊齊（你們有 {0} 個字母相同） |
| explorer_explorer | 探險家 × 探險家——說走就走的兩個人，冒險路上互相接應（你們有 {0} 個字母相同） |
| explorer_diplomat | 外交官 × 探險家——理想加上行動力，隨時可能改變世界（你們有 {0} 個字母相同） |
| explorer_analyst | 分析師 × 探險家——想得深遇上跑得快，互補到有點好笑（你們有 {0} 個字母相同） |
| explorer_sentinel | 守護者 × 探險家——一個踩油門、一個握方向盤，剛好平衡（你們有 {0} 個字母相同） |
| diplomat_analyst | 外交官 × 分析師——理想派負責作夢，邏輯派負責讓夢成真（你們有 {0} 個字母相同） |
| diplomat_sentinel | 外交官 × 守護者——一個畫藍圖、一個蓋地基，穩穩的溫柔（你們有 {0} 個字母相同） |
| analyst_sentinel | 分析師 × 守護者——策略遇上執行，最強的落地組合（你們有 {0} 個字母相同） |

- 退役：`compare.0`–`compare.4`（五語同步刪）；`core/compare.ts` 的 `compareKey` 退役、`sharedLetters` 保留（配對句佔位用）。

### 2. 維度對照列（純視覺、零 i18n）
- 四組並排置中，每維度：**同字母** → 一顆該字母色圓章（深字）＋2px `PALETTE.accent` 描邊；**異字母** → 兩顆小章並列（我的 = 字母色底深字、好友的 = `#ffffff22` 底灰字 `#8888aa`）。章高 22、圓角 11、組間距 16；用既有 `chipRect` 幾何。
- 佈局（有邀請時）：配對句 y=522（14px、白、wrap）→ 對照列 y=552 → 按鈕下移 595/658/718（底部 743，餘裕夠）。無邀請時按鈕維持現位 585/650/712。

## 明確不做（YAGNI）

- 假統計稀有度（無數據來源不上）；配對分數/百分比。
- 開始頁打招呼變動；分享卡版式變動（只換文字內容）。
- ja/es 母語校稿（照慣例標 needs-review 延後）。

## 測試與驗證

- completeness 測試自動把關新增/退役 keys 五語同步（+210、−14）。
- `personalities.test.ts`：`describeType` 斷言改新內容來源；`typeName` 合法/非法輸入。
- `pairKey` 單測：無序性（(a,b)==(b,a)）、10 種組合對應存在的 key、同族組合。
- ResultScene 佈局：截圖驗收（無邀請／有邀請兩態）；OG 抽查 3 張。
- 既有測試全綠、`tsc --noEmit` 乾淨。

## 驗收標準

1. 結果頁顯示「型別＋綽號＋新描述」，讀起來有被說中感；分享卡/OG/分享文字同步。
2. 有邀請時：族群配對句＋維度對照列一眼看出同與互補；無邀請版面不變。
3. 全站無模板組句殘留；退役 keys 清乾淨。
