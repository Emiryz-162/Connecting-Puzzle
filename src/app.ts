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
  private settings: Settings;
  private settingsOpen = false;

  // Path animation state.
  private activePath: TilePath | null = null;
  private pathDisplayTimer = 0;
  private pendingRemoval: [Coord, Coord] | null = null;

  // No-move warning state.
  private noMovesWarning = false;

  // Tutorial text state.
  private tutorialText: string | null = null;
  private tutorialTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.settingsStore = new SettingsStore();
    this.settings = this.settingsStore.get();
    this.settingsModal = new SettingsModal(
      this.settings,
      (next) => {
        this.settings = this.settingsStore.set(next);
        this.settingsModal.setSettings(this.settings);
      },
      (isOpen) => {
        this.settingsOpen = isOpen;
      }
    );

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
    }

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
      if (this.ensureBoardHasValidMove(board)) {
        return board;
      }
    }
    throw new Error(`Playable board could not be created (level ${def.id}).`);
  }

  /** Ensure board has a valid pair; reshuffle tile types when needed. */
  private ensureBoardHasValidMove(board: BoardState): boolean {
    if (hasAnyValidPair(board)) {
      return true;
    }

    for (let i = 0; i < App.MAX_RESHUFFLE_ATTEMPTS; i++) {
      const changed = reshuffleBoardTiles(board);
      if (!changed) {
        return false;
      }
      if (hasAnyValidPair(board)) {
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
    if (this.settingsOpen) return;
    if (this.gameState.phase !== "playing") return;

    this.gameState.timerRemaining -= dt;
    if (this.gameState.timerRemaining <= 0) {
      this.gameState.timerRemaining = 0;
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

    if (this.gameState.phase === "won") {
      if (this.campaignCompleted) {
        this.restartCampaign();
      } else {
        this.nextLevel();
      }
      return;
    }

    if (this.gameState.phase === "lost") {
      this.restartLevel();
      return;
    }

    if (this.noMovesWarning) {
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
      return;
    }

    const selected = this.gameState.selectedTile;

    if (selected.col === coord.col && selected.row === coord.row) {
      this.gameState.selectedTile = null;
      return;
    }

    const selectedCell = this.gameState.board.cells[selected.row][selected.col];
    if (selectedCell.tileType !== cell.tileType) {
      this.gameState.selectedTile = coord;
      return;
    }

    const path = findPath(this.gameState.board, selected, coord);
    if (!path) {
      this.gameState.selectedTile = coord;
      return;
    }

    this.gameState.inputLocked = true;
    this.gameState.selectedTile = null;
    this.activePath = path;
    this.pathDisplayTimer = PATH_DISPLAY_DURATION;
    this.pendingRemoval = [selected, coord];
    this.noMovesWarning = false;

    this.triggerHaptic("light");
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
    this.runScore += 100;
    this.gameState.score = this.runScore;

    const unfrozen = unfreezeNeighbors(this.gameState.board, [a, b]);
    if (unfrozen.length > 0) {
      this.triggerHaptic("light");
    }

    resolveGravity(this.gameState.board);
    moveJumpingBlockers(this.gameState.board);

    const remaining = countRemainingTiles(this.gameState.board);
    if (remaining === 0) {
      this.gameState.phase = "won";
      this.campaignCompleted = this.progression.isLastLevel();
      this.triggerHaptic("heavy");
      if (this.campaignCompleted) {
        this.finalizeRunScore();
      }
    } else if (!hasAnyValidPair(this.gameState.board)) {
      const recovered = this.ensureBoardHasValidMove(this.gameState.board);
      this.noMovesWarning = !recovered;
      if (!recovered) {
        this.finalizeRunScore();
      }
      this.triggerHaptic("medium");
    }

    this.activePath = null;
    this.pendingRemoval = null;
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

  private render(): void {
    const ctx = this.ctx;
    const w = this.displayWidth;
    const h = this.displayHeight;

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    drawBoard(ctx, this.gameState.board, this.layout, this.gameState.selectedTile, this.activePath);

    this.drawHUD(ctx, w);

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

    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.textBaseline = "middle";

    ctx.fillStyle = HUD_TEXT_COLOR;
    ctx.textAlign = "left";
    ctx.fillText(`Level ${this.gameState.levelId}`, padding, hudY + 14);

    ctx.textAlign = "right";
    ctx.fillText(`${this.gameState.score}`, w - padding, hudY + 14);

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
    ctx.fillText(`${seconds}s`, w / 2, barY + barH + 14);
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

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (this.gameState.phase === "won") {
      ctx.fillStyle = "#2ecc71";
      ctx.font = "bold 36px system-ui, sans-serif";
      const title = this.campaignCompleted ? "Campaign Complete!" : "Level Complete!";
      ctx.fillText(title, w / 2, h / 2 - 40);

      ctx.fillStyle = HUD_TEXT_COLOR;
      ctx.font = "24px system-ui, sans-serif";
      ctx.fillText(`Score: ${this.gameState.score}`, w / 2, h / 2 + 10);

      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = "16px system-ui, sans-serif";
      const hint = this.campaignCompleted ? "Tap to restart campaign" : "Tap for next level";
      ctx.fillText(hint, w / 2, h / 2 + 60);
    } else {
      ctx.fillStyle = "#e74c3c";
      ctx.font = "bold 36px system-ui, sans-serif";
      ctx.fillText("Time's Up!", w / 2, h / 2 - 40);

      ctx.fillStyle = HUD_TEXT_COLOR;
      ctx.font = "24px system-ui, sans-serif";
      ctx.fillText(`Score: ${this.gameState.score}`, w / 2, h / 2 + 10);

      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = "16px system-ui, sans-serif";
      ctx.fillText("Tap to retry", w / 2, h / 2 + 60);
    }
  }
}
