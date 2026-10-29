import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { DISPLAY_FONT, INK, INK_CSS, MANGA_YELLOW, PAPER, PAPER_CARD, numToHex } from '../theme/manga';

/**
 * 畫面四邊的日式漫畫原稿分鏡框（外框＋內細線＋四角裁切標記＋上下網點漸層）。
 * 不攔截點擊。
 */
export function inkFrame(scene: Phaser.Scene, showCornerTone = true): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setScrollFactor(0).setDepth(40);

  if (showCornerTone) {
    // 四角微妙斜向漫畫網點（スクリーントーン）
    g.fillStyle(INK, 0.065);
    for (let row = 0; row < 7; row++) {
      const r = Math.max(0.8, 2.3 - row * 0.22);
      for (let col = 0; col < 10 - row; col++) {
        const dx = 18 + col * 11 + (row % 2) * 5.5;
        const dy = 18 + row * 11;
        g.fillCircle(dx, dy, r);
        g.fillCircle(GAME.width - dx, GAME.height - dy, r);
      }
    }
  }

  // 外側頁面留白遮罩（確保分鏡外緣乾淨）
  g.lineStyle(8, PAPER, 1);
  g.strokeRect(2, 2, GAME.width - 4, GAME.height - 4);

  // 主分鏡粗墨框（コマ枠）
  g.lineStyle(4.5, INK, 1);
  g.strokeRect(7, 7, GAME.width - 14, GAME.height - 14);

  // 內側雙線裝飾細框
  g.lineStyle(1.2, INK, 0.45);
  g.strokeRect(11, 11, GAME.width - 22, GAME.height - 22);

  // 四角漫畫原稿角標加粗
  g.fillStyle(INK, 1);
  const corners: [number, number, number, number][] = [
    [5, 5, 14, 4],
    [5, 5, 4, 14],
    [GAME.width - 19, 5, 14, 4],
    [GAME.width - 9, 5, 4, 14],
    [5, GAME.height - 9, 14, 4],
    [5, GAME.height - 19, 4, 14],
    [GAME.width - 19, GAME.height - 9, 14, 4],
    [GAME.width - 9, GAME.height - 19, 4, 14],
  ];
  for (const [cx, cy, cw, ch] of corners) {
    g.fillRect(cx, cy, cw, ch);
  }

  return g;
}

/** 繪製漸層漫畫網點帶（スクリーントーン）。dir: 'down' 由上往下變淡，'up' 由下往上變淡。 */
export function drawHalftoneBand(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number = INK,
  maxAlpha = 0.14,
  dir: 'down' | 'up' = 'down',
  step = 11,
): void {
  const rows = Math.floor(h / step);
  for (let r = 0; r < rows; r++) {
    const t = dir === 'down' ? r / Math.max(1, rows - 1) : 1 - r / Math.max(1, rows - 1);
    const radius = Math.max(0.7, (1 - t * 0.72) * 2.6);
    const alpha = maxAlpha * (1 - t * 0.65);
    g.fillStyle(color, alpha);
    const yy = y + r * step + step * 0.5;
    const offset = (r % 2) * (step * 0.5);
    for (let xx = x + step * 0.5 + offset; xx < x + w - 2; xx += step) {
      g.fillCircle(xx, yy, radius);
    }
  }
}

