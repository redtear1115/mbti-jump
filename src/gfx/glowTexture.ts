import Phaser from 'phaser';

const GLOW_KEY = 'radial-glow';

/** 256×256 白色放射漸變 texture（中心亮→邊緣透明），tint 後做色暈。回傳 texture key。 */
export function ensureGlowTexture(scene: Phaser.Scene): string {
  if (scene.textures.exists(GLOW_KEY)) return GLOW_KEY;
  const size = 256;
  const canvas = scene.textures.createCanvas(GLOW_KEY, size, size);
  if (!canvas) return GLOW_KEY;
  const ctx = canvas.getContext();
  const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  // 亮度整體 ×0.85（P0 可讀性：前景圖底分離），氛圍仍在
  grd.addColorStop(0, 'rgba(255,255,255,0.765)');
  grd.addColorStop(0.5, 'rgba(255,255,255,0.272)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  canvas.refresh();
  return GLOW_KEY;
}
