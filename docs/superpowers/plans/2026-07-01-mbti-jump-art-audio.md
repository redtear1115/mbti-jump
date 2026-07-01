# MBTI Jump — 美術 & 音效 (Tier 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 以漸進增強把 MBTI Jump 從程式美術升級：導入 16Personalities 四族群色票、族群色結算、Fredoka/Nunito 字體、視差背景、SFX 音效與 BootScene 載入管線；缺素材時優雅降級，全程 build 綠、可玩。

**Architecture:** 純呈現層強化，不動遊戲邏輯。純模組（`theme/palette`、`core/temperament`、`config/assets`、`audio/Sfx`）不 import Phaser 且可單測；BootScene 依 manifest 預載圖/音並容忍缺檔；實體與場景「有真素材就用、否則 fallback」。

**Tech Stack:** Vite, TypeScript (strict), Phaser 3, Vitest。網頁字體 Fredoka + Nunito。

## Global Constraints

- 純前端、直式 portrait 450×800；`npm run build` 每個 task 後必須綠、`npm test` 綠。
- 純模組（`palette`、`temperament`、`assets`、`Sfx`）**不得 import Phaser**、須單元測試；場景/實體/`Background`/`MuteButton` 不在此限。
- **漸進增強**：真素材（精靈/音效/字體）缺失時 fallback（程式美術／`Sfx` no-op／系統字體／純色背景），不得讓 build 或遊戲壞掉。
- 四族群色（16Personalities 慣例）：探險家 SP=黃 `0xe4ae3a`、外交官 NF=綠 `0x33a474`、分析師 NT=紫 `0x88619a`、守護者 SJ=藍 `0x4298b4`。
- 分組規則：type[1]=N → (type[2]=F→diplomat / 否則 analyst)；type[1]=S → (type[3]=J→sentinel / 否則 explorer)。
- SFX key：`bounce/select/advance/result/gameover`；靜音狀態存 `localStorage('mbti-jump.muted')`。
- 素材路徑：圖 `public/assets/sprites/*.png`、音 `public/assets/audio/*`（由使用者放檔；缺檔容忍）。
- 遊戲邏輯（ScoreTracker、questions、i18n、progression、爬塔流程）不得更動。

---

### Task 1: 色票 `theme/palette.ts`（集中色值 + 四族群色）

**Files:**
- Create: `src/theme/palette.ts`
- Modify: `src/config/gameConfig.ts`（移除 `levelColors`）, `src/scenes/GameScene.ts`（背景改用 `LEVEL_BG`）, `src/ui/Button.ts`（預設色改用 palette）

**Interfaces:**
- Consumes: 無
- Produces:
  - `const PALETTE`（含 `explorer/diplomat/analyst/sentinel/surface/surfaceAlt/yes/no/accent` 數字色值與 `textOn/textLight/textMuted` 字串色）
  - `const LEVEL_BG: readonly [number, number, number, number]`（四維度背景色）

- [ ] **Step 1: 建立 `src/theme/palette.ts`**

```ts
/** 語意色票。數字色供 Phaser Graphics/背景；字串色供 Text style。 */
export const PALETTE = {
  // 16Personalities 四族群色（基底）
  explorer: 0xe4ae3a, // SP 探險家 黃
  diplomat: 0x33a474, // NF 外交官 綠
  analyst: 0x88619a, // NT 分析師 紫
  sentinel: 0x4298b4, // SJ 守護者 藍

  surface: 0x1a1c2c,
  surfaceAlt: 0x2a2d42,
  yes: 0x38b764, // 綠 = Yes 台階
  no: 0xb13e53, // 紅 = No 台階
  accent: 0xffcc00,

  textOn: '#0f1220', // 亮底上的深字（按鈕）
  textLight: '#ffffff',
  textMuted: '#ffffffaa',
} as const;

/** 四維度背景（族群色深化版，僅美術用途、非語意對應維度）。 */
export const LEVEL_BG: readonly [number, number, number, number] = [
  0x2e3a59, 0x3a2e59, 0x594a2e, 0x2e594a,
];
```

- [ ] **Step 2: 從 `gameConfig.ts` 移除 `levelColors`**

刪除 `src/config/gameConfig.ts` 中這段（含前一行註解）：
```ts
  // 各維度背景色（對應 DIMENSIONS 順序 EI/SN/TF/JP）
  levelColors: ['#2e3a59', '#3a2e59', '#594a2e', '#2e594a'],
```

- [ ] **Step 3: `GameScene.ts` 改用 `LEVEL_BG`**

在 import 區加：
```ts
import { LEVEL_BG } from '../theme/palette';
```
把兩處 `GAME.levelColors[this.dimIndex]` 改為 `LEVEL_BG[this.dimIndex]`：
```ts
this.cameras.main.setBackgroundColor(LEVEL_BG[this.dimIndex]);
```
（`create()` 與 `advanceDimension()` 各一處。）

