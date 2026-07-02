export interface ChipRect {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
}

/** 依文字包框（左上角＋寬高）計算膠囊底的幾何；r 超過高度一半時取一半（保持膠囊形）。 */
export function chipRect(
  textLeft: number,
  textTop: number,
  textW: number,
  textH: number,
  opts?: { padX?: number; padY?: number; r?: number },
): ChipRect {
  const padX = opts?.padX ?? 10;
  const padY = opts?.padY ?? 6;
  const h = textH + padY * 2;
  const r = Math.min(opts?.r ?? 12, h / 2);
  return { x: textLeft - padX, y: textTop - padY, w: textW + padX * 2, h, r };
}
