import { describe, it, expect } from 'vitest';
import { LETTER_TRAITS, describeType } from './personalities';

describe('personalities', () => {
  it('has a trait phrase for all 8 letters', () => {
    for (const l of ['E', 'I', 'S', 'N', 'T', 'F', 'J', 'P'] as const) {
      expect(LETTER_TRAITS[l].length).toBeGreaterThan(0);
    }
  });

  it('describeType includes each letter trait', () => {
    const text = describeType('ENFP');
    expect(text).toContain(LETTER_TRAITS.E);
    expect(text).toContain(LETTER_TRAITS.N);
    expect(text).toContain(LETTER_TRAITS.F);
    expect(text).toContain(LETTER_TRAITS.P);
  });

  it('describeType throws on malformed type', () => {
    expect(() => describeType('ABC')).toThrow();
  });
});
