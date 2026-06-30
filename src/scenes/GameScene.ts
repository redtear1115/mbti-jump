import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { Player } from '../entities/Player';
import { Platform } from '../entities/Platform';
import { Controls } from '../core/Controls';
import { ScoreTracker } from '../core/ScoreTracker';
import { DIMENSIONS, questionsForDimension } from '../config/questions';
import type { Question } from '../config/questions';

interface GameInit {
  score: ScoreTracker;
  levelIndex: number;
}

export class GameScene extends Phaser.Scene {
  private score!: ScoreTracker;
  private levelIndex = 0;
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private controls!: Controls;

  private questions: Question[] = [];
  private nextQuestionIdx = 0; // 下一個要生成的題目
  private answeredCount = 0; // 已答題數
  private answeredIds = new Set<number>();
  private spawnY = 0; // 下一個平台的 y（往上遞減）
  private platformsSinceFork = 0;
  private banner!: Phaser.GameObjects.Text;
  private levelComplete = false;
  private lastForkY = -Infinity; // 最後一題分叉的 y；玩家爬過它即過關（避免跳過題目卡關）

  constructor() {
    super('Game');
  }

  init(data: GameInit) {
    this.score = data.score;
    this.levelIndex = data.levelIndex;
    // 每次進場重置關卡狀態（死亡重玩時要乾淨）
    this.questions = questionsForDimension(DIMENSIONS[this.levelIndex]);
    this.nextQuestionIdx = 0;
    this.answeredCount = 0;
    this.answeredIds.clear();
    this.platformsSinceFork = 0;
    this.levelComplete = false;
    this.lastForkY = -Infinity;
    this.score.resetCurrentLevel();
  }

  create() {
    this.cameras.main.setBackgroundColor(LEVEL_COLORS[this.levelIndex]);
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
      .text(GAME.width / 2, 24, '', {
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
    this.updateBanner();

    this.add
      .text(GAME.width / 2, 92, `第 ${this.levelIndex + 1} 關 · ${DIMENSIONS[this.levelIndex]}`, {
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

    // 相機只向上跟隨：玩家保持在畫面約 60% 高度，相機絕不往下移
    const targetScroll = this.player.y - GAME.height * 0.6;
    if (targetScroll < this.cameras.main.scrollY) {
      this.cameras.main.scrollY = targetScroll;
    }

    // 持續在上方補平台
    const topVisible = this.cameras.main.scrollY;
    while (this.spawnY > topVisible - GAME.height) {
      this.spawnNextRow();
    }

    // 跳過題目的保險：所有分叉都生成後，玩家明顯爬過最後一題分叉，
    // 就以「已記錄的答案」過關，不要求答滿 5 題（避免跳過題目無限往上卡關）。
    if (
      !this.levelComplete &&
      this.nextQuestionIdx >= this.questions.length &&
      this.player.y < this.lastForkY - GAME.height * 0.75
    ) {
      this.completeLevel();
      return;
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
    const id = this.nextQuestionIdx;
    const isLast = this.nextQuestionIdx === this.questions.length - 1;
    this.platforms.add(Platform.makeQuestion(this, GAME.forkLeftX, y, q.yes, id, true));
    this.platforms.add(Platform.makeQuestion(this, GAME.forkRightX, y, q.no, id, false));
    if (isLast) {
      this.lastForkY = y;
      this.add
        .text(GAME.width / 2, y - 54, '🏁 最後一題 · 答完過關！', {
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

  private onlyWhenFalling = (_player: unknown, _platform: unknown): boolean => {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    return body.velocity.y > 0;
  };

  private onLand = (_player: unknown, platformObj: unknown): void => {
    const platform = platformObj as Platform;
    this.player.bounce();

    if (platform.kind === 'question' && platform.choice && platform.questionId !== undefined) {
      if (!this.answeredIds.has(platform.questionId)) {
        this.answeredIds.add(platform.questionId);
        this.score.recordAnswer(platform.choice.side);
        this.answeredCount += 1;
        this.updateBanner();
        if (this.answeredCount >= GAME.questionsPerLevel) {
          this.completeLevel();
        }
      }
    }
  };

  private updateBanner(): void {
    const upcoming = this.questions[this.nextQuestionIdx - 1] ?? this.questions[0];
    const idx = Math.min(this.answeredCount + 1, GAME.questionsPerLevel);
    const onLastQuestion = this.answeredCount >= GAME.questionsPerLevel - 1;
    const prefix = onLastQuestion ? '🏁 最後一題！' : `(${idx}/${GAME.questionsPerLevel})`;
    this.banner.setText(`${prefix} ${upcoming.text}`);
  }

  private completeLevel(): void {
    if (this.levelComplete) return;
    this.levelComplete = true;
    // 平手時以玩家當下水平位置決定：靠左(Yes側)→第一字母、靠右(No側)→第二字母。
    const tieBreak = this.player.x < GAME.width / 2 ? 'first' : 'second';
    this.score.completeLevel(DIMENSIONS[this.levelIndex], tieBreak);
    this.controls.destroy();
    this.scene.start('LevelTransition', { score: this.score, levelIndex: this.levelIndex });
  }

  private gameOver(): void {
    this.controls.destroy();
    this.scene.start('GameOver', { score: this.score, levelIndex: this.levelIndex });
  }
}

const LEVEL_COLORS = ['#2e3a59', '#3a2e59', '#594a2e', '#2e594a'];
