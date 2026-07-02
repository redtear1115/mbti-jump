import type { ShareCardModel } from './shareCardModel';
import { hex, tintToward, wrapText, drawDimBars } from './draw';
import { PALETTE } from '../theme/palette';

export const OG_W = 1200;
export const OG_H = 630;

/**
 * 1200×630 橫式 OG 圖：左半型別大字＋族群名，右半描述＋四維度條。
 * 只用 CanvasRenderingContext2D 介面，瀏覽器與 @napi-rs/canvas 皆可餵。
 */
export function drawOgCard(ctx: CanvasRenderingContext2D, model: ShareCardModel): void {
  const grd = ctx.createRadialGradient(
    OG_W * 0.3, OG_H * 0.45, 60,
    OG_W * 0.3, OG_H * 0.45, OG_W * 0.65,
  );
  grd.addColorStop(0, tintToward(model.groupColor, 0.25));
  grd.addColorStop(1, '#101018');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, OG_W, OG_H);

  ctx.textAlign = 'center';

  // 左半：型別大字＋族群名
  ctx.fillStyle = hex(model.groupColor);
  ctx.font = "800 200px Fredoka, 'Noto Sans TC', 'Noto Sans JP', sans-serif";
  ctx.fillText(model.type, OG_W * 0.3, OG_H * 0.48);
  ctx.fillStyle = '#ffffffcc';
  ctx.font = "600 40px Fredoka, 'Noto Sans TC', 'Noto Sans JP', sans-serif";
  ctx.fillText(model.groupName, OG_W * 0.3, OG_H * 0.58);

  // 右半：描述（換行）＋四維度條
  ctx.fillStyle = '#ffffff';
  ctx.font = "400 30px Nunito, 'Noto Sans TC', 'Noto Sans JP', sans-serif";
  wrapText(ctx, model.description, OG_W * 0.72, OG_H * 0.22, OG_W * 0.4, 42);
  drawDimBars(ctx, model.dims, {
    x: OG_W * 0.55, y: OG_H * 0.52, w: OG_W * 0.34, barH: 24, gap: 16,
  });

  // 底部標語
  ctx.fillStyle = '#ffffff88';
  ctx.font = "400 26px Nunito, 'Noto Sans TC', 'Noto Sans JP', sans-serif";
  ctx.fillText(model.tagline, OG_W / 2, OG_H - 30);
}

/** 首頁通用 OG 圖：站名＋四族群色圓點＋標語。 */
export function drawOgDefault(ctx: CanvasRenderingContext2D, tagline: string): void {
  const grd = ctx.createRadialGradient(
    OG_W / 2, OG_H * 0.42, 60,
    OG_W / 2, OG_H * 0.42, OG_W * 0.6,
  );
  grd.addColorStop(0, '#2a2d42');
  grd.addColorStop(1, '#101018');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, OG_W, OG_H);

  ctx.textAlign = 'center';
  ctx.fillStyle = hex(PALETTE.accent);
  ctx.font = "800 120px Fredoka, 'Noto Sans TC', 'Noto Sans JP', sans-serif";
  ctx.fillText('MBTI Jump', OG_W / 2, OG_H * 0.45);

  const groupColors = [PALETTE.explorer, PALETTE.diplomat, PALETTE.analyst, PALETTE.sentinel];
  groupColors.forEach((c, i) => {
    ctx.fillStyle = hex(c);
    ctx.beginPath();
    ctx.arc(OG_W / 2 + (i - 1.5) * 70, OG_H * 0.58, 18, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#ffffffcc';
  ctx.font = "400 34px Nunito, 'Noto Sans TC', 'Noto Sans JP', sans-serif";
  ctx.fillText(tagline, OG_W / 2, OG_H * 0.74);
}
