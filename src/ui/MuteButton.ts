import Phaser from 'phaser';
import { Sfx } from '../audio/Sfx';

/** 右上角靜音切換（純文字圖示 🔊/🔇；點擊切換並記住）。 */
export class MuteButton {
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.label = scene.add
      .text(x, y, this.icon(), { fontSize: '22px' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(50)
      .setInteractive({ useHandCursor: true });
    this.label.on('pointerup', () => {
      Sfx.toggleMute();
      this.label.setText(this.icon());
    });
  }

  private icon(): string {
    return Sfx.isMuted() ? '🔇' : '🔊';
  }
}