- [ ] **Step 4: `Button.ts` 預設色改用 palette**

在 `src/ui/Button.ts` import 加 `import { PALETTE } from '../theme/palette';`，把建構子預設色改為：
```ts
    this.bg = opts.bg ?? PALETTE.yes;
    this.bgHover = opts.bgHover ?? 0x49cf82;
    this.bgDown = opts.bgDown ?? 0x2f9d57;
```
並把 `label` 顏色預設 `opts.textColor ?? PALETTE.textOn`。

- [ ] **Step 5: 驗證編譯與建置**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -1`
Expected: 無型別錯誤；`✓ built`。

- [ ] **Step 6: 跑測試（確認無回歸）**

Run: `npm test`
Expected: 現有測試全綠（數量不變）。

- [ ] **Step 7: Commit**

```bash
git add src/theme/palette.ts src/config/gameConfig.ts src/scenes/GameScene.ts src/ui/Button.ts
git commit -m "feat: add palette module with 4 MBTI group colors; centralize colors"
```

---

### Task 2: 族群判定 `core/temperament.ts`（純邏輯 + 測試）

**Files:**
- Create: `src/core/temperament.ts`
- Test: `src/core/temperament.test.ts`

**Interfaces:**
- Consumes: `PALETTE`（from `theme/palette`）
- Produces:
  - `type Group = 'explorer' | 'diplomat' | 'analyst' | 'sentinel'`
  - `const GROUP_COLORS: Record<Group, number>`
  - `function groupOf(type: string): Group`（格式錯誤丟錯）
  - `function colorOf(group: Group): number`
  - `function groupColorOf(type: string): number`

- [ ] **Step 1: 寫失敗測試 `src/core/temperament.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { groupOf, colorOf, groupColorOf, GROUP_COLORS } from './temperament';
import { PALETTE } from '../theme/palette';

