# MBTI Jump 內容包（16 型文案＋好友對比深化）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 16 型原創綽號＋描述（`type.<TYPE>.name/.desc` ×5 語）貫穿結果頁/分享文字/分享卡/OG（80 張重生成）；有邀請時結果頁改族群配對句（10 種）＋四維度字母對照列。

**Architecture:** 文案進 i18n（en 為 key 權威、zh-Hant 為創作主稿）；`describeType` 內部改讀新 key（簽名不變）＋新 `typeName`；`buildShareCardModel.groupName` 改組合字串讓卡/OG 自動跟隨；`pairKey` 純函式進 `core/compare.ts`；ResultScene 邀請區重排。

**Tech Stack:** TypeScript strict、Phaser 3、vitest、@napi-rs/canvas（OG）。

**Spec:** `docs/superpowers/specs/2026-07-03-mbti-jump-content-pack-design.md`（zh-Hant 主稿定稿在 spec，本 plan 為五語全文）

## Global Constraints

- TypeScript strict、`noUnusedLocals`；指令在 repo root；五語 completeness 測試強制 key set 一致（加/刪 key 必五檔同步）。
- 文案以本 plan 的字串為準逐字使用；ja/es 區塊加 `// needs-review` 段落註解（沿用慣例）。
- **pair 字串內的族群名必須與同檔既有 `group.*` 值一致**——實作時先讀該檔 `group.*`，不一致以 `group.*` 為準改 pair 字串中的族群名。
- 佈局：有邀請時配對句 y=522（14px）、對照列 y=552（章高 22）、按鈕 595/658/718；無邀請按鈕維持 585/650/712。
- 退役 keys（五語同步）：`personality.template`、`trait.E/I/S/N/T/F/J/P`（T2）、`result.groupLabel`（T3）、`compare.0`–`compare.4`（T5）。
- 既有 133 測試每 task 結束全綠；commit conventional prefix，結尾加：
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: i18n `type.<TYPE>.name/.desc` ×5 語（只新增）

**Files:**
- Modify: `src/i18n/strings/en.ts`、`zh-Hant.ts`、`zh-Hans.ts`、`ja.ts`、`es.ts`

**Interfaces:**
- Produces: 32 keys（`type.INTJ.name` … `type.ESFP.desc`）× 5 語；T2 的 `describeType`/`typeName` 讀取

- [ ] **Step 1: 各檔在 `personality.template` 之前加區塊（en 加在對應位置；順序 INTJ, INTP, ENTJ, ENTP, INFJ, INFP, ENFJ, ENFP, ISTJ, ISFJ, ESTJ, ESFJ, ISTP, ISFP, ESTP, ESFP）**

**en.ts**：

```ts
  // --- 16 型專屬文案 ---
  'type.INTJ.name': 'The Silent Strategist',
  'type.INTJ.desc': "You've already played out the next three moves — explaining them just feels inefficient. Small circle, rigorously vetted.",
  'type.INTP.name': 'The Idea Lab',
  'type.INTP.desc': 'Your brain runs experiments around the clock — replying to texts not included. Cracking one puzzle beats ten parties.',
  'type.ENTJ.name': 'The Born Commander',
  'type.ENTJ.desc': "You tried to take over kindergarten at three. If Earth won't follow your plan, that's Earth's problem.",
  'type.ENTP.name': 'The Debate Gremlin',
  'type.ENTP.desc': "You don't argue to win — you argue for fun. (You usually win anyway.) More ideas than you'll ever get to use.",
  'type.INFJ.name': 'The Gentle Oracle',
  'type.INFJ.desc': "You read what people never say out loud, yet you're a locked diary yourself. Soft-spoken, with boundaries of steel.",
  'type.INFP.name': 'The Daydream Poet',
  'type.INFP.desc': "You've held a hundred concerts in your head, audience of one. Kindness is your superpower — so is procrastination.",
  'type.ENFJ.name': 'The Warm-up Captain',
  'type.ENFJ.desc': 'You know exactly how to make everyone shine, and keep forgetting to save a light for yourself. The glue of every friend group.',
  'type.ENFP.name': 'The Human Firework',
  'type.ENFP.desc': 'Your enthusiasm lights up a whole street; your focus lasts about three minutes. Leap first — it usually works out.',
  'type.ISTJ.name': 'The Bedrock',
  'type.ISTJ.desc': "If you said it'll be done, it gets done — apocalypse or not. Your backups have backups.",
  'type.ISFJ.name': 'The Human Hearth',
  'type.ISFJ.desc': "You remember everyone's birthdays and allergies, and forget you need care too. Quiet, but everything falls apart without you.",
  'type.ESTJ.name': 'The Order Captain',
  'type.ESTJ.desc': 'Chaos makes your hands itch, and meetings without conclusions cause physical discomfort. The world runs on time thanks to you.',
  'type.ESFJ.name': 'The Party Steward',
  'type.ESFJ.desc': 'You planned the gathering, smoothed every awkward moment, and know everyone\'s news. Your love is concrete — it shows up in lunchboxes.',
  'type.ISTP.name': 'The Cool-hand Tinkerer',
  'type.ISTP.desc': "Few words, clever hands — if it's broken, you take it apart first and ask later. Looks like you're not listening; you heard everything.",
  'type.ISFP.name': 'The Quiet Artist',
  'type.ISFP.desc': "You don't compete, but your taste never compromises. When the world gets too loud, you retreat into your little universe and create.",
  'type.ESTP.name': 'The Action Player',
  'type.ESTP.desc': 'Do first, plan never. In a real crisis, the calmest person in the room is somehow you.',
  'type.ESFP.name': 'The Main Character',
  'type.ESFP.desc': "You walk in and the room brightens two notches. Life is a stage, and you've never known stage fright.",
```

