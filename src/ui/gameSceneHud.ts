import { GAME } from '../config/gameConfig';
import { DIMENSIONS, LETTERS_OF } from '../config/questions';
import type { Letter } from '../config/questions';
import { chipRect } from '../core/hud';
import { scoreBarModel } from '../core/scoreBar';
import { LETTER_COLORS } from '../theme/palette';
import { t, tf } from '../i18n/t';
import type { StringKey } from '../i18n/t';

/** GameScene-shaped host for HUD helpers. */
export type HudHost = any;

/** 依目前維度票數重繪得分條（雙色分段底＋字母色圓章票數＋加粗分隔線與圓頭旋鈕）。 */
export function drawScoreBar(host: HudHost): void {
  const dimCode = DIMENSIONS[host.dimIndex];
  const [a, b] = LETTERS_OF[dimCode];
  const [na, nb] = host.score.tallyFor(dimCode);
  const m = scoreBarModel(a, na, b, nb);

  host.scoreLeft.setText(m.leftLabel);
  host.scoreRight.setText(m.rightLabel);

  const w = 200;
  const h = 22;
  const x0 = (GAME.width - w) / 2;
  const y0 = 746;
  const g = host.scoreBar;
  g.clear();
  g.fillStyle(LETTER_COLORS[b], 1);
  g.fillRoundedRect(x0, y0, w, h, 11);
  const lw = m.dividerFrac * w;
  if (lw >= w - 11) {
    g.fillStyle(LETTER_COLORS[a], 1);
    g.fillRoundedRect(x0, y0, w, h, 11);
  } else if (lw > 0) {
    g.fillStyle(LETTER_COLORS[a], 1);
    g.fillRoundedRect(x0, y0, lw, h, { tl: 11, bl: 11, tr: 0, br: 0 });
  }

  const badge = (text: any, letter: Letter) => {
    const textLeft = text.originX === 1 ? text.x - text.displayWidth : text.x;
    const textTop = text.y - text.displayHeight / 2;
    const r = chipRect(textLeft, textTop, text.displayWidth, text.displayHeight, {
      padX: 8,
      padY: 3,
      r: (text.displayHeight + 6) / 2,
    });
    g.fillStyle(LETTER_COLORS[letter], 1);
    g.fillRoundedRect(r.x, r.y, r.w, r.h, r.r);
  };
  badge(host.scoreLeft, a);
  badge(host.scoreRight, b);

  const dx = x0 + m.dividerFrac * w;
  g.fillStyle(0xffffff, 1);
  g.fillRect(dx - 2.5, y0 - 2, 5, h + 4);
  g.fillCircle(dx, y0 - 2, 4);
}

/** 進入新維度時，畫面中央淡入淡出顯示新維度名稱。 */
export function announceDimension(host: HudHost): void {
  const dimCode = DIMENSIONS[host.dimIndex];
  const label = host.add
    .text(GAME.width / 2, GAME.height * 0.32, t(`dim.${dimCode}` as StringKey), {
      fontSize: '26px',
      fontStyle: 'bold',
      color: '#ffffff',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 5,
      wordWrap: { width: GAME.width - 40, useAdvancedWrap: true },
      fontFamily: 'Fredoka, system-ui, sans-serif',
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(30)
    .setAlpha(0);
  if (host.reducedMotion) {
    label.setAlpha(1);
    host.time.delayedCall(1000, () => label.destroy());
    return;
  }
  host.tweens.add({
    targets: label,
    alpha: { from: 0, to: 1 },
    duration: 300,
    yoyo: true,
    hold: 700,
    onComplete: () => label.destroy(),
  });
}

export function updateLevelLabel(host: HudHost): void {
  const dimCode = DIMENSIONS[host.dimIndex];
  host.levelLabel.setText(tf('level.label', [host.dimIndex + 1, t(`dim.${dimCode}` as StringKey)]));
}
