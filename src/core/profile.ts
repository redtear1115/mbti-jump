import type { Dimension } from '../config/questions';

export interface PlayRecord {
  at: number; // 時間戳（毫秒）
  type: string; // 4 碼人格
  tallies: Record<Dimension, [number, number]>; // 各維度 [第一字母數, 第二字母數]
}

export const PROFILE_KEY = 'mbti-jump.profile';
export const MAX_PLAYS = 200;
const VERSION = 1;

interface ProfileData {
  version: number;
  plays: PlayRecord[];
}

function read(): ProfileData {
  try {
    const raw = (globalThis as any).localStorage?.getItem(PROFILE_KEY);
    if (!raw) return { version: VERSION, plays: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== VERSION || !Array.isArray(parsed.plays)) {
      return { version: VERSION, plays: [] };
    }
    return parsed as ProfileData;
  } catch {
    return { version: VERSION, plays: [] };
  }
}

function write(data: ProfileData): void {
  try {
    (globalThis as any).localStorage?.setItem(PROFILE_KEY, JSON.stringify(data));
  } catch {
    /* localStorage 不可用時略過 */
  }
}

export function getPlays(): PlayRecord[] {
  return read().plays;
}

export function recordPlay(
  type: string,
  tallies: Record<Dimension, [number, number]>,
  at: number = Date.now(),
): void {
  const data = read();
  data.plays.push({ at, type, tallies });
  if (data.plays.length > MAX_PLAYS) {
    data.plays = data.plays.slice(data.plays.length - MAX_PLAYS);
  }
  write(data);
}

export function clearPlays(): void {
  write({ version: VERSION, plays: [] });
}
