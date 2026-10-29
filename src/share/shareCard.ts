import type { ShareCardModel } from './shareCardModel';
import { hex, wrapText, drawDimBars, roundRect } from './draw';
import { BODY_FONT, DISPLAY_FONT, INK_CSS, PAPER_CSS, TITLE_FONT } from '../theme/manga';

const W = 1080;
const H = 1350;

export function renderShareCard(model: ShareCardModel): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');

  ctx.fillStyle = PAPER_CSS;
  ctx.fillRect(0, 0, W, H);

  // 上半網點（族群色）
  ctx.fillStyle = hex(model.groupColor);
  for (let y = 48; y < 500; y += 18) {
    for (let x = 48 + ((y / 18) % 2) * 9; x < W - 40; x += 18) {
      ctx.beginPath();
      ctx.arc(x, y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.lineWidth = 16;
  ctx.strokeStyle = INK_CSS;
  ctx.strokeRect(28, 28, W - 56, H - 56);

  roundRect(ctx, 64, 520, W - 128, 700, 28);
  ctx.fillStyle = '#fffaf2';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';

  ctx.font = `400 180px ${DISPLAY_FONT}`;
  ctx.lineWidth = 14;
  ctx.strokeStyle = INK_CSS;
  ctx.strokeText(model.type, W / 2, H * 0.28);
  ctx.fillStyle = hex(model.groupColor);
  ctx.fillText(model.type, W / 2, H * 0.28);

  ctx.fillStyle = INK_CSS;
  ctx.font = `700 42px ${TITLE_FONT}`;
  ctx.fillText(model.groupName, W / 2, H * 0.36);

  ctx.font = `500 38px ${BODY_FONT}`;
  wrapText(ctx, model.description, W / 2, 620, W - 200, 54);

  drawDimBars(ctx, model.dims, { x: 120, y: 860, w: W - 240, barH: 32, gap: 24 });

  ctx.fillStyle = INK_CSS;
  ctx.font = `500 30px ${BODY_FONT}`;
  ctx.fillText(model.tagline, W / 2, H - 72);

  return canvas;
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
