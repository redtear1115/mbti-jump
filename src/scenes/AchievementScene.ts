import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { BODY_FONT, INK, INK_CSS, MANGA_YELLOW, PAPER, PAPER_CARD, TITLE_FONT } from '../theme/manga';
import { inkFrame } from '../gfx/mangaFx';
import { ACHIEVEMENTS, unlockedIds } from '../core/achievements';
import { getPlays } from '../core/profile';
import { t, tf } from '../i18n/t';
import type { StringKey } from '../i18n/t';
import { MuteButton } from '../ui/MuteButton';
import { Button } from '../ui/Button';
import { ensureIconTexture } from '../ui/icons';

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
    this.cameras.main.setBackgroundColor(PAPER);
    inkFrame(this);
    const cx = GAME.width / 2;
    new MuteButton(this, GAME.width - 26, 26);

    this.add
      .text(cx, 48, t('ach.title'), { fontFamily: TITLE_FONT, fontSize: '30px', fontStyle: 'bold', color: INK_CSS })
      .setOrigin(0.5);

    const plays = getPlays();
    const unlocked = unlockedIds(plays);

    // 總進度：已解鎖 x/y + 200×10 進度條
    this.add
      .text(cx, 84, tf('ach.progress', [unlocked.size, ACHIEVEMENTS.length]), {
        fontFamily: BODY_FONT,
        fontSize: '14px',
        color: '#1c1424aa',
      })
      .setOrigin(0.5);
    const totalG = this.add.graphics();
    const tw = 200;
    const tx = cx - tw / 2;
    totalG.fillStyle(INK, 0.12);
    totalG.fillRoundedRect(tx, 100, tw, 10, 5);
    if (unlocked.size > 0) {
      totalG.fillStyle(MANGA_YELLOW, 1);
      totalG.fillRoundedRect(tx, 100, Math.max(10, (tw * unlocked.size) / ACHIEVEMENTS.length), 10, 5);
    }
    totalG.lineStyle(2, INK, 1);
    totalG.strokeRoundedRect(tx, 100, tw, 10, 5);

    // 兩欄徽章卡
    ACHIEVEMENTS.forEach((a, i) => {
      const x = GRID_X + (i % 2) * COL_PITCH;
      const y = GRID_Y + Math.floor(i / 2) * ROW_PITCH;
      const on = unlocked.has(a.id);
      const g = this.add.graphics();
      g.fillStyle(INK, 1);
      g.fillRoundedRect(x + 3, y + 3, CARD_W, CARD_H, 10);
      g.fillStyle(on ? PAPER_CARD : 0xe7e0d4, 1);
      g.fillRoundedRect(x, y, CARD_W, CARD_H, 10);
      g.lineStyle(on ? 3 : 2, on ? 0xe23b4a : INK, 1);
      g.strokeRoundedRect(x, y, CARD_W, CARD_H, 10);

      // 徽章：彩色獎盃（解鎖）或灰鎖（未解鎖）
      const bx = x + 28;
      const by = y + 30;
      g.fillStyle(on ? MANGA_YELLOW : PAPER_CARD, 1);
      g.fillCircle(bx, by, 16);
      g.lineStyle(2, INK, 1);
      g.strokeCircle(bx, by, 16);
      this.add
        .image(bx, by, ensureIconTexture(this, on ? 'trophy' : 'lock'))
        .setDisplaySize(18, 18)
        .setTint(INK);

      const nameText = this.add
        .text(x + 52, y + 22, t(`ach.${a.id}.name` as StringKey), {
          fontFamily: TITLE_FONT,
          fontStyle: 'bold',
          fontSize: '16px',
          color: on ? INK_CSS : '#5c564e',
          wordWrap: { width: CARD_W - 60, useAdvancedWrap: true },
        })
        .setOrigin(0, 0);
      const descY = Math.max(y + 56, nameText.y + nameText.displayHeight + 6);
      this.add
        .text(x + 14, descY, t(`ach.${a.id}.desc` as StringKey), {
          fontFamily: BODY_FONT,
          fontSize: '13px',
          color: on ? INK_CSS : '#5c564e',
          wordWrap: { width: CARD_W - 28, useAdvancedWrap: true },
        })
        .setOrigin(0, 0);

      // 可計數成就：卡底進度條＋數字
      const prog = a.progress?.(plays);
      if (prog) {
        const pw = CARD_W - 28;
        const px = x + 14;
        const py = y + CARD_H - 16;
        g.fillStyle(INK, 0.12);
        g.fillRoundedRect(px, py, pw, 4, 2);
        if (prog.current > 0) {
          g.fillStyle(MANGA_YELLOW, 1);
          g.fillRoundedRect(px, py, Math.max(4, (pw * prog.current) / prog.target), 4, 2);
        }
        this.add
          .text(x + CARD_W - 14, py - 4, `${prog.current}/${prog.target}`, {
            fontFamily: BODY_FONT,
            fontSize: '12px',
            color: '#3a342c',
          })
          .setOrigin(1, 1);
      }
    });

    new Button(this, cx, 758, t('common.back'), {
      width: 160,
      height: 46,
      fontSize: 16,
      bg: PAPER_CARD,
      bgHover: 0xfff3c4,
      bgDown: 0xe6dcc8,
      textColor: INK_CSS,
      onClick: () => this.scene.start('Start'),
    });
  }
}
