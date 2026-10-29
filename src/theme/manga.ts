/** 全遊戲共用的日式漫畫視覺符號：濃墨線、漫畫紙色、網點、標題／內文字體。 */

export const INK = 0x141019;
export const INK_CSS = '#141019';
export const PAPER = 0xfbf7ef;
export const PAPER_CSS = '#fbf7ef';
export const PAPER_CARD = 0xffffff;
export const PAPER_SHADE = 0xf0e9da;
export const MANGA_YELLOW = 0xffd938;
export const MANGA_RED = 0xe62e3d;
export const MANGA_CYAN = 0x2299dd;

/**
 * 只有純英數與日文擬聲詞用（遊戲名、四碼型別、擬聲）。
 * Dela Gothic One 是超粗日式漫畫展示字體。
 */
export const DISPLAY_FONT = '"Dela Gothic One", "Fredoka", system-ui, sans-serif';

/** 介面統一用這一套。同一句裡每個字都來自同一個字族、同一個粗細。 */
export const UI_FONT =
  '"PingFang TC", "PingFang SC", "Hiragino Sans", "Hiragino Sans GB", "Noto Sans TC", "Noto Sans SC", "Noto Sans JP", "Microsoft JhengHei", "Yu Gothic", "Segoe UI", system-ui, sans-serif';

export const TITLE_FONT = UI_FONT;
export const BODY_FONT = UI_FONT;

/** 把顏色往墨色拉近 t（0 原色、1 純墨）。頭髮、立體側邊、陰影用。 */
export function mixInk(color: number, t: number): number {
  const ch = (c: number, i: number) => Math.round(c + (i - c) * t);
  const ir = (INK >> 16) & 255;
  const ig = (INK >> 8) & 255;
  const ib = INK & 255;
  return (
    (ch((color >> 16) & 255, ir) << 16) |
    (ch((color >> 8) & 0xff, ig) << 8) |
    ch(color & 255, ib)
  );
}

/** 把顏色往亮白拉近 t（0 原色、1 純白）。賽璐珞高光與淺底用。 */
export function mixWhite(color: number, t: number): number {
  const ch = (c: number) => Math.round(c + (255 - c) * t);
  return (
    (ch((color >> 16) & 255) << 16) |
    (ch((color >> 8) & 255) << 8) |
    ch(color & 255)
  );
}

export function numToHex(color: number): string {
  return '#' + color.toString(16).padStart(6, '0');
}
