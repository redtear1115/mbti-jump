import { describe, it, expect } from 'vitest';
import { sharedLetters, compareKey, pairKey } from './compare';
import { EN } from '../i18n/strings/en';

describe('sharedLetters', () => {
  it('counts same-position matches', () => {
    expect(sharedLetters('INFP', 'INFP')).toBe(4);
    expect(sharedLetters('INFP', 'ESTJ')).toBe(0);
    expect(sharedLetters('INFP', 'ENFP')).toBe(3);
    expect(sharedLetters('INTJ', 'INFP')).toBe(2);
  });
});

describe('compareKey', () => {
  it('maps every possible count to an existing string key', () => {
    for (const n of [0, 1, 2, 3, 4]) {
      expect(EN[compareKey(n)]).toBeTypeOf('string');
    }
  });
});

describe('pairKey', () => {
  it('is order-insensitive', () => {
    expect(pairKey('diplomat', 'analyst')).toBe(pairKey('analyst', 'diplomat'));
  });

  it('maps every unordered pair to an existing key', () => {
    const groups = ['explorer', 'diplomat', 'analyst', 'sentinel'] as const;
    for (const a of groups) {
      for (const b of groups) {
        expect(EN[pairKey(a, b)]).toBeTypeOf('string');
      }
    }
  });
});
