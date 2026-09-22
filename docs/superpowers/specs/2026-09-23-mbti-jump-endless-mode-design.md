# MBTI Jump — 無限模式（Endless）設計規格

- 日期：2026-09-23（Asia/Taipei）
- 狀態：規格已拍板（含解鎖與 §14；**尚未改碼**）
- 觸發：用戶想「一直跳、不答題」，結束後可分享「跳了幾層」
- 產品約束（本次追加）：**至少完成一場經典測驗後，才解鎖無限模式**

---

## 1. 一句話

在「經典：跳著測 MBTI」旁，加第二模式「無限：只跳不答題」；以**層數**為唯一成績口徑，掉落後結算並可分享；入口預設鎖定，完成 ≥1 場經典後解鎖。

---

## 2. 目標與非目標

### 目標
- 給「只想跳」的玩家一條清楚路徑，不稀釋人格測驗主線。
- 成績可分享、可累積成就（層數／局數）。
- 與現有五語 i18n、Mute、safe-area、果凍 v2 動態相容。

### 非目標（YAGNI／本版不做）
- 不在經典四關內「跳過題目變無限」。
- 不做排行榜／帳號／雲端同步。
- 不做移動平台、破碎平台等複雜機關（v1 固定難度曲線即可）。
- 不把無限局寫進人格「趨勢」統計（避免污染 MBTI 資料）。
- 不產 16 型 OG；無限分享用獨立卡片／文案。

---

## 3. 資訊架構（IA）

### 場景關係（建議）

```
Boot → Start
         ├─ 開始（經典）→ Game（quiz）→ Result → Start / Trend
         ├─ 無限跳     → EndlessGame → EndlessResult → Start / Achievements
         │    └─ 未解鎖：點了出鎖態說明，不進局
         ├─ 趨勢（僅經典 plays）
         └─ 成就（經典成就 + 無限成就同頁分區或混排＋標籤）
```

| 畫面 | 職責 |
|---|---|
| **Start** | 主 CTA＝經典「開始」；次級＝「無限跳」（鎖／解鎖兩態） |
| **Game** | 既有經典；不變 |
| **EndlessGame** | 新場景（或 `Game` 帶 `mode:'endless'` 旗標）；無題目分叉 |
| **EndlessResult** | 層數舞台＋再跳／回開始／分享（可複用 Button 族） |
| **Achievements** | 納入無限相關徽章；**解鎖條件不讀經典 tallies** |
| **Trend** | **不**計入無限局 |

### 開始頁按鈕層級（解鎖後）

1. **開始**（綠，主）→ 經典  
2. **無限跳**（次級實心或 outline；建議用 accent／另一色，勿與「趨勢」藍紫搶成三主色並列過久——可把趨勢／成就維持現高，無限放在「開始」正下方、趨勢之上）  
3. 趨勢／成就維持現況  

**未解鎖時**：「無限跳」呈現鎖態（鎖 icon＋較暗），點擊 → 短提示，不開新場景。

---

## 4. 解鎖規則（本次關鍵）

### 規則
- **解鎖條件**：`getPlays().length >= 1`（既有 `PlayRecord`：完成一場經典並寫入 profile）。
- **未解鎖**：不可進入 EndlessGame。
- **已解鎖**：永久（清趨勢／清資料若會清空 plays，則可能重新上鎖——見下）。

### 與「清除資料」一致性
- 若使用者在趨勢頁兩步清除 **plays**，無限應**重新上鎖**（條件仍是 plays≥1）。
- UI 提示文案需可理解：「先玩一場測人格，即可解鎖無限跳」。

### 首次解鎖回饋（建議）
- 經典 Result 結束、若本場使 `plays` 從 0→1：Result 或返回 Start 時給一次輕量提示（toast／一行文案）「無限跳已解鎖」；不擋分享主流程。

### 驗證
- 新帳號（無 plays）：Start 無限為鎖；點擊有說明。  
- 完成一場經典：回 Start 無限可點；進局無題。  
- 清除 plays：無限再上鎖。

---

## 5. 使用流程

### 5.1 未解鎖
1. Start → 點「無限跳」  
2. 提示：「先完成一場測驗即可解鎖」＋可選「去開始」聚焦主 CTA  
3. 不進局

