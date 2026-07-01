import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { PALETTE } from '../theme/palette';
import { ACHIEVEMENTS, unlockedIds } from '../core/achievements';
import { getPlays } from '../core/profile';
import { t } from '../i18n/t';
import type { StringKey } from '../i18n/t';
import { MuteButton } from '../ui/MuteButton';

const TITLE_FONT = 'Fredoka, system-ui, sans-serif';
const BODY_FONT = 'Nunito, system-ui, sans-serif';

export class AchievementScene extends Phaser.Scene {
  constructor() {
    super('Achievements');
  }

  create() {
    this.cameras.main.setBackgroundColor(PALETTE.surface);
    const cx = GAME.width / 2;
    new MuteButton(this, GAME.width - 26, 26);

    this.add
      .text(cx, 48, t('ach.title'), { fontFamily: TITLE_FONT, fontSize: '30px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);

    const unlocked = unlockedIds(getPlays());
    let y = 108;
    for (const a of ACHIEVEMENTS) {
      const on = unlocked.has(a.id);
      this.add.text(28, y, on ? '🏆' : '🔒', { fontSize: '22px' }).setOrigin(0, 0.5);
      this.add
        .text(64, y - 10, t(`ach.${a.id}.name` as StringKey), {
          fontFamily: TITLE_FONT,
          fontSize: '18px',
          color: on ? '#ffe066' : '#ffffff66',
        })
        .setOrigin(0, 0.5);
      this.add
        .text(64, y + 12, t(`ach.${a.id}.desc` as StringKey), {
          fontFamily: BODY_FONT,
          fontSize: '13px',
          color: on ? '#ffffffcc' : '#ffffff44',
          wordWrap: { width: GAME.width - 90 },
        })
        .setOrigin(0, 0.5);
      y += 80;
    }

    const backBtn = this.add
      .text(cx, 758, t('common.back'), { fontFamily: BODY_FONT, fontSize: '18px', color: '#ffffff', backgroundColor: '#ffffff11', padding: { x: 16, y: 8 } })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    backBtn.on('pointerup', () => this.scene.start('Start'));
  }
}
