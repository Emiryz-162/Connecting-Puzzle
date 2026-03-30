// app.ts
// Main orchestration: loop, state transitions, match pipeline, HUD and overlays.

import {
  BoardLayout,
  BoardState,
  CellKind,
  Coord,
  GameState,
  LevelDef,
  Settings,
  TilePath,
} from "./types";
import { createBoard, countRemainingTiles, removeTiles, reshuffleBoardTiles } from "./game/board";
import { findPath, hasAnyValidPair } from "./game/pathfinder";
import { resolveGravity } from "./game/gravity";
import { unfreezeNeighbors } from "./game/frozen";
import { moveJumpingBlockers } from "./game/jumper";
import { calculateLayout, drawBoard } from "./render/board-renderer";
import { InputHandler } from "./input/input-handler";
import { LEVELS } from "./levels/level-data";
import { LevelProgression } from "./levels/progression";
import { SettingsStore } from "./settings/store";
import { SettingsModal } from "./ui/settings-modal";
import { HintButton } from "./ui/hint-button";
import { AudioManager, GAME_SOUNDS } from "./audio/audio-manager";
import { submitOasizScore, triggerOasizHaptic } from "./platform/oasiz";
import {
  BG_COLOR,
  HUD_TEXT_COLOR,
  BOARD_PADDING,
  PATH_DISPLAY_DURATION,
  TIMER_BG_COLOR,
  TIMER_FILL_COLOR,
  TIMER_LOW_COLOR,
  OVERLAY_BG,
} from "./constants";

export class App {
  private static readonly MAX_INIT_BUILD_ATTEMPTS = 12;
  private static readonly MAX_RESHUFFLE_ATTEMPTS = 24;
  private static readonly HINT_DISPLAY_DURATION_MS = 1400;
  private static readonly HINT_FEEDBACK_DURATION_S = 1.2;
  private static readonly PHOTO_REWARD_XP_STEP = 150;
  private static readonly OVERLAY_INTRO_DURATION_S = 0.24;
  private static readonly MATCH_CHAIN_WINDOW_MS = 1300;
  private static readonly TIME_LOW_WARNING_SECONDS = 10;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private displayWidth = 0;
  private displayHeight = 0;

  private gameState!: GameState;
  private layout!: BoardLayout;
  private inputHandler!: InputHandler;
  private lastTimestamp = 0;

  private progression = new LevelProgression(LEVELS);
  private campaignCompleted = false;
  private runScore = 0;
  private runScoreSubmitted = false;
  private settingsStore: SettingsStore;
  private settingsModal: SettingsModal;
  private hintButton: HintButton;
  private audio: AudioManager;
  private settings: Settings;
  private settingsOpen = false;

  // Path animation state.
  private activePath: TilePath | null = null;
  private pathDisplayTimer = 0;
  private pendingRemoval: [Coord, Coord] | null = null;
  private hintPath: TilePath | null = null;
  private hintPathTimerMs = 0;
  private hintFeedbackText: string | null = null;
  private hintFeedbackTimer = 0;

  // No-move warning state.
  private noMovesWarning = false;

