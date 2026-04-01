import Phaser from "phaser";
// app.ts
// Main orchestration: loop, state transitions, match pipeline, HUD and overlays.

import {
  BoardLayout,
  BoardState,
  Cell,
  CellKind,
  Coord,
  GameState,
  LevelDef,
  Settings,
  SettleMove,
  TilePath,
} from "../types";
import { createBoard, countRemainingTiles, removeTiles, reshuffleBoardTiles } from "../game/board";
import { findPath, hasAnyValidPair } from "../game/pathfinder";
import { resolveGravity } from "../game/gravity";
import { unfreezeNeighbors } from "../game/frozen";
import { moveJumpingBlockers } from "../game/jumper";
import {
  FallingTileRenderItem,
  GravitySlideRenderItem,
  MergePullRenderItem,
  calculateLayout,
  drawBoard,
  drawFallingTiles,
} from "../render/board-renderer";
import { LEVELS } from "../levels/level-data";
import { LevelProgression } from "../levels/progression";
import { LevelProgressStore } from "../levels/progress-store";
import { SettingsStore } from "../settings/store";
import { SettingsModal } from "../ui/settings-modal";
import { HintButton } from "../ui/hint-button";
import { HomeButton } from "../ui/home-button";
import { ReplayButton } from "../ui/replay-button";
import { StartScreen } from "../ui/start-screen";
import { HudOverlay } from "../ui/hud-overlay";
import { ResultOverlay } from "../ui/result-overlay";
import { HintFeedbackOverlay } from "../ui/hint-feedback-overlay";
import {
  TutorialCircleSpotlight,
  TutorialOverlay,
  TutorialRectSpotlight,
} from "../ui/tutorial-overlay";
import { AudioManager, GAME_SOUNDS } from "../audio/audio-manager";
import { submitOasizScore, triggerOasizHaptic } from "../platform/oasiz";
import { TutorialProgressStore } from "../tutorial/tutorial-progress-store";
import {
  ALL_TILE_THEME_DEFINITIONS,
  TileThemeId,
  getTextureKeyForThemeTile,
  getThemeForLevel,
} from "../themes/tile-themes";
import { SPECIAL_TEXTURE_KEYS } from "../themes/special-assets";
import {
  BG_COLOR,
  PATH_DISPLAY_DURATION,
  OVERLAY_BG,
} from "../constants";

// Test helper: change this to start directly from a specific level id (1..30).
const START_LEVEL_ID_FOR_TESTING = 1;
const START_LEVEL_ID = Math.max(1, Math.min(30, START_LEVEL_ID_FOR_TESTING));
const MATCH_SCORE_PER_PAIR = 100;

const TUTORIAL_SCRIPT: TutorialScriptStep[] = [
  {
    id: "intro-match",
    message: "Tap these two matching tiles to connect them.",
    placement: "bottom",
    matchBoard: "intro",
  },
  {
    id: "hud-level",
    message: "Level shows your current stage and the total number of levels.",
    placement: "top",
    tapToContinue: true,
    highlightHud: "level",
  },
  {
    id: "hud-score",
    message: `Score goes up by ${MATCH_SCORE_PER_PAIR} points for each successful match.`,
    placement: "top",
    tapToContinue: true,
    highlightHud: "score",
  },
  {
    id: "hud-time",
    message: "Time keeps decreasing. If it runs out, you lose the level.",
    placement: "top",
    tapToContinue: true,
    highlightHud: "timer",
  },
  {
    id: "hud-xp",
    message: "XP tracks your progress during the run.",
    placement: "top",
    tapToContinue: true,
    highlightHud: "xp",
  },
  {
    id: "hud-buttons",
    message:
      "Quick controls: Home returns to main menu, Hint reveals a match, Replay restarts the level, and Settings opens options.",
    placement: "bottom",
    tapToContinue: true,
    highlightButtons: true,
  },
  {
    id: "gravity-intro",
    message: "Next: gravity. After a match, tiles slide in the gravity direction.",
    placement: "bottom",
    tapToContinue: true,
  },
  {
    id: "gravity-match",
    message: "Make this match and watch how the board settles.",
    placement: "bottom",
    matchBoard: "gravity",
  },
  {
    id: "gravity-explain",
    message: "Great. Gravity re-packs the board after each match.",
    placement: "bottom",
    tapToContinue: true,
  },
  {
    id: "frozen-intro",
    message: "Now frozen tiles: match next to ice to break it.",
    placement: "bottom",
    tapToContinue: true,
  },
  {
    id: "frozen-match",
    message: "Match this pair beside ice.",
    placement: "bottom",
    matchBoard: "frozen",
  },
  {
    id: "frozen-explain",
    message: "Nice. Ice unlocks when a neighboring match pops.",
    placement: "bottom",
    tapToContinue: true,
  },
  {
    id: "jumper-intro",
    message: "Last one: monkey blockers jump to random empty cells after each match.",
    placement: "bottom",
    tapToContinue: true,
  },
  {
    id: "jumper-match",
    message: "Make this match and watch the monkey move.",
    placement: "bottom",
    matchBoard: "jumper",
  },
  {
    id: "jumper-explain",
    message: "Perfect. Monkey blockers reposition randomly every time you match.",
    placement: "bottom",
    tapToContinue: true,
  },
  {
    id: "done",
    message: "Tutorial complete. Tap anywhere and start your run.",
    placement: "bottom",
    tapToContinue: true,
  },
];

interface MergePullAnimation {
  from: Coord;
  to: Coord;
  tileType: number;
  elapsedMs: number;
  durationMs: number;
}

interface GravitySlideAnimation {
  from: Coord;
  to: Coord;
  tileType: number;
  kind: CellKind.Tile | CellKind.FrozenTile;
  elapsedMs: number;
  durationMs: number;
}

interface MatchClearTileAnimation {
  coord: Coord;
  tileType: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotationRad: number;
  rotationSpeedRad: number;
  alpha: number;
  scale: number;
}

interface MatchClearAnimation {
  phase: "approach" | "scatter";
  pathPoints: Array<{ x: number; y: number }>;
  segmentLengths: number[];
  totalPathLength: number;
  meetDistance: number;
  approachElapsedMs: number;
  approachDurationMs: number;
  scatterElapsedMs: number;
  scatterDurationMs: number;
  tiles: [MatchClearTileAnimation, MatchClearTileAnimation];
}

type TutorialStepId =
  | "intro-match"
  | "hud-level"
  | "hud-score"
  | "hud-time"
  | "hud-xp"
  | "hud-buttons"
  | "gravity-intro"
  | "gravity-match"
  | "gravity-explain"
  | "frozen-intro"
  | "frozen-match"
  | "frozen-explain"
  | "jumper-intro"
  | "jumper-match"
  | "jumper-explain"
  | "done";

type TutorialBoardKind = "intro" | "gravity" | "frozen" | "jumper";

interface TutorialScriptStep {
  id: TutorialStepId;
  message: string;
  placement?: "top" | "center" | "bottom";
  tapToContinue?: boolean;
  matchBoard?: TutorialBoardKind;
  highlightHud?: "level" | "score" | "timer" | "xp";
  highlightButtons?: boolean;
}

interface TutorialBoardPreset {
  board: BoardState;
  targetPair: [Coord, Coord];
}

export class GameScene extends Phaser.Scene {
  public static readonly SCENE_KEY = "GameScene";
  private static readonly MAX_INIT_BUILD_ATTEMPTS = 12;
  private static readonly MAX_RESHUFFLE_ATTEMPTS = 24;
  private static readonly HINT_DISPLAY_DURATION_MS = 1400;
  private static readonly HINT_FEEDBACK_DURATION_S = 1.2;
  private static readonly XP_PROGRESS_STEP = 150;
  private static readonly OVERLAY_INTRO_DURATION_S = 0.24;
  private static readonly MATCH_CHAIN_WINDOW_MS = 1300;
  private static readonly TIME_LOW_WARNING_SECONDS = 10;
  private static readonly MERGE_PULL_DURATION_MS = 170;
  private static readonly MAX_MERGE_PULL_ANIMATIONS = 10;
  private static readonly GRAVITY_SLIDE_BASE_DURATION_MS = 95;
  private static readonly GRAVITY_SLIDE_PER_CELL_MS = 34;
  private static readonly MAX_GRAVITY_SLIDE_DURATION_MS = 220;
  private static readonly MAX_GRAVITY_SLIDE_ANIMATIONS = 64;
  private static readonly MATCH_CLEAR_APPROACH_DURATION_MS = 220;
  private static readonly MATCH_CLEAR_SCATTER_DURATION_MS = 430;
  private static readonly MATCH_CLEAR_SCATTER_GRAVITY_PX_S2 = 2750;
  private static readonly MATCH_CLEAR_SCATTER_SPEED_PX_S = 300;
  private static readonly MATCH_CLEAR_SCATTER_LIFT_PX_S = 245;

