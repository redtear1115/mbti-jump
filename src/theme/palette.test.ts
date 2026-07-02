import { describe, it, expect } from 'vitest';
import { LETTER_COLORS, letterHex } from './palette';

describe('LETTER_COLORS', () => {
  it('covers all 8 letters', () => {
    expect(Object.keys(LETTER_COLORS).sort()).toEqual(['E', 'F', 'I', 'J', 'N', 'P', 'S', 'T']);
  });

  it('letterHex matches the numeric colour', () => {
    expect(letterHex('E')).toBe('#f0b84a');
    expect(letterHex('I')).toBe('#2e6d86');
    expect(letterHex('F')).toBe('#33a474');
  });

  it('letterHex always returns a 7-char lowercase hex', () => {
    for (const l of Object.keys(LETTER_COLORS) as Array<keyof typeof LETTER_COLORS>) {
      expect(letterHex(l)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
