import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { PALETTE } from '../theme/palette';
import { prefersReducedMotion } from '../ui/reducedMotion';

/**
 * 程式美術的氛圍背景（無點陣圖、無山層）。
 * 固定貼在鏡頭（scrollFactor 0），畫在遊戲物件之後（depth < 0）。
 * - 基底：微微閃爍的星點 + 幾隻飄動的蝴蝶/蜜蜂/小鳥
 * - 各維度不同天象：0 流星、1 極光、2 下雨、3 螢火蟲
 * 相機底色（LEVEL_BG 四色）由 GameScene 設定，透在最後面。
 */
type SkyKind = 'meteors' | 'aurora' | 'rain' | 'fireflies';
const SKY_BY_DIM: readonly SkyKind[] = ['meteors', 'aurora', 'rain', 'fireflies'];

const TEX = {
  butterfly: 'amb-butterfly',
  bee: 'amb-bee',
  bird: 'amb-bird',
  meteor: 'amb-meteor',
  rain: 'amb-rain',
  firefly: 'amb-firefly',
} as const;

export class Background {
  private scene: Phaser.Scene;
  private reduced: boolean;
  private sky: Phaser.GameObjects.GameObject[] = [];
  private skyTimer?: Phaser.Time.TimerEvent;
  private current?: SkyKind;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.reduced = prefersReducedMotion();
    ensureTextures(scene);
    this.createStars();
    this.createCreatures();
  }

  /** 依維度切換天象（GameScene 於 create 與 advanceDimension 呼叫）。 */
  setDimension(dimIndex: number): void {
    const kind = SKY_BY_DIM[dimIndex % SKY_BY_DIM.length];
    if (kind === this.current) return;
    this.clearSky();
    this.current = kind;
    this.buildSky(kind);
  }

  // 動畫皆由 tween/timer 驅動，無需逐幀更新；保留簽名相容 GameScene。
  update(_scrollY: number): void {
    /* no-op */
  }

  private createStars(): void {
    const n = this.reduced ? 16 : 30;
    for (let i = 0; i < n; i++) {
      const star = this.scene.add
        .circle(
          Phaser.Math.Between(0, GAME.width),
          Phaser.Math.Between(0, GAME.height),
          Phaser.Math.FloatBetween(0.8, 2),
          0xffffff,
          Phaser.Math.FloatBetween(0.4, 0.9),
        )
        .setScrollFactor(0)
        .setDepth(-10);
      if (!this.reduced) {
        this.scene.tweens.add({
          targets: star,
          alpha: 0.15,
          duration: Phaser.Math.Between(1200, 2600),
          yoyo: true,
          repeat: -1,
          delay: Phaser.Math.Between(0, 1500),
        });
      }
    }
  }

  private createCreatures(): void {
    const wingTints = [0xf6c6e0, 0xc6d8ff, 0xfff0b3];
    const kinds: (keyof typeof TEX)[] = ['butterfly', 'bee', 'bird', 'butterfly'];
    const n = this.reduced ? 2 : kinds.length;
    for (let i = 0; i < n; i++) {
      const kind = kinds[i];
      const y = Phaser.Math.Between(70, GAME.height - 130);
      const dir = i % 2 === 0 ? 1 : -1;
      const startX = dir > 0 ? -24 : GAME.width + 24;
      const endX = dir > 0 ? GAME.width + 24 : -24;
      const sprite = this.scene.add
        .image(startX, y, TEX[kind])
        .setScrollFactor(0)
        .setDepth(-9)
        .setFlipX(dir < 0);
      if (kind === 'butterfly') sprite.setTint(wingTints[i % wingTints.length]);
      if (this.reduced) {
        sprite.setX(Phaser.Math.Between(40, GAME.width - 40));
        continue;
      }
      this.scene.tweens.add({
        targets: sprite,
        x: endX,
        duration: Phaser.Math.Between(11000, 20000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 6000),
      });
      this.scene.tweens.add({
        targets: sprite,
        y: y + Phaser.Math.Between(12, 28),
        duration: Phaser.Math.Between(1400, 2600),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      if (kind !== 'bird') {
        this.scene.tweens.add({
          targets: sprite,
          scaleX: 0.55,
          duration: 220,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }
  }

  private clearSky(): void {
    this.skyTimer?.remove();
    this.skyTimer = undefined;
    for (const o of this.sky) {
      this.scene.tweens.killTweensOf(o);
      o.destroy();
    }
    this.sky = [];
  }

  private buildSky(kind: SkyKind): void {
    if (kind === 'meteors') this.buildMeteors();
    else if (kind === 'aurora') this.buildAurora();
    else if (kind === 'rain') this.buildRain();
    else this.buildFireflies();
  }

  private buildMeteors(): void {
    if (this.reduced) return;
    this.skyTimer = this.scene.time.addEvent({
      delay: 1500,
      loop: true,
      callback: () => this.spawnMeteor(),
    });
  }

  private spawnMeteor(): void {
    // 行進方向與拖尾角度一致：往左下 122°（cos<0 向左、sin>0 向下）
    const angleDeg = 122;
    const rad = Phaser.Math.DegToRad(angleDeg);
    const dist = Phaser.Math.Between(300, 380);
    const x = Phaser.Math.Between(Math.floor(GAME.width * 0.3), GAME.width + 40);
    const y = Phaser.Math.Between(-30, Math.floor(GAME.height * 0.4));
    const m = this.scene.add
      .image(x, y, TEX.meteor)
      .setScrollFactor(0)
      .setDepth(-9)
      .setAngle(angleDeg)
      .setAlpha(0);
    this.sky.push(m);
    this.scene.tweens.add({
      targets: m,
      x: x + Math.cos(rad) * dist,
      y: y + Math.sin(rad) * dist,
      alpha: { from: 0.9, to: 0 },
      duration: 720,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.sky = this.sky.filter((o) => o !== m);
        m.destroy();
      },
    });
  }

  private buildAurora(): void {
    const colors = [PALETTE.diplomat, PALETTE.analyst, PALETTE.sentinel];
    for (let i = 0; i < 3; i++) {
      const band = this.scene.add
        .ellipse(GAME.width / 2, 72 + i * 46, GAME.width * 1.4, 74, colors[i], 0.14)
        .setScrollFactor(0)
        .setDepth(-9)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.sky.push(band);
      if (!this.reduced) {
        this.scene.tweens.add({
          targets: band,
          x: GAME.width / 2 + (i % 2 ? 40 : -40),
          scaleX: 1.15,
          alpha: 0.24,
          duration: 2600 + i * 400,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }
  }

  private buildRain(): void {
    const n = this.reduced ? 0 : 46;
    for (let i = 0; i < n; i++) {
      const drop = this.scene.add
        .image(Phaser.Math.Between(0, GAME.width + 30), -20, TEX.rain)
        .setScrollFactor(0)
        .setDepth(-9)
        .setAngle(12)
        .setAlpha(0.35);
      this.sky.push(drop);
      this.scene.tweens.add({
        targets: drop,
        y: GAME.height + 20,
        duration: Phaser.Math.Between(650, 1100),
        repeat: -1,
        delay: Phaser.Math.Between(0, 1400),
      });
    }
  }

  private buildFireflies(): void {
    const n = this.reduced ? 6 : 16;
    for (let i = 0; i < n; i++) {
      const x = Phaser.Math.Between(20, GAME.width - 20);
      const y = Phaser.Math.Between(80, GAME.height - 80);
      const f = this.scene.add
        .image(x, y, TEX.firefly)
        .setScrollFactor(0)
        .setDepth(-9)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.2);
      this.sky.push(f);
      if (!this.reduced) {
        this.scene.tweens.add({
          targets: f,
          alpha: 0.9,
          scale: 1.4,
          duration: Phaser.Math.Between(700, 1600),
          yoyo: true,
          repeat: -1,
          delay: Phaser.Math.Between(0, 1200),
          ease: 'Sine.easeInOut',
        });
        this.scene.tweens.add({
          targets: f,
          x: x + Phaser.Math.Between(-30, 30),
          y: y + Phaser.Math.Between(-24, 24),
          duration: Phaser.Math.Between(2000, 4000),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }
  }
}

/** 產生氛圍用的小貼圖（只做一次）。 */
function ensureTextures(scene: Phaser.Scene): void {
  const make = (key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  };

  // 蝴蝶（白色供 tint）：兩對圓翅 + 深色身體
  make(TEX.butterfly, 18, 15, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(6, 5, 5);
    g.fillCircle(6, 11, 4);
    g.fillCircle(12, 5, 5);
    g.fillCircle(12, 11, 4);
    g.fillStyle(0x3a2f4a, 1);
    g.fillRoundedRect(8.5, 3, 1.6, 10, 0.8);
  });

  // 蜜蜂：黃身黑紋 + 半透明翅
  make(TEX.bee, 16, 12, (g) => {
    g.fillStyle(0xffffff, 0.8);
    g.fillEllipse(5, 4, 8, 5);
    g.fillEllipse(11, 4, 8, 5);
    g.fillStyle(0xf2c200, 1);
    g.fillRoundedRect(3, 4, 11, 7, 3);
    g.fillStyle(0x2b2440, 1);
    g.fillRect(6, 4, 1.6, 7);
    g.fillRect(10, 4, 1.6, 7);
  });

  // 海鷗：對稱雙弧剪影（⌢⌢），無方向性
  make(TEX.bird, 22, 10, (g) => {
    g.lineStyle(1.8, 0x9aa0c0, 0.9);
    g.beginPath();
    g.arc(7, 7, 5, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340));
    g.strokePath();
    g.beginPath();
    g.arc(15, 7, 5, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340));
    g.strokePath();
  });

  // 流星：白色短拖尾
  make(TEX.meteor, 28, 3, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(0, 0, 28, 3, 1.5);
  });

  // 雨滴：細長淡藍
  make(TEX.rain, 2, 14, (g) => {
    g.fillStyle(0xbfd0ff, 1);
    g.fillRoundedRect(0, 0, 2, 14, 1);
  });

  // 螢火蟲：黃綠光暈
  make(TEX.firefly, 10, 10, (g) => {
    g.fillStyle(0xdcff8c, 0.4);
    g.fillCircle(5, 5, 5);
    g.fillStyle(0xdcff8c, 1);
    g.fillCircle(5, 5, 3);
  });
}
