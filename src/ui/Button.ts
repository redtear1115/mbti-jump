import Phaser from 'phaser';
import { PALETTE } from '../theme/palette';

export interface ButtonOptions {
  onClick: () => void;
  width?: number;
  height?: number;
  fontSize?: number;
  bg?: number; // 底色
  bgHover?: number; // hover 底色
  bgDown?: number; // 按下底色
  textColor?: string;
  radius?: number;
}

/**
 * 實心圓角按鈕：一致的主要 CTA 樣式 + hover/press 視覺回饋 + ≥44px 可點區。
 * 視覺用圓角 Graphics + 置中文字；輸入用一個 Zone 疊在最上層（矩形命中測試最可靠，
 * 避免 Container 自訂 hitArea 收不到事件的坑）。
 */
export class Button {
  private readonly x: number;
  private readonly y: number;
  private readonly w: number;
  private readonly h: number;
  private readonly radius: number;
  private readonly bg: number;
  private readonly bgHover: number;
  private readonly bgDown: number;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly zone: Phaser.GameObjects.Zone;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, opts: ButtonOptions) {
    this.x = x;
    this.y = y;
    this.w = opts.width ?? 240;
    this.h = Math.max(opts.height ?? 56, 44); // 觸控目標至少 44
    this.radius = opts.radius ?? 14;
    this.bg = opts.bg ?? PALETTE.yes;
    this.bgHover = opts.bgHover ?? 0x49cf82;
    this.bgDown = opts.bgDown ?? 0x2f9d57;

    this.gfx = scene.add.graphics().setDepth(10);
    this.label = scene.add
      .text(x, y, text, {
        fontSize: `${opts.fontSize ?? 24}px`,
        fontStyle: 'bold',
        color: opts.textColor ?? PALETTE.textOn,
        align: 'center',
        fontFamily: 'Fredoka, system-ui, sans-serif',
      })
      .setOrigin(0.5)
      .setDepth(11);
    this.draw(this.bg);

    this.zone = scene.add
      .zone(x, y, this.w, this.h) // Zone 原點預設 (0.5, 0.5)，命中區與視覺對齊
      .setDepth(12)
      .setInteractive({ useHandCursor: true });
    this.zone.on('pointerover', () => this.draw(this.bgHover));
    this.zone.on('pointerout', () => this.draw(this.bg));
    this.zone.on('pointerdown', () => this.draw(this.bgDown));
    this.zone.on('pointerup', () => {
      this.draw(this.bgHover);
      opts.onClick();
    });
  }

  private draw(color: number): void {
    this.gfx.clear();
    this.gfx.fillStyle(color, 1);
    this.gfx.fillRoundedRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h, this.radius);
  }

  setLabel(text: string): this {
    this.label.setText(text);
    return this;
  }
}
