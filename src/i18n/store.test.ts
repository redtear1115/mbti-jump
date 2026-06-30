import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getLocale, setLocale, _resetForTest, STORAGE_KEY } from './store';

function mockEnv(stored: string | null, navLangs: string[]) {
  const store: Record<string, string> = {};
  if (stored !== null) store[STORAGE_KEY] = stored;
  (globalThis as any).localStorage = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = v; },
  };
  Object.defineProperty(globalThis, 'navigator', {
    value: { languages: navLangs },
    writable: true,
    configurable: true,
  });
  return store;
}

afterEach(() => {
  delete (globalThis as any).localStorage;
  delete (globalThis as any).navigator;
  _resetForTest();
});
beforeEach(() => _resetForTest());

describe('i18n store', () => {
  it('prefers a valid stored locale over navigator', () => {
    mockEnv('ja', ['zh-TW']);
    expect(getLocale()).toBe('ja');
  });

  it('falls back to navigator detection when nothing stored', () => {
    mockEnv(null, ['zh-TW', 'en']);
    expect(getLocale()).toBe('zh-Hant');
  });

  it('ignores an invalid stored value and uses detection', () => {
    mockEnv('klingon', ['es-ES']);
    expect(getLocale()).toBe('es');
  });

  it('setLocale updates cache and persists', () => {
    const store = mockEnv(null, ['en']);
    setLocale('zh-Hans');
    expect(getLocale()).toBe('zh-Hans');
    expect(store[STORAGE_KEY]).toBe('zh-Hans');
  });

  it('defaults to en when no DOM is available', () => {
    expect(getLocale()).toBe('en');
  });
});