describe('temperament grouping', () => {
  it('maps N+F types to diplomat', () => {
    for (const t of ['INFJ', 'INFP', 'ENFJ', 'ENFP']) expect(groupOf(t)).toBe('diplomat');
  });
  it('maps N+T types to analyst', () => {
    for (const t of ['INTJ', 'INTP', 'ENTJ', 'ENTP']) expect(groupOf(t)).toBe('analyst');
  });
  it('maps S+J types to sentinel', () => {
    for (const t of ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ']) expect(groupOf(t)).toBe('sentinel');
  });
  it('maps S+P types to explorer', () => {
    for (const t of ['ISTP', 'ISFP', 'ESTP', 'ESFP']) expect(groupOf(t)).toBe('explorer');
  });
  it('covers all 16 types (each maps to a group)', () => {
    const seen = new Set<string>();
    for (const a of ['E', 'I']) for (const b of ['S', 'N']) for (const c of ['T', 'F']) for (const d of ['J', 'P']) {
      seen.add(groupOf(`${a}${b}${c}${d}`));
    }
    expect(seen).toEqual(new Set(['explorer', 'diplomat', 'analyst', 'sentinel']));
  });
  it('colorOf / groupColorOf return palette colors', () => {
    expect(colorOf('analyst')).toBe(PALETTE.analyst);
    expect(groupColorOf('ENFP')).toBe(PALETTE.diplomat);
    expect(GROUP_COLORS.sentinel).toBe(PALETTE.sentinel);
  });
  it('throws on malformed type', () => {
    expect(() => groupOf('ABC')).toThrow();
    expect(() => groupOf('ENFPX')).toThrow();
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm test src/core/temperament.test.ts`
Expected: FAIL — 找不到模組 `./temperament`。

- [ ] **Step 3: 實作 `src/core/temperament.ts`**

```ts
import { PALETTE } from '../theme/palette';

export type Group = 'explorer' | 'diplomat' | 'analyst' | 'sentinel';

export const GROUP_COLORS: Record<Group, number> = {
  explorer: PALETTE.explorer,
  diplomat: PALETTE.diplomat,
  analyst: PALETTE.analyst,
  sentinel: PALETTE.sentinel,
};

const VALID = new Set(['E', 'I', 'S', 'N', 'T', 'F', 'J', 'P']);

/** 4 碼人格 → 族群。type[1]=S/N、type[2]=T/F、type[3]=J/P。 */
export function groupOf(type: string): Group {
  const l = type.split('');
  if (l.length !== 4 || !l.every((c) => VALID.has(c))) {
    throw new Error(`Invalid MBTI type: ${type}`);
  }
  if (l[1] === 'N') return l[2] === 'F' ? 'diplomat' : 'analyst';
  return l[3] === 'J' ? 'sentinel' : 'explorer';
}

export function colorOf(group: Group): number {
  return GROUP_COLORS[group];
}

export function groupColorOf(type: string): number {
  return colorOf(groupOf(type));
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npm test`
Expected: PASS（含 temperament 全數）。

- [ ] **Step 5: Commit**

```bash
git add src/core/temperament.ts src/core/temperament.test.ts
git commit -m "feat: add temperament grouping (type -> MBTI group -> color)"
```

---

### Task 3: 資源清單 `config/assets.ts`（+ 唯一性測試）

**Files:**
- Create: `src/config/assets.ts`
- Test: `src/config/assets.test.ts`

**Interfaces:**
- Consumes: 無
- Produces:
  - `const ASSET_KEYS`（圖 key）、`const SFX_KEYS`（音 key）
  - `const IMAGE_MANIFEST: { key: string; path: string }[]`
  - `const AUDIO_MANIFEST: { key: string; path: string }[]`

- [ ] **Step 1: 寫失敗測試 `src/config/assets.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { ASSET_KEYS, SFX_KEYS, IMAGE_MANIFEST, AUDIO_MANIFEST } from './assets';

describe('assets registry', () => {
  it('image keys are unique', () => {
    const vals = Object.values(ASSET_KEYS);
    expect(new Set(vals).size).toBe(vals.length);
  });
  it('sfx keys are unique', () => {
    const vals = Object.values(SFX_KEYS);
    expect(new Set(vals).size).toBe(vals.length);
  });
  it('manifests reference declared keys and unique paths', () => {
    const imgKeys = new Set<string>(Object.values(ASSET_KEYS));
    for (const e of IMAGE_MANIFEST) expect(imgKeys.has(e.key)).toBe(true);
    const sfxKeys = new Set<string>(Object.values(SFX_KEYS));
    for (const e of AUDIO_MANIFEST) expect(sfxKeys.has(e.key)).toBe(true);
    const paths = [...IMAGE_MANIFEST, ...AUDIO_MANIFEST].map((e) => e.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm test src/config/assets.test.ts`
Expected: FAIL — 找不到模組 `./assets`。

- [ ] **Step 3: 實作 `src/config/assets.ts`**

```ts
export const ASSET_KEYS = {
  player: 'player',
  platformNormal: 'platform-normal',
  platformYes: 'platform-yes',
  platformNo: 'platform-no',
  bgSky: 'bg-sky',
  bgClouds: 'bg-clouds',
  bgHills: 'bg-hills',
} as const;

export const SFX_KEYS = {
  bounce: 'sfx-bounce',
  select: 'sfx-select',
  advance: 'sfx-advance',
  result: 'sfx-result',
  gameover: 'sfx-gameover',
} as const;

/** BootScene 依此預載；檔案缺失時由 loaderror 略過（漸進增強）。 */
export const IMAGE_MANIFEST: { key: string; path: string }[] = [
  { key: ASSET_KEYS.player, path: 'assets/sprites/player.png' },
  { key: ASSET_KEYS.platformNormal, path: 'assets/sprites/platform-normal.png' },
  { key: ASSET_KEYS.platformYes, path: 'assets/sprites/platform-yes.png' },
  { key: ASSET_KEYS.platformNo, path: 'assets/sprites/platform-no.png' },
  { key: ASSET_KEYS.bgSky, path: 'assets/sprites/bg-sky.png' },
  { key: ASSET_KEYS.bgClouds, path: 'assets/sprites/bg-clouds.png' },
  { key: ASSET_KEYS.bgHills, path: 'assets/sprites/bg-hills.png' },
];

export const AUDIO_MANIFEST: { key: string; path: string }[] = [
  { key: SFX_KEYS.bounce, path: 'assets/audio/bounce.ogg' },
  { key: SFX_KEYS.select, path: 'assets/audio/select.ogg' },
  { key: SFX_KEYS.advance, path: 'assets/audio/advance.ogg' },
  { key: SFX_KEYS.result, path: 'assets/audio/result.ogg' },
  { key: SFX_KEYS.gameover, path: 'assets/audio/gameover.ogg' },
];
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npm test`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/config/assets.ts src/config/assets.test.ts
git commit -m "feat: add asset key registry and load manifests"
```

---

### Task 4: 音效管理 `audio/Sfx.ts`（+ 測試）

**Files:**
- Create: `src/audio/Sfx.ts`
- Test: `src/audio/Sfx.test.ts`

**Interfaces:**
- Consumes: `SFX_KEYS`（from `config/assets`）
- Produces: `const Sfx`：
  - `init(sound: Phaser.Sound.BaseSoundManager, has: (key: string) => boolean): void`
  - `play(key: keyof typeof SFX_KEYS): void`（未 init／缺音／靜音時 no-op）
  - `isMuted(): boolean`、`toggleMute(): boolean`
  - `const MUTE_KEY = 'mbti-jump.muted'`

> 用「注入 sound manager 與 has() 判斷」讓 `Sfx` 可在 node 測試（不 import Phaser 型別以外的執行期依賴；`Phaser.Sound.BaseSoundManager` 僅型別）。

- [ ] **Step 1: 寫失敗測試 `src/audio/Sfx.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Sfx, MUTE_KEY } from './Sfx';

function mockStore() {
  const s: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => (k in s ? s[k] : null),
    setItem: (k: string, v: string) => { s[k] = v; },
  };
  return s;
}
afterEach(() => {
  delete (globalThis as any).localStorage;
  Sfx._resetForTest();
});
beforeEach(() => Sfx._resetForTest());

describe('Sfx', () => {
  it('play is a no-op before init (does not throw)', () => {
    expect(() => Sfx.play('bounce')).not.toThrow();
  });

  it('plays an existing, non-muted sound', () => {
    mockStore();
    const played: string[] = [];
    const sound = { play: (k: string) => played.push(k) } as any;
    Sfx.init(sound, () => true);
    Sfx.play('select');
    expect(played).toEqual(['sfx-select']);
  });

  it('does not play a missing sound', () => {
    mockStore();
    const played: string[] = [];
    const sound = { play: (k: string) => played.push(k) } as any;
    Sfx.init(sound, () => false); // 檔案缺失
    Sfx.play('select');
    expect(played).toEqual([]);
  });

  it('toggleMute persists and silences playback', () => {
    const store = mockStore();
    const played: string[] = [];
    const sound = { play: (k: string) => played.push(k) } as any;
    Sfx.init(sound, () => true);
    expect(Sfx.toggleMute()).toBe(true);
    expect(store[MUTE_KEY]).toBe('1');
    Sfx.play('bounce');
    expect(played).toEqual([]); // 靜音 → 不播
    expect(Sfx.toggleMute()).toBe(false);
    Sfx.play('bounce');
    expect(played).toEqual(['sfx-bounce']);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm test src/audio/Sfx.test.ts`
Expected: FAIL — 找不到模組 `./Sfx`。

- [ ] **Step 3: 實作 `src/audio/Sfx.ts`**

```ts
import type Phaser from 'phaser';
import { SFX_KEYS } from '../config/assets';

export const MUTE_KEY = 'mbti-jump.muted';

let sound: Phaser.Sound.BaseSoundManager | null = null;
let hasSound: (key: string) => boolean = () => false;
let muted: boolean | null = null;

function readMuted(): boolean {
  try {
    return (globalThis as any).localStorage?.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}
function writeMuted(v: boolean): void {
  try {
    (globalThis as any).localStorage?.setItem(MUTE_KEY, v ? '1' : '0');
  } catch {
    /* 略過 */
  }
}

export const Sfx = {
  init(sm: Phaser.Sound.BaseSoundManager, has: (key: string) => boolean): void {
    sound = sm;
    hasSound = has;
    if (muted === null) muted = readMuted();
  },

  play(key: keyof typeof SFX_KEYS): void {
    if (!sound || this.isMuted()) return;
    const soundKey = SFX_KEYS[key];
    if (!hasSound(soundKey)) return;
    sound.play(soundKey);
  },

  isMuted(): boolean {
    if (muted === null) muted = readMuted();
    return muted;
  },

  toggleMute(): boolean {
    muted = !this.isMuted();
    writeMuted(muted);
    return muted;
  },

  /** 測試用：清空狀態。 */
  _resetForTest(): void {
    sound = null;
    hasSound = () => false;
    muted = null;
  },
};
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npm test`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/audio/Sfx.ts src/audio/Sfx.test.ts
git commit -m "feat: add Sfx manager (mute toggle, graceful no-op)"
```

---

### Task 5: BootScene + 網頁字體 + 接線（`scenes/BootScene.ts`, `index.html`, `main.ts`）

**Files:**
- Create: `src/scenes/BootScene.ts`
- Modify: `index.html`（引入字體）, `src/main.ts`（場景陣列最前面加 Boot）

**Interfaces:**
- Consumes: `IMAGE_MANIFEST`, `AUDIO_MANIFEST`（from `config/assets`）, `Sfx`
- Produces: `class BootScene extends Phaser.Scene`（key `'Boot'`）：預載素材（容忍缺檔）、等字體、`Sfx.init`、`scene.start('Start')`

- [ ] **Step 1: `index.html` 引入 Fredoka + Nunito**

在 `<head>` 內、`<title>` 前加：
```html
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;700&display=swap"
      rel="stylesheet"
    />
```

- [ ] **Step 2: 建立 `src/scenes/BootScene.ts`**

```ts
import Phaser from 'phaser';
import { IMAGE_MANIFEST, AUDIO_MANIFEST } from '../config/assets';
import { Sfx } from '../audio/Sfx';

/**
 * 預載素材（缺檔容忍 → 漸進增強）、等網頁字體就緒，再進 Start。
 * 不在此請求 iOS 體感權限（需使用者手勢，維持在 StartScene 按鈕內）。
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // 缺檔不致命：記 warn 後略過，實體/背景/音效自行 fallback
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[assets] missing, will fall back: ${file.key} (${file.src})`);
    });
    for (const { key, path } of IMAGE_MANIFEST) this.load.image(key, path);
    for (const { key, path } of AUDIO_MANIFEST) this.load.audio(key, path);
  }

  async create() {
    Sfx.init(this.sound, (key) => this.cache.audio.exists(key));
    try {
      await (document as Document).fonts.ready;
    } catch {
      /* 無 FontFaceSet：略過，用系統字體 */
    }
    this.scene.start('Start');
  }
}
```

- [ ] **Step 3: `main.ts` 場景陣列最前面加 BootScene**

改 `src/main.ts`：import 加 `import { BootScene } from './scenes/BootScene';`，並把 `scene` 陣列（目前為 `[StartScene, GameScene, GameOverScene, ResultScene]`）在最前面插入 `BootScene`：
```ts
  scene: [BootScene, StartScene, GameScene, GameOverScene, ResultScene],
```
Phaser 會自動啟動陣列第一個場景（BootScene），預載後由 BootScene 轉到 `'Start'`。

- [ ] **Step 4: 驗證編譯、建置、測試**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -1 && npm test 2>&1 | tail -3`
Expected: 無型別錯誤、`✓ built`、測試全綠。

- [ ] **Step 5: 手動驗證啟動流程**

Run: `npm run dev`，開瀏覽器。
Expected: 短暫 Boot 後進入 Start（畫面與先前一致；主控台可能出現 `[assets] missing…` warn——預期，因尚未放素材）；遊戲可正常開始與遊玩。

- [ ] **Step 6: Commit**

```bash
git add src/scenes/BootScene.ts index.html src/main.ts
git commit -m "feat: add BootScene asset preload (fault-tolerant) + web fonts"
```

---

### Task 6: 套用字體到各場景（Fredoka 標題 / Nunito 內文）

**Files:**
- Modify: `src/scenes/StartScene.ts`, `src/scenes/GameScene.ts`, `src/scenes/GameOverScene.ts`, `src/scenes/ResultScene.ts`, `src/ui/Button.ts`

**Interfaces:**
- Consumes: 無（僅在 Text style 加 `fontFamily`）
- Produces: 無新介面

> 慣例：標題/大字/按鈕用 `"Fredoka, system-ui, sans-serif"`；題目/內文用 `"Nunito, system-ui, sans-serif"`。未載入時 fallback 系統字體。

- [ ] **Step 1: `Button.ts` 文字加 Fredoka**

`src/ui/Button.ts` 建立 `label` 的 style 內加：
```ts
        fontFamily: 'Fredoka, system-ui, sans-serif',
```

- [ ] **Step 2: `StartScene.ts` 加字體**

- 標題 `t('start.title')` 的 style 加 `fontFamily: 'Fredoka, system-ui, sans-serif'`。
- tagline、`start.language` 標籤、語言 chip 的 style 加 `fontFamily: 'Nunito, system-ui, sans-serif'`。

- [ ] **Step 3: `GameScene.ts` 加字體**

- banner、`announceDimension` 大字、`level.lastQuestionMarker` 用 `fontFamily: 'Fredoka, system-ui, sans-serif'`。
- levelLabel、tally、previewLeft/Right 用 `fontFamily: 'Nunito, system-ui, sans-serif'`。

- [ ] **Step 4: `GameOverScene.ts` / `ResultScene.ts` 加字體**

- 標題/大字（gameover.title、result.heading、type 大字）用 Fredoka。
- 副標、說明用 Nunito。

- [ ] **Step 5: 驗證編譯、建置、測試**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -1 && npm test 2>&1 | tail -3`
Expected: 無錯誤、`✓ built`、測試全綠。

- [ ] **Step 6: 手動驗證**

Run: `npm run dev`
Expected: Start/遊玩/結算文字改為圓潤 Fredoka/Nunito（非系統預設 slab/mono）。

- [ ] **Step 7: Commit**

```bash
git add src/scenes/StartScene.ts src/scenes/GameScene.ts src/scenes/GameOverScene.ts src/scenes/ResultScene.ts src/ui/Button.ts
git commit -m "feat: apply Fredoka/Nunito fonts across scenes"
```

---

### Task 7: 視差背景 `gfx/Background.ts` + 接入 GameScene

**Files:**
- Create: `src/gfx/Background.ts`
- Modify: `src/scenes/GameScene.ts`

**Interfaces:**
- Consumes: `ASSET_KEYS`（from `config/assets`）
- Produces: `class Background`：
  - `constructor(scene: Phaser.Scene)`
  - `update(scrollY: number): void`
  - `hasLayers(): boolean`（是否成功建立視差層；否 → 呼叫端保留純色底）

- [ ] **Step 1: 實作 `src/gfx/Background.ts`**

```ts
import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { ASSET_KEYS } from '../config/assets';

interface Layer {
  ts: Phaser.GameObjects.TileSprite;
  factor: number; // 視差速度：越小越慢
}

/**
 * 視差多層背景。若對應圖未載入則不建立任何層（hasLayers()=false），
 * 呼叫端改用純色背景（漸進增強）。
 */
export class Background {
  private layers: Layer[] = [];

  constructor(scene: Phaser.Scene) {
    const defs: { key: string; factor: number }[] = [
      { key: ASSET_KEYS.bgSky, factor: 0.1 },
      { key: ASSET_KEYS.bgClouds, factor: 0.25 },
      { key: ASSET_KEYS.bgHills, factor: 0.5 },
    ];
    for (const d of defs) {
      if (!scene.textures.exists(d.key)) continue;
      const ts = scene.add
        .tileSprite(0, 0, GAME.width, GAME.height, d.key)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(-10);
      this.layers.push({ ts, factor: d.factor });
    }
  }

  hasLayers(): boolean {
    return this.layers.length > 0;
  }

  /** 依相機捲動更新各層 tilePositionY，製造上升視差。 */
  update(scrollY: number): void {
    for (const l of this.layers) l.ts.tilePositionY = scrollY * l.factor;
  }
}
```

- [ ] **Step 2: `GameScene.ts` 接入 Background**

- import：`import { Background } from '../gfx/Background';`
- 欄位：`private background!: Background;`
- `create()` 開頭（`setBackgroundColor` 之後）建立：
```ts
    this.background = new Background(this);
```
（純色底仍設定；若有視差層會覆蓋其上、depth -10 在平台之下。）
- `update()` 內（相機捲動計算之後）加：
```ts
    this.background.update(this.cameras.main.scrollY);
```

- [ ] **Step 3: 驗證編譯、建置、測試**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -1 && npm test 2>&1 | tail -3`
Expected: 無錯誤、`✓ built`、測試全綠。

- [ ] **Step 4: 手動驗證（無素材時）**

Run: `npm run dev`，開始遊戲。
Expected: 因尚無背景圖，`hasLayers()`=false，畫面維持純色底（現行行為），無錯誤。

- [ ] **Step 5: Commit**

```bash
git add src/gfx/Background.ts src/scenes/GameScene.ts
git commit -m "feat: add parallax Background with solid-color fallback"
```

---

### Task 8: 精靈整合（`Player`/`Platform` 真 texture 優先）

**Files:**
- Modify: `src/entities/Player.ts`, `src/entities/Platform.ts`

**Interfaces:**
- Consumes: `ASSET_KEYS`（from `config/assets`）
- Produces: 無新介面（行為：有真 texture 就用、否則程式美術）

- [ ] **Step 1: `Player.ts` 真 texture 優先**

在 `Player.ts` import 加 `import { ASSET_KEYS } from '../config/assets';`。把建構子改為：
```ts
  constructor(scene: Phaser.Scene, x: number, y: number) {
    const key = scene.textures.exists(ASSET_KEYS.player) ? ASSET_KEYS.player : PROC_KEY;
    if (key === PROC_KEY) ensureTexture(scene);
    super(scene, x, y, key);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(36, 36);
    body.setCollideWorldBounds(false);
  }
```
並把原本的程式貼圖 key 常數改名為 `PROC_KEY`（例如 `const PROC_KEY = 'player-proc';`），`ensureTexture` 產生 `PROC_KEY`。

- [ ] **Step 2: `Platform.ts` 真 texture 優先**

在 `Platform.ts` import 加 `import { ASSET_KEYS } from '../config/assets';`。把三種平台 key 的選用改為「真 texture 優先」：
```ts
  static makeNormal(scene: Phaser.Scene, x: number, y: number): Platform {
    const key = scene.textures.exists(ASSET_KEYS.platformNormal) ? ASSET_KEYS.platformNormal : NORMAL_KEY;
    if (key === NORMAL_KEY) ensureTextures(scene);
    const p = new Platform(scene, x, y, key);
    p.kind = 'normal';
    return p;
  }
```
`makeQuestion` 同理，依 `opts.isYes` 選 `ASSET_KEYS.platformYes`/`platformNo`，缺則 `ensureTextures` 後用程式 key `YES_KEY`/`NO_KEY`：
```ts
    const realKey = opts.isYes ? ASSET_KEYS.platformYes : ASSET_KEYS.platformNo;
    const procKey = opts.isYes ? YES_KEY : NO_KEY;
    const key = scene.textures.exists(realKey) ? realKey : procKey;
    if (key === procKey) ensureTextures(scene);
    const p = new Platform(scene, x, y, key);
```
（`ensureTextures` 內部已對每個程式 key 做 `exists` 判斷，重複呼叫安全。）

- [ ] **Step 3: 驗證編譯、建置、測試**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -1 && npm test 2>&1 | tail -3`
Expected: 無錯誤、`✓ built`、測試全綠。

- [ ] **Step 4: 手動驗證（無素材時）**

Run: `npm run dev`，開始遊戲。
Expected: 無精靈檔 → 仍用程式美術（黃色玩家、色塊平台），無錯誤。

- [ ] **Step 5: Commit**

```bash
git add src/entities/Player.ts src/entities/Platform.ts
git commit -m "feat: prefer real sprite textures with procedural fallback"
```

---

### Task 9: SFX 觸發點 + 靜音鈕（`ui/MuteButton.ts`）

**Files:**
- Create: `src/ui/MuteButton.ts`
- Modify: `src/scenes/GameScene.ts`, `src/scenes/StartScene.ts`, `src/scenes/GameOverScene.ts`, `src/scenes/ResultScene.ts`

**Interfaces:**
- Consumes: `Sfx`（from `audio/Sfx`）
- Produces: `class MuteButton`：`constructor(scene, x, y)`（右上角圖示鈕，點擊 `Sfx.toggleMute()` 並更新圖示）

- [ ] **Step 1: 實作 `src/ui/MuteButton.ts`**

```ts
import Phaser from 'phaser';
import { Sfx } from '../audio/Sfx';

/** 右上角靜音切換（純文字圖示 🔊/🔇；點擊切換並記住）。 */
export class MuteButton {
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.label = scene.add
      .text(x, y, this.icon(), { fontSize: '22px' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(50)
      .setInteractive({ useHandCursor: true });
    this.label.on('pointerup', () => {
      Sfx.toggleMute();
      this.label.setText(this.icon());
    });
  }

  private icon(): string {
    return Sfx.isMuted() ? '🔇' : '🔊';
  }
}
```

- [ ] **Step 2: SFX 觸發點接入 `GameScene.ts`**

- import：`import { Sfx } from '../audio/Sfx';` 與 `import { MuteButton } from '../ui/MuteButton';`
- `create()` 末尾加靜音鈕：`new MuteButton(this, GAME.width - 26, 26);`
- `Player.bounce()` 之後（`onLand` 內）加 `Sfx.play('bounce');`
- `onLand` 記錄答案處（`this.dimAnsweredIds.add(...)` 之後）加 `Sfx.play('select');`
- `completeCurrentDimension()` 內 `this.score.completeLevel(...)` 之後加 `Sfx.play('advance');`
- `advanceDimension()` 進結算前 `this.scene.start('Result', …)` 之前加 `Sfx.play('result');`
- `gameOver()` 內 `this.scene.start('GameOver', …)` 之前加 `Sfx.play('gameover');`

- [ ] **Step 3: 靜音鈕加到 Start / 結算 / 失敗場景**

- `StartScene.create()`：`new MuteButton(this, GAME.width - 26, 26);`（需 import GAME 與 MuteButton）
- `GameOverScene.create()` 與 `ResultScene.create()` 同樣各加一顆。

- [ ] **Step 4: 驗證編譯、建置、測試**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -1 && npm test 2>&1 | tail -3`
Expected: 無錯誤、`✓ built`、測試全綠。

- [ ] **Step 5: 手動驗證（無音效檔時）**

Run: `npm run dev`
Expected: 右上角出現 🔊/🔇 可切換；無音效檔時 `Sfx.play` no-op（不出聲、不報錯）；靜音狀態重整後保留。

- [ ] **Step 6: Commit**

```bash
git add src/ui/MuteButton.ts src/scenes/GameScene.ts src/scenes/StartScene.ts src/scenes/GameOverScene.ts src/scenes/ResultScene.ts
git commit -m "feat: wire SFX triggers + mute button (graceful when silent)"
```

---

### Task 10: 結算族群色 + 族群名稱 i18n（`ResultScene` + 五語字串）

**Files:**
- Modify: `src/scenes/ResultScene.ts`, `src/i18n/strings/en.ts`, `src/i18n/strings/zh-Hant.ts`, `src/i18n/strings/zh-Hans.ts`, `src/i18n/strings/ja.ts`, `src/i18n/strings/es.ts`
- Test: 既有 `src/i18n/completeness.test.ts` 自動涵蓋新 key（不需改測試）

**Interfaces:**
- Consumes: `groupOf`, `groupColorOf`（from `core/temperament`）、`t`（from i18n）
- Produces: 無新介面（ResultScene 以族群色上色 + 顯示族群名稱）

> 新增 5 個 i18n key（每語）：`group.explorer/diplomat/analyst/sentinel` 與 `result.groupLabel`（模板 `{0}`）。`en` 為權威來源；完整性測試會確保其他語言齊全。

- [ ] **Step 1: `en.ts` 加族群 key**（其他語言同步；找 `'level.lastQuestion'` 後方插入）

在 `EN` 物件內加：
```ts
  'result.groupLabel': 'You are {0}',
  'group.explorer': 'an Explorer',
  'group.diplomat': 'a Diplomat',
  'group.analyst': 'an Analyst',
  'group.sentinel': 'a Sentinel',
```

- [ ] **Step 2: 其餘四語加對應 key（值如下）**

`zh-Hant.ts`：
```ts
  'result.groupLabel': '你屬於{0}',
  'group.explorer': '探險家',
  'group.diplomat': '外交官',
  'group.analyst': '分析師',
  'group.sentinel': '守護者',
```
`zh-Hans.ts`：
```ts
  'result.groupLabel': '你属于{0}',
  'group.explorer': '探险家',
  'group.diplomat': '外交官',
  'group.analyst': '分析师',
  'group.sentinel': '守护者',
```
`ja.ts`：
```ts
  'result.groupLabel': 'あなたは{0}',
  'group.explorer': '探検家',
  'group.diplomat': '外交官',
  'group.analyst': '分析家',
  'group.sentinel': '番人',
```
`es.ts`：
```ts
  'result.groupLabel': 'Eres {0}',
  'group.explorer': 'un Explorador',
  'group.diplomat': 'un Diplomático',
  'group.analyst': 'un Analista',
  'group.sentinel': 'un Centinela',
```

- [ ] **Step 3: `ResultScene.ts` 用族群色 + 顯示族群名稱**

- import：`import { groupOf, groupColorOf } from '../core/temperament';`
- 在 `create()` 取得 `type` 後：
```ts
    const group = groupOf(type);
    const groupHex = Phaser.Display.Color.IntegerToColor(groupColorOf(type)).rgba;
```
- 4 碼大字顏色改用族群色（把 `color: '#ffcc00'` 改為 `color: groupHex`）。
- 背景改為族群色的深化：`this.cameras.main.setBackgroundColor(groupColorOf(type));` 之上疊深色遮罩，或直接用 `PALETTE.surface` 底 + 大字族群色（擇一，保持可讀）。建議：底維持 `#1a1c2c`，僅大字與一行族群名稱用族群色。
- 在類型大字下方加一行族群名稱：
```ts
    this.add
      .text(cx, 320, tf('result.groupLabel', [t(`group.${group}` as StringKey)]), {
        fontFamily: 'Fredoka, system-ui, sans-serif',
        fontSize: '20px',
        color: groupHex,
      })
      .setOrigin(0.5);
```
（需 import `tf` 與 `StringKey`，`PALETTE` 視採用方案而定。）

- [ ] **Step 4: 驗證編譯、建置、測試**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -1 && npm test 2>&1 | tail -3`
Expected: 無錯誤、`✓ built`、測試全綠（含 completeness 涵蓋新 key）。

- [ ] **Step 5: 手動驗證**

Run: `npm run dev`，玩到結算（或暫時把 StartScene 直接 `scene.start('Result', {score})` 塞測試資料——驗證後還原）。
Expected: 結算頁 4 碼字與族群名稱以該族群色顯示（例：ENFP → 綠色「外交官」）。

- [ ] **Step 6: Commit**

```bash
git add src/scenes/ResultScene.ts src/i18n/strings
git commit -m "feat: tint result by MBTI group color + localized group name"
```

---

## 完成後（手動）
- **放素材啟用真美術/音效**：
  - 圖 → `public/assets/sprites/`（Kenney Jumper/Platformer/Background Elements，CC0）：`player.png`、`platform-normal.png`、`platform-yes.png`、`platform-no.png`、`bg-sky.png`、`bg-clouds.png`、`bg-hills.png`。
  - 音 → `public/assets/audio/`（Kenney Interface/Impact 或 Freesound CC0）：`bounce.ogg`、`select.ogg`、`advance.ogg`、`result.ogg`、`gameover.ogg`。
  - 檔名對應 `config/assets.ts` 的 manifest；放入後自動生效，無需改程式。
- 取用 CC-BY 素材時更新 [`CREDITS.md`](../../../CREDITS.md)。
- 實機各語言/各裝置抽測字體排版與觸控。
