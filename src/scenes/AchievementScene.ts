import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { PALETTE } from '../theme/palette';
import { ACHIEVEMENTS, unlockedIds } from '../core/achievements';
import { getPlays } from '../core/profile';
import { t, tf } from '../i18n/t';
import type { StringKey } from '../i18n/t';
import { MuteButton } from '../ui/MuteButton';
import { Button } from '../ui/Button';
import { ensureIconTexture } from '../ui/icons';

const TITLE_FONT = 'Fredoka, system-ui, sans-serif';
const BODY_FONT = 'Nunito, system-ui, sans-serif';

const CARD_W = 198;
const CARD_H = 126;
const COL_PITCH = 210; // CARD_W + 欄距 12
const ROW_PITCH = 138; // CARD_H + 列距 12
const GRID_X = 20;
const GRID_Y = 120;

export class AchievementScene extends Phaser.Scene {
  constructor() {
    super('Achievements');
  }

  create() {
    this.cameras.main.setBackgroundColor(PALETTE.surface);
    const cx = GAME.width / 2;
    new MuteButton(this, GAME.width - 26, 26);

    this.add
      .text(cx, 48, t('ach.title'), { fontFamily: TITLE_FONT, fontSize: '30px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);

    const plays = getPlays();
    const unlocked = unlockedIds(plays);

    // 總進度：已解鎖 x/y + 200×10 進度條
    this.add
      .text(cx, 84, tf('ach.progress', [unlocked.size, ACHIEVEMENTS.length]), {
        fontFamily: BODY_FONT,
        fontSize: '14px',
        color: PALETTE.textMuted,
      })
      .setOrigin(0.5);
    const totalG = this.add.graphics();
    const tw = 200;
    const tx = cx - tw / 2;
    totalG.fillStyle(0xffffff, 0.13);
    totalG.fillRoundedRect(tx, 100, tw, 10, 5);
    if (unlocked.size > 0) {
      totalG.fillStyle(PALETTE.accent, 1);
      totalG.fillRoundedRect(tx, 100, Math.max(10, (tw * unlocked.size) / ACHIEVEMENTS.length), 10, 5);
    }

    // 兩欄徽章卡
    ACHIEVEMENTS.forEach((a, i) => {
      const x = GRID_X + (i % 2) * COL_PITCH;
      const y = GRID_Y + Math.floor(i / 2) * ROW_PITCH;
      const on = unlocked.has(a.id);
      const g = this.add.graphics();
      g.fillStyle(PALETTE.surfaceAlt, 1);
      g.fillRoundedRect(x, y, CARD_W, CARD_H, 12);
      if (on) {
        g.lineStyle(2, PALETTE.accent, 1);
        g.strokeRoundedRect(x, y, CARD_W, CARD_H, 12);
      }

      // 徽章：彩色獎盃（解鎖）或灰鎖（未解鎖）
      const bx = x + 28;
      const by = y + 30;
      g.fillStyle(on ? PALETTE.accent : 0xffffff, on ? 1 : 0.13);
      g.fillCircle(bx, by, 16);
      this.add
        .image(bx, by, ensureIconTexture(this, on ? 'trophy' : 'lock'))
        .setDisplaySize(18, 18)
        .setTint(on ? 0x0f1220 : 0x8888aa);

      const nameText = this.add
        .text(x + 52, y + 22, t(`ach.${a.id}.name` as StringKey), {
          fontFamily: TITLE_FONT,
          fontSize: '15px',
          color: on ? '#ffe066' : '#ffffff66',
          wordWrap: { width: CARD_W - 60, useAdvancedWrap: true },
        })
        .setOrigin(0, 0);
      const descY = Math.max(y + 56, nameText.y + nameText.displayHeight + 6);
      this.add
        .text(x + 14, descY, t(`ach.${a.id}.desc` as StringKey), {
          fontFamily: BODY_FONT,
          fontSize: '11px',
          color: on ? '#ffffffcc' : '#ffffff44',
          wordWrap: { width: CARD_W - 28, useAdvancedWrap: true },
        })
        .setOrigin(0, 0);

      // 可計數成就：卡底進度條＋數字
      const prog = a.progress?.(plays);
      if (prog) {
        const pw = CARD_W - 28;
        const px = x + 14;
        const py = y + CARD_H - 16;
        g.fillStyle(0xffffff, 0.13);
        g.fillRoundedRect(px, py, pw, 4, 2);
        if (prog.current > 0) {
          g.fillStyle(PALETTE.accent, 1);
          g.fillRoundedRect(px, py, Math.max(4, (pw * prog.current) / prog.target), 4, 2);
        }
        this.add
          .text(x + CARD_W - 14, py - 4, `${prog.current}/${prog.target}`, {
            fontFamily: BODY_FONT,
            fontSize: '10px',
            color: '#ffffff88',
          })
          .setOrigin(1, 1);
      }
    });

    new Button(this, cx, 758, t('common.back'), {
      width: 160,
      height: 46,
      fontSize: 16,
      bg: PALETTE.surfaceAlt,
      bgHover: 0x3a3e58,
      bgDown: 0x22243a,
      textColor: '#ffffff',
      onClick: () => this.scene.start('Start'),
    });
  }
}
