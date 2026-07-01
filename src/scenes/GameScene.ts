import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { Player } from '../entities/Player';
import { Platform } from '../entities/Platform';
import { Controls } from '../input/Controls';
import { ScoreTracker } from '../core/ScoreTracker';
import { shouldAutoComplete } from '../core/progression';
import { DIMENSIONS, LETTERS_OF, questionsForDimension } from '../config/questions';
import type { QuestionDef } from '../config/questions';
import { t, tf } from '../i18n/t';
import type { StringKey } from '../i18n/t';
import { prefersReducedMotion } from '../ui/reducedMotion';

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
  private tally!: Phaser.GameObjects.Text; // 目前維度即時取向，例如 "E 2 · I 1"
  private previewLeft!: Phaser.GameObjects.Text;
  private previewRight!: Phaser.GameObjects.Text;
  private lastForkY = -Infinity; // 目前維度最後一題分叉的 y
  private forks: { qIndex: number; y: number }[] = [];
  private shownQuestionIdx = -1;
  private reducedMotion = false;

  constructor() {
    super('Game');
  }

  init(data: GameInit) {
    this.score = data.score;
    // 從尚未鎖定的維度接續（重玩時保留已鎖定的維度）
    this.dimIndex = this.score.lockedCount();
    this.questions = questionsForDimension(DIMENSIONS[this.dimIndex]);
    this.nextQuestionIdx = 0;
    this.dimAnsweredIds.clear();
    this.platformsSinceFork = 0;
    this.dimComplete = false;
    this.lastForkY = -Infinity;
    this.forks = [];
    this.shownQuestionIdx = -1;
    this.score.resetCurrentLevel();
  }

  create() {
    this.reducedMotion = prefersReducedMotion();
    this.cameras.main.setBackgroundColor(GAME.levelColors[this.dimIndex]);
    this.platforms = this.physics.add.staticGroup();

    // 起始平台（玩家正下方）
    this.spawnY = GAME.height - 40;
    this.addNormalPlatform(GAME.width / 2, this.spawnY);

    // 預先往上鋪一段
    this.spawnY -= GAME.platformGapY;
    for (let i = 0; i < 8; i++) {
      this.spawnNextRow();
    }

    this.player = new Player(this, GAME.width / 2, GAME.height - 90);
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

    this.banner = this.add
      .text(GAME.width / 2, 40, '', {
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 4,
        wordWrap: { width: GAME.width - 24 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(20);

    this.levelLabel = this.add
      .text(GAME.width / 2, 108, '', { fontSize: '14px', color: '#ffffffaa' })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(20);
    this.tally = this.add
      .text(GAME.width / 2, 126, '', { fontSize: '15px', fontStyle: 'bold', color: '#ffe066' })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(20);
    this.updateLevelLabel();
    this.updateTally();

    const previewStyle = {
      fontSize: '17px',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      wordWrap: { width: GAME.width * 0.44 },
    };
    this.previewLeft = this.add
      .text(12, 158, '', { ...previewStyle, color: '#5effa0', align: 'left' })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(20)
      .setAlpha(0);
    this.previewRight = this.add
      .text(GAME.width - 12, 158, '', { ...previewStyle, color: '#ff8a99', align: 'right' })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(20)
      .setAlpha(0);
  }

  update() {
    this.player.setAxis(this.controls.axis);
    this.player.wrapHorizontally();

    // 相機只向上跟隨：玩家保持在畫面約 60% 高度，相機絕不往下移
    const targetScroll = this.player.y - GAME.height * 0.6;
    if (targetScroll < this.cameras.main.scrollY) {
      this.cameras.main.scrollY = targetScroll;
    }

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
      }
      const dist = this.player.y - fork.y;
      const alpha = this.reducedMotion
        ? 1
        : Phaser.Math.Clamp((GAME.height * 1.5 - dist) / (GAME.height * 0.6), 0, 1);
      this.previewLeft.setAlpha(alpha);
      this.previewRight.setAlpha(alpha);
    } else {
      this.previewLeft.setAlpha(0);
      this.previewRight.setAlpha(0);
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
      const x = Phaser.Math.Between(GAME.platformWidth / 2, GAME.width - GAME.platformWidth / 2);
      this.addNormalPlatform(x, this.spawnY);
      this.platformsSinceFork += 1;
    }
    this.spawnY -= GAME.platformGapY;
  }

  private addNormalPlatform(x: number, y: number): void {
    this.platforms.add(Platform.makeNormal(this, x, y));
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

    if (platform.kind === 'question' && platform.side && platform.questionId !== undefined) {
      if (!this.dimAnsweredIds.has(platform.questionId)) {
        this.dimAnsweredIds.add(platform.questionId);
        this.score.recordAnswer(platform.side);
        this.updateTally();
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
  }

  private updateLevelLabel(): void {
    const dimCode = DIMENSIONS[this.dimIndex];
    this.levelLabel.setText(tf('level.label', [this.dimIndex + 1, t(`dim.${dimCode}` as StringKey)]));
  }

  /** 更新目前維度兩側即時票數，例如 "E 2 · I 1"（MBTI 字母跨語言通用，不需翻譯）。 */
  private updateTally(): void {
    const dimCode = DIMENSIONS[this.dimIndex];
    const [a, b] = LETTERS_OF[dimCode];
    const [na, nb] = this.score.tallyFor(dimCode);
    this.tally.setText(`${a} ${na} · ${b} ${nb}`);
  }

  private completeCurrentDimension(): void {
    if (this.dimComplete) return;
    this.dimComplete = true;
    // 平手時以玩家當下水平位置決定：靠左(Yes側)→第一字母、靠右(No側)→第二字母。
    const tieBreak = this.player.x < GAME.width / 2 ? 'first' : 'second';
    this.score.completeLevel(DIMENSIONS[this.dimIndex], tieBreak);
    this.advanceDimension();
  }

  /** 無縫切到下一個維度（不換場景）；四個維度都鎖定後進結算。 */
  private advanceDimension(): void {
    this.dimIndex += 1;
    if (this.dimIndex >= DIMENSIONS.length) {
      this.controls.destroy();
      this.scene.start('Result', { score: this.score });
      return;
    }

    this.questions = questionsForDimension(DIMENSIONS[this.dimIndex]);
    this.nextQuestionIdx = 0;
    this.dimAnsweredIds.clear();
    this.platformsSinceFork = 0;
    this.dimComplete = false;
    this.lastForkY = -Infinity;
    this.forks = [];
    this.shownQuestionIdx = -1;

    this.cameras.main.setBackgroundColor(GAME.levelColors[this.dimIndex]);
    this.updateLevelLabel();
    this.updateTally();
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
        wordWrap: { width: GAME.width - 40 },
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
    this.scene.start('GameOver', { score: this.score });
  }
}
