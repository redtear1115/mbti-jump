import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { ScoreTracker } from '../core/ScoreTracker';

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

    this.add.text(cx, 200, 'MBTI Jump', { fontSize: '44px', color: '#ffcc00', fontStyle: 'bold' }).setOrigin(0.5);
    this.add
      .text(cx, 270, '一路往上跳，跳左 = Yes、跳右 = No\n四關測出你的人格', { fontSize: '16px', color: '#ffffffcc', align: 'center' })
      .setOrigin(0.5);

    const btn = this.add
      .text(cx, 430, '開始 ▶', { fontSize: '28px', color: '#38b764', backgroundColor: '#ffffff11', padding: { x: 24, y: 12 } })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    btn.on('pointerdown', async () => {
      await this.requestTiltPermission();
      this.scene.start('Game', { score: new ScoreTracker(), levelIndex: 0 });
    });
  }

  /** iOS 13+ 需在使用者手勢中請求體感權限；其他平台直接略過。 */
  private async requestTiltPermission(): Promise<void> {
    const api = (window.DeviceOrientationEvent as unknown) as OrientationPermissionApi | undefined;
    if (api && typeof api.requestPermission === 'function') {
      try {
        await api.requestPermission();
      } catch {
        // 被拒：交給點擊左右半邊備援
      }
    }
  }
}
