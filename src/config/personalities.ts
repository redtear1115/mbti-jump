import { t, format } from '../i18n/t';
import type { StringKey } from '../i18n/t';
import type { Locale } from '../i18n/locales';

const VALID_LETTERS = new Set(['E', 'I', 'S', 'N', 'T', 'F', 'J', 'P']);

export function describeType(type: string, locale?: Locale): string {
  const letters = type.split('');
  if (letters.length !== 4 || !letters.every((l) => VALID_LETTERS.has(l))) {
    throw new Error(`Invalid MBTI type: ${type}`);
  }
  const traits = letters.map((l) => t(`trait.${l}` as StringKey, locale));
  return format(t('personality.template', locale), ...traits);
}
