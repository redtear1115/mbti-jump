import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import type { Letter } from '../config/questions';
import { LETTER_COLORS } from '../theme/palette';
import { BODY_FONT, DISPLAY_FONT, INK, INK_CSS, PAPER_CARD, mixInk, mixWhite, numToHex } from '../theme/manga';
import { drawMangaSpeechBox } from '../gfx/mangaFx';

export type PlatformKind = 'normal' | 'question';

const VISUAL_H = 26;

export class Platform extends Phaser.Physics.Arcade.Sprite {
  kind: PlatformKind = 'normal';
  side?: Letter;
  questionId?: string;
  label?: Phaser.GameObjects.Text;
  plate?: Phaser.GameObjects.Graphics;

  static makeNormal(scene: Phaser.Scene, x: number, y: number, width: number = GAME.platformWidth): Platform {
    const w = Math.round(width);
    const key = ensureMangaBlock(scene, `platform-manga-n-${w}`, w, null);
    const p = new Platform(scene, x, y, key);
    p.kind = 'normal';
    fitBody(p, w);
    return p;
  }

  static makeQuestion(
    scene: Phaser.Scene,
    x: number,
    y: number,
    opts: { side: Letter; questionId: string; label: string; isYes: boolean },
  ): Platform {
    const color = LETTER_COLORS[opts.side];
    const key = ensureMangaBlock(scene, `platform-manga-q-${opts.side}`, GAME.platformWidth, color);
    const p = new Platform(scene, x, y, key);
    p.kind = 'question';
    p.side = opts.side;
    p.questionId = opts.questionId;
    fitBody(p, GAME.platformWidth);

    // 漫畫對白框（吹き出し）懸浮於問題台階上方，帶指向尖角與字母印章
    const labelLift = 28;
    const label = scene.add
      .text(x, y - labelLift, opts.label, {
        fontFamily: BODY_FONT,
        fontSize: '16px',
        fontStyle: 'bold',
        color: INK_CSS,
        align: 'center',
        wordWrap: { width: GAME.platformWidth + 46, useAdvancedWrap: true },
      })
      .setOrigin(0.5, 1)
      .setDepth(6.2);

    const pw = Math.max(76, label.width + 24);
    const ph = label.height + 14;
    const bx = x - pw / 2;
    const by = label.y - ph + 6;

    const plate = scene.add.graphics().setDepth(5.8);
    drawMangaSpeechBox(plate, bx, by, pw, ph, {
      fill: PAPER_CARD,
      shadowOffset: 4,
      lineWidth: 2.8,
      tailX: x,
      tailDir: 'down',
      tailLen: 9,
      cornerSlash: true,
    });

    // 頂部彩色色帶條（一眼辨識選項色）
    plate.fillStyle(color, 1);
    plate.fillRect(bx + 2, by + 2, pw - 4, 4);

    // 左上角漫畫字母徽章（E/I/S/N/T/F/J/P）
    const badgeX = opts.isYes ? bx - 6 : bx + pw - 16;
    const badgeY = by - 10;
    plate.fillStyle(INK, 1);
    plate.fillRect(badgeX + 2, badgeY + 2, 22, 20);
    plate.fillStyle(color, 1);
    plate.fillRect(badgeX, badgeY, 22, 20);
    plate.lineStyle(2.2, INK, 1);
    plate.strokeRect(badgeX, badgeY, 22, 20);

    scene.add
      .text(badgeX + 11, badgeY + 10, opts.side, {
        fontFamily: DISPLAY_FONT,
        fontSize: '13px',
        color: numToHex(INK),
        stroke: '#ffffff',
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(6.3);

    p.label = label;
    p.plate = plate;
    return p;
  }

  private constructor(scene: Phaser.Scene, x: number, y: number, key: string) {
    super(scene, x, y, key);
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body
  }
}

/** 碰撞維持原本的薄台階，貼圖含漫畫立體厚度與落影。 */
function fitBody(p: Platform, width: number): void {
  const body = p.body as Phaser.Physics.Arcade.StaticBody;
  body.setSize(width, GAME.platformHeight);
}

/**
 * 繪製日式漫畫立體分鏡磚塊（含硬黑落影、賽璐珞立體底層、斜排線陰影與粗墨框）。
 */
function ensureMangaBlock(scene: Phaser.Scene, key: string, width: number, accent: number | null): string {
  if (scene.textures.exists(key)) return key;
  const texW = width + 6;
  const texH = VISUAL_H;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  const mainFill = accent !== null ? accent : 0xfffdf7;
  const topHighlight = accent !== null ? mixWhite(accent, 0.38) : 0xffffff;
  const bottomBevel = accent !== null ? mixInk(accent, 0.28) : 0xe4dccb;

  const bx = 2;
  const by = 2;
  const bw = width;
  const bh = 18;

  // 1. 硬派墨黑立體底影
  g.fillStyle(INK, 1);
  g.fillRect(bx + 3, by + 4, bw, bh);

  // 2. 磚塊主體色
  g.fillStyle(mainFill, 1);
  g.fillRect(bx, by, bw, bh);

  // 3. 頂部賽璐珞高光帶
  g.fillStyle(topHighlight, 1);
  g.fillRect(bx + 2, by + 2, bw - 4, 4);

  // 4. 底部立體斜切暗面
  g.fillStyle(bottomBevel, 1);
  g.fillRect(bx + 2, by + bh - 6, bw - 4, 5);

  // 5. 右側漫畫排線（カケアミ斜線）
  g.lineStyle(1.6, INK, accent !== null ? 0.35 : 0.22);
  const slashCount = Math.min(6, Math.floor(bw / 16));
  for (let i = 0; i < slashCount; i++) {
    const sx = bx + bw - 10 - i * 7;
    g.lineBetween(sx, by + bh - 6, sx - 4, by + bh - 1);
  }

  // 6. 粗墨線外框＋中段分界細線
  g.lineStyle(3, INK, 1);
  g.strokeRect(bx, by, bw, bh);
  g.lineStyle(1.5, INK, 0.35);
  g.lineBetween(bx + 2, by + bh - 6, bx + bw - 2, by + bh - 6);

  g.generateTexture(key, texW, texH);
  g.destroy();
  return key;
}
