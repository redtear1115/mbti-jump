import type { StringKey } from '../i18n/t';
import type { Group } from './temperament';

/** 兩個 4 碼型別在相同位置的相同字母數（0..4）。 */
export function sharedLetters(a: string, b: string): number {
  let n = 0;
  for (let i = 0; i < 4; i++) {
    if (a[i] === b[i]) n++;
  }
  return n;
}

const PAIR_ORDER: readonly Group[] = ['explorer', 'diplomat', 'analyst', 'sentinel'];

/** 兩族群 → 配對文案 key（無序：依 PAIR_ORDER 正規化，共 10 種）。 */
export function pairKey(a: Group, b: Group): StringKey {
  const [x, y] = [a, b].sort((p, q) => PAIR_ORDER.indexOf(p) - PAIR_ORDER.indexOf(q));
  return `pair.${x}_${y}` as StringKey;
}
