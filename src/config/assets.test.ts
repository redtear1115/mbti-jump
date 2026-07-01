import { describe, it, expect } from 'vitest';
import { ASSET_KEYS, SFX_KEYS, IMAGE_MANIFEST, AUDIO_MANIFEST } from './assets';

describe('assets registry', () => {
  it('image keys are unique', () => {
    const vals = Object.values(ASSET_KEYS);
    expect(new Set(vals).size).toBe(vals.length);
  });
  it('sfx keys are unique', () => {
    const vals = Object.values(SFX_KEYS);
    expect(new Set(vals).size).toBe(vals.length);
  });
  it('manifests reference declared keys and unique paths', () => {
    const imgKeys = new Set<string>(Object.values(ASSET_KEYS));
    for (const e of IMAGE_MANIFEST) expect(imgKeys.has(e.key)).toBe(true);
    const sfxKeys = new Set<string>(Object.values(SFX_KEYS));
    for (const e of AUDIO_MANIFEST) expect(sfxKeys.has(e.key)).toBe(true);
    const paths = [...IMAGE_MANIFEST, ...AUDIO_MANIFEST].map((e) => e.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