### 5.2 已解鎖一局
1. Start →「無限跳」→ EndlessGame（果凍色可用上次經典最終色或基底白；建議**記住上次經典結果色**當皮膚，沒有則 `PLAYER_BASE_COLOR`）  
2. 只跳中性台階；HUD 顯示層數  
3. 掉落（既有 `fallMargin` 邏輯）→ EndlessResult  
4. 主 CTA「再跳一次」；次「分享」；次「回開始」  
5. 寫入**無限專用紀錄**（見 §8）；結算可跳成就 toast（僅無限徽章）

### 5.3 與經典穿插
- 任何時候可回 Start 選經典；兩模式進度分離。

---

## 6. 玩法規則（EndlessGame）

### 台階
- **只生成普通平台**（隨機寬 `platformWidthMin–Max`），**不插入** Yes／No 題目分叉。  
- 垂直間距起步可用現有 `platformGapY`；v1 可不做難度爬升（或極輕：每 N 層 gap +2px，封頂）。

### 「層」的定義（唯一口徑）
- **層數 `floors`**＝本局成功踩到（觸發 bounce）的平台次數。  
- 同一平台連續彈跳若物理上會多次 bounce：以「每次 `bounce()` 且相對上次落地平台 id 不同」計 1 層；實作時用 platform instance id／生成序號去重。  
- HUD 與分享、成就、最高分**全部用同一 `floors`**。  
- 不使用「相機捲動像素／ ent」當對外文案，免爭議。

### 死亡
- 與經典相同：掉出相機底部 + `fallMargin`。  
- **無** GameOver「同場續玩保留維度」——無限掉落＝本局結束進 EndlessResult（可在結果頁「再跳一次」開新局）。  
  - 理由：無限沒有「已鎖維度」；續玩會模糊「一局層數」分享口徑。

### 控制
- 與經典相同：鍵／點／傾斜；Mute；safe-area。  
- 首次無限可選擇性跳過答題導覽（`mbti-jump.tutorial.v1` 是經典用）；無限另可做一行「左右移動，別掉下去」極短提示（可選，非 P0）。

### reduced-motion
- 果凍拉伸／濺射沿用現有略過規則。

---

## 7. HUD（EndlessGame）

### 佈局（450×800）
- **拿掉**：題目 banner、左右答案 chip、維度得分條、關卡「第 n 關」。  
- **保留／改為**：
  - 底部或頂部一體深色卡（建議底部，與經典「上方視野留給跳」一致）：  
    - 大號 **層數**（例：「128」）  
    - 小號標籤「層」／`endless.floorsLabel`  
    - 可選：本機最高「最佳 240」  
  - Mute 右上（safe-area）

### 視覺層級
- 層數是唯一主訊息；最佳分為次要。  
- 勿再放人格字母色條，以免以為還在測。

### 驗證
- 320 寬邏輯縮放下數字不裁切；與果凍／平台無重疊誤觸。

---

## 8. 資料模型

### 不寫入
- `PlayRecord` / `getPlays()`（經典趨勢、經典成就的 plays 來源）

### 新增（建議）
```ts
// localStorage key 例：mbti-jump.endless
interface EndlessProfile {
  bestFloors: number;
  runs: number;           // 完成局數（掉落結算才 +1）
  totalFloors: number;    // 累計層數（可選，給成就用）
  lastSkinType?: string;  // 可選：上次經典 TYPE，供染色
}
```
- 每局結束：`runs++`；`bestFloors = max(best, floors)`；`totalFloors += floors`。  
- 成就解鎖改讀 `EndlessProfile`（或獨立 `endlessRuns` 列表）；**不要**塞進 `PlayRecord.type`。

### 清除資料
- 趨勢「清除」若只清 classics：文件中需寫明是否同時清 endless。  
  - **建議**：清除確認文案改為「清除測驗紀錄」；endless 另提供或同一清除一併清空並重新上鎖。產品二選一寫死，避免靜默。

---

## 9. 結算與分享（EndlessResult）

### 版面（對齊 Result 按鈕族）
1. 標題：`endless.resultTitle`（例：「跳到這裡」）  
2. 超大層數  
3. 若創新高：徽章「新紀錄」  
4. 副文：最佳／本局對照一句  
5. 果凍（可選）：用 `lastSkinType` 色或白基底＋落地投影  
6. 按鈕（上→下）：**分享**（主綠）→ **再跳一次**（琥珀）→ **回開始**（次級）  
   - 垂直間距沿用 `layoutResultButtons` 精神（≥16／≥8）