**zh-Hant.ts**：

```ts
  // --- 16 型專屬文案 ---
  'type.INTJ.name': '沉默軍師',
  'type.INTJ.desc': '你早就推演完三步後的局，只是懶得解釋。朋友不多，但每個都經過嚴格審核。',
  'type.INTP.name': '腦內宇宙',
  'type.INTP.desc': '你的腦袋 24 小時都在跑實驗，回訊息除外。想通一件事的快樂，勝過十次聚會。',
  'type.ENTJ.name': '天生總指揮',
  'type.ENTJ.desc': '你三歲就想接管幼稚園。地球沒照你的計畫轉，你認為是地球的問題。',
  'type.ENTP.name': '抬槓鬼才',
  'type.ENTP.desc': '你辯論不是為了贏，是為了好玩——雖然通常也贏了。點子多到自己都來不及用。',
  'type.INFJ.name': '溫柔預言家',
  'type.INFJ.desc': '你看得穿別人沒說出口的事，自己卻是一本上鎖的日記。溫柔，但底線硬得像鋼。',
  'type.INFP.name': '夢遊詩人',
  'type.INFP.desc': '你在腦內開過一百場演唱會，散場時觀眾只有自己。溫柔是你的超能力——拖延也是。',
  'type.ENFJ.name': '暖場隊長',
  'type.ENFJ.desc': '你天生知道怎麼讓每個人發光，卻常忘了留一盞燈給自己。朋友圈的黏著劑。',
  'type.ENFP.name': '人形煙火',
  'type.ENFP.desc': '你的熱情能點亮整條街，專注力大概能維持三分鐘。想到就衝，通常都沒事。',
  'type.ISTJ.name': '靠譜磐石',
  'type.ISTJ.desc': '你說會做到的事，天塌下來也會做到。備份的備份都有備份。',
  'type.ISFJ.name': '人間暖爐',
  'type.ISFJ.desc': '你記得所有人的生日和忌口，卻常忘了自己也需要被照顧。低調，但少了你全場會垮。',
  'type.ESTJ.name': '秩序隊長',
  'type.ESTJ.desc': '你看到混亂就手癢，開會沒結論你會物理性不適。世界靠你這種人準時運轉。',
  'type.ESFJ.name': '全場管家',
  'type.ESFJ.desc': '聚會是你辦的、場面是你圓的、大家的近況你都熟。你的愛具體到會出現在便當裡。',
  'type.ISTP.name': '冷面工匠',
  'type.ISTP.desc': '話不多，手很巧，東西壞了你先拆再說。冷靜到像沒在聽，其實全都記得。',
  'type.ISFP.name': '安靜藝術家',
  'type.ISFP.desc': '你不爭不搶，但審美從不妥協。世界太吵的時候，你就躲進自己的小宇宙創作。',
  'type.ESTP.name': '行動派玩家',
  'type.ESTP.desc': '先做再說是你的座右銘，計畫是別人的事。危機現場最冷靜的人，通常是你。',
  'type.ESFP.name': '派對主角',
  'type.ESFP.desc': '你一進場，氣氛就自動調亮兩度。人生是舞台，你從不怯場。',
```

**zh-Hans.ts**：

```ts
  // --- 16 型专属文案 ---
  'type.INTJ.name': '沉默军师',
  'type.INTJ.desc': '你早就推演完三步后的局，只是懒得解释。朋友不多，但每个都经过严格审核。',
  'type.INTP.name': '脑内宇宙',
  'type.INTP.desc': '你的脑袋 24 小时都在跑实验，回消息除外。想通一件事的快乐，胜过十次聚会。',
  'type.ENTJ.name': '天生总指挥',
  'type.ENTJ.desc': '你三岁就想接管幼儿园。地球没照你的计划转，你认为是地球的问题。',
  'type.ENTP.name': '抬杠鬼才',
  'type.ENTP.desc': '你辩论不是为了赢，是为了好玩——虽然通常也赢了。点子多到自己都来不及用。',
  'type.INFJ.name': '温柔预言家',
  'type.INFJ.desc': '你看得穿别人没说出口的事，自己却是一本上锁的日记。温柔，但底线硬得像钢。',
  'type.INFP.name': '梦游诗人',
  'type.INFP.desc': '你在脑内开过一百场演唱会，散场时观众只有自己。温柔是你的超能力——拖延也是。',
  'type.ENFJ.name': '暖场队长',
  'type.ENFJ.desc': '你天生知道怎么让每个人发光，却常忘了留一盏灯给自己。朋友圈的黏合剂。',
  'type.ENFP.name': '人形烟火',
  'type.ENFP.desc': '你的热情能点亮整条街，专注力大概能维持三分钟。想到就冲，通常都没事。',
  'type.ISTJ.name': '靠谱磐石',
  'type.ISTJ.desc': '你说会做到的事，天塌下来也会做到。备份的备份都有备份。',
  'type.ISFJ.name': '人间暖炉',
  'type.ISFJ.desc': '你记得所有人的生日和忌口，却常忘了自己也需要被照顾。低调，但少了你全场会垮。',
  'type.ESTJ.name': '秩序队长',
  'type.ESTJ.desc': '你看到混乱就手痒，开会没结论你会物理性不适。世界靠你这种人准时运转。',
  'type.ESFJ.name': '全场管家',
  'type.ESFJ.desc': '聚会是你办的、场面是你圆的、大家的近况你都熟。你的爱具体到会出现在便当里。',
  'type.ISTP.name': '冷面工匠',
  'type.ISTP.desc': '话不多，手很巧，东西坏了你先拆再说。冷静到像没在听，其实全都记得。',
  'type.ISFP.name': '安静艺术家',
  'type.ISFP.desc': '你不争不抢，但审美从不妥协。世界太吵的时候，你就躲进自己的小宇宙创作。',
  'type.ESTP.name': '行动派玩家',
  'type.ESTP.desc': '先做再说是你的座右铭，计划是别人的事。危机现场最冷静的人，通常是你。',
  'type.ESFP.name': '派对主角',
  'type.ESFP.desc': '你一进场，气氛就自动调亮两度。人生是舞台，你从不怯场。',
```

