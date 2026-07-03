import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { LEVEL_BG, PALETTE, LETTER_COLORS } from '../theme/palette';
import { Background } from '../gfx/Background';
import { AuroraBackground } from '../gfx/AuroraBackground';
import { Player } from '../entities/Player';
import { Platform } from '../entities/Platform';
import { Controls } from '../input/Controls';
import { ScoreTracker } from '../core/ScoreTracker';
import { shouldAutoComplete } from '../core/progression';
import { DIMENSIONS, LETTERS_OF, questionsForDimension } from '../config/questions';
import { pickQuestions } from '../core/pickQuestions';
import type { QuestionDef, Letter } from '../config/questions';
import { chipRect } from '../core/hud';
import { t, tf } from '../i18n/t';
import type { StringKey } from '../i18n/t';
import { prefersReducedMotion } from '../ui/reducedMotion';
import { playerColorFor } from '../core/playerColor';
import { Sfx } from '../audio/Sfx';
import { MuteButton } from '../ui/MuteButton';
import { scoreBarModel } from '../core/scoreBar';

interface GameInit {
  score: ScoreTracker;
}

/**
 * 無縫單一爬塔：整場是一座塔，玩家一路往上跳。
 * 每答完（或跳過）一個維度的 5 題，塔直接往上接下一個維度——不切場景、不需點擊。
 * 四個維度全部鎖定後才進結算。掉落 → GameOver，重來時從尚未鎖定的維度接續。
 */
export class GameScene extends Phaser.Scene {
  private score!: ScoreTracker;
  private dimIndex = 0; // 目前維度（0..3）
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private controls!: Controls;

  private questions: QuestionDef[] = [];
  private nextQuestionIdx = 0; // 目前維度中下一個要生成的題目
  private dimAnsweredIds = new Set<string>(); // 目前維度已計分的題目 id（換維度時清空）
  private spawnY = 0; // 下一個平台的 y（往上遞減）
  private platformsSinceFork = 0;
  private dimComplete = false; // 目前維度是否已鎖定（避免重複鎖定）
  private banner!: Phaser.GameObjects.Text;
  private levelLabel!: Phaser.GameObjects.Text;
  private scoreBar!: Phaser.GameObjects.Graphics; // 得分條底＋分隔線
  private scoreLeft!: Phaser.GameObjects.Text; // 左側票數
  private scoreRight!: Phaser.GameObjects.Text; // 右側票數
  private previewLeft!: Phaser.GameObjects.Text;
  private previewRight!: Phaser.GameObjects.Text;
  private chipLeft!: Phaser.GameObjects.Graphics;
  private chipRight!: Phaser.GameObjects.Graphics;
  private previewShown = false;
  private lastForkY = -Infinity; // 目前維度最後一題分叉的 y
  private forks: { qIndex: number; y: number }[] = [];
  private shownQuestionIdx = -1;
  private reducedMotion = false;
  private background!: Background;
  private aurora!: AuroraBackground;

  constructor() {
    super('Game');
  }

  init(data: GameInit) {
    this.score = data.score;
    // 從尚未鎖定的維度接續（重玩時保留已鎖定的維度）
    this.dimIndex = this.score.lockedCount();
    this.questions = pickQuestions(
      questionsForDimension(DIMENSIONS[this.dimIndex]),
      GAME.questionsPerLevel,
      Math.random,
    );
    this.nextQuestionIdx = 0;
    this.dimAnsweredIds.clear();
    this.platformsSinceFork = 0;
    this.dimComplete = false;
    this.lastForkY = -Infinity;
    this.forks = [];
    this.shownQuestionIdx = -1;
    this.score.resetCurrentLevel();
    this.previewShown = false;
  }

