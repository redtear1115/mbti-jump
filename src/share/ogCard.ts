import type { ShareCardModel } from './shareCardModel';
import { hex, wrapText, drawDimBars } from './draw';
import { PALETTE } from '../theme/palette';

const INK = '#1c1424';
const PAPER = '#f6f0e4';
const OG_FONT = "'Fredoka', 'Noto Sans TC', 'Noto Sans SC', 'Noto Sans JP', sans-serif";

export const OG_W = 1200;
export const OG_H = 630;

/**
 * 1200×630 橫式 OG 圖：左半型別大字＋族群名，右半描述＋四維度條。
 * 只用 CanvasRenderingContext2D 介面，瀏覽器與 @napi-rs/canvas 皆可餵。
 */
export function drawOgCard(ctx: CanvasRenderingContext2D, model: ShareCardModel): void {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, OG_W, OG_H);
  ctx.fillStyle = hex(model.groupColor);
  for (let y = 36; y < OG_H - 24; y += 16) {
    for (let x = 36 + ((y / 16) % 2) * 8; x < OG_W * 0.44; x += 16) {
      ctx.beginPath();
      ctx.arc(x, y, 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = INK;
  ctx.fillRect(OG_W * 0.46, 28, 6, OG_H - 56);
  ctx.lineWidth = 12;
  ctx.strokeStyle = INK;
  ctx.strokeRect(16, 16, OG_W - 32, OG_H - 32);

  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';

  // 左半：型別大字＋族群名
  ctx.font = `800 168px ${OG_FONT}`;
  ctx.lineWidth = 10;
  ctx.strokeStyle = INK;
  ctx.strokeText(model.type, OG_W * 0.24, OG_H * 0.46);
  ctx.fillStyle = hex(model.groupColor);
  ctx.fillText(model.type, OG_W * 0.24, OG_H * 0.46);
  ctx.fillStyle = INK;
  const GROUP_MAXW = 480;
  let groupSize = 34;
  const groupFont = (px: number) => `700 ${px}px ${OG_FONT}`;
  ctx.font = groupFont(groupSize);
  while (groupSize > 22 && ctx.measureText(model.groupName).width > GROUP_MAXW) {
    groupSize -= 2;
    ctx.font = groupFont(groupSize);
  }
  ctx.fillText(model.groupName, OG_W * 0.24, OG_H * 0.64);

  // 右半：描述（換行）＋四維度條
  ctx.fillStyle = INK;
  ctx.font = `500 28px Nunito, 'Noto Sans TC', 'Noto Sans SC', 'Noto Sans JP', sans-serif`;
  wrapText(ctx, model.description, OG_W * 0.73, OG_H * 0.2, OG_W * 0.4, 40);
  drawDimBars(ctx, model.dims, {
    x: OG_W * 0.55, y: OG_H * 0.52, w: OG_W * 0.34, barH: 22, gap: 16,
  });

  ctx.fillStyle = INK;
  ctx.font = `500 24px Nunito, 'Noto Sans TC', 'Noto Sans SC', 'Noto Sans JP', sans-serif`;
  ctx.fillText(model.tagline, OG_W * 0.73, OG_H - 52);
}

/** 首頁通用 OG 圖：站名＋四族群色圓點＋標語。 */
export function drawOgDefault(ctx: CanvasRenderingContext2D, tagline: string): void {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, OG_W, OG_H);
  ctx.fillStyle = hex(PALETTE.accent);
  for (let y = 40; y < OG_H - 30; y += 18) {
    for (let x = 40 + ((y / 18) % 2) * 9; x < OG_W - 30; x += 18) {
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.lineWidth = 12;
  ctx.strokeStyle = INK;
  ctx.strokeRect(16, 16, OG_W - 32, OG_H - 32);

  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.font = `800 108px ${OG_FONT}`;
  ctx.lineWidth = 10;
  ctx.strokeText('MBTI Jump', OG_W / 2, OG_H * 0.42);
  ctx.fillStyle = INK;
  ctx.fillText('MBTI Jump', OG_W / 2, OG_H * 0.42);

  const groupColors = [PALETTE.explorer, PALETTE.diplomat, PALETTE.analyst, PALETTE.sentinel];
  groupColors.forEach((c, i) => {
    ctx.fillStyle = hex(c);
    ctx.beginPath();
    ctx.arc(OG_W / 2 + (i - 1.5) * 70, OG_H * 0.58, 18, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = INK;
  ctx.font = `500 32px Nunito, 'Noto Sans TC', 'Noto Sans SC', 'Noto Sans JP', sans-serif`;
  ctx.fillText(tagline, OG_W / 2, OG_H * 0.74);
}
