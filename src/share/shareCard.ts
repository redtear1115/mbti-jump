import type { ShareCardModel } from './shareCardModel';
import { hex, tintToward, wrapText, drawDimBars } from './draw';

const W = 1080;
const H = 1350;

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
  drawDimBars(ctx, model.dims, { x: 100, y: H * 0.66, w: W - 200, barH: 34, gap: 26 });

  // 底部標語
  ctx.fillStyle = '#ffffff88';
  ctx.font = '400 32px Nunito, system-ui, sans-serif';
  ctx.fillText(model.tagline, W / 2, H - 56);

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

/** @deprecated Task 12（結果頁分享鈕合併）後移除；目前 ResultScene 仍使用。 */
export async function downloadCard(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  downloadBlob(await canvasToBlob(canvas), filename);
}