**ja.ts**：

```ts
  // --- 16 型專屬文案（needs-review: AI 草稿，待母語校稿） ---
  'type.INTJ.name': '静かなる軍師',
  'type.INTJ.desc': '三手先まで読み終えているのに、説明するのが面倒なだけ。友達は少ないが、全員厳選済み。',
  'type.INTP.name': '脳内ラボ',
  'type.INTP.desc': '頭の中では24時間実験中——返信は実験に含まれない。ひとつの謎が解ける喜びは、飲み会十回分。',
  'type.ENTJ.name': '生まれつき総司令',
  'type.ENTJ.desc': '3歳で幼稚園を仕切ろうとした人。地球が計画通りに回らないのは、地球のせい。',
  'type.ENTP.name': '屁理屈の天才',
  'type.ENTP.desc': '勝つためじゃなく、楽しいから議論する——まあ大体勝つけど。アイデアは使い切れないほど。',
  'type.INFJ.name': 'やさしい預言者',
  'type.INFJ.desc': '人の本音は見抜くのに、自分は鍵のかかった日記帳。やさしいが、譲れない線は鋼。',
  'type.INFP.name': '夢見る詩人',
  'type.INFP.desc': '脳内でライブを百回開催、観客はいつも自分だけ。やさしさは超能力——先延ばしも。',
  'type.ENFJ.name': '場を温める隊長',
  'type.ENFJ.desc': 'みんなを輝かせる天才なのに、自分のための灯りを忘れがち。友達グループの接着剤。',
  'type.ENFP.name': '人間花火',
  'type.ENFP.desc': '情熱は街を照らせるのに、集中力は三分。思い立ったら即行動、なぜか大体うまくいく。',
  'type.ISTJ.name': '頼れる岩盤',
  'type.ISTJ.desc': 'やると言ったことは、天が落ちてもやる。バックアップのバックアップにもバックアップ。',
  'type.ISFJ.name': '人間ストーブ',
  'type.ISFJ.desc': 'みんなの誕生日も苦手な食べ物も覚えているのに、自分のケアは忘れがち。いないと全部崩れる。',
  'type.ESTJ.name': '秩序隊長',
  'type.ESTJ.desc': '混乱を見ると手がうずうず、結論の出ない会議は物理的に無理。世界が時間通りに回るのは君のおかげ。',
  'type.ESFJ.name': '会場の執事',
  'type.ESFJ.desc': '集まりを企画し、場を丸く収め、みんなの近況に詳しい。君の愛は具体的で、お弁当にまで現れる。',
  'type.ISTP.name': 'クールな職人',
  'type.ISTP.desc': '口数は少なく、手先は器用。壊れたらまず分解。聞いてないようで、全部覚えている。',
  'type.ISFP.name': '静かな芸術家',
  'type.ISFP.desc': '争わないが、美意識は絶対に譲らない。世界がうるさい日は、自分の小宇宙で創作。',
  'type.ESTP.name': '行動派プレイヤー',
  'type.ESTP.desc': '「まずやってみる」が座右の銘、計画は他人の仕事。危機の現場で一番冷静なのは、たいてい君。',
  'type.ESFP.name': 'パーティーの主役',
  'type.ESFP.desc': '君が入場すると、場の明るさが二段階上がる。人生は舞台、物怖じしたことなし。',
```

**es.ts**：

