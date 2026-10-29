import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { ScoreTracker } from '../core/ScoreTracker';
import { t, tf } from '../i18n/t';
import { getLocale, setLocale } from '../i18n/store';
import { SUPPORTED_LOCALES, LOCALE_LABELS } from '../i18n/locales';
import { Button } from '../ui/Button';
import { MuteButton } from '../ui/MuteButton';
import { muteAnchor } from '../ui/safeArea';
import { getInvite } from '../core/invite';
import { groupColorOf } from '../core/temperament';
import { ensurePlayerTexture } from '../entities/Player';
import { PLAYER_BASE_COLOR } from '../core/playerColor';
import { prefersReducedMotion } from '../ui/reducedMotion';
import { requestTiltPermission } from '../input/tiltPermission';
import { BODY_FONT, DISPLAY_FONT, INK, INK_CSS, MANGA_RED, MANGA_YELLOW, PAPER, PAPER_CARD, numToHex } from '../theme/manga';
import { drawHalftoneBand, drawMangaSpeechBox, inkFrame } from '../gfx/mangaFx';
import { isEndlessUnlocked } from '../core/endlessUnlock';

export class StartScene extends Phaser.Scene {
  constructor() {
    super('Start');
  }

  create() {
    this.cameras.main.setBackgroundColor(PAPER);
    const cx = GAME.width / 2;
    const current = getLocale();
    const reduce = prefersReducedMotion();

    // 封面：集中線（ベタフラッシュ）從主角放射
    const rays = this.add.graphics().setDepth(0);
    const heroY = 118;
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2 + (i % 3) * 0.012;
      const inner = 70 + (i % 4) * 14;
      rays.lineStyle(i % 2 === 0 ? 2.6 : 1.1, INK, i % 2 === 0 ? 0.55 : 0.3);
      rays.lineBetween(
        cx + Math.cos(a) * inner,
        heroY + Math.sin(a) * inner * 0.8,
        cx + Math.cos(a) * 520,
        heroY + Math.sin(a) * 520 * 0.8,
      );
    }
    // 下半紙面蓋住集中線，形成「分鏡切割」
    const lowerPanel = this.add.graphics().setDepth(1);
    lowerPanel.fillStyle(PAPER, 1);
    lowerPanel.beginPath();
    lowerPanel.moveTo(0, 318);
    lowerPanel.lineTo(GAME.width, 288);
    lowerPanel.lineTo(GAME.width, GAME.height);
    lowerPanel.lineTo(0, GAME.height);
    lowerPanel.closePath();
    lowerPanel.fillPath();
    drawHalftoneBand(lowerPanel, 12, 300, GAME.width - 24, 90, INK, 0.1, 'down', 10);
    lowerPanel.lineStyle(4, INK, 1);
    lowerPanel.lineBetween(0, 318, GAME.width, 288);
    inkFrame(this, false);

    // 主角背後白色光暈圈
    const halo = this.add.graphics().setDepth(2);
    halo.fillStyle(PAPER_CARD, 1);
    halo.fillCircle(cx, heroY, 58);
    halo.lineStyle(3, INK, 1);
    halo.strokeCircle(cx, heroY, 58);

