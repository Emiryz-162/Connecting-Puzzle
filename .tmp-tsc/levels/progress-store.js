const LEVEL_PROGRESS_STORAGE_KEY = "oasiz-connect-level-progress-v1";
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
export class LevelProgressStore {
    constructor(totalLevels, baselineUnlockedLevel) {
        this.totalLevels = Math.max(1, Math.floor(totalLevels));
        this.baselineUnlockedLevel = clamp(Math.floor(baselineUnlockedLevel), 1, this.totalLevels);
        const loaded = this.load();
        this.highestUnlockedLevel = loaded.highestUnlockedLevel;
        this.lastPlayedLevel = loaded.lastPlayedLevel;
    }
    getHighestUnlockedLevel() {
        return this.highestUnlockedLevel;
    }
    getLastPlayedLevel() {
        return this.lastPlayedLevel;
    }
    setLastPlayedLevel(levelId) {
        const maxAllowed = Math.max(this.baselineUnlockedLevel, this.highestUnlockedLevel);
        const next = clamp(Math.floor(levelId), 1, Math.min(this.totalLevels, maxAllowed));
        if (next === this.lastPlayedLevel) {
            return this.lastPlayedLevel;
        }
        this.lastPlayedLevel = next;
        this.persist();
        return this.lastPlayedLevel;
    }
    markLevelCompleted(levelId) {
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
    load() {
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
            const payload = JSON.parse(raw);
            const stored = Number(payload.highestUnlockedLevel ?? 0);
            if (!Number.isFinite(stored)) {
                return {
                    highestUnlockedLevel: this.baselineUnlockedLevel,
                    lastPlayedLevel: this.baselineUnlockedLevel,
                };
            }
            const highestUnlockedLevel = clamp(Math.floor(stored), this.baselineUnlockedLevel, this.totalLevels);
            const lastPlayedRaw = Number(payload.lastPlayedLevel ?? highestUnlockedLevel);
            const lastPlayedLevel = Number.isFinite(lastPlayedRaw)
                ? clamp(Math.floor(lastPlayedRaw), 1, highestUnlockedLevel)
                : highestUnlockedLevel;
            return {
                highestUnlockedLevel,
                lastPlayedLevel,
            };
        }
        catch {
            return {
                highestUnlockedLevel: this.baselineUnlockedLevel,
                lastPlayedLevel: this.baselineUnlockedLevel,
            };
        }
    }
    persist() {
        if (typeof window === "undefined") {
            return;
        }
        try {
            const payload = {
                highestUnlockedLevel: this.highestUnlockedLevel,
                lastPlayedLevel: this.lastPlayedLevel,
            };
            window.localStorage.setItem(LEVEL_PROGRESS_STORAGE_KEY, JSON.stringify(payload));
        }
        catch {
            // no-op
        }
    }
}
//# sourceMappingURL=progress-store.js.map