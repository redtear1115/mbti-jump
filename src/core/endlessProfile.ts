/** Endless mode profile — separate from classic PlayRecord / trends. */

export interface EndlessProfile {
  bestFloors: number;
  runs: number;
  totalFloors: number;
  lastSkinType?: string;
}

export const ENDLESS_KEY = 'mbti-jump.endless';
const VERSION = 1;

interface EndlessData extends EndlessProfile {
  version: number;
}

const EMPTY: EndlessProfile = {
  bestFloors: 0,
  runs: 0,
  totalFloors: 0,
};

function read(): EndlessData {
  try {
    const raw = (globalThis as any).localStorage?.getItem(ENDLESS_KEY);
    if (!raw) return { version: VERSION, ...EMPTY };
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== VERSION) {
      return { version: VERSION, ...EMPTY };
    }
    return {
      version: VERSION,
      bestFloors: Number(parsed.bestFloors) || 0,
      runs: Number(parsed.runs) || 0,
      totalFloors: Number(parsed.totalFloors) || 0,
      lastSkinType: typeof parsed.lastSkinType === 'string' ? parsed.lastSkinType : undefined,
    };
  } catch {
    return { version: VERSION, ...EMPTY };
  }
}

function write(data: EndlessData): void {
  try {
    (globalThis as any).localStorage?.setItem(ENDLESS_KEY, JSON.stringify(data));
  } catch {
    /* localStorage unavailable */
  }
}

export function getEndlessProfile(): EndlessProfile {
  const d = read();
  return {
    bestFloors: d.bestFloors,
    runs: d.runs,
    totalFloors: d.totalFloors,
    lastSkinType: d.lastSkinType,
  };
}

/** Record a finished endless run (called on fall → result). Returns whether floors is a new best. */
export function recordEndlessRun(floors: number): { isNewBest: boolean; profile: EndlessProfile } {
  const n = Math.max(0, Math.floor(floors));
  const data = read();
  const isNewBest = n > data.bestFloors;
  data.runs += 1;
  data.totalFloors += n;
  if (isNewBest) data.bestFloors = n;
  write(data);
  return { isNewBest, profile: getEndlessProfile() };
}

/** Remember classic result TYPE for jelly skin in endless. */
export function setEndlessLastSkinType(type: string): void {
  const data = read();
  data.lastSkinType = type;
  write(data);
}

export function clearEndlessProfile(): void {
  write({ version: VERSION, ...EMPTY });
}