```ts
  // --- 16 型專屬文案（needs-review: AI 草稿，待母語校稿） ---
  'type.INTJ.name': 'El Estratega Silencioso',
  'type.INTJ.desc': 'Ya calculaste las próximas tres jugadas; explicarlas te parece ineficiente. Pocos amigos, todos rigurosamente seleccionados.',
  'type.INTP.name': 'El Laboratorio de Ideas',
  'type.INTP.desc': 'Tu cerebro experimenta las 24 horas — responder mensajes no incluido. Resolver un enigma vale más que diez fiestas.',
  'type.ENTJ.name': 'El Comandante Nato',
  'type.ENTJ.desc': 'A los tres años ya querías dirigir el jardín de infancia. Si la Tierra no sigue tu plan, es problema de la Tierra.',
  'type.ENTP.name': 'El Genio del Debate',
  'type.ENTP.desc': 'No discutes para ganar, sino por diversión — aunque sueles ganar. Más ideas de las que jamás usarás.',
  'type.INFJ.name': 'El Oráculo Amable',
  'type.INFJ.desc': 'Lees lo que nadie dice en voz alta, pero tú eres un diario con candado. Voz suave, límites de acero.',
  'type.INFP.name': 'El Poeta Soñador',
  'type.INFP.desc': 'Has dado cien conciertos en tu cabeza, con un solo espectador: tú. La ternura es tu superpoder — procrastinar también.',
  'type.ENFJ.name': 'El Capitán del Ánimo',
  'type.ENFJ.desc': 'Sabes hacer brillar a todos, pero olvidas guardar una luz para ti. El pegamento del grupo.',
  'type.ENFP.name': 'El Fuego Artificial Humano',
  'type.ENFP.desc': 'Tu entusiasmo ilumina una calle entera; tu concentración dura tres minutos. Saltas primero — y suele salir bien.',
  'type.ISTJ.name': 'La Roca Fiable',
  'type.ISTJ.desc': 'Lo que dijiste que harías, se hace — aunque caiga el cielo. Tus copias de seguridad tienen copias de seguridad.',
  'type.ISFJ.name': 'La Estufa Humana',
  'type.ISFJ.desc': 'Recuerdas cumpleaños y alergias de todos, y olvidas que tú también necesitas cuidados. Discreto, pero sin ti todo se derrumba.',
  'type.ESTJ.name': 'El Capitán del Orden',
  'type.ESTJ.desc': 'El caos te da comezón y las reuniones sin conclusión te causan malestar físico. El mundo llega puntual gracias a ti.',
  'type.ESFJ.name': 'El Anfitrión Total',
  'type.ESFJ.desc': 'Tú organizas la reunión, suavizas los momentos incómodos y conoces las novedades de todos. Tu cariño es concreto: aparece en la lonchera.',
  'type.ISTP.name': 'El Artesano Impasible',
  'type.ISTP.desc': 'Pocas palabras, manos hábiles: si algo se rompe, primero lo desarmas. Parece que no escuchas, pero lo recuerdas todo.',
  'type.ISFP.name': 'El Artista Silencioso',
  'type.ISFP.desc': 'No compites, pero tu gusto jamás se negocia. Cuando el mundo hace ruido, te refugias en tu pequeño universo a crear.',
  'type.ESTP.name': 'El Jugador de Acción',
  'type.ESTP.desc': 'Primero hacer, planear nunca. En una crisis real, el más tranquilo de la sala eres tú.',
  'type.ESFP.name': 'El Protagonista',
  'type.ESFP.desc': 'Entras y la sala sube dos niveles de brillo. La vida es un escenario y nunca has tenido pánico escénico.',
```

- [ ] **Step 2: 全套測試（completeness 把關五檔同步）**

Run: `npm test`
Expected: 全 PASS（舊 keys 未動、describeType 行為未變）

- [ ] **Step 3: Commit**

```bash
git add src/i18n/strings/
git commit -m "feat: add 16-type name/desc copy (5 locales, 160 strings)"
```

---

### Task 2: `describeType` 改讀新文案 ＋ `typeName` ＋ 退役模板 keys

**Files:**
- Modify: `src/config/personalities.ts`
- Modify: `src/config/personalities.test.ts`（改寫斷言）
- Modify: 五個 locale 檔（刪 `personality.template`、`trait.E/I/S/N/T/F/J/P` 共 9 keys × 5）

**Interfaces:**
- Produces: `describeType(type, locale?): string`（簽名不變，內容改讀 `type.<TYPE>.desc`）；`typeName(type, locale?): string`（T3/T5 使用）

- [ ] **Step 1: 改寫測試（personalities.test.ts 整檔）**

```ts
import { describe, it, expect } from 'vitest';
import { describeType, typeName } from './personalities';
import { MBTI_TYPES } from '../core/mbtiType';

describe('describeType', () => {
  it('returns the per-type copy, distinct across all 16 types', () => {
    const descs = MBTI_TYPES.map((t) => describeType(t, 'zh-Hant'));
    expect(new Set(descs).size).toBe(16);
    for (const d of descs) expect(d.length).toBeGreaterThan(10);
  });

  it('respects locale', () => {
    expect(describeType('INFP', 'en')).not.toBe(describeType('INFP', 'zh-Hant'));
  });

  it('throws on invalid type', () => {
    expect(() => describeType('ABCD')).toThrow();
    expect(() => describeType('INF')).toThrow();
  });
});

describe('typeName', () => {
  it('returns the per-type nickname, distinct across all 16 types', () => {
    const names = MBTI_TYPES.map((t) => typeName(t, 'zh-Hant'));
    expect(new Set(names).size).toBe(16);
  });

  it('throws on invalid type', () => {
    expect(() => typeName('XXXX')).toThrow();
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/config/personalities.test.ts`
Expected: FAIL（typeName 不存在）

- [ ] **Step 3: 改寫 `personalities.ts`**

