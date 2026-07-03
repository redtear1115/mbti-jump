import { t } from '../i18n/t';
import type { StringKey } from '../i18n/t';
import type { Locale } from '../i18n/locales';

const VALID_LETTERS = new Set(['E', 'I', 'S', 'N', 'T', 'F', 'J', 'P']);

function assertType(type: string): void {
  const letters = type.split('');
  if (letters.length !== 4 || !letters.every((l) => VALID_LETTERS.has(l))) {
    throw new Error(`Invalid MBTI type: ${type}`);
  }
}

/** 16 型專屬描述（被說中式文案）。 */
export function describeType(type: string, locale?: Locale): string {
  assertType(type);
  return t(`type.${type}.desc` as StringKey, locale);
}

/** 16 型原創綽號（如「夢遊詩人」）。 */
export function typeName(type: string, locale?: Locale): string {
  assertType(type);
  return t(`type.${type}.name` as StringKey, locale);
}
