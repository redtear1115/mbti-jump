import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { LETTER_COLORS } from '../theme/palette';
import { DIMENSIONS, LETTERS_OF } from '../config/questions';
import { ensureGlowTexture } from './glowTexture';

/**
 * 兩團維度色柔光緩慢飄移的程序背景（無美術資產）。
 * 以 SCREEN 疊加在相機底色上，深度 -11 → 位於既有氛圍背景（星點 -10、
 * 飛蟲/天象 -9）之後，只做「顏色暈染」不遮擋其上元素。retint 依維度換色。
 */
export class AuroraBackground {
  private glowA: Phaser.GameObjects.Image;
  private glowB: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, reducedMotion: boolean) {
    const glowKey = ensureGlowTexture(scene);
    const mk = () =>
      scene.add
        .image(0, 0, glowKey)
        .setScrollFactor(0)
        .setDepth(-11)
        .setBlendMode(Phaser.BlendModes.SCREEN)
        .setDisplaySize(GAME.width * 1.7, GAME.width * 1.7);
    this.glowA = mk();
    this.glowB = mk();

    this.glowA.setPosition(GAME.width * 0.2, GAME.height * 0.25);
    this.glowB.setPosition(GAME.width * 0.8, GAME.height * 0.75);

    if (!reducedMotion) {
      scene.tweens.add({
        targets: this.glowA,
        x: GAME.width * 0.6,
        y: GAME.height * 0.5,
        duration: 9000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      scene.tweens.add({
        targets: this.glowB,
        x: GAME.width * 0.35,
        y: GAME.height * 0.45,
        duration: 11000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  /** 依維度更新兩團柔光顏色。 */
  retint(dimIndex: number): void {
    const [a, b] = LETTERS_OF[DIMENSIONS[dimIndex]];
    this.glowA.setTint(LETTER_COLORS[a]);
    this.glowB.setTint(LETTER_COLORS[b]);
  }
}
