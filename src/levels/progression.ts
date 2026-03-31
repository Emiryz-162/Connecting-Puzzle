import { LevelDef } from "../types";

export class LevelProgression {
  private readonly levels: LevelDef[];
  private currentIndex = 0;

  constructor(levels: LevelDef[], startLevelId = 1) {
    if (levels.length === 0) {
      throw new Error("LevelProgression requires at least one level.");
    }
    this.levels = levels;

    const startIndex = this.levels.findIndex((level) => level.id === startLevelId);
    this.currentIndex = startIndex >= 0 ? startIndex : 0;
  }

  getCurrentLevel(): LevelDef {
    return this.levels[this.currentIndex];
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  setCurrentLevelById(levelId: number): LevelDef | null {
    const nextIndex = this.levels.findIndex((level) => level.id === levelId);
    if (nextIndex < 0) {
      return null;
    }
    this.currentIndex = nextIndex;
    return this.getCurrentLevel();
  }

  getTotalLevels(): number {
    return this.levels.length;
  }

  isLastLevel(): boolean {
    return this.currentIndex === this.levels.length - 1;
  }

  /**
   * Son level degilse bir sonraki level'a ilerler.
   * Son level'da null doner.
   */
  advanceToNextLevel(): LevelDef | null {
    if (this.isLastLevel()) {
      return null;
    }
    this.currentIndex += 1;
    return this.getCurrentLevel();
  }

  /** Mevcut leveli tekrar dondurur (retry icin). */
  restartCurrentLevel(): LevelDef {
    return this.getCurrentLevel();
  }

  /** Kampanyayi en basa alir ve ilk leveli dondurur. */
  resetCampaign(): LevelDef {
    this.currentIndex = 0;
    return this.getCurrentLevel();
  }
}
