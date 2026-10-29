import Phaser from 'phaser';

const textResolution = Math.min(window.devicePixelRatio || 1, 3);

/**
 * 讓所有 this.add.text 以裝置像素倍率畫字。
 * 否則字先畫成小圖，再被瀏覽器放大，筆畫會糊。
 */
export function installSharpText(): void {
  const factory = Phaser.GameObjects.GameObjectFactory.prototype;
  const original = factory.text;
  factory.text = function (
    this: Phaser.GameObjects.GameObjectFactory,
    x: number,
    y: number,
    text: string | string[],
    style?: Phaser.Types.GameObjects.Text.TextStyle,
  ) {
    const created = original.call(this, x, y, text, style);
    if (!style?.resolution) created.setResolution(textResolution);
    return created;
  };
}