  // Tutorial text state.
  private tutorialText: string | null = null;
  private tutorialTimer = 0;
  private runXp = 0;
  private photoRewardsUnlocked = 0;
  private lastWinXpGain = 0;
  private lastWinRewardText: string | null = null;
  private previousPhase: GameState["phase"] | null = null;
  private overlayIntroTimer = 0;
  private timeLowWarningPlayed = false;
  private lastSuccessfulMatchAtMs = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.settingsStore = new SettingsStore();
    this.settings = this.settingsStore.get();
    this.audio = new AudioManager(this.settings.fxEnabled);
    this.settingsModal = new SettingsModal(
      this.settings,
      (next) => {
        const previousSettings = this.settings;
        if (previousSettings.fxEnabled !== next.fxEnabled) {
          if (next.fxEnabled) {
            this.audio.setFxEnabled(true);
            this.audio.play(GAME_SOUNDS.BUTTON_CLICK_PRIMARY);
            this.audio.play(GAME_SOUNDS.SETTINGS_TOGGLE_ON);
          }
        }
        this.settings = this.settingsStore.set(next);
        this.audio.setFxEnabled(this.settings.fxEnabled);
        this.settingsModal.setSettings(this.settings);
      },
      (isOpen) => {
        this.settingsOpen = isOpen;
      },
      (_key, value) => {
        this.audio.play(GAME_SOUNDS.BUTTON_CLICK_PRIMARY);
        this.audio.play(value ? GAME_SOUNDS.SETTINGS_TOGGLE_ON : GAME_SOUNDS.SETTINGS_TOGGLE_OFF);
      },
      () => {
        this.audio.play(GAME_SOUNDS.BUTTON_CLICK_PRIMARY);
      }
    );
    this.hintButton = new HintButton(() => {
      this.audio.play(GAME_SOUNDS.BUTTON_CLICK_PRIMARY);
      this.handleHintRequest();
    });

    this.handleResize();
    window.addEventListener("resize", () => this.handleResize());

    this.initLevel(this.progression.getCurrentLevel(), false);

