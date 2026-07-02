import type { ShareDim } from './shareCardModel';

export const hex = (n: number): string => '#' + n.toString(16).padStart(6, '0');

/** 把 24-bit 色與白色以 amount 混合，回傳 CSS 字串（做放射漸變中心提亮）。 */
export function tintToward(color: number, amount: number): string {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

export function roundRect(
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

export function wrapText(
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

/** 四維度傾向條：左右字母色漸變 + 白色分隔線（分享卡直式與 OG 橫式共用）。 */
export function drawDimBars(
  ctx: CanvasRenderingContext2D,
  dims: ShareDim[],
  opts: { x: number; y: number; w: number; barH: number; gap: number },
): void {
  let y = opts.y;
  for (const d of dims) {
    const grd = ctx.createLinearGradient(opts.x, 0, opts.x + opts.w, 0);
    grd.addColorStop(0, hex(d.leftColor));
    grd.addColorStop(1, hex(d.rightColor));
    ctx.fillStyle = grd;
    roundRect(ctx, opts.x, y, opts.w, opts.barH, opts.barH / 2);
    ctx.fill();
    const dx = opts.x + d.dividerFrac * opts.w;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(dx - 2, y - 3, 4, opts.barH + 6);
    y += opts.barH + opts.gap;
  }
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('toBlob returned null'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
