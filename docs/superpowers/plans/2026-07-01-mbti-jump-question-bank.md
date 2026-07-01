# MBTI Jump — 題庫擴充 + 隨機題組 (子專案 C) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 每維度題庫由 5 擴充到 10 題（共 40）；每場每維度以純函式從池中隨機抽 5 題（維持奇數不平手）；新題原創、五語翻譯（日西 needs-review）。抽題純函式可測；計分/爬塔流程與 A(趨勢)/B(成就) 不受影響。

**Architecture:** `config/questions.ts` 加 20 個 `QuestionDef`（每維度 6..10）；`core/pickQuestions.ts` 純函式以注入 rng 做 Fisher-Yates 抽樣；`GameScene` 每場每維度改用 `pickQuestions(...)` 抽 5；新題 `q.<id>.text/yes/no` × 五語。

**Tech Stack:** Vite, TypeScript (strict), Phaser 3, Vitest。純前端。

## Global Constraints

- 純前端、直式 portrait；每個 task 後 `npm run build` 與 `npm test` 必須綠。
- 純模組（`pickQuestions`、`questions`）**不得 import Phaser**、須單元測試；場景不在此限。
- 每維度 10 題，id `ei_1..ei_10` / `sn_1..sn_10` / `tf_1..tf_10` / `jp_1..jp_10`（保留 1..5，新增 6..10）。`yes.side`=維度第一字母（E/S/T/J）、`no.side`=第二字母（I/N/F/P）。
- 每場每維度隨機抽 `GAME.questionsPerLevel`（=5，奇數不平手）；`questionsPerLevel` 不變。
- i18n：新題 `q.<id>.text/yes/no` × 五語；`en` 權威；`ja`/`es` 為草稿（檔頭既有 `needs-review`）；完整性測試涵蓋。
- **順序關鍵**：新題的 i18n key 必須在 `config/questions.ts` 擴充（把新 id 納入 `QUESTIONS`）之前或同時加齊五語，否則 `completeness.test.ts` 會失敗。本計畫先加 i18n（T2、T3）再擴充 `QUESTIONS`（T4）。
- 計分、progression、爬塔流程、A/B 不得更動。

---

### Task 1: 隨機抽題純函式（`core/pickQuestions.ts`）

**Files:**
- Create: `src/core/pickQuestions.ts`
- Test: `src/core/pickQuestions.test.ts`

**Interfaces:**
- Consumes: `QuestionDef`（type, from `config/questions`）
- Produces: `function pickQuestions(pool: readonly QuestionDef[], count: number, rng: () => number): QuestionDef[]`

- [ ] **Step 1: 寫失敗測試 `src/core/pickQuestions.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { pickQuestions } from './pickQuestions';
import type { QuestionDef } from '../config/questions';

const pool: QuestionDef[] = Array.from({ length: 10 }, (_, i) => ({
  id: `q${i}`,
  dimension: 'EI',
  yes: { side: 'E' },
  no: { side: 'I' },
}));

/** 固定序列的假 rng（回 [0,1)），循環使用。 */
function seq(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('pickQuestions', () => {
  it('returns exactly count distinct questions from the pool', () => {
    const picked = pickQuestions(pool, 5, Math.random);
    expect(picked).toHaveLength(5);
    expect(new Set(picked.map((q) => q.id)).size).toBe(5);
    for (const q of picked) expect(pool).toContain(q);
  });

  it('does not mutate the input pool', () => {
    const before = pool.map((q) => q.id);
    pickQuestions(pool, 5, seq([0.1, 0.5, 0.9, 0.3, 0.7]));
    expect(pool.map((q) => q.id)).toEqual(before);
  });

  it('returns the whole pool (shuffled) when count >= pool length', () => {
    const picked = pickQuestions(pool, 20, seq([0.5]));
    expect(picked).toHaveLength(pool.length);
    expect(new Set(picked.map((q) => q.id))).toEqual(new Set(pool.map((q) => q.id)));
  });

  it('is deterministic for a fixed rng', () => {
    const nums = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
    const a = pickQuestions(pool, 5, seq(nums)).map((q) => q.id);
    const b = pickQuestions(pool, 5, seq(nums)).map((q) => q.id);
    expect(a).toEqual(b);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm test src/core/pickQuestions.test.ts`
