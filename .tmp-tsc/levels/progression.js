export class LevelProgression {
    constructor(levels, startLevelId = 1) {
        this.currentIndex = 0;
        if (levels.length === 0) {
            throw new Error("LevelProgression requires at least one level.");
        }
        this.levels = levels;
        const startIndex = this.levels.findIndex((level) => level.id === startLevelId);
        this.currentIndex = startIndex >= 0 ? startIndex : 0;
    }
    getCurrentLevel() {
        return this.levels[this.currentIndex];
    }
    getCurrentIndex() {
        return this.currentIndex;
    }
    setCurrentLevelById(levelId) {
        const nextIndex = this.levels.findIndex((level) => level.id === levelId);
        if (nextIndex < 0) {
            return null;
        }
        this.currentIndex = nextIndex;
        return this.getCurrentLevel();
    }
    getTotalLevels() {
        return this.levels.length;
    }
    isLastLevel() {
        return this.currentIndex === this.levels.length - 1;
    }
    /**
     * Son level degilse bir sonraki level'a ilerler.
     * Son level'da null doner.
     */
    advanceToNextLevel() {
        if (this.isLastLevel()) {
            return null;
        }
        this.currentIndex += 1;
        return this.getCurrentLevel();
    }
    /** Mevcut leveli tekrar dondurur (retry icin). */
    restartCurrentLevel() {
        return this.getCurrentLevel();
    }
    /** Kampanyayi en basa alir ve ilk leveli dondurur. */
    resetCampaign() {
        this.currentIndex = 0;
        return this.getCurrentLevel();
    }
}
//# sourceMappingURL=progression.js.map