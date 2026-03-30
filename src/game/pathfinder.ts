import { BoardState, CellKind, Coord, TilePath } from "../types";

/**
 * Find a valid link path between two tiles with at most 2 turns.
 * Border-space routing is allowed (outside board bounds).
 */
export function findPath(board: BoardState, a: Coord, b: Coord): TilePath | null {
  if (a.col === b.col && a.row === b.row) {
    return null;
  }

  const cellA = board.cells[a.row][a.col];
  const cellB = board.cells[b.row][b.col];
  if (cellA.tileType !== cellB.tileType) {
    return null;
  }

  const candidates: TilePath[] = [];

  // 0-turn path
  if (canWalkStraight(board, a, b)) {
    candidates.push([a, b]);
  }

  // 1-turn paths
  const corner1: Coord = { col: a.col, row: b.row };
  const corner2: Coord = { col: b.col, row: a.row };

  if (
    isWalkable(board, corner1) &&
    canWalkStraight(board, a, corner1) &&
    canWalkStraight(board, corner1, b)
  ) {
    candidates.push([a, corner1, b]);
  }

  if (
    isWalkable(board, corner2) &&
    canWalkStraight(board, a, corner2) &&
    canWalkStraight(board, corner2, b)
  ) {
    candidates.push([a, corner2, b]);
  }

  // 2-turn horizontal bridges (including border rows)
  for (let r = -1; r <= board.height; r++) {
    const c1: Coord = { col: a.col, row: r };
    const c2: Coord = { col: b.col, row: r };

    if (
      isWalkable(board, c1) &&
      isWalkable(board, c2) &&
      canWalkStraight(board, a, c1) &&
      canWalkStraight(board, c1, c2) &&
      canWalkStraight(board, c2, b)
    ) {
      candidates.push([a, c1, c2, b]);
    }
  }

  // 2-turn vertical bridges (including border cols)
  for (let c = -1; c <= board.width; c++) {
    const c1: Coord = { col: c, row: a.row };
    const c2: Coord = { col: c, row: b.row };

    if (
      isWalkable(board, c1) &&
      isWalkable(board, c2) &&
      canWalkStraight(board, a, c1) &&
      canWalkStraight(board, c1, c2) &&
      canWalkStraight(board, c2, b)
    ) {
      candidates.push([a, c1, c2, b]);
    }
  }

  return pickBestPath(board, candidates);
}

function canWalkStraight(board: BoardState, from: Coord, to: Coord): boolean {
  if (from.row === to.row) {
    const row = from.row;
    const minCol = Math.min(from.col, to.col) + 1;
    const maxCol = Math.max(from.col, to.col);

    for (let col = minCol; col < maxCol; col++) {
      if (!isCellWalkable(board, row, col)) {
        return false;
      }
    }
    return true;
  }

  if (from.col === to.col) {
    const col = from.col;
    const minRow = Math.min(from.row, to.row) + 1;
    const maxRow = Math.max(from.row, to.row);

    for (let row = minRow; row < maxRow; row++) {
      if (!isCellWalkable(board, row, col)) {
        return false;
      }
    }
    return true;
  }

  return false;
}

function isWalkable(board: BoardState, coord: Coord): boolean {
  if (
    coord.row < 0 ||
    coord.row >= board.height ||
    coord.col < 0 ||
    coord.col >= board.width
  ) {
    return true;
  }

  return board.cells[coord.row][coord.col].kind === CellKind.Empty;
}

function isCellWalkable(board: BoardState, row: number, col: number): boolean {
  if (row < 0 || row >= board.height || col < 0 || col >= board.width) {
    return true;
  }

  return board.cells[row][col].kind === CellKind.Empty;
}

interface PathScore {
  turns: number;
  distance: number;
  outsideNodes: number;
}

function pickBestPath(board: BoardState, candidates: TilePath[]): TilePath | null {
  if (candidates.length === 0) {
    return null;
  }

  let best = candidates[0];
  let bestScore = scorePath(board, best);

  for (let i = 1; i < candidates.length; i++) {
    const candidate = candidates[i];
    const candidateScore = scorePath(board, candidate);

    if (comparePathScore(candidateScore, bestScore) < 0) {
      best = candidate;
      bestScore = candidateScore;
    }
  }

  return best;
}

function scorePath(board: BoardState, path: TilePath): PathScore {
  let distance = 0;
  let outsideNodes = 0;

  for (let i = 0; i < path.length; i++) {
    const p = path[i];

    if (p.row < 0 || p.row >= board.height || p.col < 0 || p.col >= board.width) {
      outsideNodes++;
    }

    if (i > 0) {
      const prev = path[i - 1];
      distance += Math.abs(p.row - prev.row) + Math.abs(p.col - prev.col);
    }
  }

  return {
    turns: Math.max(0, path.length - 2),
    distance,
    outsideNodes,
  };
}

function comparePathScore(a: PathScore, b: PathScore): number {
  if (a.turns !== b.turns) {
    return a.turns - b.turns;
  }

  if (a.distance !== b.distance) {
    return a.distance - b.distance;
  }

  if (a.outsideNodes !== b.outsideNodes) {
    return a.outsideNodes - b.outsideNodes;
  }

  return 0;
}

export function hasAnyValidPair(board: BoardState): boolean {
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
        if (findPath(board, coords[i], coords[j])) {
          return true;
        }
      }
    }
  }

  return false;
}
