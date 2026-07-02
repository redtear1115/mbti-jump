import { describe, it, expect, beforeEach } from 'vitest';
import { parseInvite, saveInvite, getInvite, INVITE_KEY } from './invite';

describe('parseInvite', () => {
  it('parses valid path with lang', () => {
    expect(parseInvite('/t/INFP', '?lang=ja')).toEqual({ type: 'INFP', locale: 'ja' });
  });

  it('normalizes case and trailing slash, missing lang → locale null', () => {
    expect(parseInvite('/t/infp/', '')).toEqual({ type: 'INFP', locale: null });
  });

  it('invalid lang → locale null', () => {
    expect(parseInvite('/t/INFP', '?lang=xx')).toEqual({ type: 'INFP', locale: null });
  });

  it('rejects non-invite paths and invalid types', () => {
    expect(parseInvite('/', '')).toBeNull();
    expect(parseInvite('/t/ABCD', '?lang=ja')).toBeNull();
    expect(parseInvite('/t/INFP/extra', '')).toBeNull();
  });
});

describe('saveInvite/getInvite', () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    (globalThis as any).sessionStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    };
  });

  it('round-trips a type', () => {
    saveInvite('INFP');
    expect(store.get(INVITE_KEY)).toBe('INFP');
    expect(getInvite()).toBe('INFP');
  });

  it('getInvite returns null when empty or tampered', () => {
    expect(getInvite()).toBeNull();
    store.set(INVITE_KEY, 'ZZZZ');
    expect(getInvite()).toBeNull();
  });

  it('survives missing sessionStorage', () => {
    delete (globalThis as any).sessionStorage;
    expect(() => saveInvite('INFP')).not.toThrow();
    expect(getInvite()).toBeNull();
  });
});