/** 繪製漫畫分鏡對話框／旁白框（含硬派黑影、粗墨線、選配對話尖角與斜線裝飾）。 */
export function drawMangaSpeechBox(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: {
    fill?: number;
    fillAlpha?: number;
    shadowOffset?: number;
    lineWidth?: number;
    tailX?: number;
    tailDir?: 'down' | 'up';
    tailLen?: number;
    cornerSlash?: boolean;
  } = {},
): void {
  const fill = opts.fill ?? PAPER_CARD;
  const fillAlpha = opts.fillAlpha ?? 1;
  const sh = opts.shadowOffset ?? 4;
  const lw = opts.lineWidth ?? 3;

  // 硬黑立體落影
  if (sh > 0) {
    g.fillStyle(INK, 1);
    g.fillRect(x + sh, y + sh, w, h);
  }

  // 本體底色
  g.fillStyle(fill, fillAlpha);
  g.fillRect(x, y, w, h);

  // 右下角漫畫排線裝飾（カケアミ風斜線）
  if (opts.cornerSlash) {
    g.lineStyle(1.5, INK, 0.14);
    for (let i = 0; i < 4; i++) {
      const d = 10 + i * 6;
      g.lineBetween(x + w - d, y + h - 2, x + w - 2, y + h - d);
    }
  }

  // 粗墨框
  g.lineStyle(lw, INK, 1);
  g.strokeRect(x, y, w, h);

  // 對白框尖角（吹き出しのしっぽ）
  if (opts.tailX !== undefined) {
    const tx = Phaser.Math.Clamp(opts.tailX, x + 16, x + w - 16);
    const dir = opts.tailDir ?? 'down';
    const len = opts.tailLen ?? 10;
    const baseY = dir === 'down' ? y + h : y;
    const tipY = dir === 'down' ? baseY + len : baseY - len;

    if (sh > 0) {
      g.fillStyle(INK, 1);
      g.beginPath();
      g.moveTo(tx - 6 + sh, baseY + sh);
      g.lineTo(tx + 6 + sh, baseY + sh);
      g.lineTo(tx + sh, tipY + sh);
      g.closePath();
      g.fillPath();
    }

    g.fillStyle(fill, 1);
    g.beginPath();
    g.moveTo(tx - 7, baseY + (dir === 'down' ? -2 : 2));
    g.lineTo(tx + 7, baseY + (dir === 'down' ? -2 : 2));
    g.lineTo(tx, tipY);
    g.closePath();
    g.fillPath();

    g.lineStyle(lw, INK, 1);
    g.beginPath();
    g.moveTo(tx - 6, baseY);
    g.lineTo(tx, tipY);
    g.lineTo(tx + 6, baseY);
    g.strokePath();
  }
}

/** 上昇時貼在左右緣的漫畫集中流線（スピード線）。速度不夠就清空。 */
export class MangaSpeedLines {
  private readonly g: Phaser.GameObjects.Graphics;
  private tick = 0;

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(7);
  }

  draw(vy: number, reduced: boolean): void {
    this.g.clear();
    if (reduced || vy > -260) return;
    this.tick++;
    const power = Phaser.Math.Clamp((-vy - 260) / 620, 0, 1);
    const phase = Math.floor(this.tick / 2) % 3;

    for (let i = 0; i < 11; i++) {
      const seed = (i * 7 + phase * 3) % 11;
      const y = 24 + i * 68 + (seed % 3) * 9;
      const len = 36 + power * (80 + (seed % 4) * 28);
      const xOff = 10 + (seed % 3) * 5;
      const thick = (i + phase) % 3 === 0 ? 3 : 1.6;
      const alpha = 0.14 + power * ((i % 2 === 0 ? 0.42 : 0.25));

      this.g.lineStyle(thick, INK, alpha);
      this.g.lineBetween(xOff, y, xOff, y + len);
      this.g.lineBetween(GAME.width - xOff, y + 26, GAME.width - xOff, y + 26 + len);
    }
  }
}

const HOPS = ['タンッ!', 'ポンッ!', 'タッ!', 'ドン!'];

/** 普通台階落地：尖銳漫畫星芒＋傾斜擬聲詞（描き文字）。 */
export function popHop(scene: Phaser.Scene, x: number, y: number, n: number): void {
  const g = scene.add.graphics().setPosition(x, y - 4).setDepth(18);
  // 漫畫小爆發星芒
  g.fillStyle(MANGA_YELLOW, 1);
  g.lineStyle(2, INK, 1);
  g.beginPath();
  const spikes = 8;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? 22 : 9;
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r * 0.55;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
  g.fillPath();
  g.strokePath();

  const tilt = (n % 2 === 0 ? -1 : 1) * (8 + (n % 3) * 3);
  const label = scene.add
    .text(x + (n % 2 === 0 ? -8 : 8), y - 20, HOPS[Math.abs(n) % HOPS.length], {
      fontFamily: DISPLAY_FONT,
      fontSize: '19px',
      color: INK_CSS,
      stroke: '#ffffff',
      strokeThickness: 5,
    })
    .setOrigin(0.5)
    .setAngle(tilt)
    .setDepth(18.1);

  scene.tweens.add({
    targets: g,
    scaleX: 1.35,
    scaleY: 1.35,
    alpha: 0,
    duration: 260,
    ease: 'Quad.easeOut',
    onComplete: () => g.destroy(),
  });
  scene.tweens.add({
    targets: label,
    y: y - 58,
    scale: { from: 0.75, to: 1.08 },
    alpha: 0,
    duration: 380,
    ease: 'Cubic.easeOut',
    onComplete: () => label.destroy(),
  });
}

