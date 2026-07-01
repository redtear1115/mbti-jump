import Phaser from 'phaser';
import { GAME } from './config/gameConfig';
import { BootScene } from './scenes/BootScene';
import { StartScene } from './scenes/StartScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';
import { ResultScene } from './scenes/ResultScene';
import { TrendScene } from './scenes/TrendScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#1a1c2c',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME.width,
    height: GAME.height,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: GAME.gravityY }, debug: false },
  },
  scene: [BootScene, StartScene, GameScene, GameOverScene, ResultScene, TrendScene],
});
