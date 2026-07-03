/** 果凍縱向拉伸上限（0.28 → 最多拉長 28%）。 */
export const JELLY_MAX_STRETCH = 0.28;

/** 依垂直速度算果凍變形：|vy| 越大越縱長，橫向收窄保體積，封頂。 */
export function jellyStretch(vy: number): { scaleX: number; scaleY: number } {
  const s = Math.min(JELLY_MAX_STRETCH, Math.abs(vy) * 0.00055);
  const scaleY = 1 + s;
  return { scaleX: 1 / scaleY, scaleY };
}
