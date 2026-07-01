import type Phaser from 'phaser';
import { SFX_KEYS } from '../config/assets';

export const MUTE_KEY = 'mbti-jump.muted';

let sound: Phaser.Sound.BaseSoundManager | null = null;
let hasSound: (key: string) => boolean = () => false;
let muted: boolean | null = null;

function readMuted(): boolean {
  try {
    return (globalThis as any).localStorage?.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}
function writeMuted(v: boolean): void {
  try {
    (globalThis as any).localStorage?.setItem(MUTE_KEY, v ? '1' : '0');
  } catch {
    /* 略過 */
  }
}

export const Sfx = {
  init(sm: Phaser.Sound.BaseSoundManager, has: (key: string) => boolean): void {
    sound = sm;
    hasSound = has;
    if (muted === null) muted = readMuted();
  },

  play(key: keyof typeof SFX_KEYS): void {
    if (!sound || this.isMuted()) return;
    const soundKey = SFX_KEYS[key];
    if (!hasSound(soundKey)) return;
    sound.play(soundKey);
  },

  isMuted(): boolean {
    if (muted === null) muted = readMuted();
    return muted;
  },

  toggleMute(): boolean {
    muted = !this.isMuted();
    writeMuted(muted);
    return muted;
  },

  /** 測試用：清空狀態。 */
  _resetForTest(): void {
    sound = null;
    hasSound = () => false;
    muted = null;
  },
};