```ts
import { t } from '../i18n/t';
import type { StringKey } from '../i18n/t';
import type { Locale } from '../i18n/locales';

const VALID_LETTERS = new Set(['E', 'I', 'S', 'N', 'T', 'F', 'J', 'P']);

function assertType(type: string): void {
  const letters = type.split('');
  if (letters.length !== 4 || !letters.every((l) => VALID_LETTERS.has(l))) {
    throw new Error(`Invalid MBTI type: ${type}`);
  }
}

/** 16 型專屬描述（被說中式文案）。 */
export function describeType(type: string, locale?: Locale): string {
  assertType(type);
  return t(`type.${type}.desc` as StringKey, locale);
}

/** 16 型原創綽號（如「夢遊詩人」）。 */
export function typeName(type: string, locale?: Locale): string {
  assertType(type);
  return t(`type.${type}.name` as StringKey, locale);
}
```

（原 `format` import 移除。）

- [ ] **Step 4: 五檔刪 9 個模板 keys**

各 locale 檔刪除 `personality.template` 與 `trait.E`、`trait.I`、`trait.S`、`trait.N`、`trait.T`、`trait.F`、`trait.J`、`trait.P` 的行。

- [ ] **Step 5: 型檢＋全套測試**

Run: `npx tsc --noEmit && npm test`
Expected: 全 PASS（completeness 驗證同步刪除；`format` 若他處仍用則保留其 export——只移 personalities 的 import）

- [ ] **Step 6: Commit**

```bash
git add src/config/personalities.ts src/config/personalities.test.ts src/i18n/strings/
git commit -m "feat: describeType reads per-type copy, add typeName, retire template keys"
```

---

### Task 3: 貫穿——族群行組合字串 ＋ OG title 升級

**Files:**
- Modify: `src/share/shareCardModel.ts`（groupName 組合）
- Modify: `src/scenes/ResultScene.ts`（族群行改用 model.groupName）
- Modify: `src/share/ogMeta.ts`（title 帶綽號）
- Modify: 五個 locale 檔（刪 `result.groupLabel` × 5）
- Test: `src/share/shareCardModel.test.ts`、`src/share/ogMeta.test.ts`（斷言更新）

**Interfaces:**
- Consumes: `typeName`（T2）
- Produces: `ShareCardModel.groupName` = `"<綽號> · <族群名>"`；`buildOgMeta().title` 含「TYPE 綽號」

- [ ] **Step 1: `shareCardModel.ts` groupName 改組合**

import 加 `typeName`（自 `../config/personalities`），`buildShareCardModel` 內：

```ts
    groupName: `${typeName(type, locale)} · ${t(`group.${group}` as StringKey, locale)}`,
```

- [ ] **Step 2: ResultScene 族群行**

`create()` 中 model 的建構（`buildShareCardModel(...)`）移到族群行之前（若尚在其後），族群行改為：

```ts
    this.add
      .text(cx, 268, model.groupName, {
        fontFamily: 'Fredoka, system-ui, sans-serif',
        fontSize: '20px',
        color: groupHex,
      })
      .setOrigin(0.5);
```

（原 `tf('result.groupLabel', ...)` 呼叫刪除；`tf` 若他處仍用保留 import。）

- [ ] **Step 3: `ogMeta.ts` title**

```ts
    title: tf('og.title', [`${type} ${typeName(type, locale)}`], locale),
```

（import 加 `typeName`。）

- [ ] **Step 4: 五檔刪 `result.groupLabel`；測試斷言更新**

`shareCardModel.test.ts`：groupName 斷言改為「含 `·` 且含族群名」；`ogMeta.test.ts`：title 斷言 `toContain(type)` 不變（自動成立），可加 `toContain('·') === false`（title 是「TYPE 綽號」無分隔）——只要既有斷言過即可，不強加。

- [ ] **Step 5: 型檢＋全套測試**

Run: `npx tsc --noEmit && npm test`
Expected: 全 PASS

- [ ] **Step 6: Commit**

```bash
git add src/share/shareCardModel.ts src/scenes/ResultScene.ts src/share/ogMeta.ts src/i18n/strings/ src/share/shareCardModel.test.ts src/share/ogMeta.test.ts
git commit -m "feat: nickname woven into group line and OG title"
```

---

### Task 4: `pairKey` 純函式 ＋ `pair.*` ×5 語（只新增）

**Files:**
- Modify: `src/core/compare.ts`（加 pairKey；compareKey 本 task 保留）
- Modify: 五個 locale 檔（各加 10 keys）
- Test: `src/core/compare.test.ts`（append）

**Interfaces:**
- Consumes: `Group`（`core/temperament.ts`）
- Produces: `pairKey(a: Group, b: Group): StringKey`（無序正規化；T5 使用）；`pair.<g1>_<g2>` 10 keys × 5 語

- [ ] **Step 1: 失敗測試（append）**

```ts
describe('pairKey', () => {
  it('is order-insensitive', () => {
    expect(pairKey('diplomat', 'analyst')).toBe(pairKey('analyst', 'diplomat'));
  });

  it('maps every unordered pair to an existing key', () => {
    const groups = ['explorer', 'diplomat', 'analyst', 'sentinel'] as const;
    for (const a of groups) {
      for (const b of groups) {
        expect(EN[pairKey(a, b)]).toBeTypeOf('string');
      }
    }
  });
});
```

