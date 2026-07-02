import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import type { Letter } from '../config/questions';
import { ASSET_KEYS } from '../config/assets';
import { LETTER_COLORS } from '../theme/palette';

export type PlatformKind = 'normal' | 'question';

const NORMAL_KEY = 'platform-normal';
const QUESTION_KEY = 'platform-question'; // 中性灰白底，供依字母 tint

export class Platform extends Phaser.Physics.Arcade.Sprite {
  kind: PlatformKind = 'normal';
  side?: Letter;
  questionId?: string;

  static makeNormal(scene: Phaser.Scene, x: number, y: number, width: number = GAME.platformWidth): Platform {
    const key = scene.textures.exists(ASSET_KEYS.platformNormal) ? ASSET_KEYS.platformNormal : NORMAL_KEY;
    if (key === NORMAL_KEY) ensureTextures(scene);
    const p = new Platform(scene, x, y, key);
    p.kind = 'normal';
    if (width !== GAME.platformWidth) {
      // 拉伸基準材質成指定寬度（有長有短），並同步靜態碰撞體。
      p.setDisplaySize(width, GAME.platformHeight);
      p.refreshBody();
    }
    return p;
  }

  static makeQuestion(
    scene: Phaser.Scene,
    x: number,
    y: number,
    opts: { side: Letter; questionId: string; label: string; isYes: boolean },
  ): Platform {
    const realKey = opts.isYes ? ASSET_KEYS.platformYes : ASSET_KEYS.platformNo;
    const key = scene.textures.exists(realKey) ? realKey : QUESTION_KEY;
    if (key === QUESTION_KEY) ensureTextures(scene);
    const p = new Platform(scene, x, y, key);
    p.kind = 'question';
    p.side = opts.side;
    p.questionId = opts.questionId;
    // 依 MBTI 字母上色（取代固定紅/綠）。假設底圖為中性色（QUESTION_KEY 白底）；
    // 若日後為 platformYes/No 加入彩色點陣圖，需改為中性圖或移除此 tint 以免疊色。
    p.setTint(LETTER_COLORS[opts.side]);
    scene.add
      .text(x, y, opts.label, {
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 4,
        wordWrap: { width: GAME.platformWidth + 60 },
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
  const W = GAME.platformWidth;
  const H = GAME.platformHeight;
  const R = 6;
  /** 立體化台階底：主體色＋頂邊 2px 亮線＋底部 3px 暗帶（圖底分離）。 */
  const make = (key: string, body: number, topLine: number) => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(body, 1);
    g.fillRoundedRect(0, 0, W, H, R);
    g.fillStyle(topLine, 1);
    g.fillRect(R, 0, W - R * 2, 2);
    g.fillStyle(0x000000, 0.25);
    g.fillRect(R, H - 3, W - R * 2, 3);
    g.generateTexture(key, W, H);
    g.destroy();
  };
  make(NORMAL_KEY, 0x3d4a7a, 0x8fa0d8);
  // 中性灰白底＋純白頂線：setTint 後頂線成為「比體色亮一階」的立體亮邊
  make(QUESTION_KEY, 0xe8e8e8, 0xffffff);
}