  private renderCanvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private displayWidth = 0;
  private displayHeight = 0;
  private renderPixelRatio = 1;
  private readonly tileImagesByTextureKey = new Map<string, CanvasImageSource>();
  private activeTheme: TileThemeId = "foods";
  private monkeyImage: CanvasImageSource | null = null;
  private iceOverlayImage: CanvasImageSource | null = null;
  private foodsBackgroundImage: CanvasImageSource | null = null;
  private landmarksBackgroundImage: CanvasImageSource | null = null;
  private planetsBackgroundImage: CanvasImageSource | null = null;

  private gameState!: GameState;
  private layout!: BoardLayout;

  private progression = new LevelProgression(LEVELS, START_LEVEL_ID);
  private levelProgressStore!: LevelProgressStore;
  private campaignCompleted = false;
  private runScore = 0;
  private runScoreSubmitted = false;
  private settingsStore!: SettingsStore;
  private settingsModal!: SettingsModal;
  private hintButton!: HintButton;
  private homeButton!: HomeButton;
  private replayButton!: ReplayButton;
  private startScreen!: StartScreen;
  private hudOverlay!: HudOverlay;
  private resultOverlay!: ResultOverlay;
  private hintFeedbackOverlay!: HintFeedbackOverlay;
  private tutorialOverlay!: TutorialOverlay;
  private audio!: AudioManager;
  private settings!: Settings;
  private settingsOpen = false;
  private tutorialProgressStore!: TutorialProgressStore;
  private tutorialEnabled = false;
  private tutorialStepIndex = 0;
  private tutorialExpectedPair: [Coord, Coord] | null = null;
  private tutorialActiveBoard: TutorialBoardKind = "intro";

  // Path animation state.
  private activePath: TilePath | null = null;
  private pathDisplayTimer = 0;
  private pendingRemoval: [Coord, Coord] | null = null;
  private pendingRemovalUsedClearFall = false;
  private hintPath: TilePath | null = null;
  private hintPathTimerMs = 0;
  private hintFeedbackText: string | null = null;
  private hintFeedbackTimer = 0;

  // No-move warning state.
  private noMovesWarning = false;
  private runXp = 0;
  private lastWinXpGain = 0;
  private previousPhase: GameState["phase"] | null = null;
  private overlayIntroTimer = 0;
  private timeLowWarningPlayed = false;
  private lastSuccessfulMatchAtMs = 0;
  private keyboardCursor: Coord | null = null;
  private mergePullAnimations: MergePullAnimation[] = [];
  private gravitySlideAnimations: GravitySlideAnimation[] = [];
  private matchClearAnimation: MatchClearAnimation | null = null;

  constructor() {
    super(GameScene.SCENE_KEY);
  }