（import 行補 `pairKey`；`EN` 已 import。）

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/core/compare.test.ts`
Expected: FAIL

- [ ] **Step 3: `compare.ts` 加**

```ts
import type { Group } from './temperament';

const PAIR_ORDER: readonly Group[] = ['explorer', 'diplomat', 'analyst', 'sentinel'];

/** 兩族群 → 配對文案 key（無序：依 PAIR_ORDER 正規化，共 10 種）。 */
export function pairKey(a: Group, b: Group): StringKey {
  const [x, y] = [a, b].sort((p, q) => PAIR_ORDER.indexOf(p) - PAIR_ORDER.indexOf(q));
  return `pair.${x}_${y}` as StringKey;
}
```

- [ ] **Step 4: 五檔各加 10 keys（放 `compare.4` 之後；⚠️ 族群名先對照同檔 `group.*` 值，不一致以 `group.*` 為準）**

**zh-Hant**（spec 定稿）：

```ts
  // --- 族群配對文案 ---
  'pair.explorer_explorer': '探險家 × 探險家——說走就走的兩個人，冒險路上互相接應（你們有 {0} 個字母相同）',
  'pair.explorer_diplomat': '外交官 × 探險家——理想加上行動力，隨時可能改變世界（你們有 {0} 個字母相同）',
  'pair.explorer_analyst': '分析師 × 探險家——想得深遇上跑得快，互補到有點好笑（你們有 {0} 個字母相同）',
  'pair.explorer_sentinel': '守護者 × 探險家——一個踩油門、一個握方向盤，剛好平衡（你們有 {0} 個字母相同）',
  'pair.diplomat_diplomat': '外交官 × 外交官——兩顆真心互相取暖，聊到天亮都嫌不夠（你們有 {0} 個字母相同）',
  'pair.diplomat_analyst': '外交官 × 分析師——理想派負責作夢，邏輯派負責讓夢成真（你們有 {0} 個字母相同）',
  'pair.diplomat_sentinel': '外交官 × 守護者——一個畫藍圖、一個蓋地基，穩穩的溫柔（你們有 {0} 個字母相同）',
  'pair.analyst_analyst': '分析師 × 分析師——鬥智鬥得很開心，吵架都像學術研討（你們有 {0} 個字母相同）',
  'pair.analyst_sentinel': '分析師 × 守護者——策略遇上執行，最強的落地組合（你們有 {0} 個字母相同）',
  'pair.sentinel_sentinel': '守護者 × 守護者——可靠遇上可靠，行程表都對得整整齊齊（你們有 {0} 個字母相同）',
```

**en**：

```ts
  // --- Group pairing copy ---
  'pair.explorer_explorer': 'Explorer × Explorer — two "let\'s just go" people covering each other on every adventure ({0} letters in common)',
  'pair.explorer_diplomat': 'Diplomat × Explorer — ideals plus action; the world should be a little worried ({0} letters in common)',
  'pair.explorer_analyst': 'Analyst × Explorer — deep thinker meets fast mover, almost comically complementary ({0} letters in common)',
  'pair.explorer_sentinel': 'Sentinel × Explorer — one hits the gas, one holds the wheel; perfectly balanced ({0} letters in common)',
  'pair.diplomat_diplomat': 'Diplomat × Diplomat — two warm hearts talking till sunrise and still not done ({0} letters in common)',
  'pair.diplomat_analyst': 'Diplomat × Analyst — the dreamer dreams it, the logician makes it real ({0} letters in common)',
  'pair.diplomat_sentinel': 'Diplomat × Sentinel — one sketches the blueprint, one lays the foundation; steady tenderness ({0} letters in common)',
  'pair.analyst_analyst': 'Analyst × Analyst — happily out-thinking each other; even your fights sound like seminars ({0} letters in common)',
  'pair.analyst_sentinel': 'Analyst × Sentinel — strategy meets execution, the ultimate get-it-done duo ({0} letters in common)',
  'pair.sentinel_sentinel': 'Sentinel × Sentinel — reliable meets reliable; even your calendars line up ({0} letters in common)',
```

**zh-Hans**：

```ts
  // --- 族群配对文案 ---
  'pair.explorer_explorer': '探险家 × 探险家——说走就走的两个人，冒险路上互相接应（你们有 {0} 个字母相同）',
  'pair.explorer_diplomat': '外交官 × 探险家——理想加上行动力，随时可能改变世界（你们有 {0} 个字母相同）',
  'pair.explorer_analyst': '分析师 × 探险家——想得深遇上跑得快，互补到有点好笑（你们有 {0} 个字母相同）',
  'pair.explorer_sentinel': '守护者 × 探险家——一个踩油门、一个握方向盘，刚好平衡（你们有 {0} 个字母相同）',
  'pair.diplomat_diplomat': '外交官 × 外交官——两颗真心互相取暖，聊到天亮都嫌不够（你们有 {0} 个字母相同）',
  'pair.diplomat_analyst': '外交官 × 分析师——理想派负责做梦，逻辑派负责让梦成真（你们有 {0} 个字母相同）',
  'pair.diplomat_sentinel': '外交官 × 守护者——一个画蓝图、一个盖地基，稳稳的温柔（你们有 {0} 个字母相同）',
  'pair.analyst_analyst': '分析师 × 分析师——斗智斗得很开心，吵架都像学术研讨（你们有 {0} 个字母相同）',
  'pair.analyst_sentinel': '分析师 × 守护者——策略遇上执行，最强的落地组合（你们有 {0} 个字母相同）',
  'pair.sentinel_sentinel': '守护者 × 守护者——可靠遇上可靠，行程表都对得整整齐齐（你们有 {0} 个字母相同）',
