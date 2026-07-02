import type { StringKey } from '../i18n/t';

/** 兩個 4 碼型別在相同位置的相同字母數（0..4）。 */
export function sharedLetters(a: string, b: string): number {
  let n = 0;
  for (let i = 0; i < 4; i++) {
    if (a[i] === b[i]) n++;
  }
  return n;
}

/** 重合數 → 對比文案 key（compare.0 ~ compare.4）。 */
export function compareKey(shared: number): StringKey {
  return `compare.${shared}` as StringKey;
}
