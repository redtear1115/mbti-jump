import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { ScoreTracker } from '../core/ScoreTracker';
import { t, tf } from '../i18n/t';
import { Button } from '../ui/Button';
import { MuteButton } from '../ui/MuteButton';

interface GameOverInit {
  score: ScoreTracker;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(data: GameOverInit) {
    const { score } = data;
    // 無縫爬塔：重來時從尚未鎖定的維度接續（已鎖定的維度保留）。
    const resumeLevel = score.lockedCount();
    this.cameras.main.setBackgroundColor('#1a1c2c');
    const cx = GAME.width / 2;

    this.add
      .text(cx, GAME.height / 2 - 60, t('gameover.title'), {
        fontSize: '28px',
        color: '#b13e53',
        fontFamily: 'Fredoka, system-ui, sans-serif',
      })
      .setOrigin(0.5);
    this.add
      .text(cx, GAME.height / 2 - 20, tf('gameover.subtitle', [resumeLevel + 1]), {
        fontSize: '15px',
        color: '#ffffffaa',
        fontFamily: 'Nunito, system-ui, sans-serif',
      })
      .setOrigin(0.5);

    new Button(this, cx, GAME.height / 2 + 55, t('gameover.retry'), {
      width: 220,
      height: 58,
      fontSize: 24,
      bg: 0xd9a521,
      bgHover: 0xf0b93a,
      onClick: () => this.scene.start('Game', { score }),
    });

    new MuteButton(this, GAME.width - 26, 26);
  }
}
