export interface ScoreBarModel {
  /** 第一字母（左側）占比 0..1；雙零時為 0.5。 */
  dividerFrac: number;
  leftLabel: string;
  rightLabel: string;
}

export function scoreBarModel(
  firstLetter: string,
  na: number,
  secondLetter: string,
  nb: number,
): ScoreBarModel {
  const total = na + nb;
  return {
    dividerFrac: total === 0 ? 0.5 : na / total,
    leftLabel: `${firstLetter} ${na}`,
    rightLabel: `${secondLetter} ${nb}`,
  };
}
