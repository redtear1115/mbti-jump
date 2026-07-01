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