Expected: FAIL — 找不到模組 `./pickQuestions`。

- [ ] **Step 3: 實作 `src/core/pickQuestions.ts`**

```ts
import type { QuestionDef } from '../config/questions';

/**
 * 從 pool 隨機抽 count 題（不重複、不變動 pool）。
 * 以注入的 rng()（回 [0,1)）做 Fisher-Yates 洗牌後取前 count；
 * count >= pool.length 時回全部（已洗牌）。
 */
export function pickQuestions(
  pool: readonly QuestionDef[],
  count: number,
  rng: () => number,
): QuestionDef[] {
  const arr = pool.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.min(count, arr.length));
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npm test`
Expected: PASS（含 pickQuestions 4 測試）。

- [ ] **Step 5: Commit**

```bash
git add src/core/pickQuestions.ts src/core/pickQuestions.test.ts
git commit -m "feat: add pickQuestions (seedable random sampling)"
```

---

### Task 2: 新題 i18n — EI + SN（五語，各 5 題）

**Files:**
- Modify: `src/i18n/strings/en.ts`, `zh-Hant.ts`, `zh-Hans.ts`, `ja.ts`, `es.ts`
- Test: 既有 `src/i18n/completeness.test.ts`

**Interfaces:**
- Produces（每語新增 30 key）：`q.ei_6..ei_10` 與 `q.sn_6..sn_10` 各 `.text/.yes/.no`。

> 加到各檔既有 `'q.sn_5.no'` 之後（或該檔任一處，只要在物件內）。`en` 權威；五檔都要加齊，否則 tsc/completeness 失敗。此時 `QUESTIONS` 尚未含這些 id（T4 才擴充），completeness 只要求既有 id，故加「多出來」的 key 不會失敗。

- [ ] **Step 1: `en.ts` 新增（EI + SN 各 5 題）**

```ts
  'q.ei_6.text': 'At a big gathering you tend to…',
  'q.ei_6.yes': 'Work the whole room',
  'q.ei_6.no': 'Stick with a few people',
  'q.ei_7.text': 'After a very social day you feel…',
  'q.ei_7.yes': 'Energized',
  'q.ei_7.no': 'Drained',
  'q.ei_8.text': 'Your ideal Friday night is…',
  'q.ei_8.yes': 'Out with friends',
  'q.ei_8.no': 'Cozy at home',
  'q.ei_9.text': 'In a group project you…',
  'q.ei_9.yes': 'Speak up early',
  'q.ei_9.no': 'Listen first',
  'q.ei_10.text': "You'd describe yourself as…",
  'q.ei_10.yes': 'Outgoing',
  'q.ei_10.no': 'Reserved',
  'q.sn_6.text': "You'd rather read about…",
  'q.sn_6.yes': 'How things work',
  'q.sn_6.no': 'What could be',
  'q.sn_7.text': 'You remember best…',
  'q.sn_7.yes': 'Concrete facts',
  'q.sn_7.no': 'Overall impressions',
  'q.sn_8.text': 'Instructions should be…',
  'q.sn_8.yes': 'Step by step',
  'q.sn_8.no': 'A general direction',
  'q.sn_9.text': "You're drawn to ideas that are…",
  'q.sn_9.yes': 'Proven',
  'q.sn_9.no': 'Novel',
  'q.sn_10.text': 'You notice first…',
  'q.sn_10.yes': 'What is',
  'q.sn_10.no': 'What if',
```

- [ ] **Step 2: `zh-Hant.ts` 新增**

