import Phaser from 'phaser';

export type IconKind = 'trophy' | 'lock' | 'chart';

/** 程式繪製 24×24 白色 icon texture（使用端 setTint 上色）。同 kind 快取。 */
export function ensureIconTexture(scene: Phaser.Scene, kind: IconKind): string {
  const key = `icon-${kind}`;
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0xffffff, 1);
  if (kind === 'trophy') {
    // 杯身＋杯腳＋底座
    g.fillRoundedRect(5, 3, 14, 10, { tl: 3, tr: 3, bl: 5, br: 5 });
    g.fillRect(10, 13, 4, 5);
    g.fillRoundedRect(6, 18, 12, 3, 1);
  } else if (kind === 'lock') {
    // 鎖環（半圓弧）＋鎖體
    g.lineStyle(2.5, 0xffffff, 1);
    g.beginPath();
    g.arc(12, 9, 5, Math.PI, 0, false);
    g.strokePath();
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(5, 9, 14, 11, 3);
  } else {
    // chart：三根高低長條
    g.fillRect(4, 12, 4, 8);
    g.fillRect(10, 7, 4, 13);
    g.fillRect(16, 10, 4, 10);
  }
  g.generateTexture(key, 24, 24);
  g.destroy();
  return key;
}
