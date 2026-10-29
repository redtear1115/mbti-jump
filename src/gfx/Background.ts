import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { INK, MANGA_RED, MANGA_YELLOW, PAPER_CARD } from '../theme/manga';
import { prefersReducedMotion } from '../ui/reducedMotion';

/**
 * 日式漫畫分鏡背景。固定貼在鏡頭上、畫在台階後面。
 * 全部採用清晰向量筆觸與程序貼圖繪製（零模糊點陣圖、零白邊）：
 * - 第 0 章（E/I）：少年漫晴空太陽＋排線雲朵
 * - 第 1 章（S/N）：少女漫櫻吹雪＋閃亮十字星芒＋夢幻泡泡網點
 * - 第 2 章（T/F）：青年漫層雲＋斜向雨線（アメ線）
 * - 第 3 章（J/P）：熱血終章放射集中線（ベタフラッシュ）＋上升星火
 */
export class Background {
  private scene: Phaser.Scene;
  private reduced: boolean;
  private plate: Phaser.GameObjects.Graphics;
  private decor: Phaser.GameObjects.GameObject[] = [];
  private current?: number;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.reduced = prefersReducedMotion();
    this.plate = scene.add.graphics().setScrollFactor(0).setDepth(-9);
    ensureDecorTextures(scene);
  }

  setDimension(dimIndex: number): void {
    if (dimIndex === this.current) return;
    this.current = dimIndex;
    this.clearDecor();
    this.drawPlate(dimIndex % 4);
    this.spawnDecor(dimIndex % 4);
  }

  update(_scrollY: number): void {
    /* 裝飾以 tween 驅動 */
  }

  private clearDecor(): void {
    for (const o of this.decor) {
      this.scene.tweens.killTweensOf(o);
      o.destroy();
    }
    this.decor = [];
  }

  private drawPlate(dim: number): void {
    const g = this.plate;
    g.clear();

    // 背景斜切分鏡輔助框線（コマ割り風）
    g.lineStyle(1.5, INK, 0.08);
    g.lineBetween(12, 165, GAME.width - 12, 130);
    g.lineBetween(12, 480, GAME.width - 12, 520);

    if (dim === 0) this.drawSunChapter(g);
    else if (dim === 1) this.drawShojoChapter(g);
    else if (dim === 2) this.drawRainChapter(g);
    else this.drawClimaxChapter(g);
  }

  /** 第 0 章：漫畫烈日與放射光線。 */
  private drawSunChapter(g: Phaser.GameObjects.Graphics): void {
    const sx = 368;
    const sy = 96;
    // 太陽外圍放射漫畫線
    g.lineStyle(2.2, INK, 0.16);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const r0 = 44;
      const r1 = i % 2 === 0 ? 110 : 72;
      g.lineBetween(sx + Math.cos(a) * r0, sy + Math.sin(a) * r0, sx + Math.cos(a) * r1, sy + Math.sin(a) * r1);
    }
    // 太陽本體（立體黑影＋黃底＋粗墨框）
    g.fillStyle(INK, 0.9);
    g.fillCircle(sx + 3, sy + 3, 34);
    g.fillStyle(MANGA_YELLOW, 1);
    g.fillCircle(sx, sy, 34);
    g.lineStyle(3, INK, 1);
    g.strokeCircle(sx, sy, 34);
    // 太陽內部漫畫排線陰影
    g.lineStyle(1.5, INK, 0.25);
    for (let i = -3; i <= 3; i++) {
      g.lineBetween(sx + 8 + i * 3, sy + 18 - Math.abs(i) * 2, sx + 18 + i * 3, sy + 26 - Math.abs(i) * 2);
    }
  }

  /** 第 1 章：少女漫畫夢幻泡泡網點（丸アミ）與星芒。 */
  private drawShojoChapter(g: Phaser.GameObjects.Graphics): void {
    const bubbles: [number, number, number][] = [
      [74, 110, 38],
      [96, 138, 22],
      [378, 170, 44],
      [352, 206, 24],
      [68, 330, 30],
      [386, 390, 34],
    ];
    for (const [bx, by, br] of bubbles) {
      g.fillStyle(0xffffff, 0.55);
      g.fillCircle(bx, by, br);
      g.lineStyle(1.8, INK, 0.16);
      g.strokeCircle(bx, by, br);
    }
    // 靜態大十字星芒
    const stars: [number, number, number][] = [
      [118, 92, 14],
      [338, 130, 12],
      [92, 286, 11],
      [364, 340, 15],
    ];
    for (const [sx, sy, sr] of stars) {
      drawFourPointStar(g, sx, sy, sr, MANGA_YELLOW);
    }
  }

  /** 第 2 章：青年漫畫陰雨層雲與垂直速度線。 */
  private drawRainChapter(g: Phaser.GameObjects.Graphics): void {
    // 頂部厚重排線烏雲帶
    const clouds: [number, number, number, number][] = [
      [90, 64, 150, 48],
      [225, 56, 180, 54],
      [365, 68, 140, 46],
    ];
    for (const [cx, cy, cw, ch] of clouds) {
      g.fillStyle(INK, 0.12);
      g.fillEllipse(cx + 3, cy + 4, cw, ch);
      g.fillStyle(0xdbe4ee, 0.85);
      g.fillEllipse(cx, cy, cw, ch);
      g.lineStyle(2.4, INK, 0.55);
      g.strokeEllipse(cx, cy, cw, ch);
      // 雲底漫畫垂直排線
      g.lineStyle(1.2, INK, 0.22);
      for (let x = cx - cw * 0.35; x <= cx + cw * 0.35; x += 7) {
        g.lineBetween(x, cy + 4, x, cy + ch * 0.38);
      }
    }
  }

  /** 第 3 章：少年漫畫終局放射集中線（ベタフラッシュ）。 */
  private drawClimaxChapter(g: Phaser.GameObjects.Graphics): void {
    const cx = GAME.width / 2;
    const cy = 220;
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const inner = 135 + (i % 3) * 28;
      const outer = 620;
      g.lineStyle(i % 2 === 0 ? 2.4 : 1.2, INK, i % 2 === 0 ? 0.16 : 0.1);
      g.lineBetween(
        cx + Math.cos(a) * inner,
        cy + Math.sin(a) * inner,
        cx + Math.cos(a) * outer,
        cy + Math.sin(a) * outer,
      );
    }
  }

  private spawnDecor(dim: number): void {
    if (dim === 0) this.spawnClouds();
    else if (dim === 1) this.spawnPetals();
    else if (dim === 2) this.spawnRain();
    else this.spawnSparks();
  }

  private track(obj: Phaser.GameObjects.GameObject): void {
    this.decor.push(obj);
  }

  private spawnClouds(): void {
    const ys = [128, 232, 340];
    ys.forEach((y, i) => {
      const dir = i % 2 === 0 ? 1 : -1;
      const startX = dir > 0 ? -60 : GAME.width + 60;
      const endX = dir > 0 ? GAME.width + 60 : -60;
      const cloud = this.scene.add
        .image(this.reduced ? 90 + i * 130 : startX, y, 'manga-decor-cloud')
        .setScale(0.85 + (i % 2) * 0.15)
        .setAlpha(0.88)
        .setScrollFactor(0)
        .setDepth(-8);
      this.track(cloud);
      if (this.reduced) return;
      this.scene.tweens.add({
        targets: cloud,
        x: endX,
        duration: 17000 + i * 3200,
        repeat: -1,
        delay: i * 1600,
      });
    });
  }

  private spawnPetals(): void {
    const n = this.reduced ? 5 : 10;
    for (let i = 0; i < n; i++) {
      const x = Phaser.Math.Between(24, GAME.width - 24);
      const petal = this.scene.add
        .image(x, this.reduced ? 80 + i * 65 : Phaser.Math.Between(-40, GAME.height), 'manga-decor-petal')
        .setScale(0.75 + (i % 3) * 0.15)
        .setScrollFactor(0)
        .setDepth(-8)
        .setAngle(Phaser.Math.Between(-35, 35));
      this.track(petal);
      if (this.reduced) continue;
      this.scene.tweens.add({
        targets: petal,
        y: GAME.height + 24,
        x: x + Phaser.Math.Between(-50, 50),
        angle: petal.angle + Phaser.Math.Between(-90, 90),
        duration: Phaser.Math.Between(6500, 11000),
        repeat: -1,
        delay: i * 380,
      });
    }
  }

  private spawnRain(): void {
    const n = this.reduced ? 6 : 20;
    for (let i = 0; i < n; i++) {
      const x = Phaser.Math.Between(10, GAME.width - 10);
      const drop = this.scene.add
        .image(x, this.reduced ? 90 + i * 80 : Phaser.Math.Between(-30, GAME.height), 'manga-decor-rain')
        .setScrollFactor(0)
        .setDepth(-8)
        .setAlpha(0.65);
      this.track(drop);
      if (this.reduced) continue;
      this.scene.tweens.add({
        targets: drop,
        y: GAME.height + 30,
        x: x - 48,
        duration: Phaser.Math.Between(650, 980),
        repeat: -1,
        delay: i * 55,
      });
    }
  }

  private spawnSparks(): void {
    const n = this.reduced ? 5 : 9;
    for (let i = 0; i < n; i++) {
      const spark = this.scene.add
        .image(
          Phaser.Math.Between(34, GAME.width - 34),
          Phaser.Math.Between(56, GAME.height - 200),
          'manga-decor-spark',
        )
        .setScale(0.7 + (i % 3) * 0.2)
        .setScrollFactor(0)
        .setDepth(-8)
        .setAlpha(0.85);
      this.track(spark);
      if (this.reduced) continue;
      this.scene.tweens.add({
        targets: spark,
        alpha: 0.2,
        scale: 0.45,
        angle: 45,
        duration: Phaser.Math.Between(650, 1250),
        yoyo: true,
        repeat: -1,
      });
    }
  }
}

