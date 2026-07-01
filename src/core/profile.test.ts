import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { recordPlay, getPlays, clearPlays, PROFILE_KEY, MAX_PLAYS } from './profile';
import type { Dimension } from '../config/questions';

function mockStore() {
  const s: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => (k in s ? s[k] : null),
    setItem: (k: string, v: string) => { s[k] = v; },
    removeItem: (k: string) => { delete s[k]; },
  };
  return s;
}
const T: Record<Dimension, [number, number]> = { EI: [3, 2], SN: [4, 1], TF: [2, 3], JP: [5, 0] };
afterEach(() => { delete (globalThis as any).localStorage; });
beforeEach(() => { mockStore(); });

describe('profile', () => {
  it('records and reads back plays', () => {
    recordPlay('ENFP', T, 1000);
    recordPlay('INTJ', T, 2000);
    const plays = getPlays();
    expect(plays).toHaveLength(2);
    expect(plays[0]).toEqual({ at: 1000, type: 'ENFP', tallies: T });
    expect(plays[1].type).toBe('INTJ');
  });

  it('caps at MAX_PLAYS, dropping oldest', () => {
    for (let i = 0; i < MAX_PLAYS + 5; i++) recordPlay('ENFP', T, i);
    const plays = getPlays();
    expect(plays).toHaveLength(MAX_PLAYS);
    expect(plays[0].at).toBe(5); // 最舊 5 筆被丟
    expect(plays[plays.length - 1].at).toBe(MAX_PLAYS + 4);
  });

  it('clearPlays empties history', () => {
    recordPlay('ENFP', T, 1);
    clearPlays();
    expect(getPlays()).toEqual([]);
  });

  it('returns [] on malformed / wrong-version / absent data', () => {
    expect(getPlays()).toEqual([]); // 空
    (globalThis as any).localStorage.setItem(PROFILE_KEY, 'not json');
    expect(getPlays()).toEqual([]);
    (globalThis as any).localStorage.setItem(PROFILE_KEY, JSON.stringify({ version: 99, plays: [] }));
    expect(getPlays()).toEqual([]);
  });

  it('is safe with no localStorage', () => {
    delete (globalThis as any).localStorage;
    expect(getPlays()).toEqual([]);
    expect(() => recordPlay('ENFP', T, 1)).not.toThrow();
  });
});
