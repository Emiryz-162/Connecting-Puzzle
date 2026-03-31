interface ProgressPayload {
  highestUnlockedLevel?: number;
}

const LEVEL_PROGRESS_STORAGE_KEY = "oasiz-connect-level-progress-v1";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export class LevelProgressStore {
  private readonly totalLevels: number;
  private readonly baselineUnlockedLevel: number;
  private highestUnlockedLevel: number;

  constructor(totalLevels: number, baselineUnlockedLevel: number) {
    this.totalLevels = Math.max(1, Math.floor(totalLevels));
    this.baselineUnlockedLevel = clamp(Math.floor(baselineUnlockedLevel), 1, this.totalLevels);
    this.highestUnlockedLevel = this.load();
  }

  getHighestUnlockedLevel(): number {
    return this.highestUnlockedLevel;
  }

  markLevelCompleted(levelId: number): number {
    const candidate = clamp(Math.floor(levelId) + 1, 1, this.totalLevels);
    if (candidate <= this.highestUnlockedLevel) {
      return this.highestUnlockedLevel;
    }

    this.highestUnlockedLevel = candidate;
    this.persist();
    return this.highestUnlockedLevel;
  }

  private load(): number {
    if (typeof window === "undefined") {
      return this.baselineUnlockedLevel;
    }

    try {
      const raw = window.localStorage.getItem(LEVEL_PROGRESS_STORAGE_KEY);
      if (!raw) {
        return this.baselineUnlockedLevel;
      }

      const payload = JSON.parse(raw) as ProgressPayload;
      const stored = Number(payload.highestUnlockedLevel ?? 0);
      if (!Number.isFinite(stored)) {
        return this.baselineUnlockedLevel;
      }
      return clamp(Math.floor(stored), this.baselineUnlockedLevel, this.totalLevels);
    } catch {
      return this.baselineUnlockedLevel;
    }
  }

  private persist(): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const payload: ProgressPayload = {
        highestUnlockedLevel: this.highestUnlockedLevel,
      };
      window.localStorage.setItem(LEVEL_PROGRESS_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // no-op
    }
  }
}
