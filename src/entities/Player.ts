import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { prefersReducedMotion } from '../ui/reducedMotion';
import { PLAYER_BASE_COLOR } from '../core/playerColor';
import { jellyStretch } from '../core/jelly';
import { INK_CSS, PAPER_CSS, mixInk, mixWhite, numToHex } from '../theme/manga';

const PROC_KEY_PREFIX = 'player-dialogue-v1-';
const TEX_W = 84;
const TEX_H = 92;

export class Player extends Phaser.Physics.Arcade.Sprite {
  private reduced = prefersReducedMotion();
  private jiggling = false;
  private jiggleT = 0; // 已經過秒數
  private static readonly JIGGLE_DUR = 0.42;
  private static readonly LEAN_MAX = 0.14; // rad

  constructor(scene: Phaser.Scene, x: number, y: number, color: number = PLAYER_BASE_COLOR) {
    super(scene, x, y, ensurePlayerTexture(scene, color));
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(false);
    this.syncBodySize();
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

  /** 依混色結果換膚＋軟晃動。 */
  recolor(color: number): void {
    this.setTexture(ensurePlayerTexture(this.scene, color));
    this.syncBodySize();
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
        this.setScale(1 + 0.32 * damp, 1 - 0.28 * damp);
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

  /**
   * 反補償視覺 scale，讓 Arcade body 維持真正 36×36，並貼在腳上。
   * 貼圖比碰撞高，對白框頂端可以伸出命中框。
   */
  private syncBodySize(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    // setSize 使用 Body 快取的縮放；先同步本幀 scale，避免變形時碰撞尺寸落後一幀。
    body.updateBounds();
    const srcW = 36 / Math.abs(this.scaleX);
    const srcH = 36 / Math.abs(this.scaleY);
    body.setSize(srcW, srcH, false);
    const frameW = this.frame.realWidth;
    const frameH = this.frame.realHeight;
    const pad = 6 / Math.abs(this.scaleY);
    body.setOffset((frameW - srcW) / 2, Math.max(0, frameH - srcH - pad));
  }

  private applyLean(vx: number, dt: number): void {
    const target = Phaser.Math.Clamp(vx * 0.00035, -Player.LEAN_MAX, Player.LEAN_MAX);
    const a = 1 - Math.exp(-dt * 12);
    this.rotation += (target - this.rotation) * a;
  }

  wrapHorizontally(): void {
    if (this.x < 0) this.x = GAME.width;
    else if (this.x > GAME.width) this.x = 0;
  }
}

/**
 * 對白精靈：以漫畫吹き出し作為輪廓，保留大片可染色紙面。
 * 粗墨線、偏移硬影與局部網點沿用介面語言；尾角落在腳部碰撞框內。
 * 首頁、遊戲與結果頁共用同一張依人格色快取的材質。
 */
export function ensurePlayerTexture(scene: Phaser.Scene, bodyColor: number): string {
  const key = PROC_KEY_PREFIX + bodyColor.toString(16).padStart(6, '0');
  if (scene.textures.exists(key)) return key;

  const canvasTex = scene.textures.createCanvas(key, TEX_W, TEX_H);
  if (!canvasTex) return ensureFallbackGraphicsTexture(scene, key, bodyColor);

  const ctx = canvasTex.getContext();
  ctx.clearRect(0, 0, TEX_W, TEX_H);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 略不對稱的圓角對白框，右下收成一個向內勾的小尾角。
  const outline = () => {
    ctx.beginPath();
    ctx.moveTo(39, 15);
    ctx.bezierCurveTo(61, 13, 73, 25, 73, 43);
    ctx.bezierCurveTo(74, 56, 69, 65, 60, 71);
    ctx.quadraticCurveTo(59, 79, 65, 84);
    ctx.quadraticCurveTo(51, 84, 46, 75);
    ctx.bezierCurveTo(23, 78, 11, 67, 11, 47);
    ctx.bezierCurveTo(10, 28, 19, 17, 39, 15);
    ctx.closePath();
  };

  // 紙白保護邊 + 右下硬墨落影，在雨景、集中線上仍保有完整輪廓。
  outline();
  ctx.strokeStyle = PAPER_CSS;
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.save();
  ctx.translate(2, 3);
  outline();
  ctx.fillStyle = INK_CSS;
  ctx.fill();
  ctx.restore();

  outline();
  ctx.fillStyle = numToHex(mixWhite(bodyColor, 0.12));
  ctx.fill();
  ctx.save();
  ctx.clip();

  // 下緣一塊平塗陰影，避免把角色畫成有光澤的立體玩具。
  ctx.beginPath();
  ctx.moveTo(11, 57);
  ctx.bezierCurveTo(29, 76, 61, 69, 74, 51);
  ctx.lineTo(80, 92);
  ctx.lineTo(6, 92);
  ctx.closePath();
  ctx.fillStyle = numToHex(mixInk(bodyColor, 0.12));
  ctx.fill();

  // 只在下半部保留稀疏網點，臉部與主要染色面保持乾淨。
  ctx.fillStyle = INK_CSS;
  ctx.globalAlpha = 0.22;
  for (let row = 0; row < 5; row++) {
    const y = 64 + row * 5;
    for (let x = 15 + (row % 2) * 2.5; x < 75; x += 5) {
      ctx.beginPath();
      ctx.arc(x, y, 0.75, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  outline();
  ctx.strokeStyle = INK_CSS;
  ctx.lineWidth = 3.4;
  ctx.stroke();

  // 左上短弧是紙面留白，跟隨角色輪廓而非玻璃高光。
  ctx.beginPath();
  ctx.moveTo(21, 32);
  ctx.quadraticCurveTo(25, 24, 35, 23);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.stroke();

  // 兩顆墨滴眼與微微上揚的嘴，在實際遊戲尺寸仍可辨識。
  ctx.fillStyle = INK_CSS;
  for (const x of [31, 52]) {
    ctx.beginPath();
    ctx.ellipse(x, 43, 3.5, 5.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(36, 55);
  ctx.quadraticCurveTo(42, 61, 48, 54);
  ctx.strokeStyle = INK_CSS;
  ctx.lineWidth = 2.6;
  ctx.stroke();

  // 兩側短排線呼應按鈕與平台，不加獨立配件色干擾人格混色。
  ctx.lineWidth = 1.4;
  for (const x of [22, 58]) {
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 3, 51);
      ctx.lineTo(x - 1 + i * 3, 54);
      ctx.stroke();
    }
  }

  canvasTex.refresh();
  return key;
}

/** Canvas texture 不可用時，以同樣的對白框輪廓繪製。 */
function ensureFallbackGraphicsTexture(scene: Phaser.Scene, key: string, bodyColor: number): string {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(bodyColor, 1);
  g.fillRoundedRect(11, 15, 62, 60, 25);
  g.fillTriangle(44, 70, 60, 68, 65, 84);
  g.lineStyle(3.4, 0x141019, 1);
  g.strokeRoundedRect(11, 15, 62, 60, 25);
  g.fillStyle(0x141019, 1);
  g.fillEllipse(31, 43, 7, 12);
  g.fillEllipse(52, 43, 7, 12);
  g.lineBetween(37, 56, 47, 56);
  g.generateTexture(key, TEX_W, TEX_H);
  g.destroy();
  return key;
}
