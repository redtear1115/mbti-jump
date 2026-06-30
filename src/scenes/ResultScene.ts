import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { ScoreTracker } from '../core/ScoreTracker';
import { describeType } from '../config/personalities';

interface Init {
  score: ScoreTracker;
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  create(data: Init) {
    const type = data.score.result();
    const desc = describeType(type);
    this.cameras.main.setBackgroundColor('#1a1c2c');
    const cx = GAME.width / 2;

    this.add.text(cx, 180, '你的人格類型', { fontSize: '18px', color: '#ffffffaa' }).setOrigin(0.5);
    this.add.text(cx, 250, type, { fontSize: '72px', color: '#ffcc00', fontStyle: 'bold' }).setOrigin(0.5);
    this.add
      .text(cx, 360, desc, { fontSize: '18px', color: '#ffffff', align: 'center', wordWrap: { width: GAME.width - 60 } })
      .setOrigin(0.5);

    const copyBtn = this.add
      .text(cx, 500, '複製結果 ⎘', { fontSize: '20px', color: '#38b764', backgroundColor: '#ffffff11', padding: { x: 16, y: 10 } })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    copyBtn.on('pointerdown', async () => {
      const text = `我的 MBTI 是 ${type}！${desc} 來玩 MBTI Jump：${location.href}`;
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.setText('已複製 ✓');
      } catch {
        copyBtn.setText('複製失敗，請手動選取');
      }
    });

    const againBtn = this.add
      .text(cx, 570, '再玩一次 ↻', { fontSize: '20px', color: '#ffcc00', backgroundColor: '#ffffff11', padding: { x: 16, y: 10 } })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    againBtn.on('pointerdown', () => this.scene.start('Start'));
  }
}
