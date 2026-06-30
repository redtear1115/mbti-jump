import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import type { Letter } from '../config/questions';

export type PlatformKind = 'normal' | 'question';

const NORMAL_KEY = 'platform-normal';
const YES_KEY = 'platform-yes';
const NO_KEY = 'platform-no';

export class Platform extends Phaser.Physics.Arcade.Sprite {
  kind: PlatformKind = 'normal';
  side?: Letter;
  questionId?: string;

  static makeNormal(scene: Phaser.Scene, x: number, y: number): Platform {
    ensureTextures(scene);
    const p = new Platform(scene, x, y, NORMAL_KEY);
    p.kind = 'normal';
    return p;
  }

  static makeQuestion(
    scene: Phaser.Scene,
    x: number,
    y: number,
    opts: { side: Letter; questionId: string; label: string; isYes: boolean },
  ): Platform {
    ensureTextures(scene);
    const p = new Platform(scene, x, y, opts.isYes ? YES_KEY : NO_KEY);
    p.kind = 'question';
    p.side = opts.side;
    p.questionId = opts.questionId;
    scene.add
      .text(x, y, opts.label, {
        fontSize: '13px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: GAME.platformWidth },
      })
      .setOrigin(0.5, 0.5)
      .setDepth(5);
    return p;
  }

  private constructor(scene: Phaser.Scene, x: number, y: number, key: string) {
    super(scene, x, y, key);
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body
  }
}

function ensureTextures(scene: Phaser.Scene): void {
  const make = (key: string, color: number) => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(color, 1);
    g.fillRoundedRect(0, 0, GAME.platformWidth, GAME.platformHeight, 6);
    g.generateTexture(key, GAME.platformWidth, GAME.platformHeight);
    g.destroy();
  };
  make(NORMAL_KEY, 0x5d6b9e);
  make(YES_KEY, 0x38b764); // 綠 = Yes
  make(NO_KEY, 0xb13e53); // 紅 = No
}
