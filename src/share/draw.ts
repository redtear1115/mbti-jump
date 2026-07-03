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

/** CJK 統一表意文字、假名及全形標點範圍：這些字元視為獨立斷行單位（不需空白）。 */
const CJK_RE = /[⺀-鿿぀-ヿㇰ-ㇿ豈-﫿！-｠]/;

/** 將文字切成斷行單位：CJK 字元各自成一個 token，拉丁文字則保留完整單字（以空白分隔）。 */
function tokenize(text: string): { value: string; cjk: boolean }[] {
  const tokens: { value: string; cjk: boolean }[] = [];
  let buf = '';
  const flush = () => {
    if (buf) {
      tokens.push({ value: buf, cjk: false });
      buf = '';
    }
  };
  for (const ch of text) {
    if (CJK_RE.test(ch)) {
      flush();
      tokens.push({ value: ch, cjk: true });
    } else if (/\s/.test(ch)) {
      flush();
    } else {
      buf += ch;
    }
  }
  flush();
  return tokens;
}

export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const tokens = tokenize(text);
  let line = '';
  let yy = y;
  for (const token of tokens) {
    const joiner = line && !token.cjk ? ' ' : '';
    const test = line ? `${line}${joiner}${token.value}` : token.value;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, cx, yy);
      line = token.value;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, cx, yy);
}

/** 四維度傾向條：分隔線左右各填純字母色（分段實色，無跨色漸變）＋白色分隔線。 */
export function drawDimBars(
  ctx: CanvasRenderingContext2D,
  dims: ShareDim[],
  opts: { x: number; y: number; w: number; barH: number; gap: number },
): void {
  let y = opts.y;
  for (const d of dims) {
    // 整條先填右色，再以 clip 把左段蓋上左色（clip 保證圓角邊緣乾淨）
    ctx.fillStyle = hex(d.rightColor);
    roundRect(ctx, opts.x, y, opts.w, opts.barH, opts.barH / 2);
    ctx.fill();
    const lw = d.dividerFrac * opts.w;
    if (lw > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(opts.x, y, lw, opts.barH);
      ctx.clip();
      ctx.fillStyle = hex(d.leftColor);
      roundRect(ctx, opts.x, y, opts.w, opts.barH, opts.barH / 2);
      ctx.fill();
      ctx.restore();
    }
    const dx = opts.x + d.dividerFrac * opts.w;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(dx - 2, y - 3, 4, opts.barH + 6);
    y += opts.barH + opts.gap;
  }
}
