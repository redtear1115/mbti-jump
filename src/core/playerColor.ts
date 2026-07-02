import { LETTER_COLORS } from '../theme/palette';
import type { Letter } from '../config/questions';

/** 果凍怪基底色（百變怪淡紫）。 */
export const PLAYER_BASE_COLOR = 0xc0aee2;

/** RGB 各通道線性插值（t 0..1），逐通道四捨五入。 */
export function lerpColor(a: number, b: number, t: number): number {
  const ch = (sa: number, sb: number) => Math.round(sa + (sb - sa) * t);
  const r = ch((a >> 16) & 0xff, (b >> 16) & 0xff);
  const g = ch((a >> 8) & 0xff, (b >> 8) & 0xff);
  const bl = ch(a & 0xff, b & 0xff);
  return (r << 16) | (g << 8) | bl;
}

/**
 * 已鎖定字母 → 果凍怪身體色。
 * 基底紫向「已鎖字母色的 RGB 平均」靠近 0.75*k/4：
 * 四關鎖完 = 75% 字母混色 + 25% 基底（保留角色識別）。
 */
export function playerColorFor(letters: Letter[]): number {
  if (letters.length === 0) return PLAYER_BASE_COLOR;
  let r = 0;
  let g = 0;
  let b = 0;
  for (const l of letters) {
    const c = LETTER_COLORS[l];
    r += (c >> 16) & 0xff;
    g += (c >> 8) & 0xff;
    b += c & 0xff;
  }
  const n = letters.length;
  const avg = (Math.round(r / n) << 16) | (Math.round(g / n) << 8) | Math.round(b / n);
  return lerpColor(PLAYER_BASE_COLOR, avg, 0.75 * (n / 4));
}