```ts
  'q.ei_6.text': '大型聚會裡你傾向…',
  'q.ei_6.yes': '到處跟人互動',
  'q.ei_6.no': '跟少數人待著',
  'q.ei_7.text': '忙碌社交一整天後你…',
  'q.ei_7.yes': '精神變好',
  'q.ei_7.no': '精疲力盡',
  'q.ei_8.text': '理想的週五夜是…',
  'q.ei_8.yes': '和朋友出去',
  'q.ei_8.no': '窩在家裡',
  'q.ei_9.text': '小組合作時你…',
  'q.ei_9.yes': '很早就發言',
  'q.ei_9.no': '先聽再說',
  'q.ei_10.text': '你形容自己…',
  'q.ei_10.yes': '外向',
  'q.ei_10.no': '內斂',
  'q.sn_6.text': '你比較想讀…',
  'q.sn_6.yes': '事物如何運作',
  'q.sn_6.no': '未來有何可能',
  'q.sn_7.text': '你最記得的是…',
  'q.sn_7.yes': '具體事實',
  'q.sn_7.no': '整體印象',
  'q.sn_8.text': '說明最好是…',
  'q.sn_8.yes': '一步一步',
  'q.sn_8.no': '大方向就好',
  'q.sn_9.text': '你被哪種點子吸引…',
  'q.sn_9.yes': '已驗證的',
  'q.sn_9.no': '新奇的',
  'q.sn_10.text': '你先注意到…',
  'q.sn_10.yes': '現況是什麼',
  'q.sn_10.no': '可能會怎樣',
```

- [ ] **Step 3: `zh-Hans.ts` 新增**

```ts
  'q.ei_6.text': '大型聚会里你倾向…',
  'q.ei_6.yes': '到处跟人互动',
  'q.ei_6.no': '跟少数人待着',
  'q.ei_7.text': '忙碌社交一整天后你…',
  'q.ei_7.yes': '精神变好',
  'q.ei_7.no': '精疲力尽',
  'q.ei_8.text': '理想的周五夜是…',
  'q.ei_8.yes': '和朋友出去',
  'q.ei_8.no': '窝在家里',
  'q.ei_9.text': '小组合作时你…',
  'q.ei_9.yes': '很早就发言',
  'q.ei_9.no': '先听再说',
  'q.ei_10.text': '你形容自己…',
  'q.ei_10.yes': '外向',
  'q.ei_10.no': '内敛',
  'q.sn_6.text': '你比较想读…',
  'q.sn_6.yes': '事物如何运作',
  'q.sn_6.no': '未来有何可能',
  'q.sn_7.text': '你最记得的是…',
  'q.sn_7.yes': '具体事实',
  'q.sn_7.no': '整体印象',
  'q.sn_8.text': '说明最好是…',
  'q.sn_8.yes': '一步一步',
  'q.sn_8.no': '大方向就好',
  'q.sn_9.text': '你被哪种点子吸引…',
  'q.sn_9.yes': '已验证的',
  'q.sn_9.no': '新奇的',
  'q.sn_10.text': '你先注意到…',
  'q.sn_10.yes': '现况是什么',
  'q.sn_10.no': '可能会怎样',
```

- [ ] **Step 4: `ja.ts` 新增**

```ts
  'q.ei_6.text': '大人数の集まりでは…',
  'q.ei_6.yes': 'あちこちで交流する',
  'q.ei_6.no': '少人数と過ごす',
  'q.ei_7.text': '社交で忙しい一日の後は…',
  'q.ei_7.yes': '元気が出る',
  'q.ei_7.no': '疲れ果てる',
  'q.ei_8.text': '理想の金曜の夜は…',
  'q.ei_8.yes': '友達と外出',
  'q.ei_8.no': '家でまったり',
  'q.ei_9.text': 'グループ作業では…',
  'q.ei_9.yes': '早めに発言する',
  'q.ei_9.no': 'まず聞く',
  'q.ei_10.text': '自分を一言でいうと…',
  'q.ei_10.yes': '社交的',
  'q.ei_10.no': '控えめ',
  'q.sn_6.text': 'どちらを読みたい…',
  'q.sn_6.yes': '物事の仕組み',
  'q.sn_6.no': '未来の可能性',
  'q.sn_7.text': 'よく覚えているのは…',
  'q.sn_7.yes': '具体的な事実',
  'q.sn_7.no': '全体の印象',
  'q.sn_8.text': '説明は…',
  'q.sn_8.yes': '一歩ずつ',
  'q.sn_8.no': '大まかな方向',
  'q.sn_9.text': '惹かれるアイデアは…',
  'q.sn_9.yes': '実証済み',
  'q.sn_9.no': '斬新',
  'q.sn_10.text': '先に気づくのは…',
  'q.sn_10.yes': '今の現実',
  'q.sn_10.no': 'もしもの可能性',
```

- [ ] **Step 5: `es.ts` 新增**

