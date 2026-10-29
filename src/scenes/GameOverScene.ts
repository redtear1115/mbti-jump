import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { ScoreTracker } from '../core/ScoreTracker';
import { t, tf } from '../i18n/t';
import { Button } from '../ui/Button';
import { MuteButton } from '../ui/MuteButton';
import { BODY_FONT, INK_CSS, MANGA_RED, MANGA_YELLOW, PAPER, TITLE_FONT } from '../theme/manga';
import { drawInkBurst, inkFrame } from '../gfx/mangaFx';

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
    this.cameras.main.setBackgroundColor(PAPER);
    inkFrame(this);
    const cx = GAME.width / 2;
    const titleY = GAME.height / 2 - 70;

    const burst = this.add.graphics();
    drawInkBurst(burst, cx, titleY, 36, 150, 16, MANGA_YELLOW);

    this.add
      .text(cx, titleY, t('gameover.title'), {
        fontSize: '40px',
        color: '#' + MANGA_RED.toString(16),
        fontFamily: TITLE_FONT,
        fontStyle: 'bold',
        stroke: '#fffaf2',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setAngle(-6);
    this.add
      .text(cx, GAME.height / 2 - 8, tf('gameover.subtitle', [resumeLevel + 1]), {
        fontSize: '16px',
        color: INK_CSS,
        align: 'center',
        wordWrap: { width: GAME.width - 80, useAdvancedWrap: true },
        fontFamily: BODY_FONT,
      })
      .setOrigin(0.5);

    new Button(this, cx, GAME.height / 2 + 64, t('gameover.retry'), {
      width: 220,
      height: 58,
      fontSize: 24,
      bg: MANGA_YELLOW,
      bgHover: 0xffec7a,
      bgDown: 0xe6c72e,
      onClick: () => this.scene.start('Game', { score }),
    });

    new MuteButton(this, GAME.width - 26, 26);
  }
}
