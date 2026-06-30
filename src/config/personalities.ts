import type { Letter } from './questions';

export const LETTER_TRAITS: Record<Letter, string> = {
  E: '從人群中獲得能量',
  I: '在獨處中找回自己',
  S: '腳踏實地相信眼見',
  N: '腦中總有無限可能',
  T: '用邏輯權衡每個選擇',
  F: '把人的感受放在心上',
  J: '喜歡計畫與確定感',
  P: '享受隨機與彈性',
};

const VALID_LETTERS = new Set<string>(['E', 'I', 'S', 'N', 'T', 'F', 'J', 'P']);

export function describeType(type: string): string {
  const letters = type.split('');
  if (letters.length !== 4 || !letters.every((l) => VALID_LETTERS.has(l))) {
    throw new Error(`Invalid MBTI type: ${type}`);
  }
  const traits = letters.map((l) => LETTER_TRAITS[l as Letter]);
  return `你${traits[0]}、${traits[1]}，${traits[2]}，${traits[3]}。`;
}