```

**ja**（needs-review 註解）：

```ts
  // --- 族群配對文案（needs-review: AI 草稿，待母語校稿） ---
  'pair.explorer_explorer': '冒険家 × 冒険家——思い立ったら即出発のふたり、冒険の途中で支え合う（同じ文字は {0} 個）',
  'pair.explorer_diplomat': '外交官 × 冒険家——理想に行動力が加われば、世界が変わるかもしれない（同じ文字は {0} 個）',
  'pair.explorer_analyst': '分析家 × 冒険家——深く考える人と速く動く人、面白いほど補い合う（同じ文字は {0} 個）',
  'pair.explorer_sentinel': '番人 × 冒険家——ひとりがアクセル、ひとりがハンドル。ちょうどいいバランス（同じ文字は {0} 個）',
  'pair.diplomat_diplomat': '外交官 × 外交官——ふたつの真心が温め合い、朝まで話しても足りない（同じ文字は {0} 個）',
  'pair.diplomat_analyst': '外交官 × 分析家——夢見る係と、夢を実現する係（同じ文字は {0} 個）',
  'pair.diplomat_sentinel': '外交官 × 番人——ひとりが青写真を描き、ひとりが土台を築く。安定のやさしさ（同じ文字は {0} 個）',
  'pair.analyst_analyst': '分析家 × 分析家——知恵比べが楽しくて、喧嘩さえ学会みたい（同じ文字は {0} 個）',
  'pair.analyst_sentinel': '分析家 × 番人——戦略と実行、最強の実現コンビ（同じ文字は {0} 個）',
  'pair.sentinel_sentinel': '番人 × 番人——頼れる同士、スケジュール帳までぴったり揃う（同じ文字は {0} 個）',
```

**es**（needs-review 註解）：

```ts
  // --- 族群配對文案（needs-review: AI 草稿，待母語校稿） ---
  'pair.explorer_explorer': 'Explorador × Explorador — dos personas de "vámonos ya", cubriéndose en cada aventura ({0} letras en común)',
  'pair.explorer_diplomat': 'Diplomático × Explorador — ideales más acción: el mundo debería preocuparse un poco ({0} letras en común)',
  'pair.explorer_analyst': 'Analista × Explorador — el que piensa hondo y el que corre rápido, cómicamente complementarios ({0} letras en común)',
  'pair.explorer_sentinel': 'Centinela × Explorador — uno pisa el acelerador, otro sujeta el volante: equilibrio perfecto ({0} letras en común)',
  'pair.diplomat_diplomat': 'Diplomático × Diplomático — dos corazones cálidos charlando hasta el amanecer ({0} letras en común)',
  'pair.diplomat_analyst': 'Diplomático × Analista — el soñador lo sueña, el lógico lo hace realidad ({0} letras en común)',
  'pair.diplomat_sentinel': 'Diplomático × Centinela — uno dibuja el plano, otro pone los cimientos: ternura estable ({0} letras en común)',
  'pair.analyst_analyst': 'Analista × Analista — compitiendo en ingenio con gusto; hasta sus peleas parecen seminarios ({0} letras en común)',
  'pair.analyst_sentinel': 'Analista × Centinela — estrategia más ejecución, el dúo que lo consigue todo ({0} letras en común)',
  'pair.sentinel_sentinel': 'Centinela × Centinela — fiable con fiable; hasta sus agendas coinciden ({0} letras en común)',
```

- [ ] **Step 5: 全套測試**

Run: `npm test`
Expected: 全 PASS

- [ ] **Step 6: Commit**

```bash
git add src/core/compare.ts src/core/compare.test.ts src/i18n/strings/
git commit -m "feat: add pairKey + 10 group-pairing copy strings (5 locales)"
```

---

### Task 5: ResultScene 邀請區——配對句＋維度對照列＋退役 compare keys

**Files:**
- Modify: `src/scenes/ResultScene.ts`
- Modify: `src/core/compare.ts`（移除 `compareKey`）
- Modify: `src/core/compare.test.ts`（移除 compareKey describe）
- Modify: 五個 locale 檔（刪 `compare.0`–`compare.4` × 5）

**Interfaces:**
- Consumes: `pairKey`、`sharedLetters`（既有）、`groupOf`、`LETTER_COLORS`/`PALETTE`（既有 import 確認）、`typeName`（不需要）
- Produces: 有邀請時配對句 (cx,522)＋對照列 (cx,552)＋按鈕 595/658/718；無邀請按鈕 585/650/712

- [ ] **Step 1: ResultScene 邀請區改寫**

import 調整：`compareKey` 改 `pairKey`；`groupOf` 已 import；確認 `LETTER_COLORS` 有 import（P1 後有），`Letter` type 已 import。

原對比行段（y=535 的 `if (friend) { ... }`）換成：

```ts
    // 好友對比（有邀請時）：族群配對句＋四維度字母對照列
    const friend = getInvite();
    if (friend) {
      this.add
        .text(cx, 522, tf(pairKey(groupOf(type), groupOf(friend)), [sharedLetters(type, friend)]), {
          fontSize: '14px',
          color: '#ffffff',
          align: 'center',
          wordWrap: { width: GAME.width - 50, useAdvancedWrap: true },
          fontFamily: 'Nunito, system-ui, sans-serif',
        })
        .setOrigin(0.5);
      this.drawCompareRow(cx, 552, type, friend);
    }
