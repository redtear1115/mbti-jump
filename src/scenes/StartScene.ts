import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { ScoreTracker } from '../core/ScoreTracker';
import { t } from '../i18n/t';
import { getLocale, setLocale } from '../i18n/store';
import { SUPPORTED_LOCALES, LOCALE_LABELS } from '../i18n/locales';
import { Button } from '../ui/Button';
import { MuteButton } from '../ui/MuteButton';

type OrientationPermissionApi = {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

export class StartScene extends Phaser.Scene {
  constructor() {
    super('Start');
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a1c2c');
    const cx = GAME.width / 2;
    const current = getLocale();

    this.add
      .text(cx, 170, t('start.title'), {
        fontSize: '44px',
        color: '#ffcc00',
        fontStyle: 'bold',
        fontFamily: 'Fredoka, system-ui, sans-serif',
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 250, t('start.tagline'), {
        fontSize: '16px',
        color: '#ffffffcc',
        align: 'center',
        fontFamily: 'Nunito, system-ui, sans-serif',
      })
      .setOrigin(0.5);

    // 語言選單：橫排小按鈕，當前語言高亮，點選即切換並重繪
    this.add
      .text(cx, 356, t('start.language'), {
        fontSize: '13px',
        color: '#ffffff88',
        fontFamily: 'Nunito, system-ui, sans-serif',
      })
      .setOrigin(0.5);
    const startX = cx - ((SUPPORTED_LOCALES.length - 1) * 80) / 2;
    SUPPORTED_LOCALES.forEach((loc, i) => {
      const active = loc === current;
      const chip = this.add
        .text(startX + i * 80, 392, LOCALE_LABELS[loc], {
          fontSize: '13px',
          color: active ? '#1a1c2c' : '#ffffffdd',
          backgroundColor: active ? '#ffcc00' : '#ffffff22',
          padding: { x: 10, y: 12 },
          fontFamily: 'Nunito, system-ui, sans-serif',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      if (!active) {
        chip.on('pointerover', () => chip.setBackgroundColor('#ffffff3a'));
        chip.on('pointerout', () => {
          chip.setBackgroundColor('#ffffff22');
          chip.setScale(1);
        });
        chip.on('pointerdown', () => chip.setScale(0.94));
      }
      chip.on('pointerup', () => {
        if (loc !== current) {
          setLocale(loc);
          this.scene.restart();
        }
      });
    });

    new MuteButton(this, GAME.width - 26, 26);

    // 主 CTA：實心圓角按鈕（hover/press 回饋 + ≥44 觸控）
    new Button(this, cx, 478, t('start.cta'), {
      width: 200,
      height: 60,
      fontSize: 28,
      onClick: async () => {
        await this.requestTiltPermission();
        this.scene.start('Game', { score: new ScoreTracker() });
      },
    });
  }

  /** iOS 13+ 需在使用者手勢中請求體感權限；其他平台略過。 */
  private async requestTiltPermission(): Promise<void> {
    const api = window.DeviceOrientationEvent as unknown as OrientationPermissionApi | undefined;
    if (api && typeof api.requestPermission === 'function') {
      try {
        await api.requestPermission();
      } catch {
        /* 被拒：交給點擊左右半邊備援 */
      }
    }
  }
}
