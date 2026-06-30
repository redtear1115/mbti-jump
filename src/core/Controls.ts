import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { tiltToAxis } from './tilt';

export class Controls {
  private scene: Phaser.Scene;
  private tiltAxis = 0;
  private hasTilt = false;
  private pointerAxis = 0;
  private orientationHandler?: (e: DeviceOrientationEvent) => void;

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

    // 點擊/觸控左右半邊備援（傾斜不可用時）
    this.scene.input.on('pointerdown', this.onPointer, this);
    this.scene.input.on('pointermove', this.onPointer, this);
    this.scene.input.on('pointerup', () => (this.pointerAxis = 0));
  }

  private onPointer = (p: Phaser.Input.Pointer) => {
    if (!p.isDown) return;
    this.pointerAxis = p.x < GAME.width / 2 ? -1 : 1;
  };

  get axis(): number {
    return this.hasTilt ? this.tiltAxis : this.pointerAxis;
  }

  destroy(): void {
    if (this.orientationHandler) {
      window.removeEventListener('deviceorientation', this.orientationHandler);
    }
    this.scene.input.off('pointerdown', this.onPointer, this);
    this.scene.input.off('pointermove', this.onPointer, this);
  }
}