```ts
  'q.ei_6.text': 'En una reunión grande sueles…',
  'q.ei_6.yes': 'Circular por toda la sala',
  'q.ei_6.no': 'Quedarte con unos pocos',
  'q.ei_7.text': 'Tras un día muy social te sientes…',
  'q.ei_7.yes': 'Con energía',
  'q.ei_7.no': 'Agotado',
  'q.ei_8.text': 'Tu viernes ideal es…',
  'q.ei_8.yes': 'Salir con amigos',
  'q.ei_8.no': 'Tranquilo en casa',
  'q.ei_9.text': 'En un trabajo en grupo…',
  'q.ei_9.yes': 'Hablas pronto',
  'q.ei_9.no': 'Escuchas primero',
  'q.ei_10.text': 'Te describirías como…',
  'q.ei_10.yes': 'Extrovertido',
  'q.ei_10.no': 'Reservado',
  'q.sn_6.text': 'Prefieres leer sobre…',
  'q.sn_6.yes': 'Cómo funcionan las cosas',
  'q.sn_6.no': 'Lo que podría ser',
  'q.sn_7.text': 'Recuerdas mejor…',
  'q.sn_7.yes': 'Hechos concretos',
  'q.sn_7.no': 'Impresiones generales',
  'q.sn_8.text': 'Las instrucciones deben ser…',
  'q.sn_8.yes': 'Paso a paso',
  'q.sn_8.no': 'Una dirección general',
  'q.sn_9.text': 'Te atraen las ideas…',
  'q.sn_9.yes': 'Probadas',
  'q.sn_9.no': 'Novedosas',
  'q.sn_10.text': 'Notas primero…',
  'q.sn_10.yes': 'Lo que es',
  'q.sn_10.no': 'Lo que podría ser',
```

- [ ] **Step 6: 驗證編譯、測試**

Run: `npx tsc --noEmit && npm test 2>&1 | tail -3`
Expected: 無型別錯誤；completeness 綠（五語鍵集一致）；prior 測試不變。

- [ ] **Step 7: Commit**

```bash
git add src/i18n/strings
git commit -m "feat: add EI/SN question strings ei_6..10, sn_6..10 (5 locales)"
```

---

### Task 3: 新題 i18n — TF + JP（五語，各 5 題）

**Files:**
- Modify: `src/i18n/strings/en.ts`, `zh-Hant.ts`, `zh-Hans.ts`, `ja.ts`, `es.ts`
- Test: 既有 `src/i18n/completeness.test.ts`

**Interfaces:**
- Produces（每語新增 30 key）：`q.tf_6..tf_10` 與 `q.jp_6..jp_10` 各 `.text/.yes/.no`。

- [ ] **Step 1: `en.ts` 新增（TF + JP 各 5 題）**

```ts
  'q.tf_6.text': 'A good decision is mostly…',
  'q.tf_6.yes': 'Logical',
  'q.tf_6.no': 'Kind',
  'q.tf_7.text': "When someone's upset you…",
  'q.tf_7.yes': 'Offer solutions',
  'q.tf_7.no': 'Offer comfort',
  'q.tf_8.text': "You'd rather be seen as…",
  'q.tf_8.yes': 'Competent',
  'q.tf_8.no': 'Warm',
  'q.tf_9.text': 'In an argument you focus on…',
  'q.tf_9.yes': 'The facts',
  'q.tf_9.no': 'The feelings',
  'q.tf_10.text': "You'd rather be…",
  'q.tf_10.yes': 'Honest but blunt',
  'q.tf_10.no': 'Kind but gentle',
  'q.jp_6.text': 'Your to-do list is…',
  'q.jp_6.yes': 'Written and followed',
  'q.jp_6.no': 'Loose or in your head',
  'q.jp_7.text': 'You feel best when plans are…',
  'q.jp_7.yes': 'Locked in',
  'q.jp_7.no': 'Open to change',
  'q.jp_8.text': 'A free day is better…',
  'q.jp_8.yes': 'Planned out',
  'q.jp_8.no': 'Spontaneous',
  'q.jp_9.text': 'Deadlines feel…',
  'q.jp_9.yes': 'Best done early',
  'q.jp_9.no': 'Real at the last minute',
  'q.jp_10.text': 'You prefer to…',
  'q.jp_10.yes': 'Decide and move on',
  'q.jp_10.no': 'Keep options open',
```