  create() {
    this.reducedMotion = prefersReducedMotion();
    this.cameras.main.setBackgroundColor(LEVEL_BG[this.dimIndex]);
    this.aurora = new AuroraBackground(this, this.reducedMotion);
    this.aurora.retint(this.dimIndex);
    this.background = new Background(this);
    this.background.setDimension(this.dimIndex);
    this.platforms = this.physics.add.staticGroup();

    // 起始平台（玩家正下方）
    this.spawnY = 600; // 起始平台移到底部 HUD 卡（646 起）之上
    this.addNormalPlatform(GAME.width / 2, this.spawnY);

    // 預先往上鋪一段
    this.spawnY -= GAME.platformGapY;
    for (let i = 0; i < 8; i++) {
      this.spawnNextRow();
    }

    this.player = new Player(this, GAME.width / 2, 550, playerColorFor(this.score.lockedLetters()));
    this.player.setDepth(19.2); // 高於 HUD 底卡(19)、低於 chips(19.5)/HUD 文字(20)：低空與墜落時仍可見
    this.player.bounce();

    this.physics.add.collider(
      this.player,
      this.platforms,
      this.onLand as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      this.onlyWhenFalling as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      this,
    );

    this.controls = new Controls(this);
    this.controls.start();

    // HUD 底襯（畫面底部）：往上跳的視野留給上方，資訊層固定在下方
    const hudScrim = this.add.graphics().setScrollFactor(0).setDepth(19);
    hudScrim.fillStyle(PALETTE.surface, 0.72);
    hudScrim.fillRoundedRect(0, 646, GAME.width, 154, { tl: 16, tr: 16, bl: 0, br: 0 });

    this.banner = this.add
      .text(GAME.width / 2, 660, '', {
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: GAME.width - 24, useAdvancedWrap: true },
        fontFamily: 'Fredoka, system-ui, sans-serif',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(20);

    this.levelLabel = this.add
      .text(GAME.width / 2, 728, '', {
        fontSize: '14px',
        color: '#ffffffaa',
        fontFamily: 'Nunito, system-ui, sans-serif',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(20);
    this.scoreBar = this.add.graphics().setScrollFactor(0).setDepth(20);
    const scoreLabelStyle = {
      fontSize: '14px',
      fontStyle: 'bold',
      color: PALETTE.textOn,
      fontFamily: 'Nunito, system-ui, sans-serif',
    };
    this.scoreLeft = this.add
      .text(135, 757, '', scoreLabelStyle)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(21);
    this.scoreRight = this.add
      .text(315, 757, '', scoreLabelStyle)
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(21);
    this.updateLevelLabel();
    this.drawScoreBar();

    const previewStyle = {
      fontSize: '17px',
      fontStyle: 'bold',
      color: PALETTE.textOn,
      wordWrap: { width: GAME.width * 0.44, useAdvancedWrap: true },
      fontFamily: 'Nunito, system-ui, sans-serif',
    };
    this.chipLeft = this.add.graphics().setScrollFactor(0).setDepth(19.5).setAlpha(0);
    this.chipRight = this.add.graphics().setScrollFactor(0).setDepth(19.5).setAlpha(0);
    this.previewLeft = this.add
      .text(12, 618, '', { ...previewStyle, align: 'left' })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(20)
      .setAlpha(0);
    this.previewRight = this.add
      .text(GAME.width - 12, 618, '', { ...previewStyle, align: 'right' })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(20)
      .setAlpha(0);

    new MuteButton(this, GAME.width - 26, 26);
  }

  update() {
    this.player.setAxis(this.controls.axis);
    this.player.wrapHorizontally();

    // 相機只向上跟隨：玩家保持在畫面約 60% 高度，相機絕不往下移
    const targetScroll = this.player.y - GAME.height * 0.6;
    if (targetScroll < this.cameras.main.scrollY) {
      this.cameras.main.scrollY = targetScroll;
    }
    this.background.update(this.cameras.main.scrollY);

    // 持續在上方補平台（多看 1.5 螢幕，讓題目分叉提早生成→題目橫幅有足夠提前量）
    const topVisible = this.cameras.main.scrollY;
    while (this.spawnY > topVisible - GAME.height * 1.5) {
      this.spawnNextRow();
    }

    // 題目橫幅 + 答案預覽跟著玩家「即將接近的分叉」走
    const fork = this.nextFork();
    if (fork) {
      if (fork.qIndex !== this.shownQuestionIdx) {
        this.shownQuestionIdx = fork.qIndex;
        this.updateBanner(fork.qIndex);
        this.updatePreview(fork.qIndex);
        this.setPreviewVisible(false, true); // 換題瞬間隱藏，等接近新分叉再亮
      }
      // 進入提示範圍後鎖住顯示（彈跳會反覆穿越閾值，不能用即時距離開關）
      const dist = this.player.y - fork.y;
      if (dist < GAME.height * 1.5) {
        this.setPreviewVisible(true);
      }
    } else {
      this.setPreviewVisible(false);
    }

    // 跳過題目的保險：本維度所有分叉都生成後，玩家明顯爬過最後一題分叉，
    // 就以「已記錄的答案」鎖定本維度並無縫接下一維度（不要求答滿 5 題）。
    if (
      !this.dimComplete &&
      shouldAutoComplete(this.nextQuestionIdx, this.questions.length, this.player.y, this.lastForkY, GAME.height)
    ) {
      this.completeCurrentDimension();
    }

    // 掉落判定
    const fallLine = this.cameras.main.scrollY + GAME.height + GAME.fallMargin;
    if (this.player.y > fallLine) {
      this.gameOver();
    }
  }

  // --- 平台生成 ---

  private spawnNextRow(): void {
    const needFork = this.platformsSinceFork >= GAME.questionGapForks && this.nextQuestionIdx < this.questions.length;
    if (needFork) {
      this.addQuestionFork(this.spawnY);
      this.platformsSinceFork = 0;
    } else {
      const width = Phaser.Math.Between(GAME.platformWidthMin, GAME.platformWidthMax);
      const x = Phaser.Math.Between(width / 2, GAME.width - width / 2);
      this.addNormalPlatform(x, this.spawnY, width);
      this.platformsSinceFork += 1;
    }
    this.spawnY -= GAME.platformGapY;
  }

  private addNormalPlatform(x: number, y: number, width?: number): void {
    this.platforms.add(Platform.makeNormal(this, x, y, width));
  }

  private addQuestionFork(y: number): void {
    const q = this.questions[this.nextQuestionIdx];
    const isLast = this.nextQuestionIdx === this.questions.length - 1;
    this.platforms.add(
      Platform.makeQuestion(this, GAME.forkLeftX, y, {
        side: q.yes.side,
        questionId: q.id,
        label: t(`q.${q.id}.yes` as StringKey),
        isYes: true,
      }),
    );
    this.platforms.add(
      Platform.makeQuestion(this, GAME.forkRightX, y, {
        side: q.no.side,
        questionId: q.id,
        label: t(`q.${q.id}.no` as StringKey),
        isYes: false,
      }),
    );
    this.forks.push({ qIndex: this.nextQuestionIdx, y });
    if (isLast) {
      this.lastForkY = y;
      this.add
        .text(GAME.width / 2, y - 54, t('level.lastQuestionMarker'), {
          fontSize: '20px',
          fontStyle: 'bold',
          color: '#ffe066',
          align: 'center',
          stroke: '#000000',
          strokeThickness: 5,
          fontFamily: 'Fredoka, system-ui, sans-serif',
        })
        .setOrigin(0.5)
        .setDepth(15);
    }
    this.nextQuestionIdx += 1;
  }

  // --- 碰撞 ---

  private onlyWhenFalling = (): boolean => {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    return body.velocity.y > 0;
  };

  private onLand = (_player: unknown, platformObj: unknown): void => {
    const platform = platformObj as Platform;
    this.player.bounce();
    Sfx.play('bounce');

    if (platform.kind === 'question' && platform.side && platform.questionId !== undefined) {
      if (!this.dimAnsweredIds.has(platform.questionId)) {
        this.dimAnsweredIds.add(platform.questionId);
        Sfx.play('select');
        this.score.recordAnswer(platform.side);
        this.drawScoreBar();
        if (this.dimAnsweredIds.size >= GAME.questionsPerLevel) {
          this.completeCurrentDimension();
        }
      }
    }
  };

  /** 玩家即將接近的分叉：在玩家上方、最靠近的未通過分叉；找不到回 null。 */
  private nextFork(): { qIndex: number; y: number } | null {
    let best: { qIndex: number; y: number } | null = null;
    for (const f of this.forks) {
      if (f.y < this.player.y && (best === null || f.y > best.y)) {
        best = f;
      }
    }
    return best;
  }

  private updateBanner(questionIdx: number): void {
    const q = this.questions[questionIdx];
    if (!q) return;
    const isLast = questionIdx === this.questions.length - 1;
    const prefix = isLast ? t('level.lastQuestion') : `(${questionIdx + 1}/${GAME.questionsPerLevel})`;
    this.banner.setText(`${prefix} ${t(`q.${q.id}.text` as StringKey)}`);
  }

  private updatePreview(questionIdx: number): void {
    const q = this.questions[questionIdx];
    if (!q) return;
    this.previewLeft.setText(`◀ ${t(`q.${q.id}.yes` as StringKey)}`);
    this.previewRight.setText(`${t(`q.${q.id}.no` as StringKey)} ▶`);
    this.drawPreviewChip(this.chipLeft, this.previewLeft, q.yes.side);
    this.drawPreviewChip(this.chipRight, this.previewRight, q.no.side);
  }

  /** 依文字實際包框重畫膠囊底（字母色實心、深字在上）。 */
  private drawPreviewChip(gfx: Phaser.GameObjects.Graphics, text: Phaser.GameObjects.Text, side: Letter): void {
    gfx.clear();
    if (!text.text) return;
    const textLeft = text.originX === 1 ? text.x - text.displayWidth : text.x;
    const r = chipRect(textLeft, text.y, text.displayWidth, text.displayHeight);
    gfx.fillStyle(LETTER_COLORS[side], 1);
    gfx.fillRoundedRect(r.x, r.y, r.w, r.h, r.r);
  }

  /** 預覽（文字＋chip）顯隱：200ms 淡入淡出；snap 或 reduced-motion 時直接切換。 */
  private setPreviewVisible(visible: boolean, snap = false): void {
    if (visible === this.previewShown) return;
    this.previewShown = visible;
    const targets = [this.previewLeft, this.previewRight, this.chipLeft, this.chipRight];
    this.tweens.killTweensOf(targets);
    if (snap || this.reducedMotion) {
      targets.forEach((obj) => obj.setAlpha(visible ? 1 : 0));
      return;
    }
    this.tweens.add({ targets, alpha: visible ? 1 : 0, duration: 200 });
  }

  private updateLevelLabel(): void {
    const dimCode = DIMENSIONS[this.dimIndex];
    this.levelLabel.setText(tf('level.label', [this.dimIndex + 1, t(`dim.${dimCode}` as StringKey)]));
  }

  /** 依目前維度票數重繪得分條（雙色漸變底＋字母色圓章票數＋加粗分隔線與圓頭旋鈕）。 */
  private drawScoreBar(): void {
    const dimCode = DIMENSIONS[this.dimIndex];
    const [a, b] = LETTERS_OF[dimCode];
    const [na, nb] = this.score.tallyFor(dimCode);
    const m = scoreBarModel(a, na, b, nb);

    this.scoreLeft.setText(m.leftLabel);
    this.scoreRight.setText(m.rightLabel);

    const w = 200;
    const h = 22;
    const x0 = (GAME.width - w) / 2;
    const y0 = 746;
    const g = this.scoreBar;
    g.clear();
    // 分段實色：整條先填右字母色，再以左圓角矩形蓋出左段（無跨色漸變髒段）
    g.fillStyle(LETTER_COLORS[b], 1);
    g.fillRoundedRect(x0, y0, w, h, 11);
    const lw = m.dividerFrac * w;
    if (lw > 0) {
      g.fillStyle(LETTER_COLORS[a], 1);
      g.fillRoundedRect(x0, y0, lw, h, { tl: 11, bl: 11, tr: 0, br: 0 });
    }

    // 兩端字母色圓章（深字由 scoreLeft/Right text 疊在 depth 21）
    const badge = (text: Phaser.GameObjects.Text, letter: Letter) => {
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
    badge(this.scoreLeft, a);
    badge(this.scoreRight, b);

    // 加粗分隔線＋頂端圓頭旋鈕
    const dx = x0 + m.dividerFrac * w;
    g.fillStyle(0xffffff, 1);
    g.fillRect(dx - 2.5, y0 - 2, 5, h + 4);
    g.fillCircle(dx, y0 - 2, 4);
  }

  private completeCurrentDimension(): void {
    if (this.dimComplete) return;
    this.dimComplete = true;
    // 平手時以玩家當下水平位置決定：靠左(Yes側)→第一字母、靠右(No側)→第二字母。
    const tieBreak = this.player.x < GAME.width / 2 ? 'first' : 'second';
    this.score.completeLevel(DIMENSIONS[this.dimIndex], tieBreak);
    this.player.recolor(playerColorFor(this.score.lockedLetters())); // 第 4 次鎖定的 pop 會被立即切場吃掉——刻意保留：預先生成最終色 texture 供 ResultScene 快取命中
    Sfx.play('advance');
    this.advanceDimension();
  }

  /** 無縫切到下一個維度（不換場景）；四個維度都鎖定後進結算。 */
  private advanceDimension(): void {
    this.dimIndex += 1;
    if (this.dimIndex >= DIMENSIONS.length) {
      this.controls.destroy();
      Sfx.play('result');
      this.scene.start('Result', { score: this.score });
      return;
    }

    this.questions = pickQuestions(
      questionsForDimension(DIMENSIONS[this.dimIndex]),
      GAME.questionsPerLevel,
      Math.random,
    );
    this.nextQuestionIdx = 0;
    this.dimAnsweredIds.clear();
    this.platformsSinceFork = 0;
    this.dimComplete = false;
    this.lastForkY = -Infinity;
    this.forks = [];
    this.shownQuestionIdx = -1;

    this.cameras.main.setBackgroundColor(LEVEL_BG[this.dimIndex]);
    this.background.setDimension(this.dimIndex);
    this.aurora.retint(this.dimIndex);
    this.updateLevelLabel();
    this.drawScoreBar();
    this.announceDimension();
  }

  /** 進入新維度時，畫面中央淡入淡出顯示新維度名稱，讓玩家知道換維度了。 */
  private announceDimension(): void {
    const dimCode = DIMENSIONS[this.dimIndex];
    const label = this.add
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
    if (this.reducedMotion) {
      label.setAlpha(1);
      this.time.delayedCall(1000, () => label.destroy());
      return;
    }
    this.tweens.add({
      targets: label,
      alpha: { from: 0, to: 1 },
      duration: 300,
      yoyo: true,
      hold: 700,
      onComplete: () => label.destroy(),
    });
  }

  private gameOver(): void {
    this.controls.destroy();
    Sfx.play('gameover');
    this.scene.start('GameOver', { score: this.score });
  }
}
