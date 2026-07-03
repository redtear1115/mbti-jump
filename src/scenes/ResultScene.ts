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
import { ensureGlowTexture } from '../gfx/glowTexture';
import { ensurePlayerTexture } from '../entities/Player';
import { playerColorFor } from '../core/playerColor';
import { letterHex } from '../theme/palette';
import type { Letter } from '../config/questions';

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
    this.cameras.main.setBackgroundColor('#101018');
    const cx = GAME.width / 2;
    const reduce = prefersReducedMotion();

    // 族群色 radial glow（與分享卡同視覺語言）
    this.add
      .image(cx, 300, ensureGlowTexture(this))
      .setDisplaySize(900, 900)
      .setBlendMode(Phaser.BlendModes.SCREEN)
      .setTint(groupColorOf(type));

    // 最終色果凍怪：你的顏色，elastic pop 入場
    // 一律用 proc texture；若日後重新引入點陣 player 資產，需比照 Player 的 ASSET_KEYS fallback
    const jelly = this.add
      .image(cx, 120, ensurePlayerTexture(this, playerColorFor(type.split('') as Letter[])))
      .setScale(2);
    if (!reduce) {
      jelly.setScale(0);
      this.tweens.add({ targets: jelly, scale: 2, duration: 500, ease: 'Back.easeOut' });
    }

    this.add
      .text(cx, 48, t('result.heading'), {
        fontSize: '16px',
        color: '#ffffffaa',
        fontFamily: 'Fredoka, system-ui, sans-serif',
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 210, type, {
        fontSize: '72px',
        color: groupHex,
        fontStyle: 'bold',
        fontFamily: 'Fredoka, system-ui, sans-serif',
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 268, tf('result.groupLabel', [t(`group.${group}` as StringKey)]), {
        fontFamily: 'Fredoka, system-ui, sans-serif',
        fontSize: '20px',
        color: groupHex,
      })
      .setOrigin(0.5);

    // 四維度傾向條（分享卡視覺的 Phaser 版；divider 由中點動畫到實際位置）
    const model = buildShareCardModel(type, data.score.allTallies(), getLocale());
    const barGfx = this.add.graphics();
    const barX = cx - 130;
    const barW = 260;
    const barH = 16;
    const topY = 310;
    const pitch = 30;
    model.dims.forEach((d, i) => {
      const y = topY + i * pitch + barH / 2;
      const labelStyle = {
        fontSize: '13px',
        fontStyle: 'bold',
        fontFamily: 'Nunito, system-ui, sans-serif',
      };
      this.add
        .text(barX - 10, y, d.leftLetter, { ...labelStyle, color: letterHex(d.leftLetter) })
        .setOrigin(1, 0.5);
      this.add
        .text(barX + barW + 10, y, d.rightLetter, { ...labelStyle, color: letterHex(d.rightLetter) })
        .setOrigin(0, 0.5);
    });
    const drawBars = (progress: number) => {
      barGfx.clear();
      model.dims.forEach((d, i) => {
        const y = topY + i * pitch;
        const frac = 0.5 + (d.dividerFrac - 0.5) * progress;
        // 分段實色：右色整條＋左段 per-corner 圓角覆蓋（無跨色漸變髒段）
        barGfx.fillStyle(d.rightColor, 1);
        barGfx.fillRoundedRect(barX, y, barW, barH, 8);
        const lw = frac * barW;
        if (lw > 0) {
          barGfx.fillStyle(d.leftColor, 1);
          barGfx.fillRoundedRect(barX, y, lw, barH, { tl: 8, bl: 8, tr: 0, br: 0 });
        }
        barGfx.fillStyle(0xffffff, 1);
        barGfx.fillRect(barX + frac * barW - 2, y - 2, 4, barH + 4);
      });
    };
    if (reduce) {
      drawBars(1);
    } else {
      const anim = { p: 0 };
      drawBars(0);
      this.tweens.add({
        targets: anim,
        p: 1,
        duration: 400,
        ease: 'Cubic.easeOut',
        onUpdate: () => drawBars(anim.p),
      });
    }

    this.add
      .text(cx, 470, desc, {
        fontSize: '18px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: GAME.width - 60, useAdvancedWrap: true },
        fontFamily: 'Nunito, system-ui, sans-serif',
      })
      .setOrigin(0.5);

    // 好友對比（有邀請時）
    const friend = getInvite();
    if (friend) {
      this.add
        .text(cx, 535, tf(compareKey(sharedLetters(type, friend)), [friend]), {
          fontSize: '16px',
          color: '#ffe066',
          align: 'center',
          wordWrap: { width: GAME.width - 60, useAdvancedWrap: true },
          fontFamily: 'Nunito, system-ui, sans-serif',
        })
        .setOrigin(0.5);
    }

    const shareBtn = new Button(this, cx, 585, t('share.action'), {
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

    new Button(this, cx, 650, t('result.again'), {
      width: 240,
      height: 54,
      fontSize: 20,
      bg: 0xd9a521,
      bgHover: 0xf0b93a,
      onClick: () => this.scene.start('Start'),
    });

    new Button(this, cx, 712, t('trend.cta'), {
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
