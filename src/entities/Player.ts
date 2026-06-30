import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';

const TEXTURE_KEY = 'player';

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    ensureTexture(scene);
    super(scene, x, y, TEXTURE_KEY);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(36, 36);
    body.setCollideWorldBounds(false);
  }

  setAxis(axis: number): void {
    this.setVelocityX(axis * GAME.playerMaxSpeedX);
  }

  bounce(): void {
    this.setVelocityY(GAME.jumpVelocity);
  }

  wrapHorizontally(): void {
    if (this.x < 0) this.x = GAME.width;
    else if (this.x > GAME.width) this.x = 0;
  }
}

/** 用 Graphics 產生一個簡單的圓角方塊貼圖（程式美術）。 */
function ensureTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEXTURE_KEY)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0xffcc00, 1);
  g.fillRoundedRect(0, 0, 36, 36, 8);
  g.fillStyle(0x000000, 1);
  g.fillCircle(12, 14, 3);
  g.fillCircle(24, 14, 3);
  g.generateTexture(TEXTURE_KEY, 36, 36);
  g.destroy();
}
