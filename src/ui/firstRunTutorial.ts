import { GAME } from '../config/gameConfig';
import { t } from '../i18n/t';
import { shouldShowTutorial, readTutorialFlag, markTutorialDone } from '../core/tutorial';

/** GameScene-shaped host; fields accessed dynamically (private on GameScene). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TutorialHost = any;

/**
 * First game / first-ever guided beat on dimension 0: left = Yes, right = No.
 * Physics stay playable; flag persists after first answer or dismiss.
 */
export function maybeStartTutorial(host: TutorialHost): void {
  if (host.dimIndex !== 0) return;
  if (!shouldShowTutorial(readTutorialFlag())) return;
  host.tutorialActive = true;

  const cx = GAME.width / 2;
  const overlay = host.add
    .rectangle(cx, GAME.height * 0.42, GAME.width - 24, 120, 0x0d0e1c, 0.55)
    .setScrollFactor(0)
    .setDepth(28)
    .setInteractive({ useHandCursor: true });

  const hint = host.add
    .text(cx, GAME.height * 0.4, t('tutorial.hint'), {
      fontSize: '15px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: GAME.width - 48, useAdvancedWrap: true },
      fontFamily: 'Nunito, system-ui, sans-serif',
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(29);

  const dismissBtn = host.add
    .text(cx, GAME.height * 0.48, t('tutorial.dismiss'), {
      fontSize: '14px',
      color: '#ffe066',
      fontFamily: 'Fredoka, system-ui, sans-serif',
      backgroundColor: '#ffffff22',
      padding: { x: 12, y: 6 },
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(29)
    .setInteractive({ useHandCursor: true });

  const end = () => dismissTutorial(host);
  overlay.on('pointerup', end);
  dismissBtn.on('pointerup', end);

  host.tutorialNodes = [overlay, hint, dismissBtn];

  // Force preview chips visible for the first fork mapping cue
  host.setPreviewVisible(true, true);

  if (!host.reducedMotion) {
    host.tweens.add({
      targets: [host.chipLeft, host.chipRight, host.previewLeft, host.previewRight],
      alpha: { from: 0.55, to: 1 },
      duration: 500,
      yoyo: true,
      repeat: 3,
    });
    host.tweens.add({
      targets: hint,
      alpha: { from: 0.7, to: 1 },
      duration: 600,
      yoyo: true,
      repeat: 2,
    });
  }
}

export function dismissTutorial(host: TutorialHost): void {
  if (!host.tutorialActive) return;
  host.tutorialActive = false;
  markTutorialDone();
  host.tweens.killTweensOf([
    host.chipLeft,
    host.chipRight,
    host.previewLeft,
    host.previewRight,
    ...host.tutorialNodes,
  ]);
  for (const n of host.tutorialNodes) n.destroy();
  host.tutorialNodes = [];
}
