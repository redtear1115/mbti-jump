import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { PALETTE } from '../theme/palette';
import { t, tf } from '../i18n/t';
import { Button } from '../ui/Button';
import { MuteButton } from '../ui/MuteButton';
import { muteAnchor, safeTopDelta } from '../ui/safeArea';
import { layoutResultButtons } from '../core/resultLayout';
import { recordEndlessRun } from '../core/endlessProfile';
import { endlessSkinColor } from '../core/endlessSkin';
import { ensurePlayerTexture } from '../entities/Player';
import { prefersReducedMotion } from '../ui/reducedMotion';
import { requestTiltPermission } from '../input/tiltPermission';

interface EndlessResultInit {
  floors: number;
}

export class EndlessResultScene extends Phaser.Scene {
  constructor() {
    super('EndlessResult');
  }

  create(data: EndlessResultInit) {
    const floors = Math.max(0, Math.floor(data?.floors ?? 0));
    const { isNewBest, profile } = recordEndlessRun(floors);
    const cx = GAME.width / 2;
    const reduce = prefersReducedMotion();
    this.cameras.main.setBackgroundColor('#101018');

    const topDelta = safeTopDelta();
    this.add
      .text(cx, 48 + topDelta, t('endless.resultTitle'), {
        fontSize: '18px',
        color: '#ffffffaa',
        fontFamily: 'Fredoka, system-ui, sans-serif',
      })
      .setOrigin(0.5);

    // Jelly + shadow
    const jellyShadow = this.add.graphics();
    jellyShadow.fillStyle(0x000000, 0.28);
    jellyShadow.fillEllipse(cx, 172, 92, 18);

    const jelly = this.add
      .image(cx, 120, ensurePlayerTexture(this, endlessSkinColor()))
      .setScale(2);
    if (!reduce) {
      jelly.setScale(0);
      this.tweens.add({ targets: jelly, scale: 2, duration: 500, ease: 'Back.easeOut' });
    }

    this.add
      .text(cx, 230, String(floors), {
        fontSize: '96px',
        fontStyle: 'bold',
        color: '#ffffff',
        fontFamily: 'Fredoka, system-ui, sans-serif',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 300, t('endless.floorsLabel'), {
        fontSize: '20px',
        color: '#ffffffaa',
        fontFamily: 'Nunito, system-ui, sans-serif',
      })
      .setOrigin(0.5);

    let contentBottom = 320;
    if (isNewBest && floors > 0) {
      const badge = this.add
        .text(cx, 348, t('endless.newBest'), {
          fontSize: '18px',
          fontStyle: 'bold',
          color: '#0f1220',
          backgroundColor: '#ffe066',
          padding: { x: 12, y: 6 },
          fontFamily: 'Fredoka, system-ui, sans-serif',
        })
        .setOrigin(0.5);
      contentBottom = badge.y + badge.displayHeight / 2;
    }

    const sub = this.add
      .text(cx, contentBottom + 28, tf('endless.best', [profile.bestFloors]), {
        fontSize: '16px',
        color: '#ffffff88',
        fontFamily: 'Nunito, system-ui, sans-serif',
      })
      .setOrigin(0.5);
    contentBottom = sub.y + sub.displayHeight / 2;

    const { ys: btnY } = layoutResultButtons(contentBottom);

    const shareBtn = new Button(this, cx, btnY[0], t('share.action'), {
      width: 240,
      height: 54,
      fontSize: 20,
      onClick: async () => {
        const shareUrl = `${location.origin}/?utm=endless`;
        const text = tf('endless.shareText', [floors]);
        const payload = `${text} ${shareUrl}`;
        try {
          const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
          if (nav.share) {
            try {
              await nav.share({ text, url: shareUrl });
              return;
            } catch (e) {
              if ((e as Error).name === 'AbortError') return;
            }
          }
          await navigator.clipboard.writeText(payload);
          shareBtn.setLabel(t('share.doneFallback'));
        } catch {
          shareBtn.setLabel(t('share.fail'));
        }
      },
    });

    new Button(this, cx, btnY[1], t('endless.again'), {
      width: 240,
      height: 54,
      fontSize: 20,
      bg: 0xd9a521,
      bgHover: 0xf0b93a,
      onClick: async () => {
        await requestTiltPermission();
        this.scene.start('EndlessGame');
      },
    });

    new Button(this, cx, btnY[2], t('endless.back'), {
      width: 240,
      height: 50,
      fontSize: 18,
      bg: PALETTE.surfaceAlt,
      bgHover: 0x3a3e58,
      bgDown: 0x22243a,
      textColor: '#ffffff',
      onClick: () => this.scene.start('Start'),
    });

    const mute = muteAnchor(GAME.width);
    new MuteButton(this, mute.x, mute.y);
  }
}
