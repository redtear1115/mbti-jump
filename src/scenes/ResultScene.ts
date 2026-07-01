import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { ScoreTracker } from '../core/ScoreTracker';
import { describeType } from '../config/personalities';
import { t, tf } from '../i18n/t';
import { Button } from '../ui/Button';

interface ResultInit {
  score: ScoreTracker;
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  create(data: ResultInit) {
    const type = data.score.result();
    const desc = describeType(type);
    this.cameras.main.setBackgroundColor('#1a1c2c');
    const cx = GAME.width / 2;

    this.add.text(cx, 180, t('result.heading'), { fontSize: '18px', color: '#ffffffaa' }).setOrigin(0.5);
    this.add.text(cx, 250, type, { fontSize: '72px', color: '#ffcc00', fontStyle: 'bold' }).setOrigin(0.5);
    this.add
      .text(cx, 360, desc, {
        fontSize: '18px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: GAME.width - 60 },
      })
      .setOrigin(0.5);

    const copyBtn = new Button(this, cx, 505, t('result.copy'), {
      width: 240,
      height: 54,
      fontSize: 20,
      onClick: async () => {
        const text = tf('result.share', [type, desc, location.href]);
        try {
          await navigator.clipboard.writeText(text);
          copyBtn.setLabel(t('result.copied'));
        } catch {
          copyBtn.setLabel(t('result.copyFail'));
        }
      },
    });

    new Button(this, cx, 575, t('result.again'), {
      width: 240,
      height: 54,
      fontSize: 20,
      bg: 0xd9a521,
      bgHover: 0xf0b93a,
      onClick: () => this.scene.start('Start'),
    });
  }
}