### 分享內容
- **文案**：`我在 MBTI Jump 無限模式跳了 {n} 層！`（五語）  
- **圖**：簡易卡 1200×630（可 build 時一張通用底＋執行期 canvas 畫數字；或固定底圖＋Web Share 純文字先做）  
  - v1 可先：**Web Share 文字＋層數**；圖卡為 v1.1  
- **連結**：首頁 `/?utm=endless` 或 `/endless`（若 deep link）；**不要**用 `/t/<TYPE>`，以免以為是人格結果。  
- 好友對比／邀請橫幅：**不適用**無限結算。

### 驗證
- 分享字串層數＝本局 HUD 最終值。  
- 經典 Result 分享路徑零改動。

---

## 10. 成就

### 原則
- 無限成就 **只**看 `EndlessProfile`。  
- 經典 8 鑽成就邏輯不變；`first_play` 等仍只看經典 plays。  
- 成就頁：無限徽章加小標「無限」或分節「無限跳」。

### 建議首批（可調數字）

| id | 條件 | 進度 |
|---|---|---|
| `endless_unlock` | 經典 plays≥1（與入口解鎖同一條件；進成就頁也可顯示） | 0/1 |
| `endless_first` | runs≥1 | 0/1 |
| `endless_50` | bestFloors≥50 | best/50 |
| `endless_100` | bestFloors≥100 | best/100 |
| `endless_250` | bestFloors≥250 | best/250 |
| `endless_runs_10` | runs≥10 | runs/10 |

- 結算 toast：僅提示**本局新解鎖**的無限成就（沿用既有 toast，注意堆疊小尾巴仍可延後）。

---

## 11. 文案 key（示意）

- `endless.cta` / `endless.ctaLocked`  
- `endless.lockHint`（先完成一場測驗…）  
- `endless.unlockedToast`  
- `endless.floorsLabel` / `endless.best`  
- `endless.resultTitle` / `endless.newBest`  
- `endless.shareText`（含 `{0}` 層數）  
- `endless.again` / `endless.back`  
- 成就名／述：`ach.endless_*.name/.desc`  
- ja／es：可先 AI＋`needs-review`

---

## 12. 實作分期（給之後開 PR 用，本文件不改碼）

### P0（最小可分享）
1. 解鎖閘門（plays≥1）＋ Start 鎖態／提示  
2. EndlessGame 無分叉＋ floors HUD  
3. EndlessResult＋再跳／回開始  
4. EndlessProfile best／runs  
5. 分享文字  

### P1
- 分享圖卡；新紀錄特效；無限成就 4～6 枚；解鎖 toast  

### P2
- 輕度難度曲線；深連結；清除資料策略打磨  

---

## 13. 驗收清單

- [ ] 無經典場次時無法進無限；提示正確  
- [ ] 一場經典後解鎖；清 plays 後再鎖（若採連動清除）  
- [ ] 無限局無 Yes／No、無維度 HUD  
- [ ] 層數口徑一致（HUD＝結算＝分享＝成就）  
- [ ] 掉落進結算，而非經典 GameOver 續命  
- [ ] 趨勢頁數字不因無限局增加  
- [ ] 經典流程／分享／16 型 OG 無回歸  
- [ ] Mute／safe-area／reduced-motion 正常  

---

## 14. 已拍板（2026-09-23）

1. **入口位置**：「無限跳」插在 Start「開始」**正下方**（趨勢／成就維持更下方）。  
2. **清除資料**：清除測驗紀錄時**一併清除** `EndlessProfile`，並因 `plays < 1` **重新上鎖**；確認文案需寫明兩種資料都會沒。  
3. **果凍染色**：跟**上次經典結果 TYPE** 的混色；若尚無經典場次（理論上進得了無限時至少有 1 場）或缺少記錄 → `PLAYER_BASE_COLOR` 白。  

狀態：規格鎖定，**尚未改碼**。下一動可開 P0 實作 PR。

---

*設計審閱 · 僅規格，未改 repo*
