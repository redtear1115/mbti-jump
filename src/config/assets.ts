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

/**
 * BootScene 依此預載；檔案缺失時由 loaderror 略過（漸進增強）。
 * 目前刻意留空：主角/台階/背景全用程式美術（proc art），不載入點陣圖。
 * 若日後要換回點陣素材，把對應項目加回（ASSET_KEYS 與 fallback 判斷都還在）。
 */
export const IMAGE_MANIFEST: { key: string; path: string }[] = [];

export const AUDIO_MANIFEST: { key: string; path: string }[] = [
  { key: SFX_KEYS.bounce, path: 'assets/audio/bounce.ogg' },
  { key: SFX_KEYS.select, path: 'assets/audio/select.ogg' },
  { key: SFX_KEYS.advance, path: 'assets/audio/advance.ogg' },
  { key: SFX_KEYS.result, path: 'assets/audio/result.ogg' },
  { key: SFX_KEYS.gameover, path: 'assets/audio/gameover.ogg' },
];
