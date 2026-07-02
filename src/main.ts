import Phaser from 'phaser';
import { GAME } from './config/gameConfig';
import { BootScene } from './scenes/BootScene';
import { StartScene } from './scenes/StartScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';
import { ResultScene } from './scenes/ResultScene';
import { TrendScene } from './scenes/TrendScene';
import { AchievementScene } from './scenes/AchievementScene';
import { parseInvite, saveInvite } from './core/invite';
import { setLocale } from './i18n/store';

// 邀請連結 /t/<TYPE>?lang=<locale>：尊重 lang、記下好友型別（本分頁有效）
const invite = parseInvite(location.pathname, location.search);
if (invite) {
  if (invite.locale) setLocale(invite.locale);
  saveInvite(invite.type);
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#1a1c2c',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME.width,
    height: GAME.height,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: GAME.gravityY }, debug: false },
  },
  scene: [BootScene, StartScene, GameScene, GameOverScene, ResultScene, TrendScene, AchievementScene],
});