/** 答題落地：漫畫ウニフラッシュ爆發＋立體字母效果字砸出。 */
export function popLetter(
  scene: Phaser.Scene,
  x: number,
  y: number,
  letter: string,
  color: number,
): void {
  const burst = scene.add.graphics().setPosition(x, y - 34).setDepth(17.9).setScale(0.3);
  drawInkBurst(burst, 0, 0, 16, 48, 12, MANGA_YELLOW, 0.75);

  const label = scene.add
    .text(x, y - 34, letter, {
      fontFamily: DISPLAY_FONT,
      fontSize: '46px',
      color: numToHex(color),
      stroke: INK_CSS,
      strokeThickness: 8,
    })
    .setOrigin(0.5)
    .setAngle(-8)
    .setDepth(18.2)
    .setScale(0.3);

  const sfx = scene.add
    .text(x + 28, y - 56, 'ズバッ!', {
      fontFamily: DISPLAY_FONT,
      fontSize: '14px',
      color: '#ffffff',
      stroke: INK_CSS,
      strokeThickness: 4,
    })
    .setOrigin(0.5)
    .setAngle(12)
    .setDepth(18.3);

  scene.tweens.add({
    targets: burst,
    scale: 1.15,
    alpha: 0,
    duration: 340,
    ease: 'Cubic.easeOut',
    onComplete: () => burst.destroy(),
  });
  scene.tweens.add({
    targets: [label, sfx],
    scale: 1,
    y: '-=36',
    duration: 180,
    ease: 'Back.easeOut',
    onComplete: () => {
      scene.tweens.add({
        targets: [label, sfx],
        alpha: 0,
        y: '-=22',
        duration: 240,
        delay: 100,
        onComplete: () => {
          label.destroy();
          sfx.destroy();
        },
      });
    },
  });
}

/**
 * 日式漫畫放射爆炸框（ウニフラッシュ／叫び枠）。
 * 長短交錯尖刺＋黑墨粗外框＋內側速度集中線。
 */
export function drawInkBurst(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  inner: number,
  outer: number,
  spikes: number,
  fill: number,
  aspectY = 0.64,
): void {
  const total = spikes * 2;
  // 立體墨影
  g.fillStyle(INK, 1);
  g.beginPath();
  for (let i = 0; i < total; i++) {
    const isTip = i % 2 === 0;
    const alt = (i / 2) % 2 === 0 ? 1 : 0.88;
    const r = (isTip ? outer * alt : inner) + 3;
    const a = (i / total) * Math.PI * 2 - Math.PI / 2;
    const x = cx + 4 + Math.cos(a) * r;
    const y = cy + 4 + Math.sin(a) * r * aspectY;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.fillPath();

  // 主填色
  g.fillStyle(fill, 1);
  g.beginPath();
  for (let i = 0; i < total; i++) {
    const isTip = i % 2 === 0;
    const alt = (i / 2) % 2 === 0 ? 1 : 0.88;
    const r = isTip ? outer * alt : inner;
    const a = (i / total) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r * aspectY;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.fillPath();
  g.lineStyle(3.2, INK, 1);
  g.strokePath();

  // 內圈漫畫速度細刺線
  g.lineStyle(1.4, INK, 0.35);
  for (let i = 0; i < spikes; i++) {
    const a = (i / spikes) * Math.PI * 2;
    const r0 = inner * 0.72;
    const r1 = inner * 1.05;
    g.lineBetween(
      cx + Math.cos(a) * r0,
      cy + Math.sin(a) * r0 * aspectY,
      cx + Math.cos(a) * r1,
      cy + Math.sin(a) * r1 * aspectY,
    );
  }
}
