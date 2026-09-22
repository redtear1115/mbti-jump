import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { isEndlessUnlocked } from './endlessUnlock';
import { recordPlay, clearPlays } from './profile';
import type { Dimension } from '../config/questions';

const T: Record<Dimension, [number, number]> = {
  EI: [3, 2],
  SN: [4, 1],
  TF: [2, 3],
  JP: [5, 0],
};

function mockStore() {
  const s: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => (k in s ? s[k] : null),
    setItem: (k: string, v: string) => {
      s[k] = v;
    },
    removeItem: (k: string) => {
      delete s[k];
    },
  };
}
afterEach(() => {
  delete (globalThis as any).localStorage;
});
beforeEach(() => {
  mockStore();
});

describe('isEndlessUnlocked', () => {
  it('is locked with zero classic plays', () => {
    expect(isEndlessUnlocked()).toBe(false);
  });

  it('unlocks after one classic play', () => {
    recordPlay('ENFP', T, 1);
    expect(isEndlessUnlocked()).toBe(true);
  });

  it('re-locks after clearPlays', () => {
    recordPlay('ENFP', T, 1);
    clearPlays();
    expect(isEndlessUnlocked()).toBe(false);
  });
});
