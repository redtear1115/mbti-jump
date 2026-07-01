import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { ScoreTracker } from '../core/ScoreTracker';
import { describeType } from '../config/personalities';
import { t, tf } from '../i18n/t';
import type { StringKey } from '../i18n/t';
import { Button } from '../ui/Button';
import { MuteButton } from '../ui/MuteButton';
import { groupOf, groupColorOf } from '../core/temperament';
import { recordPlay } from '../core/profile';

interface ResultInit {
  score: ScoreTracker;
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  create(data: ResultInit) {
    const type = data.score.result();
    recordPlay(type, data.score.allTallies());
    const desc = describeType(type);
    const group = groupOf(type);
    const groupHex = '#' + groupColorOf(type).toString(16).padStart(6, '0');
    this.cameras.main.setBackgroundColor('#1a1c2c');
    const cx = GAME.width / 2;

    this.add
      .text(cx, 180, t('result.heading'), {
        fontSize: '18px',
        color: '#ffffffaa',
        fontFamily: 'Fredoka, system-ui, sans-serif',
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 250, type, {
        fontSize: '72px',
        color: groupHex,
        fontStyle: 'bold',
        fontFamily: 'Fredoka, system-ui, sans-serif',
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 320, tf('result.groupLabel', [t(`group.${group}` as StringKey)]), {
        fontFamily: 'Fredoka, system-ui, sans-serif',
        fontSize: '20px',
        color: groupHex,
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 390, desc, {
        fontSize: '18px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: GAME.width - 60 },
        fontFamily: 'Nunito, system-ui, sans-serif',
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

    new Button(this, cx, 640, t('trend.cta'), {
      width: 240,
      height: 50,
      fontSize: 18,
      bg: 0x4298b4,
      bgHover: 0x54aec9,
      bgDown: 0x3a86a0,
      onClick: () => this.scene.start('Trend'),
    });

    new MuteButton(this, GAME.width - 26, 26);
  }
}
