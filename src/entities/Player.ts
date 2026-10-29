import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { prefersReducedMotion } from '../ui/reducedMotion';
import { PLAYER_BASE_COLOR } from '../core/playerColor';
import { jellyStretch } from '../core/jelly';
import { INK_CSS, MANGA_RED, MANGA_YELLOW, PAPER_CSS, mixInk, mixWhite, numToHex } from '../theme/manga';

const PROC_KEY_PREFIX = 'player-manga-v2-';
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
   * 貼圖比碰撞高，頭與貓耳可以伸出命中框。
   */
  private syncBodySize(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
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
 * 以 2D Canvas 向量貝茲曲線精繪「日式漫畫風圍巾貓主角」：
 * - 外圍白邊貼紙保護圈（在任何網點與速度線背景上都清晰跳出）
 * - G 筆感粗細墨線、賽璐珞雙層陰影、漫畫排線陰影（カケアミ）
 * - 閃亮漫畫大眼、腮紅斜線（///）、紅領巾與金鈴鐺
 * - 毛色隨已鎖定的 MBTI 維度動態混色
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

  const cx = 41;
  const mainHex = numToHex(mixWhite(bodyColor, 0.12));
  const shadeHex = numToHex(mixInk(bodyColor, 0.22));
  const deepHex = numToHex(mixInk(bodyColor, 0.42));
  const highlightHex = numToHex(mixWhite(bodyColor, 0.68));
  const scarfRed = numToHex(MANGA_RED);
  const bellGold = numToHex(MANGA_YELLOW);

  // 定義頭與貓耳閉合路徑
  const traceHeadPath = () => {
    ctx.beginPath();
    // 頭頂中央偏左起點
    ctx.moveTo(cx - 10, 21);
    // 左貓耳外緣 → 耳尖 → 內緣
    ctx.quadraticCurveTo(cx - 21, 14, cx - 25, 8);
    ctx.quadraticCurveTo(cx - 28, 19, cx - 23, 31);
    // 左臉頰毛絨弧線
    ctx.bezierCurveTo(cx - 30, 39, cx - 29, 53, cx - 17, 57);
    // 下巴弧線
    ctx.quadraticCurveTo(cx, 61, cx + 17, 57);
    // 右臉頰毛絨弧線
    ctx.bezierCurveTo(cx + 29, 53, cx + 30, 39, cx + 23, 31);
    // 右貓耳
    ctx.quadraticCurveTo(cx + 28, 19, cx + 25, 8);
    ctx.quadraticCurveTo(cx + 21, 14, cx + 10, 21);
    // 頭頂弧線
    ctx.quadraticCurveTo(cx, 19, cx - 10, 21);
    ctx.closePath();
  };

  // 定義身體與雙腳閉合路徑
  const traceBodyPath = () => {
    ctx.beginPath();
    ctx.moveTo(cx - 14, 54);
    // 左小手
    ctx.quadraticCurveTo(cx - 25, 60, cx - 22, 70);
    ctx.quadraticCurveTo(cx - 18, 72, cx - 15, 67);
    // 左腿與腳掌
    ctx.quadraticCurveTo(cx - 16, 78, cx - 13, 84);
    ctx.quadraticCurveTo(cx - 7, 86, cx - 4, 79);
    // 胯下
    ctx.quadraticCurveTo(cx, 78, cx + 4, 79);
    // 右腿與腳掌
    ctx.quadraticCurveTo(cx + 7, 86, cx + 13, 84);
    ctx.quadraticCurveTo(cx + 16, 78, cx + 15, 67);
    // 右小手
    ctx.quadraticCurveTo(cx + 18, 72, cx + 22, 70);
    ctx.quadraticCurveTo(cx + 25, 60, cx + 14, 54);
    ctx.closePath();
  };

  // 1. 貼紙外白框（讓角色在漫畫背景與速度線前永遠鮮明）
  ctx.save();
  ctx.strokeStyle = PAPER_CSS;
  ctx.lineWidth = 8.5;
  traceBodyPath();
  ctx.stroke();
  traceHeadPath();
  ctx.stroke();
  ctx.restore();

  // 2. 翹尾巴（右側探出）
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx + 12, 73);
  ctx.bezierCurveTo(cx + 28, 72, cx + 36, 56, cx + 30, 48);
  ctx.bezierCurveTo(cx + 26, 44, cx + 21, 52, cx + 23, 60);
  ctx.quadraticCurveTo(cx + 21, 67, cx + 12, 70);
  ctx.closePath();
  ctx.fillStyle = shadeHex;
  ctx.fill();
  ctx.lineWidth = 3.4;
  ctx.strokeStyle = INK_CSS;
  ctx.stroke();
  ctx.restore();

  // 3. 身體填色＋賽璐珞陰影＋漫畫排線
  ctx.save();
  traceBodyPath();
  ctx.fillStyle = mainHex;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // 右下側賽璐珞陰影塊
  ctx.fillStyle = shadeHex;
  ctx.beginPath();
  ctx.arc(cx + 8, 72, 20, 0, Math.PI * 2);
  ctx.fill();
  // 肚子亮白毛區
  ctx.fillStyle = highlightHex;
  ctx.beginPath();
  ctx.ellipse(cx - 2, 68, 8.5, 9.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = 3.6;
  ctx.strokeStyle = INK_CSS;
  traceBodyPath();
  ctx.stroke();
  ctx.restore();

  // 4. 紅色漫畫領巾＋飄帶＋金鈴鐺
  ctx.save();
  // 右側飄起的小領巾尾
  ctx.beginPath();
  ctx.moveTo(cx + 10, 56);
  ctx.quadraticCurveTo(cx + 26, 54, cx + 29, 62);
  ctx.quadraticCurveTo(cx + 21, 65, cx + 11, 61);
  ctx.closePath();
  ctx.fillStyle = scarfRed;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK_CSS;
  ctx.stroke();

  // 領巾本體
  ctx.beginPath();
  ctx.ellipse(cx, 57.5, 16.5, 5.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = scarfRed;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK_CSS;
  ctx.stroke();

  // 金色小鈴鐺
  ctx.beginPath();
  ctx.arc(cx, 62, 4.4, 0, Math.PI * 2);
  ctx.fillStyle = bellGold;
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = INK_CSS;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 2.5, 62.5);
  ctx.lineTo(cx + 2.5, 62.5);
  ctx.stroke();
  ctx.restore();

  // 5. 頭部填色＋賽璐珞分層＋漫畫排線
  ctx.save();
  traceHeadPath();
  ctx.fillStyle = mainHex;
  ctx.fill();

  ctx.save();
  ctx.clip();
  // 頭頂與雙耳染色漸層塊（隨人格色更明顯）
  ctx.fillStyle = shadeHex;
  ctx.beginPath();
  ctx.ellipse(cx - 20, 18, 12, 14, -0.2, 0, Math.PI * 2);
  ctx.ellipse(cx + 20, 18, 12, 14, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // 右下臉頰賽璐珞陰影
  ctx.fillStyle = shadeHex;
  ctx.beginPath();
  ctx.arc(cx + 18, 46, 16, 0, Math.PI * 2);
  ctx.fill();

  // 左上額頭高光斑
  ctx.fillStyle = highlightHex;
  ctx.beginPath();
  ctx.ellipse(cx - 10, 27, 8, 4.2, -0.35, 0, Math.PI * 2);
  ctx.fill();

  // 右臉頰漫畫斜排線（カケアミ）
  ctx.strokeStyle = INK_CSS;
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + 18 + i * 3, 50 - i * 2);
    ctx.lineTo(cx + 22 + i * 3, 54 - i * 2);
    ctx.stroke();
  }
  ctx.restore();

  // 耳窩內粉紅／深色三角
  const drawInnerEar = (dir: -1 | 1) => {
    ctx.beginPath();
    ctx.moveTo(cx + dir * 13, 22);
    ctx.lineTo(cx + dir * 22, 12);
    ctx.lineTo(cx + dir * 20, 26);
    ctx.closePath();
    ctx.fillStyle = '#ff9eb0';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = INK_CSS;
    ctx.stroke();
  };
  drawInnerEar(-1);
  drawInnerEar(1);

  // 頭部粗墨外框
  ctx.lineWidth = 3.8;
  ctx.strokeStyle = INK_CSS;
  traceHeadPath();
  ctx.stroke();

  // 頭頂呆毛（アホ毛）
  ctx.beginPath();
  ctx.moveTo(cx - 1, 20);
  ctx.quadraticCurveTo(cx - 6, 9, cx + 5, 7);
  ctx.quadraticCurveTo(cx + 2, 14, cx + 3, 20);
  ctx.fillStyle = shadeHex;
  ctx.fill();
  ctx.lineWidth = 2.8;
  ctx.strokeStyle = INK_CSS;
  ctx.stroke();

  // 額頭小虎斑／漫畫十字星記號
  ctx.fillStyle = deepHex;
  ctx.beginPath();
  ctx.moveTo(cx, 22.5);
  ctx.lineTo(cx + 2.2, 26);
  ctx.lineTo(cx, 29.5);
  ctx.lineTo(cx - 2.2, 26);
  ctx.closePath();
  ctx.fill();

  // 6. 日式漫畫閃亮大眼
  const drawMangaEye = (ex: number, dir: -1 | 1) => {
    // 眼白微底
    ctx.beginPath();
    ctx.ellipse(ex, 39.5, 6.2, 7.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = INK_CSS;
    ctx.stroke();

    // 濃墨瞳孔
    ctx.beginPath();
    ctx.ellipse(ex - dir * 0.5, 40, 4.7, 5.8, 0, 0, Math.PI * 2);
    ctx.fillStyle = INK_CSS;
    ctx.fill();

    // 下緣人格色反光月牙
    ctx.beginPath();
    ctx.arc(ex - dir * 0.5, 41.2, 3.2, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.strokeStyle = mainHex;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // 左上大高光＋右下小星點
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex - 1.8, 37.2, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex + 1.6, 42.2, 1.0, 0, Math.PI * 2);
    ctx.fill();

    // 上眼瞼加粗睫毛線
    ctx.beginPath();
    ctx.arc(ex, 39, 6.4, 1.12 * Math.PI, 1.88 * Math.PI);
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = INK_CSS;
    ctx.stroke();
  };
  drawMangaEye(cx - 10.5, -1);
  drawMangaEye(cx + 10.5, 1);

  // 7. 漫畫風斜線腮紅（///）
  ctx.strokeStyle = '#ff6b8b';
  ctx.lineWidth = 1.8;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(cx - 17 + i * 2.6, 46);
    ctx.lineTo(cx - 19 + i * 2.6, 49.2);
    ctx.moveTo(cx + 19 + i * 2.6, 46);
    ctx.lineTo(cx + 17 + i * 2.6, 49.2);
    ctx.stroke();
  }

  // 8. 倒三角小貓鼻＋元氣開口笑（ω＋小虎牙感）
  ctx.fillStyle = INK_CSS;
  ctx.beginPath();
  ctx.moveTo(cx - 2.4, 43.2);
  ctx.lineTo(cx + 2.4, 43.2);
  ctx.lineTo(cx, 45.8);
  ctx.closePath();
  ctx.fill();

  // 開口笑舌頭底
  ctx.beginPath();
  ctx.arc(cx, 48.2, 4.2, 0, Math.PI);
  ctx.fillStyle = '#ff7892';
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = INK_CSS;
  ctx.stroke();

  // ω 貓嘴上唇遮罩與墨線
  ctx.fillStyle = mainHex;
  ctx.fillRect(cx - 5.5, 45.2, 11, 3.2);
  ctx.beginPath();
  ctx.moveTo(cx - 5.5, 47.2);
  ctx.quadraticCurveTo(cx - 2.6, 50.2, cx, 46.8);
  ctx.quadraticCurveTo(cx + 2.6, 50.2, cx + 5.5, 47.2);
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = INK_CSS;
  ctx.stroke();

  // 9. 左右貓鬍鬚（ピンと張ったヒゲ）
  ctx.lineWidth = 2.1;
  ctx.strokeStyle = INK_CSS;
  ctx.beginPath();
  ctx.moveTo(cx - 21, 43);
  ctx.lineTo(cx - 29, 41);
  ctx.moveTo(cx - 21, 47);
  ctx.lineTo(cx - 29, 48.5);
  ctx.moveTo(cx + 21, 43);
  ctx.lineTo(cx + 29, 41);
  ctx.moveTo(cx + 21, 47);
  ctx.lineTo(cx + 29, 48.5);
  ctx.stroke();

  ctx.restore();
  canvasTex.refresh();
  return key;
}

/** 無 Canvas 2D 環境時的 Graphics 退路。 */
function ensureFallbackGraphicsTexture(scene: Phaser.Scene, key: string, bodyColor: number): string {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(bodyColor, 1);
  g.fillCircle(42, 46, 26);
  g.generateTexture(key, TEX_W, TEX_H);
  g.destroy();
  return key;
}