  create(): void {
    this.settingsStore = new SettingsStore();
    this.tutorialProgressStore = new TutorialProgressStore();
    this.settings = this.settingsStore.get();
    this.levelProgressStore = new LevelProgressStore(
      this.progression.getTotalLevels(),
      START_LEVEL_ID
    );
    const resumeLevel = this.getResumeLevelId();
    this.progression.setCurrentLevelById(resumeLevel);
    this.audio = new AudioManager(this.settings.fxEnabled, this.settings.musicEnabled);
    this.settingsModal = new SettingsModal(
      this.settings,
      (next) => {
        const previousSettings = this.settings;
        if (previousSettings.fxEnabled !== next.fxEnabled) {
          if (next.fxEnabled) {
            this.audio.setFxEnabled(true);
            this.audio.play(GAME_SOUNDS.SETTINGS_TOGGLE_ON);
          }
        }
        this.settings = this.settingsStore.set(next);
        this.audio.setFxEnabled(this.settings.fxEnabled);
        this.audio.setMusicEnabled(this.settings.musicEnabled);
        this.settingsModal.setSettings(this.settings);
      },
      (isOpen) => {
        this.settingsOpen = isOpen;
        this.setSceneInputEnabled(!isOpen && !this.startScreen.isVisible());
        if (isOpen && this.gameState) {
          this.gameState.selectedTile = null;
        }
      },
      (_key, value) => {
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
    this.homeButton = new HomeButton(() => this.handleHomeButtonClick());
    this.replayButton = new ReplayButton(() => this.handleReplayButtonClick());
    this.startScreen = new StartScreen(
      () => this.handleStartScreenPlay(),
      () => this.handleStartScreenSettings(),
      (levelId) => this.handleStartScreenLevelSelect(levelId),
      () => this.handleStartScreenTutorial(),
      () => this.audio.play(GAME_SOUNDS.BUTTON_CLICK_PRIMARY)
    );
    this.hudOverlay = new HudOverlay();
    this.resultOverlay = new ResultOverlay();
    this.hintFeedbackOverlay = new HintFeedbackOverlay();
    this.tutorialOverlay = new TutorialOverlay();
    this.hydrateThemeTileImages();

    this.handleResize();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    window.addEventListener("keydown", this.handleKeyDown);

    this.initLevel(this.progression.getCurrentLevel(), false, false);
    this.pauseForStartScreen();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  override update(_time: number, delta: number): void {
    if (!this.gameState || !this.ctx) {
      return;
    }
    this.updateState(Math.min(delta / 1000, 0.1));
    this.renderFrame();
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    const nativeEvent = pointer.event;
    if (nativeEvent instanceof MouseEvent && nativeEvent.button !== 0) {
      return;
    }
    if (this.handleTutorialPointerDown(pointer)) {
      return;
    }
    if (!this.gameState || !this.layout) {
      return;
    }
    const boardWidth = this.gameState.board.width;
    const boardHeight = this.gameState.board.height;
    const col = Math.floor((pointer.x - this.layout.offsetX) / this.layout.cellSize);
    const row = Math.floor((pointer.y - this.layout.offsetY) / this.layout.cellSize);
    this.handleTap({ col, row }, boardWidth, boardHeight);
  }

  private setSceneInputEnabled(enabled: boolean): void {
    this.input.enabled = enabled;
    if (this.input.keyboard) {
      this.input.keyboard.enabled = enabled;
    }
  }

  private createRenderSurface(): void {
    const pixelWidth = Math.max(1, Math.round(this.displayWidth * this.renderPixelRatio));
    const pixelHeight = Math.max(1, Math.round(this.displayHeight * this.renderPixelRatio));

    if (!this.renderCanvas) {
      this.renderCanvas = document.createElement("canvas");
      this.renderCanvas.setAttribute("aria-hidden", "true");
      Object.assign(this.renderCanvas.style, {
        position: "fixed",
        inset: "0",
        zIndex: "5",
        pointerEvents: "none",
      });
      document.body.appendChild(this.renderCanvas);
    }

    this.renderCanvas.width = pixelWidth;
    this.renderCanvas.height = pixelHeight;
    this.renderCanvas.style.width = `${this.displayWidth}px`;
    this.renderCanvas.style.height = `${this.displayHeight}px`;

    const context = this.renderCanvas.getContext("2d", {
      alpha: false,
    });
    if (!context) {
      throw new Error("Render canvas context olusturulamadi.");
    }
    this.ctx = context;
    this.applyRenderContextQuality();
  }

  private handleShutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    window.removeEventListener("keydown", this.handleKeyDown);
    this.audio?.destroy();
    this.settingsModal?.destroy();
    this.hintButton?.destroy();
    this.homeButton?.destroy();
    this.replayButton?.destroy();
    this.startScreen?.destroy();
    this.hudOverlay?.destroy();
    this.resultOverlay?.destroy();
    this.hintFeedbackOverlay?.destroy();
    this.tutorialOverlay?.destroy();
    this.tileImagesByTextureKey.clear();
    this.mergePullAnimations = [];
    this.gravitySlideAnimations = [];
    this.matchClearAnimation = null;
    this.monkeyImage = null;
    this.iceOverlayImage = null;
    this.foodsBackgroundImage = null;
    this.landmarksBackgroundImage = null;
    this.planetsBackgroundImage = null;
    this.landmarksBackgroundImage = null;
    this.planetsBackgroundImage = null;
    if (this.renderCanvas) {
      this.renderCanvas.remove();
    }
  }

  private initLevel(def: LevelDef, preserveRunScore: boolean, persistLastPlayed = true): void {
    if (persistLastPlayed && this.levelProgressStore) {
      this.levelProgressStore.setLastPlayedLevel(def.id);
    }
    this.activeTheme = getThemeForLevel(def.id);
    const board = this.createPlayableBoard(def);

    if (!preserveRunScore) {
      this.runScore = 0;
      this.runScoreSubmitted = false;
      this.runXp = 0;
    }
    this.lastWinXpGain = 0;
    this.hintPath = null;
    this.hintPathTimerMs = 0;
    this.hintFeedbackText = null;
    this.hintFeedbackTimer = 0;
    this.timeLowWarningPlayed = false;
    this.lastSuccessfulMatchAtMs = 0;
    this.pathDisplayTimer = 0;

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
    this.keyboardCursor = this.findInitialKeyboardCursor(board);
    this.previousPhase = this.gameState.phase;
    this.overlayIntroTimer = 0;

    this.noMovesWarning = false;
    this.activePath = null;
    this.pendingRemoval = null;
    this.pendingRemovalUsedClearFall = false;
    this.mergePullAnimations = [];
    this.gravitySlideAnimations = [];
    this.matchClearAnimation = null;

    this.recalculateLayout();
    this.syncStartScreenLevelSelectionState();
  }

  /** Build a board and guarantee at least one valid move at start. */
  private createPlayableBoard(def: LevelDef): BoardState {
    for (let i = 0; i < GameScene.MAX_INIT_BUILD_ATTEMPTS; i++) {
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
    for (let i = 0; i < GameScene.MAX_RESHUFFLE_ATTEMPTS; i++) {
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
    this.displayWidth = Math.max(1, Math.round(this.scale.gameSize.width));
    this.displayHeight = Math.max(1, Math.round(this.scale.gameSize.height));
    this.renderPixelRatio = this.resolveRenderPixelRatio();
    this.createRenderSurface();

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

  }

  private resolveRenderPixelRatio(): number {
    if (typeof window === "undefined") {
      return 1;
    }

    const raw = window.devicePixelRatio || 1;
    if (!Number.isFinite(raw) || raw <= 0) {
      return 1;
    }
    return Math.min(raw, 3);
  }

  private applyRenderContextQuality(): void {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    if ("imageSmoothingQuality" in this.ctx) {
      this.ctx.imageSmoothingQuality = "high";
    }
  }

  private hydrateThemeTileImages(): void {
    this.tileImagesByTextureKey.clear();
    for (const theme of ALL_TILE_THEME_DEFINITIONS) {
      for (const textureKey of theme.tileTextureKeys) {
        if (!this.textures.exists(textureKey)) {
          continue;
        }
        const texture = this.textures.get(textureKey);
        const sourceImage = texture.getSourceImage() as CanvasImageSource | null;
        if (sourceImage) {
          this.tileImagesByTextureKey.set(textureKey, sourceImage);
        }
      }
    }

    this.monkeyImage = null;
    this.iceOverlayImage = null;
    this.foodsBackgroundImage = null;

    if (this.textures.exists(SPECIAL_TEXTURE_KEYS.monkey)) {
      const monkeyTexture = this.textures.get(SPECIAL_TEXTURE_KEYS.monkey);
      this.monkeyImage = (monkeyTexture.getSourceImage() as CanvasImageSource | null) ?? null;
    }
    if (this.textures.exists(SPECIAL_TEXTURE_KEYS.iceOverlay)) {
      const iceTexture = this.textures.get(SPECIAL_TEXTURE_KEYS.iceOverlay);
      this.iceOverlayImage = (iceTexture.getSourceImage() as CanvasImageSource | null) ?? null;
    }
    if (this.textures.exists(SPECIAL_TEXTURE_KEYS.foodsBackground)) {
      const foodsBackgroundTexture = this.textures.get(SPECIAL_TEXTURE_KEYS.foodsBackground);
      this.foodsBackgroundImage =
        (foodsBackgroundTexture.getSourceImage() as CanvasImageSource | null) ?? null;
    }
    if (this.textures.exists(SPECIAL_TEXTURE_KEYS.landmarksBackground)) {
      const landmarksBackgroundTexture = this.textures.get(SPECIAL_TEXTURE_KEYS.landmarksBackground);
      this.landmarksBackgroundImage =
        (landmarksBackgroundTexture.getSourceImage() as CanvasImageSource | null) ?? null;
    }
    if (this.textures.exists(SPECIAL_TEXTURE_KEYS.planetsBackground)) {
      const planetsBackgroundTexture = this.textures.get(SPECIAL_TEXTURE_KEYS.planetsBackground);
      this.planetsBackgroundImage =
        (planetsBackgroundTexture.getSourceImage() as CanvasImageSource | null) ?? null;
    }
  }

  private resolveTileImage = (tileType: number): CanvasImageSource | null => {
    const textureKey = getTextureKeyForThemeTile(this.activeTheme, tileType);
    return this.tileImagesByTextureKey.get(textureKey) ?? null;
  };

  private updateState(dt: number): void {
    const deltaMs = dt * 1000;

    this.updateMatchClearAnimation(dt, deltaMs);

    if (this.pendingRemoval && !this.matchClearAnimation && this.gameState.inputLocked) {
      this.executeRemoval();
    }

    if (this.mergePullAnimations.length > 0) {
      this.mergePullAnimations = this.mergePullAnimations
        .map((anim) => ({ ...anim, elapsedMs: anim.elapsedMs + deltaMs }))
        .filter((anim) => anim.elapsedMs < anim.durationMs);
    }
    if (this.gravitySlideAnimations.length > 0) {
      this.gravitySlideAnimations = this.gravitySlideAnimations
        .map((anim) => ({ ...anim, elapsedMs: anim.elapsedMs + deltaMs }))
        .filter((anim) => anim.elapsedMs < anim.durationMs);
    }

    if (this.previousPhase !== this.gameState.phase) {
      const isOverlayPhase = this.gameState.phase === "won" || this.gameState.phase === "lost";
      this.overlayIntroTimer = isOverlayPhase ? GameScene.OVERLAY_INTRO_DURATION_S : 0;
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

    if (this.activePath && this.pathDisplayTimer > 0) {
      this.pathDisplayTimer = Math.max(0, this.pathDisplayTimer - deltaMs);
      if (this.pathDisplayTimer <= 0) {
        this.activePath = null;
      }
    }

    if (this.settingsOpen) return;
    if (this.tutorialEnabled) return;
    if (this.gameState.phase !== "playing") return;
    if (this.noMovesWarning) return;

    this.gameState.timerRemaining -= dt;
    if (
      !this.timeLowWarningPlayed &&
      this.gameState.timerRemaining > 0 &&
      this.gameState.timerRemaining <= GameScene.TIME_LOW_WARNING_SECONDS
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

  }

  private handleTap(coord: Coord, boardWidth: number, boardHeight: number): void {
    if (this.startScreen.isVisible()) {
      return;
    }
    if (this.settingsOpen) {
      return;
    }
    if (coord.col >= 0 && coord.col < boardWidth && coord.row >= 0 && coord.row < boardHeight) {
      this.keyboardCursor = { ...coord };
    }
    this.hintPath = null;
    this.hintPathTimerMs = 0;

    if (
      this.tutorialEnabled &&
      this.isTutorialMatchStepActive() &&
      !this.isCoordInsideTutorialTargetPair(coord)
    ) {
      this.gameState.selectedTile = null;
      return;
    }

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
    this.pendingRemovalUsedClearFall = false;
    this.noMovesWarning = false;
    this.hintFeedbackText = null;
    this.hintFeedbackTimer = 0;

    this.triggerHaptic("light");
    this.startMatchClearAnimationForPendingRemoval(path);
  }

  private handleHintRequest(): void {
    if (this.startScreen.isVisible()) return;
    if (this.tutorialEnabled) return;
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
    this.hintPathTimerMs = GameScene.HINT_DISPLAY_DURATION_MS;
    this.showHintFeedback("Hint highlighted.", GameScene.HINT_FEEDBACK_DURATION_S);
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

  private startMatchClearAnimationForPendingRemoval(path: TilePath): void {
    if (!this.pendingRemoval || !this.layout) {
      this.pendingRemovalUsedClearFall = false;
      this.executeRemoval();
      return;
    }

    const [a, b] = this.pendingRemoval;
    const firstCell = this.gameState.board.cells[a.row][a.col];
    const secondCell = this.gameState.board.cells[b.row][b.col];

    if (
      firstCell.kind !== CellKind.Tile ||
      secondCell.kind !== CellKind.Tile ||
      firstCell.tileType === null ||
      secondCell.tileType === null
    ) {
      this.pendingRemovalUsedClearFall = false;
      this.executeRemoval();
      return;
    }

    const pathPoints = path.map((coord) => ({
      x: this.layout.offsetX + (coord.col + 0.5) * this.layout.cellSize,
      y: this.layout.offsetY + (coord.row + 0.5) * this.layout.cellSize,
    }));
    const { segmentLengths, totalLength } = this.measurePath(pathPoints);
    if (pathPoints.length < 2 || totalLength <= 0.01) {
      this.pendingRemovalUsedClearFall = false;
      this.executeRemoval();
      return;
    }

    const meetDistance = totalLength * 0.5;
    const collisionPoint = this.samplePathPoint(pathPoints, segmentLengths, meetDistance);
    const firstStart = this.samplePathPoint(pathPoints, segmentLengths, 0);
    const secondStart = this.samplePathPoint(pathPoints, segmentLengths, totalLength);

    this.pendingRemovalUsedClearFall = true;
    this.matchClearAnimation = {
      phase: "approach",
      pathPoints,
      segmentLengths,
      totalPathLength: totalLength,
      meetDistance,
      approachElapsedMs: 0,
      approachDurationMs: GameScene.MATCH_CLEAR_APPROACH_DURATION_MS,
      scatterElapsedMs: 0,
      scatterDurationMs: GameScene.MATCH_CLEAR_SCATTER_DURATION_MS,
      tiles: [
        {
          coord: { ...a },
          tileType: firstCell.tileType,
          x: firstStart.x,
          y: firstStart.y,
          vx: 0,
          vy: 0,
          rotationRad: 0,
          rotationSpeedRad: 0,
          alpha: 1,
          scale: 1,
        },
        {
          coord: { ...b },
          tileType: secondCell.tileType,
          x: secondStart.x,
          y: secondStart.y,
          vx: 0,
          vy: 0,
          rotationRad: 0,
          rotationSpeedRad: 0,
          alpha: 1,
          scale: 1,
        },
      ],
    };

    // Keep the link visible while tiles travel on that exact path.
    this.activePath = path;
    this.pathDisplayTimer = Math.max(PATH_DISPLAY_DURATION, GameScene.MATCH_CLEAR_APPROACH_DURATION_MS + 40);
  }

  private updateMatchClearAnimation(dt: number, deltaMs: number): void {
    const anim = this.matchClearAnimation;
    if (!anim) {
      return;
    }

    if (anim.phase === "approach") {
      anim.approachElapsedMs += deltaMs;
      const progress = Math.max(0, Math.min(1, anim.approachElapsedMs / anim.approachDurationMs));
      const eased = this.easeInOutCubic(progress);
      const firstDistance = anim.meetDistance * eased;
      const secondDistance = anim.totalPathLength - anim.meetDistance * eased;
      const firstPos = this.samplePathPoint(anim.pathPoints, anim.segmentLengths, firstDistance);
      const secondPos = this.samplePathPoint(anim.pathPoints, anim.segmentLengths, secondDistance);

      anim.tiles[0].x = firstPos.x;
      anim.tiles[0].y = firstPos.y;
      anim.tiles[1].x = secondPos.x;
      anim.tiles[1].y = secondPos.y;
      anim.tiles[0].rotationRad = eased * -0.16;
      anim.tiles[1].rotationRad = eased * 0.16;

      if (progress >= 1) {
        this.startMatchClearScatter(anim);
      }
      return;
    }

    anim.scatterElapsedMs += deltaMs;
    const scatterProgress = Math.max(0, Math.min(1, anim.scatterElapsedMs / anim.scatterDurationMs));
    const fade = Math.max(0, 1 - Math.pow(scatterProgress, 1.18));

    for (const tile of anim.tiles) {
      tile.vy += GameScene.MATCH_CLEAR_SCATTER_GRAVITY_PX_S2 * dt;
      tile.x += tile.vx * dt;
      tile.y += tile.vy * dt;
      tile.rotationRad += tile.rotationSpeedRad * dt;
      tile.alpha = fade;
      tile.scale = Math.max(0.72, 1 - scatterProgress * 0.28);
    }

    if (scatterProgress >= 1 || anim.tiles.every((tile) => tile.alpha <= 0.01)) {
      this.matchClearAnimation = null;
    }
  }

  private startMatchClearScatter(anim: MatchClearAnimation): void {
    const collisionPoint = this.samplePathPoint(anim.pathPoints, anim.segmentLengths, anim.meetDistance);
    const tangent = this.samplePathTangent(anim.pathPoints, anim.segmentLengths, anim.meetDistance);
    const normal = { x: -tangent.y, y: tangent.x };
    const normalLength = Math.hypot(normal.x, normal.y) || 1;
    const nx = normal.x / normalLength;
    const ny = normal.y / normalLength;

    const spreadOffset = Math.max(6, this.layout.cellSize * 0.12);
    anim.tiles[0].x = collisionPoint.x + nx * spreadOffset;
    anim.tiles[0].y = collisionPoint.y + ny * spreadOffset;
    anim.tiles[1].x = collisionPoint.x - nx * spreadOffset;
    anim.tiles[1].y = collisionPoint.y - ny * spreadOffset;

    const lateral = GameScene.MATCH_CLEAR_SCATTER_SPEED_PX_S;
    const forwardKick = 55;
    const liftBase = GameScene.MATCH_CLEAR_SCATTER_LIFT_PX_S;
    anim.tiles[0].vx = nx * lateral + tangent.x * forwardKick;
    anim.tiles[1].vx = -nx * lateral - tangent.x * forwardKick;
    anim.tiles[0].vy = -liftBase + Math.random() * 40;
    anim.tiles[1].vy = -liftBase + Math.random() * 40;
    anim.tiles[0].rotationSpeedRad = -(2.2 + Math.random() * 1.2);
    anim.tiles[1].rotationSpeedRad = 2.2 + Math.random() * 1.2;
    anim.tiles[0].alpha = 1;
    anim.tiles[1].alpha = 1;
    anim.tiles[0].scale = 1;
    anim.tiles[1].scale = 1;

    anim.phase = "scatter";
    anim.scatterElapsedMs = 0;
    this.activePath = null;
    this.pathDisplayTimer = 0;
  }

  private measurePath(points: Array<{ x: number; y: number }>): { segmentLengths: number[]; totalLength: number } {
    const segmentLengths: number[] = [];
    let totalLength = 0;

    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1].x - points[i].x;
      const dy = points[i + 1].y - points[i].y;
      const len = Math.hypot(dx, dy);
      segmentLengths.push(len);
      totalLength += len;
    }

    return { segmentLengths, totalLength };
  }

  private samplePathPoint(
    points: Array<{ x: number; y: number }>,
    segmentLengths: number[],
    distance: number
  ): { x: number; y: number } {
    if (points.length === 0) {
      return { x: 0, y: 0 };
    }
    if (points.length === 1 || segmentLengths.length === 0) {
      return { ...points[0] };
    }

    const totalLength = segmentLengths.reduce((sum, len) => sum + len, 0);
    const target = Math.max(0, Math.min(distance, totalLength));
    let walked = 0;

    for (let i = 0; i < segmentLengths.length; i++) {
      const segLen = segmentLengths[i];
      const nextWalked = walked + segLen;
      if (target <= nextWalked || i === segmentLengths.length - 1) {
        const local = segLen > 0 ? (target - walked) / segLen : 0;
        return {
          x: points[i].x + (points[i + 1].x - points[i].x) * local,
          y: points[i].y + (points[i + 1].y - points[i].y) * local,
        };
      }
      walked = nextWalked;
    }

    return { ...points[points.length - 1] };
  }

  private samplePathTangent(
    points: Array<{ x: number; y: number }>,
    segmentLengths: number[],
    distance: number
  ): { x: number; y: number } {
    if (points.length < 2 || segmentLengths.length === 0) {
      return { x: 1, y: 0 };
    }

    const totalLength = segmentLengths.reduce((sum, len) => sum + len, 0);
    const target = Math.max(0, Math.min(distance, totalLength));
    let walked = 0;

    for (let i = 0; i < segmentLengths.length; i++) {
      const segLen = segmentLengths[i];
      const nextWalked = walked + segLen;
      if ((target <= nextWalked && segLen > 0) || i === segmentLengths.length - 1) {
        const dx = points[i + 1].x - points[i].x;
        const dy = points[i + 1].y - points[i].y;
        const len = Math.hypot(dx, dy) || 1;
        return { x: dx / len, y: dy / len };
      }
      walked = nextWalked;
    }

    return { x: 1, y: 0 };
  }

  private easeInOutCubic(t: number): number {
    if (t <= 0.5) {
      return 4 * t * t * t;
    }
    const f = -2 * t + 2;
    return 1 - (f * f * f) / 2;
  }

  private getMatchClearRenderItems(): FallingTileRenderItem[] {
    if (!this.matchClearAnimation) {
      return [];
    }

    return this.matchClearAnimation.tiles.map((tile) => ({
      x: tile.x,
      y: tile.y,
      tileType: tile.tileType,
      alpha: tile.alpha,
      rotationRad: tile.rotationRad,
      scale: tile.scale,
    }));
  }

  private getHiddenBoardCoordsForMatchClear(): Coord[] {
    if (!this.matchClearAnimation) {
      return [];
    }

    return this.matchClearAnimation.tiles.map((tile) => tile.coord);
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
    const usedClearFall = this.pendingRemovalUsedClearFall;
    this.pendingRemovalUsedClearFall = false;
    this.matchClearAnimation = null;
    const tutorialMatchBoard = this.tutorialEnabled ? this.tutorialActiveBoard : null;
    const matchedType = this.gameState.board.cells[a.row][a.col].tileType;
    const firstCell = this.gameState.board.cells[a.row][a.col];
    const secondCell = this.gameState.board.cells[b.row][b.col];

    removeTiles(this.gameState.board, a, b);
    const nowMs = Date.now();
    const isChainMatch =
      this.lastSuccessfulMatchAtMs > 0 &&
      nowMs - this.lastSuccessfulMatchAtMs <= GameScene.MATCH_CHAIN_WINDOW_MS;
    this.audio.play(GAME_SOUNDS.TILE_MATCH_SUCCESS);
    this.lastSuccessfulMatchAtMs = nowMs;
    this.runScore += MATCH_SCORE_PER_PAIR;
    this.gameState.score = this.runScore;

    const unfrozen = unfreezeNeighbors(this.gameState.board, [a, b]);
    if (unfrozen.length > 0) {
      this.audio.play(GAME_SOUNDS.FROZEN_BREAK);
      this.triggerHaptic("light");
    }

    const gravityMoves = resolveGravity(this.gameState.board);
    if (gravityMoves.length > 0) {
      this.startGravitySlideAnimations(gravityMoves);
      this.audio.play(GAME_SOUNDS.GRAVITY_DROP);
    }

    const jumperMoves = moveJumpingBlockers(this.gameState.board);
    if (jumperMoves.length > 0) {
      this.audio.play(GAME_SOUNDS.JUMPER_MOVE);
    }

    // Level 26+ introduces gravity+jumper combos. If board reflows immediately,
    // merge pull ghosts can visually clash with the new board state and look like flicker.
    // Show merge-pull only when the board stayed spatially stable this frame.
    const boardReflowed = gravityMoves.length > 0 || jumperMoves.length > 0;
    if (
      !usedClearFall &&
      !boardReflowed &&
      matchedType !== null &&
      firstCell.tileType !== null &&
      secondCell.tileType !== null &&
      firstCell.tileType === secondCell.tileType
    ) {
      this.startMergePullAnimation(a, b, matchedType);
    } else if (boardReflowed && this.mergePullAnimations.length > 0) {
      this.mergePullAnimations = [];
    }

    const remaining = countRemainingTiles(this.gameState.board);
    if (remaining === 0) {
      this.applyLevelWinProgress();
      this.levelProgressStore.markLevelCompleted(this.gameState.levelId);
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
      if (recovered && this.mergePullAnimations.length > 0) {
        this.mergePullAnimations = [];
      }
      if (recovered && this.gravitySlideAnimations.length > 0) {
        this.gravitySlideAnimations = [];
      }
      this.noMovesWarning = !recovered;
      if (!recovered) {
        this.audio.play(GAME_SOUNDS.NO_MOVES_WARNING);
        this.finalizeRunScore();
        if (this.gravitySlideAnimations.length > 0) {
          this.gravitySlideAnimations = [];
        }
      }
      this.triggerHaptic("medium");
    }

    if (this.tutorialEnabled && tutorialMatchBoard) {
      this.handleTutorialMatchResolved(tutorialMatchBoard);
    }

    this.pendingRemoval = null;
    this.pendingRemovalUsedClearFall = false;
    this.hintPath = null;
    this.hintPathTimerMs = 0;
    this.gameState.inputLocked = false;
  }

  private startMergePullAnimation(a: Coord, b: Coord, tileType: number): void {
    this.mergePullAnimations.push({
      from: { ...a },
      to: { ...b },
      tileType,
      elapsedMs: 0,
      durationMs: GameScene.MERGE_PULL_DURATION_MS,
    });
    if (this.mergePullAnimations.length > GameScene.MAX_MERGE_PULL_ANIMATIONS) {
      this.mergePullAnimations.splice(
        0,
        this.mergePullAnimations.length - GameScene.MAX_MERGE_PULL_ANIMATIONS
      );
    }
  }

  private getMergePullRenderItems(): MergePullRenderItem[] {
    if (this.mergePullAnimations.length === 0) {
      return [];
    }

    return this.mergePullAnimations.map((anim) => ({
      from: anim.from,
      to: anim.to,
      tileType: anim.tileType,
      progress: Math.max(0, Math.min(1, anim.elapsedMs / anim.durationMs)),
    }));
  }

  private startGravitySlideAnimations(moves: SettleMove[]): void {
    if (moves.length === 0) {
      return;
    }

    const additions: GravitySlideAnimation[] = [];
    for (const move of moves) {
      const landedCell = this.gameState.board.cells[move.to.row][move.to.col];
      if (
        (landedCell.kind !== CellKind.Tile && landedCell.kind !== CellKind.FrozenTile) ||
        landedCell.tileType === null
      ) {
        continue;
      }

      const distance =
        Math.abs(move.from.row - move.to.row) + Math.abs(move.from.col - move.to.col);
      const duration = Math.max(
        GameScene.GRAVITY_SLIDE_BASE_DURATION_MS,
        Math.min(
          GameScene.MAX_GRAVITY_SLIDE_DURATION_MS,
          GameScene.GRAVITY_SLIDE_BASE_DURATION_MS + distance * GameScene.GRAVITY_SLIDE_PER_CELL_MS
        )
      );
      additions.push({
        from: { ...move.from },
        to: { ...move.to },
        tileType: landedCell.tileType,
        kind: landedCell.kind,
        elapsedMs: 0,
        durationMs: duration,
      });
    }

    if (additions.length === 0) {
      return;
    }

    this.gravitySlideAnimations.push(...additions);
    if (this.gravitySlideAnimations.length > GameScene.MAX_GRAVITY_SLIDE_ANIMATIONS) {
      this.gravitySlideAnimations.splice(
        0,
        this.gravitySlideAnimations.length - GameScene.MAX_GRAVITY_SLIDE_ANIMATIONS
      );
    }
  }

  private getGravitySlideRenderItems(): GravitySlideRenderItem[] {
    if (this.gravitySlideAnimations.length === 0) {
      return [];
    }

    return this.gravitySlideAnimations.map((anim) => ({
      from: anim.from,
      to: anim.to,
      tileType: anim.tileType,
      kind: anim.kind,
      progress: Math.max(0, Math.min(1, anim.elapsedMs / anim.durationMs)),
    }));
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
    this.audio.play(GAME_SOUNDS.XP_GAIN);
  }

  private getXpProgressInStep(): number {
    return this.runXp % GameScene.XP_PROGRESS_STEP;
  }

  private renderFrame(): void {
    const ctx = this.ctx;
    const w = this.displayWidth;
    const h = this.displayHeight;
    this.layout = calculateLayout(
      this.displayWidth,
      this.displayHeight,
      this.gameState.board.width,
      this.gameState.board.height
    );
    let pathToDraw: TilePath | null = null;
    let pathAlpha = 1;
    if (this.activePath && this.pathDisplayTimer > 0) {
      pathToDraw = this.activePath;
      pathAlpha = Math.max(0, Math.min(1, this.pathDisplayTimer / PATH_DISPLAY_DURATION));
    } else {
      pathToDraw = this.hintPath;
    }

    ctx.setTransform(this.renderPixelRatio, 0, 0, this.renderPixelRatio, 0, 0);
    this.drawSceneBackground(ctx, w, h);
    const hiddenCoords = this.getHiddenBoardCoordsForMatchClear();

    drawBoard(
      ctx,
      this.gameState.board,
      this.layout,
      this.gameState.selectedTile,
      pathToDraw,
      pathAlpha,
      this.resolveTileImage,
      this.monkeyImage,
      this.iceOverlayImage,
      this.getMergePullRenderItems(),
      this.getGravitySlideRenderItems(),
      hiddenCoords
    );
    drawFallingTiles(
      ctx,
      this.layout.cellSize,
      this.getMatchClearRenderItems(),
      this.resolveTileImage
    );
    this.drawKeyboardCursor(ctx);
    this.hintButton.setDisabled(
      this.startScreen.isVisible() ||
      this.settingsOpen ||
      this.tutorialEnabled ||
      this.gameState.phase !== "playing" ||
      this.gameState.inputLocked ||
      this.noMovesWarning ||
      !!this.activePath
    );
    this.hintButton.setVisible(!this.startScreen.isVisible());
    this.homeButton.setVisible(!this.startScreen.isVisible());
    const tutorialButtonsStepActive =
      this.tutorialEnabled && this.getCurrentTutorialStep()?.id === "hud-buttons";
    this.replayButton.setVisible(!this.startScreen.isVisible() && (!this.tutorialEnabled || tutorialButtonsStepActive));
    this.settingsModal.setTriggerEnabled(!this.startScreen.isVisible() && !this.tutorialEnabled);

    this.updateHudOverlay();
    const shouldShowHintFeedback =
      !this.startScreen.isVisible() &&
      !this.settingsOpen &&
      this.hintFeedbackText &&
      this.hintFeedbackTimer > 0;
    this.hintFeedbackOverlay.setMessage(shouldShowHintFeedback ? this.hintFeedbackText : null);

    this.updateTutorialOverlay();

    if (this.noMovesWarning) {
      this.drawNoMovesWarning(ctx, w, h);
    }
    this.updateResultOverlay();
  }

  private drawSceneBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, width, height);

    const themeBackground = this.resolveThemeBackgroundImage();
    if (themeBackground) {
      const imageSize = this.getCanvasImageSize(themeBackground);
      if (imageSize) {
        const coverScale = Math.max(width / imageSize.width, height / imageSize.height);
        const drawWidth = imageSize.width * coverScale;
        const drawHeight = imageSize.height * coverScale;
        const drawX = (width - drawWidth) * 0.5;
        const drawY = (height - drawHeight) * 0.5;

        ctx.save();
        ctx.globalAlpha = 0.58;
        ctx.drawImage(themeBackground, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();
      }
    }

    const overlay = this.getThemeBackgroundOverlay();
    const overlayGradient = ctx.createLinearGradient(0, 0, 0, height);
    overlayGradient.addColorStop(0, overlay.top);
    overlayGradient.addColorStop(1, overlay.bottom);
    ctx.fillStyle = overlayGradient;
    ctx.fillRect(0, 0, width, height);

    const vignette = ctx.createRadialGradient(
      width * 0.5,
      height * 0.42,
      Math.min(width, height) * 0.14,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.86
    );
    vignette.addColorStop(0, "rgba(255, 255, 255, 0.04)");
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.18)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  private getThemeBackgroundOverlay(): { top: string; bottom: string } {
    if (this.activeTheme === "foods") {
      return {
        top: "rgba(92, 48, 34, 0.18)",
        bottom: "rgba(63, 31, 38, 0.34)",
      };
    }
    if (this.activeTheme === "landmarks") {
      return {
        top: "rgba(29, 56, 82, 0.20)",
        bottom: "rgba(13, 36, 66, 0.36)",
      };
    }
    return {
      top: "rgba(10, 18, 48, 0.24)",
      bottom: "rgba(5, 10, 29, 0.42)",
    };
  }

  private resolveThemeBackgroundImage(): CanvasImageSource | null {
    if (this.activeTheme === "foods") {
      return this.foodsBackgroundImage;
    }
    if (this.activeTheme === "landmarks") {
      return this.landmarksBackgroundImage;
    }
    if (this.activeTheme === "planets") {
      return this.planetsBackgroundImage;
    }
    return null;
  }

  private getCanvasImageSize(image: CanvasImageSource): { width: number; height: number } | null {
    const candidate = image as {
      width?: number;
      height?: number;
      videoWidth?: number;
      videoHeight?: number;
    };

    const width =
      typeof candidate.videoWidth === "number" && candidate.videoWidth > 0
        ? candidate.videoWidth
        : typeof candidate.width === "number" && candidate.width > 0
          ? candidate.width
          : 0;
    const height =
      typeof candidate.videoHeight === "number" && candidate.videoHeight > 0
        ? candidate.videoHeight
        : typeof candidate.height === "number" && candidate.height > 0
          ? candidate.height
          : 0;

    if (width <= 0 || height <= 0) {
      return null;
    }

    return { width, height };
  }

  private updateHudOverlay(): void {
    if (!this.hudOverlay) {
      return;
    }

    const visible = !this.startScreen.isVisible();
    this.hudOverlay.setVisible(visible);
    if (!visible) {
      return;
    }

    const currentLevel = this.progression.getCurrentIndex() + 1;
    const totalLevels = this.progression.getTotalLevels();
    const timerRatio = Math.max(0, this.gameState.timerRemaining / this.gameState.timerTotal);
    const seconds = Math.ceil(this.gameState.timerRemaining);
    const xpInStep = this.getXpProgressInStep();

    this.hudOverlay.update({
      levelLabel: `Level ${currentLevel}/${totalLevels}`,
      scoreLabel: `Score ${this.gameState.score}`,
      secondsLabel: `${seconds}s`,
      timerRatio,
      timerLow: timerRatio < 0.25,
      xpLabel: `XP ${xpInStep}/${GameScene.XP_PROGRESS_STEP}`,
      xpRatio: xpInStep / GameScene.XP_PROGRESS_STEP,
      gravityDirection: this.gameState.board.gravity,
    });
  }

  private startTutorialFlow(): void {
    this.tutorialEnabled = true;
    this.tutorialStepIndex = 0;
    this.tutorialExpectedPair = null;
    this.setTutorialStep(0);
  }

  private completeTutorial(): void {
    this.tutorialEnabled = false;
    this.tutorialExpectedPair = null;
    this.tutorialProgressStore.markCompleted();
    this.tutorialOverlay.setState({
      visible: false,
      message: "",
    });
    this.audio.play(GAME_SOUNDS.LEVEL_COMPLETE);
    this.triggerHaptic("success");

    this.initLevel(this.progression.getCurrentLevel(), false);
    this.gameState.phase = "playing";
    this.setSceneInputEnabled(!this.settingsOpen);
  }

  private getCurrentTutorialStep(): TutorialScriptStep | null {
    if (!this.tutorialEnabled) {
      return null;
    }
    if (this.tutorialStepIndex < 0 || this.tutorialStepIndex >= TUTORIAL_SCRIPT.length) {
      return null;
    }
    return TUTORIAL_SCRIPT[this.tutorialStepIndex];
  }

  private setTutorialStep(index: number): void {
    this.tutorialStepIndex = Math.max(0, Math.min(index, TUTORIAL_SCRIPT.length - 1));
    const step = this.getCurrentTutorialStep();
    this.tutorialExpectedPair = null;
    if (!step) {
      return;
    }

    if (step.matchBoard) {
      this.applyTutorialBoardPreset(step.matchBoard);
    }
  }

  private advanceTutorialStep(): void {
    if (!this.tutorialEnabled) {
      return;
    }
    const next = this.tutorialStepIndex + 1;
    if (next >= TUTORIAL_SCRIPT.length) {
      this.completeTutorial();
      return;
    }
    this.setTutorialStep(next);
  }

  private handleTutorialPointerDown(pointer: Phaser.Input.Pointer): boolean {
    if (!this.tutorialEnabled) {
      return false;
    }
    if (this.startScreen.isVisible() || this.settingsOpen) {
      return true;
    }

    const step = this.getCurrentTutorialStep();
    if (!step) {
      return false;
    }

    if (step.tapToContinue) {
      this.audio.play(GAME_SOUNDS.BUTTON_CLICK_PRIMARY);
      this.triggerHaptic("light");
      this.advanceTutorialStep();
      return true;
    }

    if (step.matchBoard) {
      if (!this.layout) {
        return true;
      }
      const boardWidth = this.gameState.board.width;
      const boardHeight = this.gameState.board.height;
      const col = Math.floor((pointer.x - this.layout.offsetX) / this.layout.cellSize);
      const row = Math.floor((pointer.y - this.layout.offsetY) / this.layout.cellSize);
      this.handleTap({ col, row }, boardWidth, boardHeight);
      return true;
    }

    return true;
  }

  private isTutorialMatchStepActive(): boolean {
    const step = this.getCurrentTutorialStep();
    return !!step?.matchBoard;
  }

  private isCoordInsideTutorialTargetPair(coord: Coord): boolean {
    if (!this.tutorialExpectedPair) {
      return true;
    }
    return this.tutorialExpectedPair.some((target) => target.row === coord.row && target.col === coord.col);
  }

  private handleTutorialMatchResolved(boardKind: TutorialBoardKind): void {
    const step = this.getCurrentTutorialStep();
    if (!step || step.matchBoard !== boardKind) {
      return;
    }
    this.advanceTutorialStep();
  }

  private applyTutorialBoardPreset(kind: TutorialBoardKind): void {
    const preset = this.createTutorialBoardPreset(kind);
    this.tutorialActiveBoard = kind;
    this.gameState.board = preset.board;
    this.gameState.selectedTile = null;
    this.gameState.inputLocked = false;
    this.pendingRemoval = null;
    this.pendingRemovalUsedClearFall = false;
    this.noMovesWarning = false;
    this.activePath = null;
    this.pathDisplayTimer = 0;
    this.hintPath = null;
    this.hintPathTimerMs = 0;
    this.keyboardCursor = { ...preset.targetPair[0] };
    this.tutorialExpectedPair = [{ ...preset.targetPair[0] }, { ...preset.targetPair[1] }];
    this.recalculateLayout();
  }

  private createTutorialBoardPreset(kind: TutorialBoardKind): TutorialBoardPreset {
    if (kind === "gravity") {
      return {
        board: this.makeTutorialBoard(
          [
            [1, 2, 3, 0],
            [2, 3, 1, 2],
            [0, 0, 2, 3],
            [3, 1, 0, 1],
            [2, 1, 3, 2],
          ],
          "down"
        ),
        targetPair: [
          { col: 0, row: 2 },
          { col: 1, row: 2 },
        ],
      };
    }

    if (kind === "frozen") {
      return {
        board: this.makeTutorialBoard(
          [
            [1, 2, 3, 0],
            [2, 3, 1, 2],
            [1, 0, -12, 3],
            [3, 0, 2, 1],
            [2, 1, 3, 0],
          ],
          "none"
        ),
        targetPair: [
          { col: 1, row: 2 },
          { col: 1, row: 3 },
        ],
      };
    }

    if (kind === "jumper") {
      return {
        board: this.makeTutorialBoard(
          [
            [0, 0, 2, 3],
            [1, -2, 3, 2],
            [2, 1, 0, 1],
            [3, 2, 1, 0],
            [1, 3, 2, 1],
          ],
          "none"
        ),
        targetPair: [
          { col: 0, row: 0 },
          { col: 1, row: 0 },
        ],
      };
    }

    return {
      board: this.makeTutorialBoard(
        [
          [0, 1, 2, 3],
          [1, 2, 3, 0],
          [2, 3, 1, 2],
          [3, 0, 2, 1],
          [0, 0, 1, 1],
        ],
        "none"
      ),
      targetPair: [
        { col: 0, row: 4 },
        { col: 1, row: 4 },
      ],
    };
  }

  private makeTutorialBoard(
    rows: number[][],
    gravity: BoardState["gravity"]
  ): BoardState {
    const height = rows.length;
    const width = rows[0]?.length ?? 0;
    const cells: Cell[][] = [];

    for (let row = 0; row < height; row++) {
      const line = rows[row];
      const rowCells: Cell[] = [];
      for (let col = 0; col < width; col++) {
        const value = line[col];
        if (value >= 0) {
          rowCells.push({ kind: CellKind.Tile, tileType: value });
          continue;
        }
        if (value === -1) {
          rowCells.push({ kind: CellKind.Empty, tileType: null });
          continue;
        }
        if (value === -2) {
          rowCells.push({ kind: CellKind.JumpingBlocker, tileType: null });
          continue;
        }

        const frozenType = Math.max(0, Math.abs(value) - 10);
        rowCells.push({ kind: CellKind.FrozenTile, tileType: frozenType });
      }
      cells.push(rowCells);
    }

    return {
      width,
      height,
      cells,
      gravity,
    };
  }

  private rectToTutorialSpotlight(rect: DOMRect, padding = 8, radius = 12): TutorialRectSpotlight {
    return {
      kind: "rect",
      x: Math.max(0, rect.left - padding),
      y: Math.max(0, rect.top - padding),
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
      radius,
    };
  }

  private tilePairToSpotlights(pair: [Coord, Coord]): TutorialCircleSpotlight[] {
    const radius = Math.max(20, this.layout.cellSize * 0.42);
    return pair.map((coord) => ({
      kind: "circle",
      x: this.layout.offsetX + coord.col * this.layout.cellSize + this.layout.cellSize * 0.5,
      y: this.layout.offsetY + coord.row * this.layout.cellSize + this.layout.cellSize * 0.5,
      radius,
    }));
  }

  private updateTutorialOverlay(): void {
    if (!this.tutorialEnabled || this.startScreen.isVisible()) {
      this.tutorialOverlay.setState({
        visible: false,
        message: "",
      });
      return;
    }

    const step = this.getCurrentTutorialStep();
    if (!step) {
      this.tutorialOverlay.setState({
        visible: false,
        message: "",
      });
      return;
    }

    const spotlights: Array<TutorialRectSpotlight | TutorialCircleSpotlight> = [];

    if (step.matchBoard && this.tutorialExpectedPair) {
      spotlights.push(...this.tilePairToSpotlights(this.tutorialExpectedPair));
    }

    if (step.highlightHud) {
      const hudRect = this.hudOverlay.getElementBounds(step.highlightHud);
      if (hudRect) {
        spotlights.push(this.rectToTutorialSpotlight(hudRect, 8, 12));
      }
    }

    if (step.highlightButtons) {
      const homeRect = this.homeButton.getBounds();
      const hintRect = this.hintButton.getBounds();
      const replayRect = this.replayButton.getBounds();
      const settingsRect = this.settingsModal.getTriggerButtonBounds();
      if (homeRect) {
        spotlights.push(this.rectToTutorialSpotlight(homeRect, 8, 16));
      }
      if (hintRect) {
        spotlights.push(this.rectToTutorialSpotlight(hintRect, 8, 16));
      }
      if (replayRect) {
        spotlights.push(this.rectToTutorialSpotlight(replayRect, 8, 16));
      }
      if (settingsRect) {
        spotlights.push(this.rectToTutorialSpotlight(settingsRect, 8, 16));
      }
    }

    const hudBounds = this.hudOverlay.getContainerBounds();
    const boardTop = this.layout?.offsetY ?? Math.round(window.innerHeight * 0.55);
    const isTopMenuStep = !!(step.highlightHud || step.highlightButtons);
    const placement = isTopMenuStep ? "board-top" : "above-hud";
    const anchorY = isTopMenuStep ? boardTop : (hudBounds?.top ?? boardTop);

    this.tutorialOverlay.setState({
      visible: true,
      message: step.message,
      tapHint: step.tapToContinue ? "Tap anywhere to continue" : "",
      placement,
      anchorY,
      spotlights,
    });
  }

  private drawKeyboardCursor(ctx: CanvasRenderingContext2D): void {
    if (!this.keyboardCursor) return;
    if (this.startScreen.isVisible()) return;
    if (this.settingsOpen) return;
    if (this.gameState.phase !== "playing") return;

    const { col, row } = this.keyboardCursor;
    if (
      col < 0 ||
      col >= this.gameState.board.width ||
      row < 0 ||
      row >= this.gameState.board.height
    ) {
      return;
    }

    const x = this.layout.offsetX + col * this.layout.cellSize + 2;
    const y = this.layout.offsetY + row * this.layout.cellSize + 2;
    const size = this.layout.cellSize - 4;

    ctx.save();
    ctx.strokeStyle = "rgba(246, 196, 69, 0.95)";
    ctx.lineWidth = 2.2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(x, y, size, size);
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

  private drawNoMovesWarning(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.fillStyle = "rgba(87, 56, 48, 0.42)";
    ctx.fillRect(0, 0, w, h);

    const cardW = Math.min(360, w - 30);
    const cardH = 176;
    const cardX = (w - cardW) / 2;
    const cardY = (h - cardH) / 2;

    const panelGradient = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
    panelGradient.addColorStop(0, "rgba(253, 228, 203, 0.98)");
    panelGradient.addColorStop(1, "rgba(251, 203, 183, 0.97)");
    ctx.fillStyle = panelGradient;
    this.drawRoundBar(ctx, cardX, cardY, cardW, cardH, 18);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.46)";
    ctx.lineWidth = 1.2;
    this.drawRoundBar(ctx, cardX + 0.5, cardY + 0.5, cardW - 1, cardH - 1, 18);
    ctx.stroke();

    ctx.fillStyle = "#d87979";
    ctx.font = "800 30px \"Plus Jakarta Sans\", system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("No Moves Left!", w / 2, cardY + 56);

    ctx.fillStyle = "#6b5a4d";
    ctx.font = "600 16px \"Plus Jakarta Sans\", system-ui, sans-serif";
    ctx.fillText("Tap to restart", w / 2, cardY + 90);

    const ctaW = cardW - 72;
    const ctaH = 36;
    const ctaX = (w - ctaW) / 2;
    const ctaY = cardY + cardH - 52;
    ctx.fillStyle = "rgba(255,255,255,0.56)";
    this.drawRoundBar(ctx, ctaX, ctaY, ctaW, ctaH, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(235, 134, 134, 0.34)";
    ctx.lineWidth = 1;
    this.drawRoundBar(ctx, ctaX + 0.5, ctaY + 0.5, ctaW - 1, ctaH - 1, 12);
    ctx.stroke();
    ctx.fillStyle = "#5a4036";
    ctx.font = "700 14px \"Plus Jakarta Sans\", system-ui, sans-serif";
    ctx.fillText("Tap anywhere", w / 2, ctaY + ctaH / 2 + 0.5);
  }

  private updateResultOverlay(): void {
    if (!this.resultOverlay) {
      return;
    }

    if (this.startScreen.isVisible() || this.noMovesWarning || this.tutorialEnabled) {
      this.resultOverlay.update({
        phase: "hidden",
        campaignCompleted: false,
        currentLevel: 0,
        totalLevels: 0,
        score: 0,
        lastWinXpGain: 0,
        xpInStep: 0,
        xpStep: GameScene.XP_PROGRESS_STEP,
      });
      return;
    }

    if (this.gameState.phase !== "won" && this.gameState.phase !== "lost") {
      this.resultOverlay.update({
        phase: "hidden",
        campaignCompleted: false,
        currentLevel: 0,
        totalLevels: 0,
        score: 0,
        lastWinXpGain: 0,
        xpInStep: 0,
        xpStep: GameScene.XP_PROGRESS_STEP,
      });
      return;
    }

    this.resultOverlay.update({
      phase: this.gameState.phase,
      campaignCompleted: this.campaignCompleted,
      currentLevel: this.progression.getCurrentIndex() + 1,
      totalLevels: this.progression.getTotalLevels(),
      score: this.gameState.score,
      lastWinXpGain: this.lastWinXpGain,
      xpInStep: this.getXpProgressInStep(),
      xpStep: GameScene.XP_PROGRESS_STEP,
    });
  }

  private drawOverlay(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.fillStyle = OVERLAY_BG;
    ctx.fillRect(0, 0, w, h);

    const introRatio = this.overlayIntroTimer > 0
      ? this.overlayIntroTimer / GameScene.OVERLAY_INTRO_DURATION_S
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
      const progressRatio = this.getXpProgressInStep() / GameScene.XP_PROGRESS_STEP;

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
        `XP ${this.getXpProgressInStep()}/${GameScene.XP_PROGRESS_STEP}`,
        w / 2,
        progressY + 20
      );

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

  private pauseForStartScreen(): void {
    this.gameState.phase = "paused";
    this.gameState.selectedTile = null;
    this.tutorialOverlay.setState({
      visible: false,
      message: "",
    });
    this.syncStartScreenLevelSelectionState();
    this.scene.launch('AmbientMenuScene', { theme: this.activeTheme });
    this.startScreen.show();
    this.setSceneInputEnabled(false);
  }

  private handleStartScreenPlay(): void {
    if (!this.startScreen.isVisible()) {
      return;
    }
    if (this.settingsOpen) {
      return;
    }

    this.scene.stop('AmbientMenuScene');
    this.audio.play(GAME_SOUNDS.BUTTON_CLICK_PRIMARY);
    this.startScreen.hide();
    if (this.gameState.phase === "paused") {
      this.gameState.phase = "playing";
    }
    this.setSceneInputEnabled(!this.settingsOpen);
    this.triggerHaptic("light");
  }

  private handleStartScreenSettings(): void {
    this.audio.play(GAME_SOUNDS.BUTTON_CLICK_PRIMARY);
    this.settingsModal.openFromExternalTrigger();
    this.triggerHaptic("light");
  }

  private handleStartScreenTutorial(): void {
    if (!this.startScreen.isVisible() || this.settingsOpen) {
      return;
    }

    const tutorialLevel = this.progression.setCurrentLevelById(1) ?? this.progression.getCurrentLevel();
    this.audio.play(GAME_SOUNDS.BUTTON_CLICK_PRIMARY);
    this.scene.stop("AmbientMenuScene");
    this.initLevel(tutorialLevel, false, false);
    this.startScreen.hide();
    this.startTutorialFlow();
    this.setSceneInputEnabled(!this.settingsOpen);
    this.triggerHaptic("light");
  }

  private handleStartScreenLevelSelect(levelId: number): void {
    if (!this.startScreen.isVisible() || this.settingsOpen) {
      return;
    }

    if (levelId > this.getUnlockedThroughLevelId()) {
      return;
    }

    const selected = this.progression.setCurrentLevelById(levelId);
    if (!selected) {
      return;
    }

    this.audio.play(GAME_SOUNDS.BUTTON_CLICK_PRIMARY);
    this.scene.stop('AmbientMenuScene');
    this.initLevel(selected, false);
    this.startScreen.hide();
    this.setSceneInputEnabled(!this.settingsOpen);
    this.triggerHaptic("light");
  }

  private handleHomeButtonClick(): void {
    if (this.startScreen.isVisible()) {
      return;
    }
    if (this.tutorialEnabled) {
      return;
    }

    this.audio.play(GAME_SOUNDS.BUTTON_CLICK_PRIMARY);
    this.settingsModal.closeFromExternalTrigger();
    this.settingsOpen = false;
    this.hintPath = null;
    this.hintPathTimerMs = 0;
    this.hintFeedbackText = null;
    this.hintFeedbackTimer = 0;
    this.activePath = null;
    this.pathDisplayTimer = 0;
    this.pendingRemoval = null;
    this.pendingRemovalUsedClearFall = false;
    this.matchClearAnimation = null;
    this.pauseForStartScreen();
    this.triggerHaptic("light");
  }

  private handleReplayButtonClick(): void {
    if (this.startScreen.isVisible() || this.tutorialEnabled) {
      return;
    }

    this.audio.play(GAME_SOUNDS.BUTTON_CLICK_PRIMARY);
    this.settingsModal.closeFromExternalTrigger();
    this.settingsOpen = false;
    this.hintPath = null;
    this.hintPathTimerMs = 0;
    this.hintFeedbackText = null;
    this.hintFeedbackTimer = 0;
    this.activePath = null;
    this.pathDisplayTimer = 0;
    this.pendingRemoval = null;
    this.pendingRemovalUsedClearFall = false;
    this.matchClearAnimation = null;
    this.noMovesWarning = false;
    this.restartLevel();
    this.setSceneInputEnabled(!this.settingsOpen && !this.startScreen.isVisible());
    this.triggerHaptic("medium");
  }

  private getUnlockedThroughLevelId(): number {
    const totalLevels = this.progression.getTotalLevels();
    const baseline = Math.max(1, Math.min(totalLevels, START_LEVEL_ID));
    if (!this.levelProgressStore) {
      return baseline;
    }
    return Math.max(
      baseline,
      Math.min(totalLevels, this.levelProgressStore.getHighestUnlockedLevel())
    );
  }

  private getResumeLevelId(): number {
    const totalLevels = this.progression.getTotalLevels();
    const baseline = Math.max(1, Math.min(totalLevels, START_LEVEL_ID));
    if (!this.levelProgressStore) {
      return baseline;
    }

    const highestUnlocked = Math.max(
      baseline,
      Math.min(totalLevels, this.levelProgressStore.getHighestUnlockedLevel())
    );
    const lastPlayed = Math.max(
      baseline,
      Math.min(highestUnlocked, this.levelProgressStore.getLastPlayedLevel())
    );
    return lastPlayed;
  }

  private syncStartScreenLevelSelectionState(): void {
    if (!this.startScreen) {
      return;
    }
    this.startScreen.setLevelSelectionState({
      unlockedThroughLevel: this.getUnlockedThroughLevelId(),
      currentLevel: this.gameState?.levelId ?? this.progression.getCurrentLevel().id,
      totalLevels: this.progression.getTotalLevels(),
    });
  }

  private findInitialKeyboardCursor(board: BoardState): Coord {
    for (let row = 0; row < board.height; row++) {
      for (let col = 0; col < board.width; col++) {
        const cell = board.cells[row][col];
        if (cell.kind === CellKind.Tile) {
          return { row, col };
        }
      }
    }

    return { row: 0, col: 0 };
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    const target = event.target as HTMLElement | null;
    if (
      target &&
      (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.tagName === "BUTTON" ||
        target.isContentEditable
      )
    ) {
      return;
    }

    if (this.startScreen.isVisible()) {
      return;
    }

    if (this.settingsOpen) {
      return;
    }

    if (this.tutorialEnabled) {
      const step = this.getCurrentTutorialStep();
      if (step?.tapToContinue) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.audio.play(GAME_SOUNDS.BUTTON_CLICK_PRIMARY);
          this.triggerHaptic("light");
          this.advanceTutorialStep();
        }
        return;
      }
      if (!step?.matchBoard) {
        return;
      }
    }

    const board = this.gameState.board;
    const cursor = this.keyboardCursor ?? this.findInitialKeyboardCursor(board);
    if (this.noMovesWarning) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this.handleTap(cursor, board.width, board.height);
      }
      return;
    }
    let nextCol = cursor.col;
    let nextRow = cursor.row;
    let handledMove = false;

    switch (event.key) {
      case "ArrowLeft":
        nextCol = Math.max(0, cursor.col - 1);
        handledMove = true;
        break;
      case "ArrowRight":
        nextCol = Math.min(board.width - 1, cursor.col + 1);
        handledMove = true;
        break;
      case "ArrowUp":
        nextRow = Math.max(0, cursor.row - 1);
        handledMove = true;
        break;
      case "ArrowDown":
        nextRow = Math.min(board.height - 1, cursor.row + 1);
        handledMove = true;
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        this.handleTap(cursor, board.width, board.height);
        return;
      case "h":
      case "H":
        event.preventDefault();
        this.handleHintRequest();
        return;
      default:
        return;
    }

    if (handledMove) {
      event.preventDefault();
      this.keyboardCursor = { row: nextRow, col: nextCol };
      if (this.gameState.phase === "playing") {
        this.audio.play(GAME_SOUNDS.TILE_SELECT_SOFT);
      }
    }
  };
}
