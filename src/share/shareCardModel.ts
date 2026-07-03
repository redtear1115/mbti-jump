import type { Locale } from '../i18n/locales';
import { t } from '../i18n/t';
import type { StringKey } from '../i18n/t';
import { describeType, typeName } from '../config/personalities';
import { groupOf, groupColorOf } from '../core/temperament';
import { DIMENSIONS, LETTERS_OF } from '../config/questions';
import type { Dimension, Letter } from '../config/questions';
import { LETTER_COLORS } from '../theme/palette';

export interface ShareDim {
  leftLetter: Letter;
  rightLetter: Letter;
  leftColor: number;
  rightColor: number;
  dividerFrac: number; // 左字母占比 0..1；雙零置中 0.5
}

export interface ShareCardModel {
  type: string;
  groupName: string;
  groupColor: number;
  description: string;
  dims: ShareDim[];
  tagline: string;
}

export function buildShareCardModel(
  type: string,
  tallies: Record<Dimension, [number, number]>,
  locale?: Locale,
): ShareCardModel {
  const group = groupOf(type);
  const dims: ShareDim[] = DIMENSIONS.map((d) => {
    const [a, b] = LETTERS_OF[d];
    const [na, nb] = tallies[d];
    const total = na + nb;
    return {
      leftLetter: a,
      rightLetter: b,
      leftColor: LETTER_COLORS[a],
      rightColor: LETTER_COLORS[b],
      dividerFrac: total === 0 ? 0.5 : na / total,
    };
  });
  return {
    type,
    groupName: `${typeName(type, locale)} · ${t(`group.${group}` as StringKey, locale)}`,
    groupColor: groupColorOf(type),
    description: describeType(type, locale),
    dims,
    tagline: t('card.tagline', locale),
  };
}
