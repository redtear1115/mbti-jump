import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { ASSET_KEYS } from '../config/assets';
import { prefersReducedMotion } from '../ui/reducedMotion';

const PROC_KEY = 'player-proc';
const TEX_W = 44;
const TEX_H = 40;

export class Player extends Phaser.Physics.Arcade.Sprite {
  private reduced = prefersReducedMotion();
  private wobble?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const key = scene.textures.exists(ASSET_KEYS.player) ? ASSET_KEYS.player : PROC_KEY;
    if (key === PROC_KEY) ensureTexture(scene);
    super(scene, x, y, key);
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
    // 液體感：落地瞬間壓扁 → 彈性回彈略微拉長，像果凍史萊姆
    if (this.reduced) return;
    this.wobble?.stop();
    this.setScale(1.35, 0.68);
    this.wobble = this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 420,
      ease: 'Elastic.easeOut',
      easeParams: [1.1, 0.45],
    });
  }

  wrapHorizontally(): void {
    if (this.x < 0) this.x = GAME.width;
    else if (this.x > GAME.width) this.x = 0;
  }
}

/** 程式美術：百變怪風格的紫色液體怪（圓潤方塊身 + 點點眼 + 小微笑）。 */
function ensureTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(PROC_KEY)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  // 身體：百變怪淡紫色圓潤方塊
  g.fillStyle(0xb9a5de, 1);
  g.fillRoundedRect(2, 5, 40, 33, 15);
  // 頂部高光（果凍感）
  g.fillStyle(0xffffff, 0.16);
  g.fillEllipse(18, 14, 20, 9);
  // 眼睛：兩個深色圓點
  g.fillStyle(0x2b2440, 1);
  g.fillCircle(17, 21, 3);
  g.fillCircle(29, 21, 3);
  // 微笑：一段小圓弧
  g.lineStyle(2, 0x2b2440, 1);
  g.beginPath();
  g.arc(23, 24, 5, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160));
  g.strokePath();
  g.generateTexture(PROC_KEY, TEX_W, TEX_H);
  g.destroy();
}
