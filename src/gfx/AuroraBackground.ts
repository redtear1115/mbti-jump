import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { LETTER_COLORS } from '../theme/palette';
import { DIMENSIONS, LETTERS_OF } from '../config/questions';
import { drawHalftoneBand } from './mangaFx';

/**
 * 依目前維度的兩個代表字母色，在漫畫紙上下兩端繪製淡雅的彩色漫畫網點帶（スクリーントーン）。
 * 取代原本會洗髒紙面的模糊柔光球，維持純粹的日式印刷網點質感。
 */
export class AuroraBackground {
  private scene: Phaser.Scene;
  private toneGfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, _reducedMotion: boolean) {
    this.scene = scene;
    this.toneGfx = this.scene.add.graphics().setScrollFactor(0).setDepth(-11);
  }

  /** 依維度更新上下兩端彩色漫畫網點。 */
  retint(dimIndex: number): void {
    const [a, b] = LETTERS_OF[DIMENSIONS[dimIndex]];
    this.toneGfx.clear();
    drawHalftoneBand(this.toneGfx, 10, 10, GAME.width - 20, 190, LETTER_COLORS[a], 0.22, 'down', 10);
    drawHalftoneBand(this.toneGfx, 10, GAME.height - 260, GAME.width - 20, 140, LETTER_COLORS[b], 0.18, 'up', 10);
  }
}
