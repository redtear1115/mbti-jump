import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { Player } from '../entities/Player';
import { Platform } from '../entities/Platform';
import { Controls } from '../core/Controls';
import { ScoreTracker } from '../core/ScoreTracker';
import { DIMENSIONS, questionsForDimension } from '../config/questions';
import type { QuestionDef } from '../config/questions';
import { t, tf } from '../i18n/t';
import type { StringKey } from '../i18n/t';

interface GameInit {
  score: ScoreTracker;
  levelIndex: number;
}

const LEVEL_COLORS = ['#2e3a59', '#3a2e59', '#594a2e', '#2e594a'];

export class GameScene extends Phaser.Scene {
  private score!: ScoreTracker;
  private levelIndex = 0;
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private controls!: Controls;

  private questions: QuestionDef[] = [];
  private nextQuestionIdx = 0;
  private answeredCount = 0;
  private answeredIds = new Set<string>();
  private spawnY = 0;
  private platformsSinceFork = 0;
  private banner!: Phaser.GameObjects.Text;

  constructor() {
    super('Game');
  }

  init(data: GameInit) {
    this.score = data.score;
    this.levelIndex = data.levelIndex;
    this.questions = questionsForDimension(DIMENSIONS[this.levelIndex]);
    this.nextQuestionIdx = 0;
    this.answeredCount = 0;
    this.answeredIds.clear();
    this.platformsSinceFork = 0;
    this.score.resetCurrentLevel();
  }

  create() {
    this.cameras.main.setBackgroundColor(LEVEL_COLORS[this.levelIndex]);
    this.platforms = this.physics.add.staticGroup();

    this.spawnY = GAME.height - 40;
    this.addNormalPlatform(GAME.width / 2, this.spawnY);

    this.spawnY -= GAME.platformGapY;
    for (let i = 0; i < 8; i++) this.spawnNextRow();

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
      .text(GAME.width / 2, 30, '', {
        fontSize: '18px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: GAME.width - 40 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(20);
    this.updateBanner();

    const dimCode = DIMENSIONS[this.levelIndex];
    this.add
      .text(GAME.width / 2, 60, tf('level.label', [this.levelIndex + 1, t(`dim.${dimCode}` as StringKey)]), {
        fontSize: '14px',
        color: '#ffffffaa',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(20);
  }

  update() {
    this.player.setAxis(this.controls.axis);
    this.player.wrapHorizontally();

    const targetScroll = this.player.y - GAME.height * 0.6;
    if (targetScroll < this.cameras.main.scrollY) {
      this.cameras.main.scrollY = targetScroll;
    }

    const topVisible = this.cameras.main.scrollY;
    while (this.spawnY > topVisible - GAME.height) this.spawnNextRow();

    const fallLine = this.cameras.main.scrollY + GAME.height + GAME.fallMargin;
    if (this.player.y > fallLine) this.gameOver();
  }

  private spawnNextRow(): void {
    const needFork =
      this.platformsSinceFork >= GAME.questionGapForks && this.nextQuestionIdx < this.questions.length;
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
    this.nextQuestionIdx += 1;
  }

  private onlyWhenFalling = (): boolean => {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    return body.velocity.y > 0;
  };

  private onLand = (_player: unknown, platformObj: unknown): void => {
    const platform = platformObj as Platform;
    this.player.bounce();

    if (platform.kind === 'question' && platform.side && platform.questionId !== undefined) {
      if (!this.answeredIds.has(platform.questionId)) {
        this.answeredIds.add(platform.questionId);
        this.score.recordAnswer(platform.side);
        this.answeredCount += 1;
        this.updateBanner();
        if (this.answeredCount >= GAME.questionsPerLevel) this.completeLevel();
      }
    }
  };

  private updateBanner(): void {
    const idxForText = Math.min(this.nextQuestionIdx, this.questions.length - 1);
    const q = this.questions[Math.max(0, idxForText)];
    const shown = Math.min(this.answeredCount + 1, GAME.questionsPerLevel);
    this.banner.setText(`(${shown}/${GAME.questionsPerLevel}) ${t(`q.${q.id}.text` as StringKey)}`);
  }

  private completeLevel(): void {
    this.score.completeLevel(DIMENSIONS[this.levelIndex]);
    this.controls.destroy();
    this.scene.start('LevelTransition', { score: this.score, levelIndex: this.levelIndex });
  }

  private gameOver(): void {
    this.controls.destroy();
    this.scene.start('GameOver', { score: this.score, levelIndex: this.levelIndex });
  }
}
