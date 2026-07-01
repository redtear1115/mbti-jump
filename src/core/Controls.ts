import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { tiltToAxis } from './tilt';

export class Controls {
  private scene: Phaser.Scene;
  private tiltAxis = 0;
  private hasTilt = false;
  private pointerAxis = 0;
  private orientationHandler?: (e: DeviceOrientationEvent) => void;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA?: Phaser.Input.Keyboard.Key;
  private keyD?: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  start(): void {
    this.orientationHandler = (e: DeviceOrientationEvent) => {
      if (e.gamma === null) return;
      this.hasTilt = true;
      this.tiltAxis = tiltToAxis(e.gamma);
    };
    window.addEventListener('deviceorientation', this.orientationHandler);

    // 鍵盤備援（桌機）：方向鍵 ← → 或 A / D
    const kb = this.scene.input.keyboard;
    if (kb) {
      this.cursors = kb.createCursorKeys();
      this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    }

    // 點擊/觸控左右半邊備援（傾斜不可用時）
    this.scene.input.on('pointerdown', this.onPointer, this);
    this.scene.input.on('pointermove', this.onPointer, this);
    this.scene.input.on('pointerup', () => (this.pointerAxis = 0));
  }

  private onPointer = (p: Phaser.Input.Pointer) => {
    if (!p.isDown) return;
    this.pointerAxis = p.x < GAME.width / 2 ? -1 : 1;
  };

  /** 鍵盤當下的水平軸：← / A = 左(-1)，→ / D = 右(+1)，無輸入回 0。 */
  private get keyboardAxis(): number {
    const left = (this.cursors?.left.isDown ?? false) || (this.keyA?.isDown ?? false);
    const right = (this.cursors?.right.isDown ?? false) || (this.keyD?.isDown ?? false);
    if (left && !right) return -1;
    if (right && !left) return 1;
    return 0;
  }

  get axis(): number {
    // 鍵盤按下時最優先（桌機）；否則傾斜（手機）；再否則點擊左右半邊。
    const k = this.keyboardAxis;
    if (k !== 0) return k;
    return this.hasTilt ? this.tiltAxis : this.pointerAxis;
  }

  destroy(): void {
    if (this.orientationHandler) {
      window.removeEventListener('deviceorientation', this.orientationHandler);
    }
    this.scene.input.off('pointerdown', this.onPointer, this);
    this.scene.input.off('pointermove', this.onPointer, this);
    const kb = this.scene.input.keyboard;
    if (kb) {
      if (this.keyA) kb.removeKey(this.keyA);
      if (this.keyD) kb.removeKey(this.keyD);
    }
  }
}
