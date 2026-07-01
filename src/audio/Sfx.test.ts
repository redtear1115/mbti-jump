import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Sfx, MUTE_KEY } from './Sfx';

function mockStore() {
  const s: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => (k in s ? s[k] : null),
    setItem: (k: string, v: string) => { s[k] = v; },
  };
  return s;
}
afterEach(() => {
  delete (globalThis as any).localStorage;
  Sfx._resetForTest();
});
beforeEach(() => Sfx._resetForTest());

describe('Sfx', () => {
  it('play is a no-op before init (does not throw)', () => {
    expect(() => Sfx.play('bounce')).not.toThrow();
  });

  it('plays an existing, non-muted sound', () => {
    mockStore();
    const played: string[] = [];
    const sound = { play: (k: string) => played.push(k) } as any;
    Sfx.init(sound, () => true);
    Sfx.play('select');
    expect(played).toEqual(['sfx-select']);
  });

  it('does not play a missing sound', () => {
    mockStore();
    const played: string[] = [];
    const sound = { play: (k: string) => played.push(k) } as any;
    Sfx.init(sound, () => false); // 檔案缺失
    Sfx.play('select');
    expect(played).toEqual([]);
  });

  it('toggleMute persists and silences playback', () => {
    const store = mockStore();
    const played: string[] = [];
    const sound = { play: (k: string) => played.push(k) } as any;
    Sfx.init(sound, () => true);
    expect(Sfx.toggleMute()).toBe(true);
    expect(store[MUTE_KEY]).toBe('1');
    Sfx.play('bounce');
    expect(played).toEqual([]); // 靜音 → 不播
    expect(Sfx.toggleMute()).toBe(false);
    Sfx.play('bounce');
    expect(played).toEqual(['sfx-bounce']);
  });
});
