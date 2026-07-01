import type { ShareCardModel } from './shareCardModel';

const W = 1080;
const H = 1350;

const hex = (n: number): string => '#' + n.toString(16).padStart(6, '0');

/** 把 24-bit 色與白色以 amount 混合，回傳 CSS 字串（做放射漸變中心提亮）。 */
function tintToward(color: number, amount: number): string {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const words = text.split(/\s+/);
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, cx, yy);
      line = word;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, cx, yy);
}

function drawDims(ctx: CanvasRenderingContext2D, model: ShareCardModel): void {
  const barW = W - 200;
  const x0 = 100;
  const barH = 34;
  const gap = 26;
  let y = H * 0.66;
  for (const d of model.dims) {
    const grd = ctx.createLinearGradient(x0, 0, x0 + barW, 0);
    grd.addColorStop(0, hex(d.leftColor));
    grd.addColorStop(1, hex(d.rightColor));
    ctx.fillStyle = grd;
    roundRect(ctx, x0, y, barW, barH, barH / 2);
    ctx.fill();
    // 白色分隔線
    const dx = x0 + d.dividerFrac * barW;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(dx - 2, y - 3, 4, barH + 6);
    y += barH + gap;
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function renderShareCard(model: ShareCardModel): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');

  // 放射漸變底（族群色 → 深底）
  const grd = ctx.createRadialGradient(W / 2, H * 0.32, 60, W / 2, H * 0.32, H * 0.8);
  grd.addColorStop(0, tintToward(model.groupColor, 0.25));
  grd.addColorStop(1, '#101018');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';

  // 型別
  ctx.fillStyle = hex(model.groupColor);
  ctx.font = '800 210px Fredoka, system-ui, sans-serif';
  ctx.fillText(model.type, W / 2, H * 0.30);

  // 族群名
  ctx.fillStyle = '#ffffffcc';
  ctx.font = '600 46px Fredoka, system-ui, sans-serif';
  ctx.fillText(model.groupName, W / 2, H * 0.37);

  // 描述（自動換行）
  ctx.fillStyle = '#ffffff';
  ctx.font = '400 40px Nunito, system-ui, sans-serif';
  wrapText(ctx, model.description, W / 2, H * 0.45, W - 160, 56);

  // 四維度傾向條
  drawDims(ctx, model);

  // 底部標語
  ctx.fillStyle = '#ffffff88';
  ctx.font = '400 32px Nunito, system-ui, sans-serif';
  ctx.fillText(model.tagline, W / 2, H - 56);

  return canvas;
}

export function downloadCard(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('toBlob returned null'));
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      resolve();
    }, 'image/png');
  });
}
