import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { ScoreTracker } from '../core/ScoreTracker';
import { describeType } from '../config/personalities';
import { t, tf } from '../i18n/t';
import type { StringKey } from '../i18n/t';
import { Button } from '../ui/Button';
import { MuteButton } from '../ui/MuteButton';
import { groupOf, groupColorOf } from '../core/temperament';
import { recordPlay, getPlays } from '../core/profile';
import { newlyUnlocked } from '../core/achievements';
import { getSeenIds, markSeen } from '../core/achievementStore';
import { prefersReducedMotion } from '../ui/reducedMotion';
import { buildShareCardModel } from '../share/shareCardModel';
import { renderShareCard, canvasToBlob, downloadBlob } from '../share/shareCard';
import { getLocale } from '../i18n/store';
import { getInvite } from '../core/invite';
import { sharedLetters, compareKey } from '../core/compare';

interface ResultInit {
  score: ScoreTracker;
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  create(data: ResultInit) {
    const type = data.score.result();
    recordPlay(type, data.score.allTallies());
    const fresh = newlyUnlocked(getPlays(), getSeenIds());
    if (fresh.length > 0) {
      this.showUnlockToast(fresh);
      markSeen(fresh);
    }
    const desc = describeType(type);
    const group = groupOf(type);
    const groupHex = '#' + groupColorOf(type).toString(16).padStart(6, '0');
    this.cameras.main.setBackgroundColor('#1a1c2c');
    const cx = GAME.width / 2;

    this.add
      .text(cx, 180, t('result.heading'), {
        fontSize: '18px',
        color: '#ffffffaa',
        fontFamily: 'Fredoka, system-ui, sans-serif',
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 250, type, {
        fontSize: '72px',
        color: groupHex,
        fontStyle: 'bold',
        fontFamily: 'Fredoka, system-ui, sans-serif',
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 320, tf('result.groupLabel', [t(`group.${group}` as StringKey)]), {
        fontFamily: 'Fredoka, system-ui, sans-serif',
        fontSize: '20px',
        color: groupHex,
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 390, desc, {
        fontSize: '18px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: GAME.width - 60 },
        fontFamily: 'Nunito, system-ui, sans-serif',
      })
      .setOrigin(0.5);

    // 好友對比（有邀請時）
    const friend = getInvite();
    if (friend) {
      this.add
        .text(cx, 458, tf(compareKey(sharedLetters(type, friend)), [friend]), {
          fontSize: '16px',
          color: '#ffe066',
          align: 'center',
          wordWrap: { width: GAME.width - 60 },
          fontFamily: 'Nunito, system-ui, sans-serif',
        })
        .setOrigin(0.5);
    }

    const shareBtn = new Button(this, cx, 530, t('share.action'), {
      width: 240,
      height: 54,
      fontSize: 20,
      onClick: async () => {
        const locale = getLocale();
        const shareUrl = `${location.origin}/t/${type}?lang=${locale}`;
        const text = tf('result.share', [type, desc, shareUrl]);
        try {
          const model = buildShareCardModel(type, data.score.allTallies(), locale);
          const canvas = renderShareCard(model);
          const blob = await canvasToBlob(canvas);
          const file = new File([blob], `mbti-jump-${type}.png`, { type: 'image/png' });
          const nav = navigator as Navigator & {
            canShare?: (d: ShareData) => boolean;
          };
          if (nav.share && nav.canShare?.({ files: [file] })) {
            try {
              await nav.share({ files: [file], text, url: shareUrl });
              return;
            } catch (e) {
              if ((e as Error).name === 'AbortError') return; // 使用者取消：不動鈕面
              // 其他分享錯誤 → 落到下方複製＋下載 fallback
            }
          }
          // 先下載（不需權限），再嘗試複製；複製失敗也不影響已完成的下載
          downloadBlob(blob, `mbti-jump-${type}.png`);
          try {
            await navigator.clipboard.writeText(text);
            shareBtn.setLabel(t('share.doneFallback'));
          } catch {
            shareBtn.setLabel(t('share.downloadedOnly'));
          }
        } catch {
          shareBtn.setLabel(t('share.fail'));
        }
      },
    });

    new Button(this, cx, 610, t('result.again'), {
      width: 240,
      height: 54,
      fontSize: 20,
      bg: 0xd9a521,
      bgHover: 0xf0b93a,
      onClick: () => this.scene.start('Start'),
    });

    new Button(this, cx, 680, t('trend.cta'), {
      width: 240,
      height: 50,
      fontSize: 18,
      bg: 0x4298b4,
      bgHover: 0x54aec9,
      bgDown: 0x3a86a0,
      onClick: () => this.scene.start('Trend'),
    });

    new MuteButton(this, GAME.width - 26, 26);
  }

  /** 於畫面上方依序淡入淡出顯示新解鎖成就；reduced-motion 時直接顯示短暫後移除。 */
  private showUnlockToast(ids: string[]): void {
    const cx = GAME.width / 2;
    const reduce = prefersReducedMotion();
    ids.forEach((id, i) => {
      const label = this.add
        .text(cx, 44 + i * 46, tf('ach.unlocked', [t(`ach.${id}.name` as StringKey)]), {
          fontFamily: 'Fredoka, system-ui, sans-serif',
          fontSize: '18px',
          color: '#0f1220',
          backgroundColor: '#ffe066',
          padding: { x: 12, y: 8 },
          align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(60)
        .setAlpha(0);
      if (reduce) {
        label.setAlpha(1);
        this.time.delayedCall(2500 + i * 400, () => label.destroy());
        return;
      }
      this.tweens.add({
        targets: label,
        alpha: { from: 0, to: 1 },
        duration: 300,
        delay: i * 300,
        hold: 2000,
        yoyo: true,
        onComplete: () => label.destroy(),
      });
    });
  }
}
