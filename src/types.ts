// ── types.ts ──
// Oyunun tüm veri modellerini tanımlar.
// Her dosya bu tiplere bağımlıdır.

/** Tile sembol/tip kimliği. 0-tabanlı indeks. */
export type TileTypeId = number;

/** Level için gravity yönü */
export type GravityDirection = "none" | "down" | "up" | "left" | "right";

/** Bir grid hücresinin içeriği */
export enum CellKind {
  Empty = 0,
  Tile = 1,
  FrozenTile = 2,
  SolidBlocker = 3,
  JumpingBlocker = 4,
}

/** Grid hücresi */
export interface Cell {
  kind: CellKind;
  /** Sadece Tile veya FrozenTile için anlamlı */
  tileType: TileTypeId | null;
}

/** Grid koordinatı. Origin sol üst. */
export interface Coord {
  col: number;
  row: number;
}

/** İki tile arasındaki bağlantı yolu (başlangıç ve bitiş dahil) */
export type TilePath = Coord[];

/** Board durumu */
export interface BoardState {
  width: number;
  height: number;
  cells: Cell[][]; // cells[row][col]
  gravity: GravityDirection;
}

/** Level tanımı (statik veri) */
export interface LevelDef {
  id: number;
  width: number;
  height: number;
  gravity: GravityDirection;
  timerSeconds: number;
  tileTypeCount: number;
  /** Opsiyonel özel layout. Yoksa tüm hücreler tile ile doldurulur. */
  layout?: number[][];
  frozenTypes?: Record<string, TileTypeId>;
  jumpingBlockerCount?: number;
  tutorialText?: string;
}

/** Aktif level için oyun durumu */
export interface GameState {
  board: BoardState;
  selectedTile: Coord | null;
  score: number;
  timerRemaining: number;
  timerTotal: number;
  levelId: number;
  phase: "playing" | "paused" | "won" | "lost";
  inputLocked: boolean;
}

/** Board render layout bilgisi */
export interface BoardLayout {
  offsetX: number;
  offsetY: number;
  cellSize: number;
}

/** Gravity sonrası tile hareket bilgisi (animasyon için) */
export interface SettleMove {
  from: Coord;
  to: Coord;
}

/** localStorage'a kaydedilen ayarlar */
export interface Settings {
  musicEnabled: boolean;
  fxEnabled: boolean;
  hapticsEnabled: boolean;
}