- [ ] **Step 2: `zh-Hant.ts` 新增**

```ts
  'q.tf_6.text': '好的決定主要靠…',
  'q.tf_6.yes': '邏輯',
  'q.tf_6.no': '善意',
  'q.tf_7.text': '別人難過時你…',
  'q.tf_7.yes': '提供解法',
  'q.tf_7.no': '給予安慰',
  'q.tf_8.text': '你比較希望被看成…',
  'q.tf_8.yes': '能幹',
  'q.tf_8.no': '溫暖',
  'q.tf_9.text': '爭論時你在意…',
  'q.tf_9.yes': '事實',
  'q.tf_9.no': '感受',
  'q.tf_10.text': '你寧願…',
  'q.tf_10.yes': '誠實但直接',
  'q.tf_10.no': '體貼但委婉',
  'q.jp_6.text': '你的待辦清單…',
  'q.jp_6.yes': '寫下來並照做',
  'q.jp_6.no': '隨意或放腦中',
  'q.jp_7.text': '計畫怎樣你最安心…',
  'q.jp_7.yes': '都定好了',
  'q.jp_7.no': '可以隨時改',
  'q.jp_8.text': '空閒的一天最好…',
  'q.jp_8.yes': '排好行程',
  'q.jp_8.no': '隨興發揮',
  'q.jp_9.text': '截止日對你來說…',
  'q.jp_9.yes': '早點做完最好',
  'q.jp_9.no': '最後一刻才真實',
  'q.jp_10.text': '你偏好…',
  'q.jp_10.yes': '決定了就往前',
  'q.jp_10.no': '保留各種選項',
```

- [ ] **Step 3: `zh-Hans.ts` 新增**

```ts
  'q.tf_6.text': '好的决定主要靠…',
  'q.tf_6.yes': '逻辑',
  'q.tf_6.no': '善意',
  'q.tf_7.text': '别人难过时你…',
  'q.tf_7.yes': '提供解法',
  'q.tf_7.no': '给予安慰',
  'q.tf_8.text': '你比较希望被看成…',
  'q.tf_8.yes': '能干',
  'q.tf_8.no': '温暖',
  'q.tf_9.text': '争论时你在意…',
  'q.tf_9.yes': '事实',
  'q.tf_9.no': '感受',
  'q.tf_10.text': '你宁愿…',
  'q.tf_10.yes': '诚实但直接',
  'q.tf_10.no': '体贴但委婉',
  'q.jp_6.text': '你的待办清单…',
  'q.jp_6.yes': '写下来并照做',
  'q.jp_6.no': '随意或放脑中',
  'q.jp_7.text': '计划怎样你最安心…',
  'q.jp_7.yes': '都定好了',
  'q.jp_7.no': '可以随时改',
  'q.jp_8.text': '空闲的一天最好…',
  'q.jp_8.yes': '排好行程',
  'q.jp_8.no': '随性发挥',
  'q.jp_9.text': '截止日对你来说…',
  'q.jp_9.yes': '早点做完最好',
  'q.jp_9.no': '最后一刻才真实',
  'q.jp_10.text': '你偏好…',
  'q.jp_10.yes': '决定了就往前',
  'q.jp_10.no': '保留各种选项',
```

- [ ] **Step 4: `ja.ts` 新增**

```ts
  'q.tf_6.text': '良い決断は主に…',
  'q.tf_6.yes': '論理',
  'q.tf_6.no': '思いやり',
  'q.tf_7.text': '落ち込む人には…',
  'q.tf_7.yes': '解決策を出す',
  'q.tf_7.no': '寄り添う',
  'q.tf_8.text': 'どう見られたい…',
  'q.tf_8.yes': '有能',
  'q.tf_8.no': '温かい',
  'q.tf_9.text': '議論で重視するのは…',
  'q.tf_9.yes': '事実',
  'q.tf_9.no': '気持ち',
  'q.tf_10.text': 'どちらでいたい…',
  'q.tf_10.yes': '正直だが率直',
  'q.tf_10.no': '優しく穏やか',
  'q.jp_6.text': 'あなたのToDoリストは…',
  'q.jp_6.yes': '書いて実行',
  'q.jp_6.no': 'ゆるく頭の中',
  'q.jp_7.text': '計画はどうだと安心…',
  'q.jp_7.yes': 'きっちり決定',
  'q.jp_7.no': '変更OK',
  'q.jp_8.text': '自由な一日は…',
  'q.jp_8.yes': '予定を立てる',
  'q.jp_8.no': '気の向くまま',
  'q.jp_9.text': '締め切りは…',
  'q.jp_9.yes': '早めに片付ける',
  'q.jp_9.no': '直前が本番',
  'q.jp_10.text': 'あなたの好みは…',
  'q.jp_10.yes': '決めて前へ',
  'q.jp_10.no': '選択肢を残す',
```

