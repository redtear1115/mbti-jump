import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { getSeenIds, markSeen, ACH_KEY } from './achievementStore';

function mockStore() {
  const s: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => (k in s ? s[k] : null),
    setItem: (k: string, v: string) => { s[k] = v; },
  };
  return s;
}
afterEach(() => { delete (globalThis as any).localStorage; });
beforeEach(() => { mockStore(); });

describe('achievementStore', () => {
  it('starts empty and marks/unions seen ids', () => {
    expect(getSeenIds()).toEqual([]);
    markSeen(['first_play']);
    expect(getSeenIds()).toEqual(['first_play']);
    markSeen(['first_play', 'persistent']); // dedupe first_play
    expect(new Set(getSeenIds())).toEqual(new Set(['first_play', 'persistent']));
  });

  it('returns [] on malformed / wrong-version data', () => {
    (globalThis as any).localStorage.setItem(ACH_KEY, 'nope');
    expect(getSeenIds()).toEqual([]);
    (globalThis as any).localStorage.setItem(ACH_KEY, JSON.stringify({ version: 99, seen: ['x'] }));
    expect(getSeenIds()).toEqual([]);
  });

  it('is safe with no localStorage', () => {
    delete (globalThis as any).localStorage;
    expect(getSeenIds()).toEqual([]);
    expect(() => markSeen(['a'])).not.toThrow();
  });
});
