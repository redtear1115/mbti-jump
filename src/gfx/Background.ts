import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { ASSET_KEYS } from '../config/assets';

interface Layer {
  ts: Phaser.GameObjects.TileSprite;
  factor: number; // 視差速度：越小越慢
}

/**
 * 視差多層背景。若對應圖未載入則不建立任何層（hasLayers()=false），
 * 呼叫端改用純色背景（漸進增強）。
 */
export class Background {
  private layers: Layer[] = [];

  constructor(scene: Phaser.Scene) {
    const defs: { key: string; factor: number }[] = [
      { key: ASSET_KEYS.bgSky, factor: 0.1 },
      { key: ASSET_KEYS.bgClouds, factor: 0.25 },
      { key: ASSET_KEYS.bgHills, factor: 0.5 },
    ];
    for (const d of defs) {
      if (!scene.textures.exists(d.key)) continue;
      const ts = scene.add
        .tileSprite(0, 0, GAME.width, GAME.height, d.key)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(-10);
      this.layers.push({ ts, factor: d.factor });
    }
  }

  hasLayers(): boolean {
    return this.layers.length > 0;
  }

  /** 依相機捲動更新各層 tilePositionY，製造上升視差。 */
  update(scrollY: number): void {
    for (const l of this.layers) l.ts.tilePositionY = scrollY * l.factor;
  }
}
