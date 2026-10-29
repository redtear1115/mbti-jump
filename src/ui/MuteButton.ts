import Phaser from 'phaser';
import { Sfx } from '../audio/Sfx';
import { INK, PAPER_CARD } from '../theme/manga';
import { ensureIconTexture } from './icons';

/** 右上角靜音切換（程式向量喇叭 icon；44×44 觸控區；點擊切換並記住）。 */
export class MuteButton {
  private readonly img: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const plate = scene.add.graphics().setScrollFactor(0).setDepth(49);
    plate.fillStyle(PAPER_CARD, 1);
    plate.fillCircle(x, y, 16);
    plate.lineStyle(2.5, INK, 1);
    plate.strokeCircle(x, y, 16);
    this.img = scene.add
      .image(x, y, ensureIconTexture(scene, this.kind()))
      .setDisplaySize(22, 22)
      .setTint(INK)
      .setScrollFactor(0)
      .setDepth(50);
    const zone = scene.add
      .zone(x, y, 44, 44)
      .setScrollFactor(0)
      .setDepth(51)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      Sfx.toggleMute();
      this.img.setTexture(ensureIconTexture(scene, this.kind()));
      this.img.setDisplaySize(22, 22);
    });
  }

  private kind(): 'sound-on' | 'sound-off' {
    return Sfx.isMuted() ? 'sound-off' : 'sound-on';
  }
}
