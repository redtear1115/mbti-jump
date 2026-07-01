export const ACH_KEY = 'mbti-jump.achievements';
const VERSION = 1;

interface AchData {
  version: number;
  seen: string[];
}

function read(): AchData {
  try {
    const raw = (globalThis as any).localStorage?.getItem(ACH_KEY);
    if (!raw) return { version: VERSION, seen: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== VERSION || !Array.isArray(parsed.seen)) {
      return { version: VERSION, seen: [] };
    }
    return parsed as AchData;
  } catch {
    return { version: VERSION, seen: [] };
  }
}

function write(data: AchData): void {
  try {
    (globalThis as any).localStorage?.setItem(ACH_KEY, JSON.stringify(data));
  } catch {
    /* localStorage 不可用時略過 */
  }
}

export function getSeenIds(): string[] {
  return read().seen;
}

export function markSeen(ids: readonly string[]): void {
  const set = new Set(read().seen);
  for (const id of ids) set.add(id);
  write({ version: VERSION, seen: [...set] });
}