    const hero = this.add
      .image(cx, heroY, ensurePlayerTexture(this, PLAYER_BASE_COLOR))
      .setScale(1.15)
      .setDepth(3);
    if (!reduce) {
      this.tweens.add({
        targets: hero,
        scaleY: { from: 1.1, to: 1.2 },
        y: { from: heroY + 4, to: heroY - 4 },
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // 擬聲詞「ドキッ」
    this.add
      .text(cx + 92, heroY - 44, 'ドキッ!', {
        fontFamily: DISPLAY_FONT,
        fontSize: '22px',
        color: '#ffffff',
        stroke: INK_CSS,
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setAngle(14)
      .setDepth(4);

    // 標題：傾斜粗體＋硬黑落影＋黃字黑邊
    const titleStyle = {
      fontSize: '52px',
      fontFamily: DISPLAY_FONT,
      stroke: INK_CSS,
      strokeThickness: 10,
    };
    this.add
      .text(cx + 5, 232 + 5, t('start.title'), { ...titleStyle, color: INK_CSS })
      .setOrigin(0.5)
      .setAngle(-5)
      .setDepth(4);
    this.add
      .text(cx, 232, t('start.title'), { ...titleStyle, color: numToHex(MANGA_YELLOW) })
      .setOrigin(0.5)
      .setAngle(-5)
      .setDepth(5);

    // 標語：漫畫旁白框
    const tagline = this.add
      .text(cx, 352, t('start.tagline'), {
        fontSize: '15px',
        color: INK_CSS,
        align: 'center',
        lineSpacing: 4,
        fontFamily: BODY_FONT,
      })
      .setOrigin(0.5)
      .setDepth(6);
    const tagBox = this.add.graphics().setDepth(5);
    const tw = tagline.width + 32;
    const th = tagline.height + 18;
    drawMangaSpeechBox(tagBox, cx - tw / 2, 352 - th / 2, tw, th, { shadowOffset: 4, cornerSlash: true });

    // 好友邀請打招呼
    const friend = getInvite();
    if (friend) {
      const friendHex = '#' + groupColorOf(friend).toString(16).padStart(6, '0');
      this.add
        .text(cx, 408, tf('invite.greeting', [friend]), {
          fontSize: '15px',
          fontStyle: 'bold',
          color: friendHex,
          align: 'center',
          stroke: '#ffffff',
          strokeThickness: 4,
          wordWrap: { width: GAME.width - 60, useAdvancedWrap: true },
          fontFamily: BODY_FONT,
        })
        .setOrigin(0.5)
        .setDepth(6);
    }

    // 語言選單：小分鏡格，當前語言黃底
    this.add
      .text(cx, 436, t('start.language'), {
        fontSize: '13px',
        color: '#14101999',
        fontFamily: BODY_FONT,
      })
      .setOrigin(0.5);
    const chipPitch = 84;
    const startX = cx - ((SUPPORTED_LOCALES.length - 1) * chipPitch) / 2;
    const chipW = 76;
    const chipH = 44;
    const drawChip = (g: Phaser.GameObjects.Graphics, x: number, y: number, fill: number) => {
      g.clear();
      g.fillStyle(INK, 1);
      g.fillRect(x - chipW / 2 + 3, y - chipH / 2 + 3, chipW, chipH);
      g.fillStyle(fill, 1);
      g.fillRect(x - chipW / 2, y - chipH / 2, chipW, chipH);
      g.lineStyle(2.5, INK, 1);
      g.strokeRect(x - chipW / 2, y - chipH / 2, chipW, chipH);
    };
    SUPPORTED_LOCALES.forEach((loc, i) => {
      const active = loc === current;
      const x = startX + i * chipPitch;
      const y = 474;
      const plate = this.add.graphics();
      drawChip(plate, x, y, active ? MANGA_YELLOW : PAPER_CARD);
      const chip = this.add
        .text(x, y, LOCALE_LABELS[loc], {
          fontSize: '13px',
          fontStyle: active ? 'bold' : 'normal',
          color: INK_CSS,
          align: 'center',
          fontFamily: BODY_FONT,
        })
        .setOrigin(0.5);
      const zone = this.add.zone(x, y, chipW, chipH).setInteractive({ useHandCursor: true });
      if (!active) {
        zone.on('pointerover', () => drawChip(plate, x, y, 0xfff3c4));
        zone.on('pointerout', () => {
          drawChip(plate, x, y, PAPER_CARD);
          chip.setScale(1);
        });
        zone.on('pointerdown', () => chip.setScale(0.96));
      }
      zone.on('pointerup', () => {
        if (loc !== current) {
          setLocale(loc);
          this.scene.restart();
        }
      });
    });

    const mute = muteAnchor(GAME.width);
    new MuteButton(this, mute.x, mute.y);

    // 主 CTA
    new Button(this, cx, 536, t('start.cta'), {
      width: 220,
      height: 62,
      fontSize: 28,
      bg: MANGA_RED,
      bgHover: 0xf04a58,
      bgDown: 0xc8202f,
      textColor: '#ffffff',
      onClick: async () => {
        await requestTiltPermission();
        this.scene.start('Game', { score: new ScoreTracker() });
      },
    });

    // Endless CTA directly under Start (locked until ≥1 classic play)
    const unlocked = isEndlessUnlocked();
    let lockHint: Phaser.GameObjects.Text | null = null;
    new Button(this, cx, 606, unlocked ? t('endless.cta') : t('endless.ctaLocked'), {
      width: 200,
      height: 50,
      fontSize: 20,
      bg: unlocked ? 0xe4ae3a : 0x3a3e58,
      bgHover: unlocked ? 0xf0c45a : 0x4a4e68,
      bgDown: unlocked ? 0xc9942a : 0x2a2e48,
      textColor: unlocked ? '#0f1220' : '#ffffff88',
      icon: unlocked ? undefined : 'lock',
      onClick: async () => {
        if (!unlocked) {
          if (lockHint) {
            lockHint.destroy();
            lockHint = null;
          }
          lockHint = this.add
            .text(cx, 638, t('endless.lockHint'), {
              fontSize: '13px',
              color: INK_CSS,
              align: 'center',
              wordWrap: { width: GAME.width - 48, useAdvancedWrap: true },
              fontFamily: 'Nunito, system-ui, sans-serif',
            })
            .setOrigin(0.5)
            .setDepth(30);
          this.time.delayedCall(2800, () => {
            if (lockHint) {
              lockHint.destroy();
              lockHint = null;
            }
          });
          return;
        }
        await requestTiltPermission();
        this.scene.start('EndlessGame');
      },
    });

    new Button(this, cx, 672, t('trend.cta'), {
      width: 200,
      height: 50,
      fontSize: 17,
      bg: PAPER_CARD,
      bgHover: 0xfff3c4,
      bgDown: 0xe6dcc8,
      textColor: INK_CSS,
      icon: 'chart',
      onClick: () => this.scene.start('Trend'),
    });

    new Button(this, cx, 734, t('ach.cta'), {
      width: 210,
      height: 50,
      fontSize: 17,
      bg: PAPER_CARD,
      bgHover: 0xfff3c4,
      bgDown: 0xe6dcc8,
      textColor: INK_CSS,
      icon: 'trophy',
      onClick: () => this.scene.start('Achievements'),
    });
  }
}