```

按鈕 y 改條件式（三顆鈕的 y 參數）：

```ts
    const btnY = friend ? [595, 658, 718] : [585, 650, 712];
```

分享鈕 y 用 `btnY[0]`、再玩一次 `btnY[1]`、趨勢 `btnY[2]`（注意 `friend` 宣告需在按鈕建立之前——若原碼順序不同，將 `const friend = getInvite();` 上移）。

- [ ] **Step 2: 加 `drawCompareRow` 方法**

```ts
  /** 四維度字母對照：同字母 → 一顆亮色章＋金框；異字母 → 我的彩色章＋好友灰章並列。 */
  private drawCompareRow(cx: number, y: number, mine: string, theirs: string): void {
    const g = this.add.graphics();
    const chipH = 22;
    const font = {
      fontSize: '14px',
      fontStyle: 'bold',
      fontFamily: 'Nunito, system-ui, sans-serif',
    };
    const gap = 16;
    const widths = [0, 1, 2, 3].map((i) => (mine[i] === theirs[i] ? 30 : 50));
    let x = cx - (widths.reduce((a, b) => a + b, 0) + gap * 3) / 2;
    for (let i = 0; i < 4; i++) {
      const same = mine[i] === theirs[i];
      if (same) {
        g.fillStyle(LETTER_COLORS[mine[i] as Letter], 1);
        g.fillRoundedRect(x, y - chipH / 2, 30, chipH, chipH / 2);
        g.lineStyle(2, PALETTE.accent, 1);
        g.strokeRoundedRect(x, y - chipH / 2, 30, chipH, chipH / 2);
        this.add.text(x + 15, y, mine[i], { ...font, color: PALETTE.textOn }).setOrigin(0.5);
      } else {
        g.fillStyle(LETTER_COLORS[mine[i] as Letter], 1);
        g.fillRoundedRect(x, y - chipH / 2, 24, chipH, chipH / 2);
        this.add.text(x + 12, y, mine[i], { ...font, color: PALETTE.textOn }).setOrigin(0.5);
        g.fillStyle(0xffffff, 0.13);
        g.fillRoundedRect(x + 26, y - chipH / 2, 24, chipH, chipH / 2);
        this.add.text(x + 38, y, theirs[i], { ...font, color: '#8888aa' }).setOrigin(0.5);
      }
      x += widths[i] + gap;
    }
  }
```

（`PALETTE` 需在 import：`import { LETTER_COLORS, PALETTE, letterHex } from '../theme/palette';` 視現有 import 併整；`letterHex` 若未用不引。）

- [ ] **Step 3: 退役 compareKey 與 compare.0–4**

- `src/core/compare.ts`：刪 `compareKey` 函式（`sharedLetters`、`pairKey` 保留）。
- `src/core/compare.test.ts`：刪 `compareKey` describe（`EN[compareKey(n)]` 斷言隨之移除）。
- 五檔刪 `compare.0`–`compare.4`。

- [ ] **Step 4: 型檢＋全套測試**

Run: `npx tsc --noEmit && npm test`
Expected: 全 PASS

- [ ] **Step 5: Commit**

```bash
git add src/scenes/ResultScene.ts src/core/compare.ts src/core/compare.test.ts src/i18n/strings/
git commit -m "feat: invited result shows group-pair copy + per-dimension letter compare row"
```

---

### Task 6: OG 重生成 ＋ 抽查

**Files:**
- Modify: `public/og/**/*.png`

- [ ] **Step 1:** `npm run generate:og` → Expected: `generated 80 type cards + default.png`
- [ ] **Step 2:** Read 抽查 `public/og/zh-Hant/INFP.png`（描述應為「你在腦內開過一百場演唱會…」、族群行「夢遊詩人 · 外交官」）、`public/og/en/ENTJ.png`、`public/og/ja/ISFJ.png`——新文案、無豆腐、無溢出。
- [ ] **Step 3:** Commit

```bash
git add public/og/
git commit -m "chore: regenerate OG images with per-type copy"
```

---

### Task 7: 整體驗證 ＋ 截圖 ＋ 部署（controller 執行）

- [ ] **Step 1:** `npm test && npx tsc --noEmit && npm run build` 全綠
- [ ] **Step 2:** 截圖驗收：結果頁無邀請（新文案＋綽號族群行）；`/t/ENTJ` 邀請後結果頁（配對句＋對照列＋按鈕位）——dev hook 比照前例、驗完還原
- [ ] **Step 3:** 截圖給使用者確認 → merge → deploy → 線上抽查（含 `/t/INFP` OG meta 新 title/desc）
- [ ] **Step 4:** `docs/TODO.md` 打勾＋註記，commit
