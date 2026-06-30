# 素材採購清單 — MBTI Jump

- 日期：2026-06-30
- 用途：MVP 用程式美術，本清單為「之後替換正式美術／加音效」的預備來源。
- 原則：**以免費為主，優先 CC0（免標示）**，CC-BY 次之（需在 [`CREDITS.md`](../CREDITS.md) 標示作者）。
- 解耦對應：依設計文件，換美術只需替換 `BootScene` 載入的貼圖／音檔，不動遊戲邏輯。

> ⚠️ 抓素材時務必確認單一檔案的授權（同站不同作品授權可能不同），並立刻登記到 [`CREDITS.md`](../CREDITS.md)。

---

## 一、依模組對應的需求

| 需求 | 對應模組 | 風格備註 |
|---|---|---|
| 玩家角色（彈跳） | `entities/Player.ts` | Doodle Jump 式，可愛、好讀 |
| 普通平台 / Yes·No 分叉台階 | `entities/Platform.ts` | 左右兩塊、中間留空隙 |
| 視差背景（直式往上爬） | `scenes/GameScene.ts` | 天空 / 雲 / 山，portrait |
| 題目橫幅、按鈕、結算面板 | `ui/QuestionBanner.ts`, `scenes/ResultScene.ts` | 圓潤、手機單手可讀 |
| 字型 | UI 全域 | 圓體 / 手寫感 |
| 背景音樂（遊玩 / 過關 / 結算） | `BootScene` 載入 → 各 Scene 播放 | 輕快循環 + 過關 jingle + 結算 fanfare |
| 音效（跳躍 / 落地 / 選答 / 掉落） | `GameScene`, `LevelTransitionScene` | 短促回饋 |

---

## 二、圖片 / 美術（優先 CC0）

### ⭐ 首選：Kenney（全站 CC0，風格一致、免標示）
一次抓齊角色／平台／UI／音效，最符合 MVP「替換貼圖、不動邏輯」的解耦設計。

| 資源 | 授權 | 用途 |
|---|---|---|
| [Jumper Pack](https://kenney.nl/assets/jumper-pack) | CC0 | ⭐ 為彈跳遊戲設計，含角色＋平台 |
| [New Platformer Pack](https://kenney.nl/assets/new-platformer-pack) | CC0 | 平台、可組分叉台階 |
| [Platformer Pack Redux](https://kenney.nl/assets/platformer-pack-redux) | CC0 | 多款角色 spritesheet |
| [Background Elements Redux](https://kenney.nl/assets/background-elements-redux) | CC0 | 視差雲 / 山 / 天空 |
| [UI Pack](https://kenney.nl/assets/ui-pack) | CC0 | 按鈕、面板、分享鈕 |
| [Kenney Fonts](https://kenney.nl/assets/kenney-fonts) | CC0 | 圓潤字型 |
| [Game Assets All-in-1](https://kenney.nl/assets) | CC0 | 全站一次打包 |

### 備援：素材庫（混合授權，需逐件確認）
| 資源 | 授權 | 備註 |
|---|---|---|
| [OpenGameArt.org](https://opengameart.org/) | 混合 | 用標籤過濾 `CC0`；搜 `doodle jump` / `platformer character` |
| [itch.io 免費素材](https://itch.io/game-assets/free) | 混合 | 過濾 Free；確認個別授權 |
| [Game-icons.net](https://game-icons.net/) | CC-BY 3.0 | 大量向量圖示，可做 MBTI 維度圖示 |

---

## 三、音樂（免費；CC0 / 免標示優先）

| 資源 | 授權 | 用途 |
|---|---|---|
| [Pixabay Music](https://pixabay.com/music/) | Pixabay授權（免標示） | casual / chiptune 循環，搜 `loop` |
| [FreePD](https://freepd.com/) | CC0 / PD | 過關 jingle、結算 fanfare 短曲 |
| [OpenGameArt — CC0 Upbeat/Electronic](https://opengameart.org/content/cc0-upbeat-electronic-music) | CC0 | 遊玩背景循環 |
| [Incompetech (Kevin MacLeod)](https://incompetech.com/music/royalty-free/music.html) | CC-BY（需標示） | 品質高、量大；「Game」分類輕快曲 |

---

## 四、音效 SFX（優先 CC0）

| 資源 | 授權 | 用途 |
|---|---|---|
| [Kenney — Interface Sounds](https://kenney.nl/assets/interface-sounds) | CC0 | 點擊、確認、選答 |
| [Kenney — Digital Audio](https://kenney.nl/assets/digital-audio) | CC0 | 彈跳、提示音 |
| [Kenney — Impact Sounds](https://kenney.nl/assets/impact-sounds) | CC0 | 落地、game over |
| [OpenGameArt — 100 CC0 SFX](https://opengameart.org/content/100-cc0-sfx) | CC0 | 雜項補充 |
| [Freesound](https://freesound.org/) | 多為 CC0/CC-BY | 找特定「boing / jump」彈跳聲，過濾 CC0 |

---

## 五、挑選建議（懶人路線）

1. **美術 = Kenney 一套（CC0）** → 風格統一、完全免標示。
2. **音樂 = Pixabay 或 FreePD（免標示）** → 最省事；要更好聽再上 Incompetech（記得標示）。
3. **音效 = Kenney 音效包（CC0）** → 與美術同來源、品質穩定。
4. 抓任何 **CC-BY** 素材 → 立刻登記到 [`CREDITS.md`](../CREDITS.md)，並在結算頁放 Credits 連結。

> 授權避雷：盡量避開 **CC-BY-SA / GPL** 類「傳染性」授權的程式碼型素材，以免影響專案授權彈性；單純美術／音檔的 SA 影響較小但仍建議優先選 CC0。
