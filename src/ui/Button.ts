import Phaser from 'phaser';
import { PALETTE } from '../theme/palette';
import { INK, MANGA_YELLOW, TITLE_FONT } from '../theme/manga';
import { ensureIconTexture } from './icons';
import type { IconKind } from './icons';

export interface ButtonOptions {
  onClick: () => void;
  width?: number;
  height?: number;
  fontSize?: number;
  bg?: number; // 底色
  bgHover?: number; // hover 底色
  bgDown?: number; // 按下底色
  textColor?: string;
  icon?: IconKind; // 文字左側 16px 向量 icon（tint 同文字色）
}

/**
 * 實心 CTA 按鈕：一致的主要 CTA 樣式 + hover/press 視覺回饋 + ≥44px 可點區。
 * 視覺用漫畫分鏡風平行四邊形 Graphics + 置中文字；輸入用一個 Zone 疊在最上層（矩形命中測試最可靠，
 * 避免 Container 自訂 hitArea 收不到事件的坑）。
 */
export class Button {
  private readonly x: number;
  private readonly y: number;
  private readonly w: number;
  private readonly h: number;
  private readonly bg: number;
  private readonly bgHover: number;
  private readonly bgDown: number;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly zone: Phaser.GameObjects.Zone;
  private icon?: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, opts: ButtonOptions) {
    this.x = x;
    this.y = y;
    this.w = opts.width ?? 240;
    this.h = Math.max(opts.height ?? 56, 44); // 觸控目標至少 44
    this.bg = opts.bg ?? MANGA_YELLOW;
    this.bgHover = opts.bgHover ?? 0xffe670;
    this.bgDown = opts.bgDown ?? 0xf0c41c;

    this.gfx = scene.add.graphics().setDepth(10);
    this.label = scene.add
      .text(x, y, text, {
        fontSize: `${opts.fontSize ?? 24}px`,
        fontStyle: 'bold',
        color: opts.textColor ?? PALETTE.textOn,
        align: 'center',
        fontFamily: TITLE_FONT,
      })
      .setOrigin(0.5)
      .setDepth(11);
    this.draw(this.bg, false);

    if (opts.icon) {
      const tintColor = Phaser.Display.Color.HexStringToColor(opts.textColor ?? PALETTE.textOn).color;
      const iconImg = scene.add
        .image(0, y, ensureIconTexture(scene, opts.icon))
        .setDisplaySize(16, 16)
        .setTint(tintColor)
        .setDepth(11);
      // icon(16) + 間距(6) + 文字：整體置中；帶 icon 的鈕不支援 setLabel 重排
      const totalW = 16 + 6 + this.label.width;
      iconImg.setX(x - totalW / 2 + 8);
      this.icon = iconImg;
      this.label.setOrigin(0, 0.5).setX(x - totalW / 2 + 22);
    }

    this.zone = scene.add
      .zone(x, y, this.w, this.h) // Zone 原點預設 (0.5, 0.5)，命中區與視覺對齊
      .setDepth(12)
      .setInteractive({ useHandCursor: true });
    this.zone.on('pointerover', () => this.draw(this.bgHover, false));
    this.zone.on('pointerout', () => this.draw(this.bg, false));
    this.zone.on('pointerdown', () => this.draw(this.bgDown, true));
    this.zone.on('pointerup', () => {
      this.draw(this.bgHover, false);
      opts.onClick();
    });
  }

  /** 漫畫分鏡風按鈕：微斜平行四邊形＋硬黑落影＋頂部高光帶＋右側排線。按下時下沉吃掉落影。 */
  private draw(color: number, pressed: boolean): void {
    const shift = pressed ? 4 : 0;
    const drop = 5;
    const skew = 8; // 平行四邊形斜度
    const x = this.x - this.w / 2 + shift;
    const y = this.y - this.h / 2 + shift;
    const w = this.w;
    const h = this.h;
    const g = this.gfx;
    const quad = (ox: number, oy: number) => {
      g.beginPath();
      g.moveTo(ox + skew, oy);
      g.lineTo(ox + w, oy);
      g.lineTo(ox + w - skew, oy + h);
      g.lineTo(ox, oy + h);
      g.closePath();
    };
    g.clear();
    if (!pressed) {
      g.fillStyle(INK, 1);
      quad(x + drop, y + drop);
      g.fillPath();
    }
    g.fillStyle(color, 1);
    quad(x, y);
    g.fillPath();
    // 頂部高光帶
    g.fillStyle(0xffffff, 0.35);
    g.beginPath();
    g.moveTo(x + skew + 3, y + 3);
    g.lineTo(x + w - 4, y + 3);
    g.lineTo(x + w - 5, y + 8);
    g.lineTo(x + skew + 2, y + 8);
    g.closePath();
    g.fillPath();
    // 右下排線（カケアミ）
    g.lineStyle(1.6, INK, 0.28);
    for (let i = 0; i < 4; i++) {
      const sx = x + w - skew - 10 - i * 6;
      g.lineBetween(sx, y + h - 3, sx + 6, y + h - 13);
    }
    g.lineStyle(3.2, INK, 1);
    quad(x, y);
    g.strokePath();
    this.label.setY(this.y + shift);
    this.icon?.setY(this.y + shift);
  }

  setLabel(text: string): this {
    this.label.setText(text);
    if (this.icon) {
      const totalW = 16 + 6 + this.label.width;
      this.icon.setX(this.x - totalW / 2 + 8);
      this.label.setX(this.x - totalW / 2 + 22);
    }
    return this;
  }
}
