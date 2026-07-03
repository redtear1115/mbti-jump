import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { ASSET_KEYS } from '../config/assets';
import { prefersReducedMotion } from '../ui/reducedMotion';
import { PLAYER_BASE_COLOR } from '../core/playerColor';

const PROC_KEY_PREFIX = 'player-proc-';
const TEX_W = 54;
const TEX_H = 50;

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
 * 程式美術：晶亮果凍水滴（帶 body 色參數）。
 * 明暗相對身體色：高光/邊光白 alpha、底陰影/暗邊黑 alpha、眼嘴固定深墨色。
 * → 同函式對白基底與任一染色都成立。texture key 依色值快取。
 */
export function ensurePlayerTexture(scene: Phaser.Scene, bodyColor: number): string {
  const key = PROC_KEY_PREFIX + bodyColor.toString(16).padStart(6, '0');
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const cx = 27;
  const cy = 26;
  const rx = 22; // 身體水平半徑
  const ry = 20; // 身體垂直半徑

  // 1. 身體（圓潤水滴橢圓）
  g.fillStyle(bodyColor, 1);
  g.fillEllipse(cx, cy, rx * 2, ry * 2);

  // 2. 底部半月陰影（體積）
  g.fillStyle(0x000000, 0.1);
  g.fillEllipse(cx, cy + ry * 0.32, rx * 1.6, ry * 1.2);

  // 3. 柔和暗邊（亮背景上仍分得出輪廓）
  g.lineStyle(1.2, 0x000000, 0.16);
  g.strokeEllipse(cx, cy, rx * 2, ry * 2);

  // 4. 主高光（左上大片）＋右上小閃點
  g.fillStyle(0xffffff, 0.85);
  g.fillEllipse(cx - rx * 0.34, cy - ry * 0.42, rx * 0.6, ry * 0.34);
  g.fillStyle(0xffffff, 0.9);
  g.fillEllipse(cx + rx * 0.32, cy - ry * 0.44, rx * 0.2, ry * 0.14);

  // 5. 上緣邊光（透亮玻璃/水珠光澤）
  g.lineStyle(rx * 0.12, 0xffffff, 0.22);
  g.beginPath();
  g.arc(cx, cy - ry * 0.06, rx * 0.86, Phaser.Math.DegToRad(208), Phaser.Math.DegToRad(332));
  g.strokePath();

  // 6. 臉：兩點深墨色眼＋寬淺微笑
  g.fillStyle(0x2a2340, 1);
  g.fillCircle(cx - rx * 0.26, cy - ry * 0.02, 2.4);
  g.fillCircle(cx + rx * 0.26, cy - ry * 0.02, 2.4);
  g.lineStyle(2, 0x2a2340, 1);
  g.beginPath();
  g.arc(cx, cy + ry * 0.12, rx * 0.5, Phaser.Math.DegToRad(35), Phaser.Math.DegToRad(145));
  g.strokePath();

  g.generateTexture(key, TEX_W, TEX_H);
  g.destroy();
  return key;
}
