import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { ASSET_KEYS } from '../config/assets';
import { prefersReducedMotion } from '../ui/reducedMotion';
import { PLAYER_BASE_COLOR } from '../core/playerColor';
import { jellyStretch } from '../core/jelly';

const PROC_KEY_PREFIX = 'player-proc-';
const TEX_W = 54;
const TEX_H = 50;

export class Player extends Phaser.Physics.Arcade.Sprite {
  private reduced = prefersReducedMotion();
  private jiggling = false;
  private jiggleT = 0; // 已經過秒數
  private static readonly JIGGLE_DUR = 0.42;
  private static readonly LEAN_MAX = 0.12; // rad

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
    if (this.reduced) return;
    // 落地衝擊：開啟阻尼晃動（由 tickJelly 每幀渲染，從壓扁彈回）
    this.jiggling = true;
    this.jiggleT = 0;
  }

  /** 依混色結果換膚（texture 帶色重生成）＋軟晃動；點陣資產模式 no-op。 */
  recolor(color: number): void {
    if (this.scene.textures.exists(ASSET_KEYS.player)) return;
    this.setTexture(ensurePlayerTexture(this.scene, color));
    if (this.reduced) return;
    this.jiggling = true;
    this.jiggleT = 0;
  }

  /** 每幀更新果凍變形：晃動期用阻尼餘弦，否則依垂直速度拉伸；水平速度給微傾。 */
  tickJelly(dt: number): void {
    if (this.reduced) return;
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (this.jiggling) {
      this.jiggleT += dt;
      const p = this.jiggleT / Player.JIGGLE_DUR;
      if (p >= 1) {
        this.jiggling = false;
      } else {
        const damp = Math.cos(p * Math.PI * 3) * Math.exp(-p * 4);
        this.setScale(1 + 0.35 * damp, 1 - 0.32 * damp);
        this.syncBodySize();
        this.applyLean(body.velocity.x, dt);
        return;
      }
    }

    // 速度驅動：目標 scale 以指數平滑趨近（避免抖動）
    const target = jellyStretch(body.velocity.y);
    const a = 1 - Math.exp(-dt * 20);
    this.setScale(
      this.scaleX + (target.scaleX - this.scaleX) * a,
      this.scaleY + (target.scaleY - this.scaleY) * a,
    );
    this.syncBodySize();
    this.applyLean(body.velocity.x, dt);
  }

  /** 反補償視覺 scale，讓 Arcade body 維持真正 36×36（Phaser body 會隨 sprite scale 縮放）。 */
  private syncBodySize(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(36 / Math.abs(this.scaleX), 36 / Math.abs(this.scaleY));
  }

  private applyLean(vx: number, dt: number): void {
    const target = Phaser.Math.Clamp(vx * 0.00032, -Player.LEAN_MAX, Player.LEAN_MAX);
    const a = 1 - Math.exp(-dt * 12);
    this.rotation += (target - this.rotation) * a;
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
