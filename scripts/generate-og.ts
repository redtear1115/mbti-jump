import { mkdirSync, writeFileSync } from 'node:fs';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { MBTI_TYPES } from '../src/core/mbtiType';
import { SUPPORTED_LOCALES } from '../src/i18n/locales';
import { buildShareCardModel } from '../src/share/shareCardModel';
import { drawOgCard, drawOgDefault, OG_W, OG_H } from '../src/share/ogCard';
import { DIMENSIONS, LETTERS_OF } from '../src/config/questions';
import type { Dimension } from '../src/config/questions';
import { t } from '../src/i18n/t';

GlobalFonts.registerFromPath('scripts/fonts/Fredoka-Bold.ttf', 'Fredoka');
GlobalFonts.registerFromPath('scripts/fonts/Nunito-Regular.ttf', 'Nunito');
GlobalFonts.registerFromPath('scripts/fonts/NotoSansTC.ttf', 'Noto Sans TC');
GlobalFonts.registerFromPath('scripts/fonts/NotoSansSC.ttf', 'Noto Sans SC');
GlobalFonts.registerFromPath('scripts/fonts/NotoSansJP.ttf', 'Noto Sans JP');

/** 預生成圖無真實 tallies：每維度朝該型別字母偏 4:1（dividerFrac 0.8/0.2）。 */
function talliesFor(type: string): Record<Dimension, [number, number]> {
  const rec = {} as Record<Dimension, [number, number]>;
  DIMENSIONS.forEach((d, i) => {
    const [first] = LETTERS_OF[d];
    rec[d] = type[i] === first ? [4, 1] : [1, 4];
  });
  return rec;
}

function draw(fn: (ctx: CanvasRenderingContext2D) => void): Buffer {
  const canvas = createCanvas(OG_W, OG_H);
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
  fn(ctx);
  return canvas.toBuffer('image/png');
}

let count = 0;
for (const locale of SUPPORTED_LOCALES) {
  mkdirSync(`public/og/${locale}`, { recursive: true });
  for (const type of MBTI_TYPES) {
    const model = buildShareCardModel(type, talliesFor(type), locale);
    writeFileSync(`public/og/${locale}/${type}.png`, draw((ctx) => drawOgCard(ctx, model)));
    count++;
  }
}
writeFileSync('public/og/default.png', draw((ctx) => drawOgDefault(ctx, t('card.tagline', 'en'))));
console.log(`generated ${count} type cards + default.png`);
