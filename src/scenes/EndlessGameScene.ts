import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { LEVEL_BG, PALETTE } from '../theme/palette';
import { Background } from '../gfx/Background';
import { AuroraBackground } from '../gfx/AuroraBackground';
import { Player } from '../entities/Player';
import { Platform } from '../entities/Platform';
import { Controls } from '../input/Controls';
import { t, tf } from '../i18n/t';
import { MuteButton } from '../ui/MuteButton';
import { muteAnchor } from '../ui/safeArea';
import { prefersReducedMotion } from '../ui/reducedMotion';
import { Sfx } from '../audio/Sfx';
import { getEndlessProfile } from '../core/endlessProfile';
import { endlessSkinColor } from '../core/endlessSkin';

/**
 * Endless mode: neutral platforms only, no question forks.
 * floors = bounce count on distinct platforms (same platform re-bounce does not add).
 */
export class EndlessGameScene extends Phaser.Scene {
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private controls!: Controls;
  private spawnY = 0;
  private floors = 0;
  private lastPlatformId: number | null = null;
  private nextPlatformId = 1;
  private floorsText!: Phaser.GameObjects.Text;
  private background!: Background;
  private aurora!: AuroraBackground;
  private ended = false;

  constructor() {
    super('EndlessGame');
  }

  create() {
    this.ended = false;
    this.floors = 0;
    this.lastPlatformId = null;
    this.nextPlatformId = 1;

    const dim = 0; // fixed neutral sky for endless
    this.cameras.main.setBackgroundColor(LEVEL_BG[dim]);
    this.aurora = new AuroraBackground(this, prefersReducedMotion());
    this.aurora.retint(dim);
    this.background = new Background(this);
    this.background.setDimension(dim);
    this.platforms = this.physics.add.staticGroup();

    this.spawnY = 600;
    this.addNormalPlatform(GAME.width / 2, this.spawnY);
    this.spawnY -= GAME.platformGapY;
    for (let i = 0; i < 10; i++) {
      this.spawnNextRow();
    }

    this.player = new Player(this, GAME.width / 2, 550, endlessSkinColor());
    this.player.setDepth(19.2);
    this.player.bounce();

    this.physics.add.collider(
      this.player,
      this.platforms,
      this.onLand as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      this.onlyWhenFalling as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      this,
    );

    this.controls = new Controls(this);
    this.controls.start();

    // Bottom HUD card — floors only (no quiz chrome)
    const hudScrim = this.add.graphics().setScrollFactor(0).setDepth(19);
    hudScrim.fillStyle(PALETTE.surface, 0.72);
    hudScrim.fillRoundedRect(0, 646, GAME.width, 154, { tl: 16, tr: 16, bl: 0, br: 0 });

    this.floorsText = this.add
      .text(GAME.width / 2, 688, '0', {
        fontSize: '56px',
        fontStyle: 'bold',
        color: '#ffffff',
        fontFamily: 'Fredoka, system-ui, sans-serif',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20);

    this.add
      .text(GAME.width / 2, 738, t('endless.floorsLabel'), {
        fontSize: '16px',
        color: '#ffffffaa',
        fontFamily: 'Nunito, system-ui, sans-serif',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20);

    const best = getEndlessProfile().bestFloors;
    this.add
      .text(GAME.width / 2, 766, best > 0 ? tf('endless.best', [best]) : '', {
        fontSize: '13px',
        color: '#ffffff88',
        fontFamily: 'Nunito, system-ui, sans-serif',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20);

    const mute = muteAnchor(GAME.width);
    new MuteButton(this, mute.x, mute.y);
  }

  update(_time: number, delta: number) {
    if (this.ended) return;
    this.player.tickJelly(delta / 1000);
    this.player.setAxis(this.controls.axis);
    this.player.wrapHorizontally();

    const targetScroll = this.player.y - GAME.height * 0.6;
    if (targetScroll < this.cameras.main.scrollY) {
      this.cameras.main.scrollY = targetScroll;
    }
    this.background.update(this.cameras.main.scrollY);

    const topVisible = this.cameras.main.scrollY;
    while (this.spawnY > topVisible - GAME.height * 1.5) {
      this.spawnNextRow();
    }

    const fallLine = this.cameras.main.scrollY + GAME.height + GAME.fallMargin;
    if (this.player.y > fallLine) {
      this.endRun();
    }
  }

  private spawnNextRow(): void {
    const width = Phaser.Math.Between(GAME.platformWidthMin, GAME.platformWidthMax);
    const x = Phaser.Math.Between(width / 2, GAME.width - width / 2);
    this.addNormalPlatform(x, this.spawnY, width);
    this.spawnY -= GAME.platformGapY;
  }

  private addNormalPlatform(x: number, y: number, width?: number): void {
    const p = Platform.makeNormal(this, x, y, width);
    (p as Platform & { endlessId?: number }).endlessId = this.nextPlatformId++;
    this.platforms.add(p);
  }

  private onlyWhenFalling = (): boolean => {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    return body.velocity.y > 0;
  };

  private onLand = (_player: unknown, platformObj: unknown): void => {
    const platform = platformObj as Platform & { endlessId?: number };
    this.player.bounce();
    Sfx.play('bounce');
    const id = platform.endlessId;
    if (id !== undefined && id !== this.lastPlatformId) {
      this.lastPlatformId = id;
      this.floors += 1;
      this.floorsText.setText(String(this.floors));
    }
  };

  private endRun(): void {
    if (this.ended) return;
    this.ended = true;
    this.controls.destroy();
    Sfx.play('gameover');
    this.scene.start('EndlessResult', { floors: this.floors });
  }
}
