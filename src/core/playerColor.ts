import { LETTER_COLORS } from '../theme/palette';
import type { Letter } from '../config/questions';
import { groupColorOf } from './temperament';

/** 果凍怪基底色（微暖白——從白紙開始，四關染成你的顏色）。 */
export const PLAYER_BASE_COLOR = 0xf0f0f4;

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
 * 0-3 碼：基底紫向「已鎖字母色的 RGB 平均」靠近 0.75*k/4（k=已鎖數）。
 * 四碼鎖完：改向「四碼所屬族群色」靠近 0.75，避免四色互補平均後偏灰
 * （例：INFP 四色平均會塌成 0x819293 的灰綠，改用族群色 0x33a474 混色更有識別度）。
 *
 * letters 需依 DIMENSIONS 順序（4 字母時以 join 推導型別/族群）。
 */
export function playerColorFor(letters: Letter[]): number {
  if (letters.length === 0) return PLAYER_BASE_COLOR;
  const n = letters.length;
  if (n === 4) {
    return lerpColor(PLAYER_BASE_COLOR, groupColorOf(letters.join('')), 0.75);
  }
  let r = 0;
  let g = 0;
  let b = 0;
  for (const l of letters) {
    const c = LETTER_COLORS[l];
    r += (c >> 16) & 0xff;
    g += (c >> 8) & 0xff;
    b += c & 0xff;
  }
  const avg = (Math.round(r / n) << 16) | (Math.round(g / n) << 8) | Math.round(b / n);
  return lerpColor(PLAYER_BASE_COLOR, avg, 0.75 * (n / 4));
}
