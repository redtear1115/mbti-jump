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
      .text(GAME.width / 2, 30, '', { fontSize: '18px', color: '#ffffff', align: 'center', wordWrap: { width: GAME.width - 40 } })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(20);
    this.updateBanner();

    this.add
      .text(GAME.width / 2, 60, `第 ${this.levelIndex + 1} 關 · ${DIMENSIONS[this.levelIndex]}`, {
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
    this.platforms.add(Platform.makeQuestion(this, GAME.forkLeftX, y, q.yes, id, true));
    this.platforms.add(Platform.makeQuestion(this, GAME.forkRightX, y, q.no, id, false));
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
    this.banner.setText(`(${idx}/${GAME.questionsPerLevel}) ${upcoming.text}`);
  }

  private completeLevel(): void {
    if (this.levelComplete) return;
    this.levelComplete = true;
    this.score.completeLevel(DIMENSIONS[this.levelIndex]);
    this.controls.destroy();
    this.scene.start('LevelTransition', { score: this.score, levelIndex: this.levelIndex });
  }

  private gameOver(): void {
    this.controls.destroy();
    this.scene.start('GameOver', { score: this.score, levelIndex: this.levelIndex });
  }
}

const LEVEL_COLORS = ['#2e3a59', '#3a2e59', '#594a2e', '#2e594a'];