- [ ] **Step 5: `es.ts` 新增**

```ts
  'q.tf_6.text': 'Una buena decisión es sobre todo…',
  'q.tf_6.yes': 'Lógica',
  'q.tf_6.no': 'Amable',
  'q.tf_7.text': 'Cuando alguien está mal…',
  'q.tf_7.yes': 'Ofreces soluciones',
  'q.tf_7.no': 'Ofreces consuelo',
  'q.tf_8.text': 'Prefieres que te vean…',
  'q.tf_8.yes': 'Competente',
  'q.tf_8.no': 'Cálido',
  'q.tf_9.text': 'En una discusión te centras en…',
  'q.tf_9.yes': 'Los hechos',
  'q.tf_9.no': 'Los sentimientos',
  'q.tf_10.text': 'Prefieres ser…',
  'q.tf_10.yes': 'Honesto pero directo',
  'q.tf_10.no': 'Amable pero suave',
  'q.jp_6.text': 'Tu lista de tareas está…',
  'q.jp_6.yes': 'Escrita y cumplida',
  'q.jp_6.no': 'Suelta o en tu cabeza',
  'q.jp_7.text': 'Te sientes mejor con planes…',
  'q.jp_7.yes': 'Bien cerrados',
  'q.jp_7.no': 'Abiertos a cambios',
  'q.jp_8.text': 'Un día libre es mejor…',
  'q.jp_8.yes': 'Planificado',
  'q.jp_8.no': 'Espontáneo',
  'q.jp_9.text': 'Las fechas límite…',
  'q.jp_9.yes': 'Mejor hacerlas pronto',
  'q.jp_9.no': 'Reales al último minuto',
  'q.jp_10.text': 'Prefieres…',
  'q.jp_10.yes': 'Decidir y avanzar',
  'q.jp_10.no': 'Dejar opciones abiertas',
```

- [ ] **Step 6: 驗證編譯、測試**

Run: `npx tsc --noEmit && npm test 2>&1 | tail -3`
Expected: 無型別錯誤；completeness 綠；prior 測試不變。

- [ ] **Step 7: Commit**

```bash
git add src/i18n/strings
git commit -m "feat: add TF/JP question strings tf_6..10, jp_6..10 (5 locales)"
```

---

### Task 4: 題庫擴充到每維度 10 題（`config/questions.ts`）

**Files:**
- Modify: `src/config/questions.ts`, `src/config/questions.test.ts`

**Interfaces:**
- Consumes: 無新增（i18n key 已於 T2/T3 加齊）
- Produces: `QUESTIONS` 由 20 → 40 題（每維度 10）。

- [ ] **Step 1: 更新 `questions.test.ts` 的每維度題數斷言（5 → 10）**

