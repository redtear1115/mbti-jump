import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { ScoreTracker } from '../core/ScoreTracker';
import { t, tf } from '../i18n/t';

interface Init {
  score: ScoreTracker;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(data: Init) {
    const { score } = data;
    // 無縫爬塔：重來時從尚未鎖定的維度接續（已鎖定的維度保留）。
    const resumeLevel = score.lockedCount();
    this.cameras.main.setBackgroundColor('#1a1c2c');
    const cx = GAME.width / 2;

    this.add
      .text(cx, GAME.height / 2 - 60, t('gameover.title'), { fontSize: '28px', color: '#b13e53' })
      .setOrigin(0.5);
    this.add
      .text(cx, GAME.height / 2 - 20, tf('gameover.subtitle', [resumeLevel + 1]), {
        fontSize: '15px',
        color: '#ffffffaa',
      })
      .setOrigin(0.5);

    const btn = this.add
      .text(cx, GAME.height / 2 + 50, t('gameover.retry'), {
        fontSize: '24px',
        color: '#ffcc00',
        backgroundColor: '#ffffff11',
        padding: { x: 16, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => this.scene.start('Game', { score }));
  }
}
