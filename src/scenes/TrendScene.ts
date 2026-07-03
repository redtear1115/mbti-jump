import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { PALETTE } from '../theme/palette';
import { DIMENSIONS, LETTERS_OF } from '../config/questions';
import { getPlays, clearPlays } from '../core/profile';
import { computeTrends } from '../core/trends';
import { groupColorOf } from '../core/temperament';
import { t, tf } from '../i18n/t';
import { MuteButton } from '../ui/MuteButton';
import { Button } from '../ui/Button';
import { ensurePlayerTexture } from '../entities/Player';
import { PLAYER_BASE_COLOR } from '../core/playerColor';
import { ScoreTracker } from '../core/ScoreTracker';
import { requestTiltPermission } from '../input/tiltPermission';

const TITLE_FONT = 'Fredoka, system-ui, sans-serif';
const BODY_FONT = 'Nunito, system-ui, sans-serif';

export class TrendScene extends Phaser.Scene {
  private clearArmed = false;

  constructor() {
    super('Trend');
  }

  create() {
    this.clearArmed = false;
    this.cameras.main.setBackgroundColor(PALETTE.surface);
    const cx = GAME.width / 2;
    new MuteButton(this, GAME.width - 26, 26);

    this.add
      .text(cx, 48, t('trend.title'), { fontFamily: TITLE_FONT, fontSize: '30px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);

    const trends = computeTrends(getPlays());

    if (trends.totalPlays === 0) {
      // 空狀態：果凍怪＋文案＋直接開局（少走一步回開始頁）
      this.add.image(cx, 300, ensurePlayerTexture(this, PLAYER_BASE_COLOR)).setScale(1.6);
      this.add
        .text(cx, 400, t('trend.empty'), {
          fontFamily: BODY_FONT,
          fontSize: '18px',
          color: '#ffffffcc',
          align: 'center',
          wordWrap: { width: GAME.width - 60, useAdvancedWrap: true },
        })
        .setOrigin(0.5);
      new Button(this, cx, 480, t('start.cta'), {
        width: 240,
        height: 54,
        fontSize: 20,
        onClick: async () => {
          await requestTiltPermission();
          this.scene.start('Game', { score: new ScoreTracker() });
        },
      });
    } else {
      this.add
        .text(cx, 108, tf('trend.totalPlays', [trends.totalPlays]), { fontFamily: BODY_FONT, fontSize: '18px', color: PALETTE.textMuted })
        .setOrigin(0.5);

      if (trends.topType) {
        this.add.text(cx, 150, t('trend.topType'), { fontFamily: BODY_FONT, fontSize: '14px', color: PALETTE.textMuted }).setOrigin(0.5);
        const hex = '#' + groupColorOf(trends.topType).toString(16).padStart(6, '0');
        this.add.text(cx, 188, trends.topType, { fontFamily: TITLE_FONT, fontSize: '44px', color: hex, fontStyle: 'bold' }).setOrigin(0.5);
      }

      let y = 250;
      for (const d of DIMENSIONS) {
        const [a, b] = LETTERS_OF[d];
        const lean = trends.dimensionLean[d];
        this.drawBar(cx, y, a, b, lean.firstPct, lean.secondPct);
        y += 56;
      }

      this.add.text(cx, 486, t('trend.recent'), { fontFamily: BODY_FONT, fontSize: '14px', color: PALETTE.textMuted }).setOrigin(0.5);
      trends.recent.forEach((r, i) => {
        this.add.text(cx, 514 + i * 26, r.type, { fontFamily: BODY_FONT, fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
      });
    }

    // 清除鈕（兩步確認；空狀態無可清）
    if (trends.totalPlays > 0) {
      const clearBtn = new Button(this, cx, 690, t('trend.clear'), {
        width: 200,
        height: 46,
        fontSize: 16,
        bg: PALETTE.no,
        bgHover: 0xc95568,
        bgDown: 0x9a3145,
        textColor: '#ffffff',
        onClick: () => {
          if (!this.clearArmed) {
            this.clearArmed = true;
            clearBtn.setLabel(t('trend.clearConfirm'));
            return;
          }
          clearPlays();
          this.scene.restart();
        },
      });
    }

    new Button(this, cx, 748, t('common.back'), {
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

  /** 一維度的偏向比例條：左標 a 與 firstPct，右標 b 與 secondPct。 */
  private drawBar(cx: number, y: number, a: string, b: string, firstPct: number, secondPct: number): void {
    const w = 220;
    const h = 20;
    const x = cx - w / 2;
    const g = this.add.graphics();
    g.fillStyle(PALETTE.surfaceAlt, 1);
    g.fillRoundedRect(x, y, w, h, 6);
    g.fillStyle(PALETTE.accent, 1);
    const fw = Math.max(0, Math.min(w, (w * firstPct) / 100));
    if (fw > 0) g.fillRoundedRect(x, y, fw, h, 6);
    this.add.text(x - 8, y + h / 2, `${a} ${firstPct}%`, { fontFamily: BODY_FONT, fontSize: '13px', color: '#ffffff' }).setOrigin(1, 0.5);
    this.add.text(x + w + 8, y + h / 2, `${b} ${secondPct}%`, { fontFamily: BODY_FONT, fontSize: '13px', color: '#ffffff' }).setOrigin(0, 0.5);
  }
}
