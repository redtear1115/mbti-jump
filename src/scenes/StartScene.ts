import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { ScoreTracker } from '../core/ScoreTracker';
import { t, tf } from '../i18n/t';
import { getLocale, setLocale } from '../i18n/store';
import { SUPPORTED_LOCALES, LOCALE_LABELS } from '../i18n/locales';
import { Button } from '../ui/Button';
import { MuteButton } from '../ui/MuteButton';
import { getInvite } from '../core/invite';
import { groupColorOf } from '../core/temperament';
import { ensurePlayerTexture } from '../entities/Player';
import { PLAYER_BASE_COLOR } from '../core/playerColor';
import { prefersReducedMotion } from '../ui/reducedMotion';
import { requestTiltPermission } from '../input/tiltPermission';

export class StartScene extends Phaser.Scene {
  constructor() {
    super('Start');
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a1c2c');
    const cx = GAME.width / 2;
    const current = getLocale();

    // Hero 果凍怪：標題上方 idle 呼吸（reduced-motion 靜態）
    // 一律用 proc texture；若日後重新引入點陣 player 資產，需比照 Player 的 ASSET_KEYS fallback
    const hero = this.add
      .image(cx, 92, ensurePlayerTexture(this, PLAYER_BASE_COLOR))
      .setScale(1.8);
    if (!prefersReducedMotion()) {
      this.tweens.add({
        targets: hero,
        scaleY: { from: 1.8 * 0.94, to: 1.8 * 1.03 },
        y: { from: 96, to: 88 },
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    this.add
      .text(cx, 170, t('start.title'), {
        fontSize: '44px',
        color: '#ffcc00',
        fontStyle: 'bold',
        fontFamily: 'Fredoka, system-ui, sans-serif',
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 250, t('start.tagline'), {
        fontSize: '16px',
        color: '#ffffffcc',
        align: 'center',
        fontFamily: 'Nunito, system-ui, sans-serif',
      })
      .setOrigin(0.5);

    // 好友邀請打招呼（tagline 與語言選單之間）
    const friend = getInvite();
    if (friend) {
      const friendHex = '#' + groupColorOf(friend).toString(16).padStart(6, '0');
      this.add
        .text(cx, 302, tf('invite.greeting', [friend]), {
          fontSize: '15px',
          color: friendHex,
          align: 'center',
          wordWrap: { width: GAME.width - 60, useAdvancedWrap: true },
          fontFamily: 'Nunito, system-ui, sans-serif',
        })
        .setOrigin(0.5);
    }

    // 語言選單：橫排小按鈕，當前語言高亮，點選即切換並重繪
    this.add
      .text(cx, 356, t('start.language'), {
        fontSize: '13px',
        color: '#ffffff88',
        fontFamily: 'Nunito, system-ui, sans-serif',
      })
      .setOrigin(0.5);
    const chipPitch = 84;
    const startX = cx - ((SUPPORTED_LOCALES.length - 1) * chipPitch) / 2;
    SUPPORTED_LOCALES.forEach((loc, i) => {
      const active = loc === current;
      const chip = this.add
        .text(startX + i * chipPitch, 392, LOCALE_LABELS[loc], {
          fontSize: '13px',
          color: active ? '#1a1c2c' : '#ffffffdd',
          backgroundColor: active ? '#ffcc00' : '#ffffff22',
          // 固定寬度 + 置中 → 每個語系膠囊等寬，間距一致
          fixedWidth: 76,
          align: 'center',
          padding: { x: 10, y: 14 },
          fontFamily: 'Nunito, system-ui, sans-serif',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      if (!active) {
        chip.on('pointerover', () => chip.setBackgroundColor('#ffffff3a'));
        chip.on('pointerout', () => {
          chip.setBackgroundColor('#ffffff22');
          chip.setScale(1);
        });
        chip.on('pointerdown', () => chip.setScale(0.94));
      }
      chip.on('pointerup', () => {
        if (loc !== current) {
          setLocale(loc);
          this.scene.restart();
        }
      });
    });

    new MuteButton(this, GAME.width - 26, 26);

    // 主 CTA：實心圓角按鈕（hover/press 回饋 + ≥44 觸控）
    new Button(this, cx, 478, t('start.cta'), {
      width: 200,
      height: 60,
      fontSize: 28,
      onClick: async () => {
        await requestTiltPermission();
        this.scene.start('Game', { score: new ScoreTracker() });
      },
    });

    new Button(this, cx, 558, t('trend.cta'), {
      width: 200,
      height: 50,
      fontSize: 20,
      bg: 0x4298b4, // 藍，區分主 CTA
      bgHover: 0x54aec9,
      bgDown: 0x3a86a0,
      icon: 'chart',
      onClick: () => this.scene.start('Trend'),
    });

    new Button(this, cx, 620, t('ach.cta'), {
      width: 200,
      height: 50,
      fontSize: 20,
      bg: 0x88619a, // 紫，區分其他鈕
      bgHover: 0x9d78ae,
      bgDown: 0x76527f,
      icon: 'trophy',
      onClick: () => this.scene.start('Achievements'),
    });
  }
}
