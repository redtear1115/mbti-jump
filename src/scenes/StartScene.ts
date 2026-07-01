import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { ScoreTracker } from '../core/ScoreTracker';
import { t } from '../i18n/t';
import { getLocale, setLocale } from '../i18n/store';
import { SUPPORTED_LOCALES, LOCALE_LABELS } from '../i18n/locales';

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
      .text(cx, 170, t('start.title'), { fontSize: '44px', color: '#ffcc00', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.add
      .text(cx, 250, t('start.tagline'), { fontSize: '16px', color: '#ffffffcc', align: 'center' })
      .setOrigin(0.5);

    // 語言選單：橫排小按鈕，當前語言高亮，點選即切換並重繪
    this.add.text(cx, 360, t('start.language'), { fontSize: '13px', color: '#ffffff88' }).setOrigin(0.5);
    const startX = cx - ((SUPPORTED_LOCALES.length - 1) * 78) / 2;
    SUPPORTED_LOCALES.forEach((loc, i) => {
      const active = loc === current;
      const item = this.add
        .text(startX + i * 78, 390, LOCALE_LABELS[loc], {
          fontSize: '13px',
          color: active ? '#1a1c2c' : '#ffffffcc',
          backgroundColor: active ? '#ffcc00' : '#ffffff11',
          padding: { x: 8, y: 6 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      item.on('pointerdown', () => {
        if (loc !== current) {
          setLocale(loc);
          this.scene.restart();
        }
      });
    });

    const btn = this.add
      .text(cx, 470, t('start.cta'), {
        fontSize: '28px',
        color: '#38b764',
        backgroundColor: '#ffffff11',
        padding: { x: 24, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    btn.on('pointerdown', async () => {
      await this.requestTiltPermission();
      this.scene.start('Game', { score: new ScoreTracker() });
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
