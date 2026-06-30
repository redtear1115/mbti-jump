import { describe, it, expect } from 'vitest';
import { describeType } from './personalities';
import { t } from '../i18n/t';

describe('describeType', () => {
  it('composes EN description from the four letter traits', () => {
    const text = describeType('ENFP', 'en');
    expect(text).toContain(t('trait.E', 'en'));
    expect(text).toContain(t('trait.N', 'en'));
    expect(text).toContain(t('trait.F', 'en'));
    expect(text).toContain(t('trait.P', 'en'));
  });

  it('composes a localized (zh-Hant) description', () => {
    const text = describeType('ISTJ', 'zh-Hant');
    expect(text).toContain(t('trait.I', 'zh-Hant'));
    expect(text).toContain(t('trait.J', 'zh-Hant'));
  });

  it('throws on malformed type', () => {
    expect(() => describeType('ABC', 'en')).toThrow();
    expect(() => describeType('ENFPX', 'en')).toThrow();
  });
});
