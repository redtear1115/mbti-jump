export const ASSET_KEYS = {
  player: 'player',
  platformNormal: 'platform-normal',
  platformYes: 'platform-yes',
  platformNo: 'platform-no',
  platformArt: 'platform-art',
  cloud: 'sprite-cloud',
  sun: 'sprite-sun',
  petal: 'sprite-petal',
  spark: 'sprite-spark',
  heart: 'sprite-heart',
  rain: 'sprite-rain',
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
 * 主角、台階與漫畫分鏡全數採用高解析 2D Canvas 向量墨線與網點程序繪製，不載入外部點陣圖。
 */
export const IMAGE_MANIFEST: { key: string; path: string }[] = [];

export const AUDIO_MANIFEST: { key: string; path: string }[] = [
  { key: SFX_KEYS.bounce, path: 'assets/audio/bounce.ogg' },
  { key: SFX_KEYS.select, path: 'assets/audio/select.ogg' },
  { key: SFX_KEYS.advance, path: 'assets/audio/advance.ogg' },
  { key: SFX_KEYS.result, path: 'assets/audio/result.ogg' },
  { key: SFX_KEYS.gameover, path: 'assets/audio/gameover.ogg' },
];