function drawFourPointStar(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  r: number,
  fill: number,
): void {
  g.fillStyle(fill, 1);
  g.lineStyle(2, INK, 1);
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const rad = i % 2 === 0 ? r : r * 0.28;
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.fillPath();
  g.strokePath();
}

/** 生成無白邊、純漫畫墨線風格的背景裝飾貼圖（雲、櫻花瓣、雨絲、星芒）。 */
function ensureDecorTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists('manga-decor-cloud')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // 漫畫雲：平坦底部＋圓弧頂＋排線底影
    g.fillStyle(INK, 1);
    g.fillCircle(30, 34, 17);
    g.fillCircle(52, 26, 22);
    g.fillCircle(78, 33, 18);
    g.fillRoundedRect(16, 28, 76, 22, 10);

    g.fillStyle(PAPER_CARD, 1);
    g.fillCircle(30, 33, 14.5);
    g.fillCircle(52, 25, 19.5);
    g.fillCircle(78, 32, 15.5);
    g.fillRoundedRect(18, 28, 72, 19, 8);

    // 雲底漫畫斜排線
    g.lineStyle(1.5, INK, 0.28);
    for (let x = 24; x <= 82; x += 6) {
      g.lineBetween(x, 41, x - 3, 46);
    }
    g.generateTexture('manga-decor-cloud', 110, 56);
    g.destroy();
  }

  if (!scene.textures.exists('manga-decor-petal')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // 櫻花瓣（帶缺口與墨線）
    g.fillStyle(0xffb3c6, 1);
    g.lineStyle(2.2, INK, 1);
    g.beginPath();
    g.moveTo(14, 24);
    g.lineTo(5, 12);
    g.lineTo(10, 4);
    g.lineTo(14, 9);
    g.lineTo(18, 4);
    g.lineTo(23, 12);
    g.closePath();
    g.fillPath();
    g.strokePath();
    g.generateTexture('manga-decor-petal', 28, 28);
    g.destroy();
  }

  if (!scene.textures.exists('manga-decor-rain')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // 銳利漫畫斜雨線（アメ線）
    g.lineStyle(2, INK, 0.55);
    g.lineBetween(14, 2, 2, 34);
    g.lineStyle(1.2, MANGA_RED, 0.15);
    g.lineBetween(16, 6, 6, 32);
    g.generateTexture('manga-decor-rain', 18, 36);
    g.destroy();
  }

  if (!scene.textures.exists('manga-decor-spark')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    drawFourPointStar(g, 14, 14, 12, MANGA_YELLOW);
    g.generateTexture('manga-decor-spark', 28, 28);
    g.destroy();
  }
}