把 `src/config/questions.test.ts` 中這段：
```ts
  it('has exactly 5 questions per dimension', () => {
    for (const d of DIMENSIONS) expect(questionsForDimension(d)).toHaveLength(5);
  });
```
改為：
```ts
  it('has exactly 10 questions per dimension', () => {
    for (const d of DIMENSIONS) expect(questionsForDimension(d)).toHaveLength(10);
  });
```
（其餘既有測試——side 對應、id 唯一——不變，仍應通過。）

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm test src/config/questions.test.ts`
Expected: FAIL — 目前每維度只有 5 題，長度斷言失敗。

- [ ] **Step 3: `questions.ts` 每維度新增 6..10（用既有 `def` 輔助）**

在 `QUESTIONS` 陣列中，於各維度既有 5 題之後插入（維持 `def(id, dimension, yesSide, noSide)` 格式）：
```ts
  def('ei_6', 'EI', 'E', 'I'),
  def('ei_7', 'EI', 'E', 'I'),
  def('ei_8', 'EI', 'E', 'I'),
  def('ei_9', 'EI', 'E', 'I'),
  def('ei_10', 'EI', 'E', 'I'),
  def('sn_6', 'SN', 'S', 'N'),
  def('sn_7', 'SN', 'S', 'N'),
  def('sn_8', 'SN', 'S', 'N'),
  def('sn_9', 'SN', 'S', 'N'),
  def('sn_10', 'SN', 'S', 'N'),
  def('tf_6', 'TF', 'T', 'F'),
  def('tf_7', 'TF', 'T', 'F'),
  def('tf_8', 'TF', 'T', 'F'),
  def('tf_9', 'TF', 'T', 'F'),
  def('tf_10', 'TF', 'T', 'F'),
  def('jp_6', 'JP', 'J', 'P'),
  def('jp_7', 'JP', 'J', 'P'),
  def('jp_8', 'JP', 'J', 'P'),
  def('jp_9', 'JP', 'J', 'P'),
  def('jp_10', 'JP', 'J', 'P'),
```
（放在陣列尾端即可；`questionsForDimension` 以 `dimension` 過濾，順序不影響正確性。）

- [ ] **Step 4: 跑測試確認通過**

Run: `npm test`
Expected: PASS — questions（每維度 10、id 唯一、side 對應）、mapping、completeness（40 題 id 皆有五語 key）全綠。

- [ ] **Step 5: 驗證編譯建置**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -1`
Expected: 無錯誤、`✓ built`。

- [ ] **Step 6: Commit**

```bash
git add src/config/questions.ts src/config/questions.test.ts
git commit -m "feat: expand question bank to 10 per dimension (40 total)"
```

---

### Task 5: GameScene 每場隨機抽 5 題（`scenes/GameScene.ts`）

**Files:**
- Modify: `src/scenes/GameScene.ts`

**Interfaces:**
- Consumes: `pickQuestions`（from `core/pickQuestions`）、`questionsForDimension`、`GAME.questionsPerLevel`
- Produces: 無新介面（取題改為抽樣）

- [ ] **Step 1: 加入 import**

`src/scenes/GameScene.ts` import 區加：
```ts
import { pickQuestions } from '../core/pickQuestions';
```

- [ ] **Step 2: `init` 改為抽樣**

把 `init` 內：
```ts
    this.questions = questionsForDimension(DIMENSIONS[this.dimIndex]);
```
改為：
```ts
    this.questions = pickQuestions(
      questionsForDimension(DIMENSIONS[this.dimIndex]),
      GAME.questionsPerLevel,
      Math.random,
    );
```

- [ ] **Step 3: `advanceDimension` 改為抽樣**

把 `advanceDimension` 內：
```ts
    this.questions = questionsForDimension(DIMENSIONS[this.dimIndex]);
```
改為：
```ts
    this.questions = pickQuestions(
      questionsForDimension(DIMENSIONS[this.dimIndex]),
      GAME.questionsPerLevel,
      Math.random,
    );
```

- [ ] **Step 4: 驗證編譯、建置、測試**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -1 && npm test 2>&1 | tail -3`
Expected: 無型別錯誤、`✓ built`、測試全綠。

- [ ] **Step 5: 手動驗證**

Run: `npm run dev`，開始遊戲，連玩兩場同一關（第 1 關 EI）。
Expected：兩場出現的 5 題（banner/預覽文字）**不完全相同**（從 10 題池隨機抽），仍每維度 5 題、奇數不平手、計分與結算正常。

- [ ] **Step 6: Commit**

```bash
git add src/scenes/GameScene.ts
git commit -m "feat: sample 5 random questions per dimension each play"
```

---

## 完成後（手動）
- 實機各語言抽測新題排版（台階 label、banner、預覽）。
- `ja`/`es` 新題母語校稿（沿用既有 needs-review 流程）。
- 三個新功能（A 趨勢 / B 成就 / C 題庫隨機）全部完成後，可回頭處理美術素材 drop-in、部署（Tier 3）。
