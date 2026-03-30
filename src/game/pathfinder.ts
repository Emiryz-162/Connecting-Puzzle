// ── game/pathfinder.ts ──
// İki tile arasında en fazla 2 dönüşlü bağlantı yolu arar.
//
// Yaklaşım: BFS yerine yapısal enumeration.
// 0 dönüş (düz hat), 1 dönüş (L-şekli), 2 dönüş (Z/U-şekli)
// olası tüm yollar doğrudan denenir.
//
// Border space: Grid dışı koordinatlar (col<0, col>=width, row<0, row>=height)
// otomatik olarak yürünebilir kabul edilir. Bu sayede board kenarından
// dolaşan yollar doğal şekilde bulunur.

import { BoardState, CellKind, Coord, TilePath } from "../types";

/**
 * İki tile arasında geçerli bir bağlantı yolu arar.
 * Yol en fazla 2 adet 90° dönüş içerebilir.
 * Bulursa path node'larını (başlangıç ve bitiş dahil) döndürür.
 * Bulamazsa null döndürür.
 */
export function findPath(board: BoardState, a: Coord, b: Coord): TilePath | null {
  // Aynı pozisyon eşleşemez
  if (a.col === b.col && a.row === b.row) return null;

  // Farklı tip eşleşemez
  const cellA = board.cells[a.row][a.col];
  const cellB = board.cells[b.row][b.col];
  if (cellA.tileType !== cellB.tileType) return null;

  // ── 0 dönüş: düz hat ──
  if (canWalkStraight(board, a, b)) {
    return [a, b];
  }

  // ── 1 dönüş: L-şekli ──
  // İki olası köşe noktası
  const corner1: Coord = { col: a.col, row: b.row };
  const corner2: Coord = { col: b.col, row: a.row };

  if (
    isWalkable(board, corner1) &&
    canWalkStraight(board, a, corner1) &&
    canWalkStraight(board, corner1, b)
  ) {
    return [a, corner1, b];
  }

  if (
    isWalkable(board, corner2) &&
    canWalkStraight(board, a, corner2) &&
    canWalkStraight(board, corner2, b)
  ) {
    return [a, corner2, b];
  }

  // ── 2 dönüş: Z/U-şekli ──
  // Yatay köprüler: her satır (border dahil -1 ve height) denenir
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
      return [a, c1, c2, b];
    }
  }

  // Dikey köprüler: her sütun (border dahil -1 ve width) denenir
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
      return [a, c1, c2, b];
    }
  }

  return null;
}

/**
 * İki nokta arasında düz çizgide yürünebilir mi kontrol eder.
 * Sadece aradaki hücreleri kontrol eder (uç noktalar hariç).
 * İki nokta aynı satır veya sütunda olmalıdır.
 */
function canWalkStraight(board: BoardState, from: Coord, to: Coord): boolean {
  if (from.row === to.row) {
    // Yatay yürüyüş
    const row = from.row;
    const minCol = Math.min(from.col, to.col) + 1;
    const maxCol = Math.max(from.col, to.col);
    for (let col = minCol; col < maxCol; col++) {
      if (!isCellWalkable(board, row, col)) return false;
    }
    return true;
  }

  if (from.col === to.col) {
    // Dikey yürüyüş
    const col = from.col;
    const minRow = Math.min(from.row, to.row) + 1;
    const maxRow = Math.max(from.row, to.row);
    for (let row = minRow; row < maxRow; row++) {
      if (!isCellWalkable(board, row, col)) return false;
    }
    return true;
  }

  // Aynı satır veya sütunda değilse düz yürünemez
  return false;
}

/**
 * Bir hücrenin path köşe noktası olarak kullanılabilir olup olmadığını kontrol eder.
 * Grid dışı koordinatlar = border space = yürünebilir.
 */
function isWalkable(board: BoardState, coord: Coord): boolean {
  if (
    coord.row < 0 || coord.row >= board.height ||
    coord.col < 0 || coord.col >= board.width
  ) {
    return true; // Border space her zaman yürünebilir
  }
  return board.cells[coord.row][coord.col].kind === CellKind.Empty;
}

/**
 * Bir hücrenin yürünebilir olup olmadığını kontrol eder (satır/sütun ile).
 * Grid dışı = yürünebilir.
 */
function isCellWalkable(board: BoardState, row: number, col: number): boolean {
  if (row < 0 || row >= board.height || col < 0 || col >= board.width) {
    return true;
  }
  return board.cells[row][col].kind === CellKind.Empty;
}

/**
 * Board'da en az bir geçerli eşleşme çifti olup olmadığını kontrol eder.
 * Hiç geçerli hamle kalmamışsa false döndürür.
 */
export function hasAnyValidPair(board: BoardState): boolean {
  // Tile'ları tipe göre grupla
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

  // Her tip grubu içinde çift çift path dene
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
