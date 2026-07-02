/** 四個維度的字母對，依位置排序。 */
const PAIRS: readonly (readonly [string, string])[] = [
  ['E', 'I'],
  ['S', 'N'],
  ['T', 'F'],
  ['J', 'P'],
];

/** 大小寫不拘的 4 碼字串 → 正規化大寫型別；不合法回 null。 */
export function normalizeMbtiType(raw: string): string | null {
  const s = raw.toUpperCase();
  if (s.length !== 4) return null;
  for (let i = 0; i < 4; i++) {
    if (s[i] !== PAIRS[i][0] && s[i] !== PAIRS[i][1]) return null;
  }
  return s;
}

/** 全部 16 型（EI×SN×TF×JP 展開）。 */
export const MBTI_TYPES: readonly string[] = PAIRS.reduce<string[]>(
  (acc, pair) => acc.flatMap((prefix) => pair.map((letter) => prefix + letter)),
  [''],
);
