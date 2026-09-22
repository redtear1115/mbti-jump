import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import {
  getEndlessProfile,
  recordEndlessRun,
  setEndlessLastSkinType,
  clearEndlessProfile,
  ENDLESS_KEY,
} from './endlessProfile';

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
  return s;
}
afterEach(() => {
  delete (globalThis as any).localStorage;
});
beforeEach(() => {
  mockStore();
});

describe('endlessProfile', () => {
  it('starts empty', () => {
    expect(getEndlessProfile()).toEqual({
      bestFloors: 0,
      runs: 0,
      totalFloors: 0,
      lastSkinType: undefined,
    });
  });

  it('records runs, best, and total floors', () => {
    const a = recordEndlessRun(12);
    expect(a.isNewBest).toBe(true);
    expect(a.profile).toMatchObject({ bestFloors: 12, runs: 1, totalFloors: 12 });

    const b = recordEndlessRun(8);
    expect(b.isNewBest).toBe(false);
    expect(b.profile).toMatchObject({ bestFloors: 12, runs: 2, totalFloors: 20 });

    const c = recordEndlessRun(30);
    expect(c.isNewBest).toBe(true);
    expect(c.profile).toMatchObject({ bestFloors: 30, runs: 3, totalFloors: 50 });
  });

  it('stores lastSkinType independently of runs', () => {
    setEndlessLastSkinType('ENFP');
    expect(getEndlessProfile().lastSkinType).toBe('ENFP');
    recordEndlessRun(5);
    expect(getEndlessProfile().lastSkinType).toBe('ENFP');
  });

  it('clearEndlessProfile resets everything including skin', () => {
    recordEndlessRun(10);
    setEndlessLastSkinType('INTJ');
    clearEndlessProfile();
    expect(getEndlessProfile()).toEqual({
      bestFloors: 0,
      runs: 0,
      totalFloors: 0,
      lastSkinType: undefined,
    });
  });

  it('returns empty on malformed / wrong-version data', () => {
    (globalThis as any).localStorage.setItem(ENDLESS_KEY, 'not json');
    expect(getEndlessProfile().runs).toBe(0);
    (globalThis as any).localStorage.setItem(
      ENDLESS_KEY,
      JSON.stringify({ version: 99, bestFloors: 99, runs: 9 }),
    );
    expect(getEndlessProfile().bestFloors).toBe(0);
  });

  it('is safe with no localStorage', () => {
    delete (globalThis as any).localStorage;
    expect(getEndlessProfile().runs).toBe(0);
    expect(() => recordEndlessRun(3)).not.toThrow();
    expect(() => setEndlessLastSkinType('ENTP')).not.toThrow();
    expect(() => clearEndlessProfile()).not.toThrow();
  });
});
