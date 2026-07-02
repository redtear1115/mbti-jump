import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { ASSET_KEYS } from '../config/assets';
import { prefersReducedMotion } from '../ui/reducedMotion';
import { PLAYER_BASE_COLOR } from '../core/playerColor';

const PROC_KEY_PREFIX = 'player-proc-';
const TEX_W = 48;
const TEX_H = 44;

export class Player extends Phaser.Physics.Arcade.Sprite {
  private reduced = prefersReducedMotion();
  private wobble?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number, color: number = PLAYER_BASE_COLOR) {
    const key = scene.textures.exists(ASSET_KEYS.player)
      ? ASSET_KEYS.player
      : ensurePlayerTexture(scene, color);
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

  /** 依混色結果換膚（texture 帶色重生成）＋彈性 pop；點陣資產模式 no-op。 */
  recolor(color: number): void {
    if (this.scene.textures.exists(ASSET_KEYS.player)) return;
    this.setTexture(ensurePlayerTexture(this.scene, color));
    if (this.reduced) return;
    this.wobble?.stop();
    this.setScale(1.18);
    this.wobble = this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });
  }

  wrapHorizontally(): void {
    if (this.x < 0) this.x = GAME.width;
    else if (this.x > GAME.width) this.x = 0;
  }
}

/**
 * 程式美術：百變怪風格淡紫液體怪（帶 body 色參數）。
 * texture key 依色值快取（player-proc-<hex>）；眼/嘴深色與白高光不隨 body 色變。
 */
export function ensurePlayerTexture(scene: Phaser.Scene, bodyColor: number): string {
  const key = PROC_KEY_PREFIX + bodyColor.toString(16).padStart(6, '0');
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  // 由多個重疊圓形聯集出「有波浪凸起」的不定形身體
  g.fillStyle(bodyColor, 1);
  g.fillCircle(24, 28, 17); // 主體
  g.fillEllipse(24, 33, 42, 22); // 加寬下半身
  g.fillCircle(11, 16, 7); // 左上尖凸
  g.fillCircle(20, 11, 8); // 中左凸
  g.fillCircle(30, 12, 8); // 中右凸
  g.fillCircle(39, 17, 7); // 右上圓凸
  g.fillCircle(7, 25, 6); // 左側
  g.fillCircle(42, 27, 6); // 右側小凸
  // 頂部高光（果凍感）
  g.fillStyle(0xffffff, 0.16);
  g.fillEllipse(19, 18, 22, 11);
  // 眼睛：兩個深色小圓點
  g.fillStyle(0x2a2340, 1);
  g.fillCircle(19, 24, 2.3);
  g.fillCircle(31, 24, 2.3);
  // 嘴巴：寬而淺的微笑線（百變怪招牌憨笑）
  g.lineStyle(2, 0x2a2340, 1);
  g.beginPath();
  g.arc(25, 16, 14, Phaser.Math.DegToRad(55), Phaser.Math.DegToRad(125));
  g.strokePath();
  g.generateTexture(key, TEX_W, TEX_H);
  g.destroy();
  return key;
}
