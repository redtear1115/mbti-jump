import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { endlessSkinColor } from './endlessSkin';
import { setEndlessLastSkinType, clearEndlessProfile } from './endlessProfile';
import { PLAYER_BASE_COLOR, playerColorFor } from './playerColor';
import type { Letter } from '../config/questions';

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

describe('endlessSkinColor', () => {
  it('falls back to PLAYER_BASE_COLOR with no skin', () => {
    expect(endlessSkinColor()).toBe(PLAYER_BASE_COLOR);
  });

  it('uses classic TYPE mix when lastSkinType is set', () => {
    setEndlessLastSkinType('INFP');
    expect(endlessSkinColor()).toBe(playerColorFor('INFP'.split('') as Letter[]));
  });

  it('ignores invalid type strings', () => {
    setEndlessLastSkinType('XX');
    expect(endlessSkinColor()).toBe(PLAYER_BASE_COLOR);
    clearEndlessProfile();
  });
});
