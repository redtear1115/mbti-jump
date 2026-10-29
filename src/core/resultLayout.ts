/**
 * Stack Share / Again / Trends buttons under Result content with fixed minimum gaps.
 */

export interface ResultButtonLayoutOpts {
  canvasH?: number;
  heights?: [number, number, number];
  gapAbove?: number;
  gapBetween?: number;
  bottomPad?: number;
}

export interface ResultButtonLayout {
  /** Button center Y for [Share, Again, Trends]. */
  ys: [number, number, number];
  /** How many px the stack was shifted up to fit the canvas (0 = no clamp). */
  overflow: number;
}

/**
 * Place three stacked buttons so:
 * - Share top ≥ contentBottomY + gapAbove (default 16)
 * - ≥ gapBetween (default 8) between consecutive buttons
 * If the stack would pass the canvas bottom, shift it upward and report overflow.
 */
export function layoutResultButtons(
  contentBottomY: number,
  opts: ResultButtonLayoutOpts = {},
): ResultButtonLayout {
  const canvasH = opts.canvasH ?? 800;
  const [h0, h1, h2] = opts.heights ?? [54, 54, 50];
  const gapAbove = opts.gapAbove ?? 16;
  const gapBetween = opts.gapBetween ?? 8;
  const bottomPad = opts.bottomPad ?? 8;

  let y0 = contentBottomY + gapAbove + h0 / 2;
  let y1 = y0 + (h0 + h1) / 2 + gapBetween;
  let y2 = y1 + (h1 + h2) / 2 + gapBetween;

  const bottom = y2 + h2 / 2;
  const overflow = Math.max(0, bottom - (canvasH - bottomPad));
  if (overflow > 0) {
    y0 -= overflow;
    y1 -= overflow;
    y2 -= overflow;
  }
  return { ys: [y0, y1, y2], overflow };
}
