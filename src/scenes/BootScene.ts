import Phaser from 'phaser';
import { IMAGE_MANIFEST, AUDIO_MANIFEST } from '../config/assets';
import { Sfx } from '../audio/Sfx';

/**
 * 預載素材（缺檔容忍 → 漸進增強）、等網頁字體就緒，再進 Start。
 * 不在此請求 iOS 體感權限（需使用者手勢，維持在 StartScene 按鈕內）。
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // 缺檔不致命：記 warn 後略過，實體/背景/音效自行 fallback
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[assets] missing, will fall back: ${file.key} (${file.src})`);
    });
    for (const { key, path } of IMAGE_MANIFEST) this.load.image(key, path);
    for (const { key, path } of AUDIO_MANIFEST) this.load.audio(key, path);
  }

  async create() {
    Sfx.init(this.sound, (key) => this.cache.audio.exists(key));
    try {
      await (document as Document).fonts.ready;
    } catch {
      /* 無 FontFaceSet：略過，用系統字體 */
    }
    this.scene.start('Start');
  }
}
