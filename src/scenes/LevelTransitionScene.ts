import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { ScoreTracker } from '../core/ScoreTracker';
import { DIMENSIONS } from '../config/questions';

interface Init {
  score: ScoreTracker;
  levelIndex: number;
}

export class LevelTransitionScene extends Phaser.Scene {
  constructor() {
    super('LevelTransition');
  }

  create(data: Init) {
    const { score, levelIndex } = data;
    const isLast = levelIndex >= DIMENSIONS.length - 1;
    this.cameras.main.setBackgroundColor('#1a1c2c');

    const cx = GAME.width / 2;
    this.add
      .text(cx, GAME.height / 2 - 60, `第 ${levelIndex + 1} 關完成！`, { fontSize: '28px', color: '#ffffff' })
      .setOrigin(0.5);

    const label = isLast ? '看結果 ▶' : '下一關 ▶';
    const btn = this.add
      .text(cx, GAME.height / 2 + 40, label, { fontSize: '24px', color: '#38b764', backgroundColor: '#ffffff11', padding: { x: 16, y: 10 } })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
      if (isLast) {
        this.scene.start('Result', { score });
      } else {
        this.scene.start('Game', { score, levelIndex: levelIndex + 1 });
      }
    });
  }
}