    requestAnimationFrame((t) => {
      this.lastTimestamp = t;
      this.loop(t);
    });
  }

  private initLevel(def: LevelDef, preserveRunScore: boolean): void {
    const board = this.createPlayableBoard(def);

    if (!preserveRunScore) {
      this.runScore = 0;
      this.runScoreSubmitted = false;
      this.runXp = 0;
      this.photoRewardsUnlocked = 0;
    }
    this.lastWinXpGain = 0;
    this.lastWinRewardText = null;
    this.hintPath = null;
    this.hintPathTimerMs = 0;
    this.hintFeedbackText = null;
    this.hintFeedbackTimer = 0;
    this.timeLowWarningPlayed = false;
    this.lastSuccessfulMatchAtMs = 0;

    this.gameState = {
      board,
      selectedTile: null,
      score: this.runScore,
      timerRemaining: def.timerSeconds,
      timerTotal: def.timerSeconds,
      levelId: def.id,
      phase: "playing",
      inputLocked: false,
    };
    this.previousPhase = this.gameState.phase;
    this.overlayIntroTimer = 0;

    this.noMovesWarning = false;
    this.activePath = null;
    this.pendingRemoval = null;

    if (def.tutorialText) {
      this.tutorialText = def.tutorialText;
      this.tutorialTimer = 4;
    } else {
      this.tutorialText = null;
      this.tutorialTimer = 0;
    }

    this.recalculateLayout();

    if (this.inputHandler) {
      this.inputHandler.destroy();
    }
    this.inputHandler = new InputHandler(
      this.canvas,
      (coord, bw, bh) => this.handleTap(coord, bw, bh),
      this.layout,
      board.width,
      board.height
    );
  }

  /** Build a board and guarantee at least one valid move at start. */
  private createPlayableBoard(def: LevelDef): BoardState {
    for (let i = 0; i < App.MAX_INIT_BUILD_ATTEMPTS; i++) {
      const board = createBoard(def);
      if (this.ensureBoardHasValidMove(board, false)) {
        return board;
      }
    }
    throw new Error(`Playable board could not be created (level ${def.id}).`);
  }

  /** Ensure board has a valid pair; reshuffle tile types when needed. */
  private ensureBoardHasValidMove(board: BoardState, playShuffleSound: boolean): boolean {
    if (hasAnyValidPair(board)) {
      return true;
    }

    let reshuffledAtLeastOnce = false;
    for (let i = 0; i < App.MAX_RESHUFFLE_ATTEMPTS; i++) {
      const changed = reshuffleBoardTiles(board);
      if (!changed) {
        return false;
      }
      reshuffledAtLeastOnce = true;
      if (hasAnyValidPair(board)) {
        if (playShuffleSound && reshuffledAtLeastOnce) {
          this.audio.play(GAME_SOUNDS.BOARD_SHUFFLE);
        }
        return true;
      }
    }

    return false;
  }

  /** Advance progression after a level win. */
  private nextLevel(): void {
    const next = this.progression.advanceToNextLevel();
    if (!next) {
      this.campaignCompleted = true;
      return;
    }

    this.campaignCompleted = false;
    this.initLevel(next, true);
  }

  /** Retry current level. */
  private restartLevel(): void {
    this.initLevel(this.progression.restartCurrentLevel(), false);
  }

  /** Restart full campaign from level 1. */
  private restartCampaign(): void {
    this.campaignCompleted = false;
    this.initLevel(this.progression.resetCampaign(), false);
  }

  private handleResize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.displayWidth = window.innerWidth;
    this.displayHeight = window.innerHeight;

    this.canvas.width = this.displayWidth * dpr;
    this.canvas.height = this.displayHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (this.gameState) {
      this.recalculateLayout();
    }
  }

  private recalculateLayout(): void {
    this.layout = calculateLayout(
      this.displayWidth,
      this.displayHeight,
      this.gameState.board.width,
      this.gameState.board.height
    );

    if (this.inputHandler) {
      this.inputHandler.updateLayout(
        this.layout,
        this.gameState.board.width,
        this.gameState.board.height
      );
    }
  }

  private loop = (timestamp: number): void => {
    const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
    this.lastTimestamp = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    if (this.previousPhase !== this.gameState.phase) {
      const isOverlayPhase = this.gameState.phase === "won" || this.gameState.phase === "lost";
      this.overlayIntroTimer = isOverlayPhase ? App.OVERLAY_INTRO_DURATION_S : 0;
      this.previousPhase = this.gameState.phase;
    }

    if (this.overlayIntroTimer > 0) {
      this.overlayIntroTimer = Math.max(0, this.overlayIntroTimer - dt);
    }

    if (this.hintPath && this.hintPathTimerMs > 0) {
      this.hintPathTimerMs -= dt * 1000;
      if (this.hintPathTimerMs <= 0) {
        this.hintPath = null;
      }
    }

    if (this.hintFeedbackTimer > 0) {
      this.hintFeedbackTimer = Math.max(0, this.hintFeedbackTimer - dt);
      if (this.hintFeedbackTimer <= 0) {
        this.hintFeedbackText = null;
      }
    }

    if (this.settingsOpen) return;
    if (this.gameState.phase !== "playing") return;

    this.gameState.timerRemaining -= dt;
    if (
      !this.timeLowWarningPlayed &&
      this.gameState.timerRemaining > 0 &&
      this.gameState.timerRemaining <= App.TIME_LOW_WARNING_SECONDS
    ) {
      this.timeLowWarningPlayed = true;
      this.audio.play(GAME_SOUNDS.TIME_LOW_WARNING);
    }

    if (this.gameState.timerRemaining <= 0) {
      this.gameState.timerRemaining = 0;
      this.audio.play(GAME_SOUNDS.TIME_UP);
      this.finalizeRunScore();
      this.gameState.phase = "lost";
      return;
    }

    if (this.tutorialTimer > 0) {
      this.tutorialTimer -= dt;
    }

    if (this.activePath && this.pathDisplayTimer > 0) {
      this.pathDisplayTimer -= dt * 1000;
      if (this.pathDisplayTimer <= 0) {
        this.executeRemoval();
      }
    }
  }

  private handleTap(coord: Coord, boardWidth: number, boardHeight: number): void {
    if (this.settingsOpen) {
      return;
    }
    this.hintPath = null;
    this.hintPathTimerMs = 0;

    if (this.gameState.phase === "won") {
      this.audio.play(GAME_SOUNDS.BUTTON_CLICK_PRIMARY);
      if (this.campaignCompleted) {
        this.restartCampaign();
      } else {
        this.nextLevel();
      }
      return;
    }

    if (this.gameState.phase === "lost") {
      this.audio.play(GAME_SOUNDS.BUTTON_CLICK_PRIMARY);
      this.restartLevel();
      return;
    }

    if (this.noMovesWarning) {
      this.audio.play(GAME_SOUNDS.BUTTON_CLICK_PRIMARY);
      this.restartLevel();
      return;
    }

    if (this.gameState.inputLocked) return;
    if (this.gameState.phase !== "playing") return;

    if (coord.col < 0 || coord.col >= boardWidth || coord.row < 0 || coord.row >= boardHeight) {
      this.gameState.selectedTile = null;
      return;
    }

    const cell = this.gameState.board.cells[coord.row][coord.col];

    if (cell.kind !== CellKind.Tile) {
      this.gameState.selectedTile = null;
      return;
    }

    if (!this.gameState.selectedTile) {
      this.gameState.selectedTile = coord;
      this.audio.play(GAME_SOUNDS.TILE_SELECT_SOFT);
      return;
    }

    const selected = this.gameState.selectedTile;

    if (selected.col === coord.col && selected.row === coord.row) {
      this.gameState.selectedTile = null;
      this.audio.play(GAME_SOUNDS.TILE_DESELECT_SOFT);
      return;
    }

    const selectedCell = this.gameState.board.cells[selected.row][selected.col];
    if (selectedCell.tileType !== cell.tileType) {
      this.gameState.selectedTile = coord;
      this.audio.play(GAME_SOUNDS.TILE_NO_MATCH);
      return;
    }

    const path = findPath(this.gameState.board, selected, coord);
    if (!path) {
      this.gameState.selectedTile = coord;
      this.audio.play(GAME_SOUNDS.TILE_NO_MATCH);
      return;
    }

    this.gameState.inputLocked = true;
    this.gameState.selectedTile = null;
    this.activePath = path;
    this.pathDisplayTimer = PATH_DISPLAY_DURATION;
    this.pendingRemoval = [selected, coord];
    this.noMovesWarning = false;
    this.hintFeedbackText = null;
    this.hintFeedbackTimer = 0;

    this.triggerHaptic("light");
  }

  private handleHintRequest(): void {
    if (this.settingsOpen) return;
    if (this.gameState.phase !== "playing") return;
    if (this.gameState.inputLocked) return;
    if (this.noMovesWarning) return;
    if (this.activePath) return;

    let path = this.findHintPath();
    if (!path && !hasAnyValidPair(this.gameState.board)) {
      const recovered = this.ensureBoardHasValidMove(this.gameState.board, true);
      this.noMovesWarning = !recovered;
      if (!recovered) {
        this.audio.play(GAME_SOUNDS.NO_MOVES_WARNING);
        this.finalizeRunScore();
        this.showHintFeedback("No moves available.", 1.4);
        return;
      }
      path = this.findHintPath();
    }

    if (!path) {
      this.showHintFeedback("No hint available.", 1.2);
      return;
    }

    this.hintPath = path;
    this.hintPathTimerMs = App.HINT_DISPLAY_DURATION_MS;
    this.showHintFeedback("Hint highlighted.", App.HINT_FEEDBACK_DURATION_S);
    this.audio.play(GAME_SOUNDS.HINT_REVEAL);
    this.triggerHaptic("light");
  }

  private findHintPath(): TilePath | null {
    const board = this.gameState.board;
    const byType = new Map<number, Coord[]>();

    for (let row = 0; row < board.height; row++) {
      for (let col = 0; col < board.width; col++) {
        const cell = board.cells[row][col];
        if (cell.kind === CellKind.Tile && cell.tileType !== null) {
          const list = byType.get(cell.tileType) ?? [];
          list.push({ row, col });
          byType.set(cell.tileType, list);
        }
      }
    }

    for (const coords of byType.values()) {
      for (let i = 0; i < coords.length; i++) {
        for (let j = i + 1; j < coords.length; j++) {
          const path = findPath(board, coords[i], coords[j]);
          if (path) {
            return path;
          }
        }
      }
    }

    return null;
  }

  private showHintFeedback(text: string, seconds: number): void {
    this.hintFeedbackText = text;
    this.hintFeedbackTimer = seconds;
  }

  /**
   * Match pipeline order:
   * 1. Remove
   * 2. Unfreeze neighbors
   * 3. Gravity
   * 4. Move jumpers
   * 5. Win / solvability checks
   * 6. Unlock input
   */
  private executeRemoval(): void {
    if (!this.pendingRemoval) return;

    const [a, b] = this.pendingRemoval;

    removeTiles(this.gameState.board, a, b);
    const nowMs = Date.now();
    const isChainMatch =
      this.lastSuccessfulMatchAtMs > 0 &&
      nowMs - this.lastSuccessfulMatchAtMs <= App.MATCH_CHAIN_WINDOW_MS;
    this.audio.play(isChainMatch ? GAME_SOUNDS.TILE_MATCH_CHAIN : GAME_SOUNDS.TILE_MATCH_SUCCESS);
    this.lastSuccessfulMatchAtMs = nowMs;
    this.runScore += 100;
    this.gameState.score = this.runScore;

    const unfrozen = unfreezeNeighbors(this.gameState.board, [a, b]);
    if (unfrozen.length > 0) {
      this.audio.play(GAME_SOUNDS.FROZEN_BREAK);
      this.triggerHaptic("light");
    }

    const gravityMoves = resolveGravity(this.gameState.board);
    if (gravityMoves.length > 0) {
      this.audio.play(GAME_SOUNDS.GRAVITY_DROP);
    }

    const jumperMoves = moveJumpingBlockers(this.gameState.board);
    if (jumperMoves.length > 0) {
      this.audio.play(GAME_SOUNDS.JUMPER_MOVE);
    }

    const remaining = countRemainingTiles(this.gameState.board);
    if (remaining === 0) {
      this.applyLevelWinProgress();
      this.gameState.phase = "won";
      this.campaignCompleted = this.progression.isLastLevel();
      this.audio.play(
        this.campaignCompleted ? GAME_SOUNDS.CAMPAIGN_COMPLETE : GAME_SOUNDS.LEVEL_COMPLETE
      );
      this.triggerHaptic("heavy");
      if (this.campaignCompleted) {
        this.finalizeRunScore();
      }
    } else if (!hasAnyValidPair(this.gameState.board)) {
      const recovered = this.ensureBoardHasValidMove(this.gameState.board, true);
      this.noMovesWarning = !recovered;
      if (!recovered) {
        this.audio.play(GAME_SOUNDS.NO_MOVES_WARNING);
        this.finalizeRunScore();
      }
      this.triggerHaptic("medium");
    }

    this.activePath = null;
    this.pendingRemoval = null;
    this.hintPath = null;
    this.hintPathTimerMs = 0;
    this.gameState.inputLocked = false;
  }

  /** Haptic hook (Oasiz). */
  private triggerHaptic(pattern: string): void {
    triggerOasizHaptic(pattern, this.settings.hapticsEnabled);
  }

  /** Score hook (Oasiz). */
  private submitScore(score: number): void {
    submitOasizScore(score);
  }

  /** Run sonunda skoru bir kez submit eder. */
  private finalizeRunScore(): void {
    if (this.runScoreSubmitted) return;
    this.runScoreSubmitted = true;
    this.submitScore(this.runScore);
  }

  private applyLevelWinProgress(): void {
    const levelId = this.gameState.levelId;
    const xpGain = 20 + Math.min(30, Math.floor(levelId * 1.5));
    this.runXp += xpGain;
    this.lastWinXpGain = xpGain;
    this.lastWinRewardText = null;
    this.audio.play(GAME_SOUNDS.XP_GAIN);

    const expectedUnlocked = Math.floor(this.runXp / App.PHOTO_REWARD_XP_STEP);
    if (expectedUnlocked > this.photoRewardsUnlocked) {
      this.photoRewardsUnlocked = expectedUnlocked;
      this.lastWinRewardText = `Photo Reward ${this.photoRewardsUnlocked} unlocked`;
      this.audio.play(GAME_SOUNDS.REWARD_UNLOCK);
    }
  }

  private getXpProgressInStep(): number {
    return this.runXp % App.PHOTO_REWARD_XP_STEP;
  }

  private render(): void {
    const ctx = this.ctx;
    const w = this.displayWidth;
    const h = this.displayHeight;
    const pathToDraw = this.activePath ?? this.hintPath;

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    drawBoard(ctx, this.gameState.board, this.layout, this.gameState.selectedTile, pathToDraw);
    this.hintButton.setDisabled(
      this.settingsOpen ||
      this.gameState.phase !== "playing" ||
      this.gameState.inputLocked ||
      this.noMovesWarning ||
      !!this.activePath
    );

    this.drawHUD(ctx, w);
    if (this.hintFeedbackText && this.hintFeedbackTimer > 0) {
      this.drawHintFeedback(ctx, w, h);
    }

    if (this.tutorialText && this.tutorialTimer > 0) {
      this.drawTutorial(ctx, w, h);
    }

    if (this.noMovesWarning) {
      this.drawNoMovesWarning(ctx, w, h);
    }

    if (this.gameState.phase === "won" || this.gameState.phase === "lost") {
      this.drawOverlay(ctx, w, h);
    }
  }

  private drawHUD(ctx: CanvasRenderingContext2D, w: number): void {
    const padding = BOARD_PADDING;
    const hudY = 8;
    const currentLevel = this.progression.getCurrentIndex() + 1;
    const totalLevels = this.progression.getTotalLevels();

    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.textBaseline = "middle";

    ctx.fillStyle = HUD_TEXT_COLOR;
    ctx.textAlign = "left";
    ctx.fillText(`Level ${currentLevel}/${totalLevels}`, padding, hudY + 14);

    ctx.textAlign = "right";
    ctx.fillText(`Score ${this.gameState.score}`, w - padding, hudY + 14);

    const barX = 90;
    const barW = w - 180;
    const barH = 8;
    const barY = hudY + 10;

    ctx.fillStyle = TIMER_BG_COLOR;
    this.drawRoundBar(ctx, barX, barY, barW, barH, 4);
    ctx.fill();

    const ratio = Math.max(0, this.gameState.timerRemaining / this.gameState.timerTotal);
    ctx.fillStyle = ratio < 0.25 ? TIMER_LOW_COLOR : TIMER_FILL_COLOR;
    if (ratio > 0) {
      this.drawRoundBar(ctx, barX, barY, barW * ratio, barH, 4);
      ctx.fill();
    }

    const seconds = Math.ceil(this.gameState.timerRemaining);
    ctx.fillStyle = HUD_TEXT_COLOR;
    ctx.textAlign = "center";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText(`${seconds}s`, w / 2, barY + barH + 12);

    const xpBarY = barY + 18;
    const xpBarH = 6;
    const xpProgress = this.getXpProgressInStep() / App.PHOTO_REWARD_XP_STEP;

    ctx.fillStyle = "rgba(255,255,255,0.14)";
    this.drawRoundBar(ctx, barX, xpBarY, barW, xpBarH, 4);
    ctx.fill();

    if (xpProgress > 0) {
      ctx.fillStyle = "#f6c445";
      this.drawRoundBar(ctx, barX, xpBarY, barW * xpProgress, xpBarH, 4);
      ctx.fill();
    }

    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText(
      `XP ${this.getXpProgressInStep()}/${App.PHOTO_REWARD_XP_STEP} • Rewards ${this.photoRewardsUnlocked}`,
      w / 2,
      xpBarY + xpBarH + 8
    );
  }

  private drawHintFeedback(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const alpha = Math.min(1, this.hintFeedbackTimer / App.HINT_FEEDBACK_DURATION_S);
    const boxW = Math.min(260, w - 32);
    const boxH = 34;
    const x = (w - boxW) / 2;
    const y = h - 72;

    ctx.save();
    ctx.globalAlpha = 0.88 * alpha;
    ctx.fillStyle = "rgba(10, 18, 36, 0.95)";
    this.drawRoundBar(ctx, x, y, boxW, boxH, 10);
    ctx.fill();

    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "rgba(246, 196, 69, 0.8)";
    ctx.lineWidth = 1.5;
    this.drawRoundBar(ctx, x, y, boxW, boxH, 10);
    ctx.stroke();

    ctx.fillStyle = "#f8f8f8";
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.hintFeedbackText ?? "", w / 2, y + boxH / 2);
    ctx.restore();
  }

  private drawRoundBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    const clampedR = Math.min(r, Math.max(0, w / 2), h / 2);
    if (w <= 0) return;

    ctx.beginPath();
    ctx.moveTo(x + clampedR, y);
    ctx.lineTo(x + w - clampedR, y);
    ctx.arcTo(x + w, y, x + w, y + clampedR, clampedR);
    ctx.lineTo(x + w, y + h - clampedR);
    ctx.arcTo(x + w, y + h, x + w - clampedR, y + h, clampedR);
    ctx.lineTo(x + clampedR, y + h);
    ctx.arcTo(x, y + h, x, y + h - clampedR, clampedR);
    ctx.lineTo(x, y + clampedR);
    ctx.arcTo(x, y, x + clampedR, y, clampedR);
    ctx.closePath();
  }

  private drawTutorial(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const alpha = Math.min(1, this.tutorialTimer);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * alpha})`;
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.tutorialText!, w / 2, h - 30);
  }

  private drawNoMovesWarning(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "#e74c3c";
    ctx.font = "bold 24px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("No Moves Left!", w / 2, h / 2 - 20);

    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillText("Tap to restart", w / 2, h / 2 + 20);
  }

  private drawOverlay(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.fillStyle = OVERLAY_BG;
    ctx.fillRect(0, 0, w, h);

    const introRatio = this.overlayIntroTimer > 0
      ? this.overlayIntroTimer / App.OVERLAY_INTRO_DURATION_S
      : 0;
    const scale = 1 - introRatio * 0.08;

    const cardW = Math.min(420, w - 32);
    const cardH = this.gameState.phase === "won" ? 298 : 250;
    const cardX = (w - cardW) / 2;
    const cardY = (h - cardH) / 2;

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(scale, scale);
    ctx.translate(-w / 2, -h / 2);

    ctx.fillStyle = "rgba(18, 27, 51, 0.98)";
    this.drawRoundBar(ctx, cardX, cardY, cardW, cardH, 16);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 1.5;
    this.drawRoundBar(ctx, cardX, cardY, cardW, cardH, 16);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (this.gameState.phase === "won") {
      const currentLevel = this.progression.getCurrentIndex() + 1;
      const totalLevels = this.progression.getTotalLevels();
      const title = this.campaignCompleted ? "Campaign Complete!" : "Level Complete!";
      const subtitle = this.campaignCompleted
        ? `All ${totalLevels} levels cleared`
        : `Level ${currentLevel} cleared`;

      ctx.fillStyle = this.campaignCompleted ? "#5ce1a0" : "#57d37c";
      ctx.font = "700 34px system-ui, sans-serif";
      ctx.fillText(title, w / 2, cardY + 56);

      ctx.fillStyle = "rgba(255,255,255,0.86)";
      ctx.font = "500 16px system-ui, sans-serif";
      ctx.fillText(subtitle, w / 2, cardY + 88);

      ctx.fillStyle = "#ffffff";
      ctx.font = "600 22px system-ui, sans-serif";
      ctx.fillText(`Score ${this.gameState.score}`, w / 2, cardY + 128);

      ctx.fillStyle = "#f6c445";
      ctx.font = "600 17px system-ui, sans-serif";
      ctx.fillText(`+${this.lastWinXpGain} XP`, w / 2, cardY + 156);

      const progressX = cardX + 30;
      const progressY = cardY + 176;
      const progressW = cardW - 60;
      const progressH = 9;
      const progressRatio = this.getXpProgressInStep() / App.PHOTO_REWARD_XP_STEP;

      ctx.fillStyle = "rgba(255,255,255,0.16)";
      this.drawRoundBar(ctx, progressX, progressY, progressW, progressH, 5);
      ctx.fill();

      if (progressRatio > 0) {
        ctx.fillStyle = "#f6c445";
        this.drawRoundBar(ctx, progressX, progressY, progressW * progressRatio, progressH, 5);
        ctx.fill();
      }

      ctx.fillStyle = "rgba(255,255,255,0.78)";
      ctx.font = "500 13px system-ui, sans-serif";
      ctx.fillText(
        `XP ${this.getXpProgressInStep()}/${App.PHOTO_REWARD_XP_STEP} • Rewards ${this.photoRewardsUnlocked}`,
        w / 2,
        progressY + 20
      );

      if (this.lastWinRewardText) {
        ctx.fillStyle = "rgba(246, 196, 69, 0.2)";
        this.drawRoundBar(ctx, cardX + 38, cardY + 214, cardW - 76, 28, 8);
        ctx.fill();
        ctx.strokeStyle = "rgba(246, 196, 69, 0.9)";
        ctx.lineWidth = 1;
        this.drawRoundBar(ctx, cardX + 38, cardY + 214, cardW - 76, 28, 8);
        ctx.stroke();
        ctx.fillStyle = "#ffd56c";
        ctx.font = "600 13px system-ui, sans-serif";
        ctx.fillText(`${this.lastWinRewardText} (placeholder)`, w / 2, cardY + 228);
      }

      ctx.fillStyle = "rgba(255,255,255,0.12)";
      this.drawRoundBar(ctx, cardX + 54, cardY + cardH - 46, cardW - 108, 30, 10);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.28)";
      ctx.lineWidth = 1.2;
      this.drawRoundBar(ctx, cardX + 54, cardY + cardH - 46, cardW - 108, 30, 10);
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "600 14px system-ui, sans-serif";
      const actionText = this.campaignCompleted ? "Tap to restart campaign" : "Tap for next level";
      ctx.fillText(actionText, w / 2, cardY + cardH - 31);
    } else {
      ctx.fillStyle = "#ff6a6a";
      ctx.font = "700 34px system-ui, sans-serif";
      ctx.fillText("Time's Up!", w / 2, cardY + 62);

      ctx.fillStyle = "rgba(255,255,255,0.84)";
      ctx.font = "500 16px system-ui, sans-serif";
      ctx.fillText("You can retry this level instantly.", w / 2, cardY + 94);

      ctx.fillStyle = "#ffffff";
      ctx.font = "600 22px system-ui, sans-serif";
      ctx.fillText(`Score ${this.gameState.score}`, w / 2, cardY + 138);

      ctx.fillStyle = "rgba(255,255,255,0.12)";
      this.drawRoundBar(ctx, cardX + 56, cardY + cardH - 52, cardW - 112, 34, 10);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.28)";
      ctx.lineWidth = 1.2;
      this.drawRoundBar(ctx, cardX + 56, cardY + cardH - 52, cardW - 112, 34, 10);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = "600 14px system-ui, sans-serif";
      ctx.fillText("Tap to retry", w / 2, cardY + cardH - 35);
    }

    ctx.restore();
  }
}
