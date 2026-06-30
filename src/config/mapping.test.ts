import { describe, it, expect } from 'vitest';
import { GAME } from './gameConfig';
import { QUESTIONS, LETTERS_OF } from './questions';

// Pins the load-bearing answer-mapping contract that lives across files:
//   physical LEFT platform  = Yes = the dimension's FIRST letter (E/S/T/J)
//   physical RIGHT platform = No  = the dimension's SECOND letter (I/N/F/P)
// GameScene.addQuestionFork places q.yes at forkLeftX and q.no at forkRightX,
// so an arg swap there — or swapping forkLeftX/forkRightX, or authoring a
// question with yes/no on the wrong letters — would invert every answer.
// These assertions catch the data/config half of that risk without Phaser.

describe('answer mapping contract', () => {
  it('left fork is physically left of right fork', () => {
    expect(GAME.forkLeftX).toBeLessThan(GAME.forkRightX);
  });

  it('yes is always the dimension first letter, no the second', () => {
    for (const q of QUESTIONS) {
      const [first, second] = LETTERS_OF[q.dimension];
      expect(q.yes.side).toBe(first);
      expect(q.no.side).toBe(second);
    }
  });
});
