interface ProgressPayload {
  highestUnlockedLevel?: number;
  lastPlayedLevel?: number;
}

const LEVEL_PROGRESS_STORAGE_KEY = "oasiz-connect-level-progress-v1";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export class LevelProgressStore {
  private readonly totalLevels: number;
  private readonly baselineUnlockedLevel: number;
  private highestUnlockedLevel: number;
  private lastPlayedLevel: number;

  constructor(totalLevels: number, baselineUnlockedLevel: number) {
    this.totalLevels = Math.max(1, Math.floor(totalLevels));
    this.baselineUnlockedLevel = clamp(Math.floor(baselineUnlockedLevel), 1, this.totalLevels);
    const loaded = this.load();
    this.highestUnlockedLevel = loaded.highestUnlockedLevel;
    this.lastPlayedLevel = loaded.lastPlayedLevel;
  }

  getHighestUnlockedLevel(): number {
    return this.highestUnlockedLevel;
  }

  getLastPlayedLevel(): number {
    return this.lastPlayedLevel;
  }

  setLastPlayedLevel(levelId: number): number {
    const maxAllowed = Math.max(this.baselineUnlockedLevel, this.highestUnlockedLevel);
    const next = clamp(Math.floor(levelId), 1, Math.min(this.totalLevels, maxAllowed));
    if (next === this.lastPlayedLevel) {
      return this.lastPlayedLevel;
    }

    this.lastPlayedLevel = next;
    this.persist();
    return this.lastPlayedLevel;
  }

  markLevelCompleted(levelId: number): number {
    const candidate = clamp(Math.floor(levelId) + 1, 1, this.totalLevels);
    if (candidate <= this.highestUnlockedLevel) {
      return this.highestUnlockedLevel;
    }

    this.highestUnlockedLevel = candidate;
    if (this.lastPlayedLevel > this.highestUnlockedLevel) {
      this.lastPlayedLevel = this.highestUnlockedLevel;
    }
    this.persist();
    return this.highestUnlockedLevel;
  }

  private load(): { highestUnlockedLevel: number; lastPlayedLevel: number } {
    if (typeof window === "undefined") {
      return {
        highestUnlockedLevel: this.baselineUnlockedLevel,
        lastPlayedLevel: this.baselineUnlockedLevel,
      };
    }

    try {
      const raw = window.localStorage.getItem(LEVEL_PROGRESS_STORAGE_KEY);
      if (!raw) {
        return {
          highestUnlockedLevel: this.baselineUnlockedLevel,
          lastPlayedLevel: this.baselineUnlockedLevel,
        };
      }

      const payload = JSON.parse(raw) as ProgressPayload;
      const stored = Number(payload.highestUnlockedLevel ?? 0);
      if (!Number.isFinite(stored)) {
        return {
          highestUnlockedLevel: this.baselineUnlockedLevel,
          lastPlayedLevel: this.baselineUnlockedLevel,
        };
      }
      const highestUnlockedLevel = clamp(
        Math.floor(stored),
        this.baselineUnlockedLevel,
        this.totalLevels
      );
      const lastPlayedRaw = Number(payload.lastPlayedLevel ?? highestUnlockedLevel);
      const lastPlayedLevel = Number.isFinite(lastPlayedRaw)
        ? clamp(Math.floor(lastPlayedRaw), 1, highestUnlockedLevel)
        : highestUnlockedLevel;

      return {
        highestUnlockedLevel,
        lastPlayedLevel,
      };
    } catch {
      return {
        highestUnlockedLevel: this.baselineUnlockedLevel,
        lastPlayedLevel: this.baselineUnlockedLevel,
      };
    }
  }

  private persist(): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const payload: ProgressPayload = {
        highestUnlockedLevel: this.highestUnlockedLevel,
        lastPlayedLevel: this.lastPlayedLevel,
      };
      window.localStorage.setItem(LEVEL_PROGRESS_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // no-op
    }
  }
}
