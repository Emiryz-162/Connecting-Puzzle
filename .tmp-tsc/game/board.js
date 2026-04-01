// game/board.ts
// Board veri modeli olusturma ve manipule etme yardimcilari.
import { CellKind } from "../types";
/**
 * LevelDef'ten yeni bir BoardState olusturur.
 * Layout varsa onu kullanir, yoksa board'u procedural doldurur.
 */
export function createBoard(def) {
    if (def.layout) {
        return createBoardFromLayout(def);
    }
    return createBoardWithoutLayout(def);
}
/**
 * Layout yoksa board olusturma.
 * jumpingBlockerCount burada gercekten kullanilir.
 */
function createBoardWithoutLayout(def) {
    const { width, height, gravity } = def;
    const totalCells = width * height;
    const blockerCount = resolveJumperCount(def.jumpingBlockerCount ?? 0, totalCells);
    const playableSlots = totalCells - blockerCount;
    const pairCount = playableSlots / 2;
    const tiles = [];
    for (let i = 0; i < pairCount; i++) {
        const type = i % def.tileTypeCount;
        tiles.push(type, type);
    }
    shuffle(tiles);
    const blockerIndices = pickRandomUniqueIndices(totalCells, blockerCount);
    const blockerSet = new Set(blockerIndices);
    const cells = [];
    let tileIdx = 0;
    for (let row = 0; row < height; row++) {
        cells[row] = [];
        for (let col = 0; col < width; col++) {
            const linear = row * width + col;
            if (blockerSet.has(linear)) {
                cells[row][col] = { kind: CellKind.JumpingBlocker, tileType: null };
            }
            else {
                cells[row][col] = { kind: CellKind.Tile, tileType: tiles[tileIdx++] };
            }
        }
    }
    return { width, height, cells, gravity };
}
/**
 * Layout dizisinden board olusturur.
 * Layout degerleri:
 * 0=bos, pozitif=tile pozisyonu, -1=solid, -2=frozen, -3=jumping blocker
 */
function createBoardFromLayout(def) {
    const { width, height, gravity } = def;
    const cells = [];
    const pairAssignablePositions = [];
    for (let row = 0; row < height; row++) {
        cells[row] = [];
        for (let col = 0; col < width; col++) {
            const val = def.layout[row][col];
            if (val > 0) {
                pairAssignablePositions.push({ row, col });
                cells[row][col] = { kind: CellKind.Tile, tileType: 0 };
            }
            else if (val === -1) {
                cells[row][col] = { kind: CellKind.SolidBlocker, tileType: null };
            }
            else if (val === -2) {
                const key = `${row},${col}`;
                const fixedFrozenType = def.frozenTypes?.[key];
                if (fixedFrozenType !== undefined) {
                    cells[row][col] = { kind: CellKind.FrozenTile, tileType: fixedFrozenType };
                }
                else {
                    pairAssignablePositions.push({ row, col });
                    cells[row][col] = { kind: CellKind.FrozenTile, tileType: 0 };
                }
            }
            else if (val === -3) {
                cells[row][col] = { kind: CellKind.JumpingBlocker, tileType: null };
            }
            else {
                cells[row][col] = { kind: CellKind.Empty, tileType: null };
            }
        }
    }
    if (pairAssignablePositions.length % 2 !== 0) {
        console.warn("Layout tile sayisi tek, son tile bosaltildi.");
        const last = pairAssignablePositions.pop();
        cells[last.row][last.col] = { kind: CellKind.Empty, tileType: null };
    }
    const pairCount = pairAssignablePositions.length / 2;
    const types = [];
    for (let i = 0; i < pairCount; i++) {
        const type = i % def.tileTypeCount;
        types.push(type, type);
    }
    shuffle(types);
    for (let i = 0; i < pairAssignablePositions.length; i++) {
        const pos = pairAssignablePositions[i];
        cells[pos.row][pos.col].tileType = types[i];
    }
    // Layout'ta jumperCount verilirse, mevcut jumperlara ek olarak bos hucrelere yerlestir.
    applyExtraJumpersToEmptyCells(cells, def.jumpingBlockerCount ?? 0);
    return { width, height, cells, gravity };
}
/**
 * Board'daki tile tiplerini karistirir.
 * Kind dagilimini (Tile/Frozen/Solid/Jumper/Empty) bozmadan sadece tileType dagitir.
 */
export function reshuffleBoardTiles(board) {
    const coords = [];
    const types = [];
    for (let row = 0; row < board.height; row++) {
        for (let col = 0; col < board.width; col++) {
            const cell = board.cells[row][col];
            if ((cell.kind === CellKind.Tile || cell.kind === CellKind.FrozenTile) && cell.tileType !== null) {
                coords.push({ row, col });
                types.push(cell.tileType);
            }
        }
    }
    if (coords.length < 2 || types.length % 2 !== 0) {
        return false;
    }
    shuffle(types);
    for (let i = 0; i < coords.length; i++) {
        const { row, col } = coords[i];
        board.cells[row][col].tileType = types[i];
    }
    return true;
}
/** Board uzerindeki kalan eslesebilir tile sayisini dondurur */
export function countRemainingTiles(board) {
    let count = 0;
    for (let row = 0; row < board.height; row++) {
        for (let col = 0; col < board.width; col++) {
            const kind = board.cells[row][col].kind;
            if (kind === CellKind.Tile || kind === CellKind.FrozenTile) {
                count++;
            }
        }
    }
    return count;
}
/** Iki tile'i board'dan kaldirir */
export function removeTiles(board, a, b) {
    board.cells[a.row][a.col] = { kind: CellKind.Empty, tileType: null };
    board.cells[b.row][b.col] = { kind: CellKind.Empty, tileType: null };
}
function applyExtraJumpersToEmptyCells(cells, targetTotal) {
    if (targetTotal <= 0)
        return;
    let currentJumpers = 0;
    const emptyCoords = [];
    for (let row = 0; row < cells.length; row++) {
        for (let col = 0; col < cells[row].length; col++) {
            const kind = cells[row][col].kind;
            if (kind === CellKind.JumpingBlocker)
                currentJumpers++;
            if (kind === CellKind.Empty)
                emptyCoords.push({ row, col });
        }
    }
    const need = Math.max(0, targetTotal - currentJumpers);
    if (need === 0 || emptyCoords.length === 0)
        return;
    shuffle(emptyCoords);
    const placeCount = Math.min(need, emptyCoords.length);
    for (let i = 0; i < placeCount; i++) {
        const { row, col } = emptyCoords[i];
        cells[row][col] = { kind: CellKind.JumpingBlocker, tileType: null };
    }
}
function resolveJumperCount(requested, totalCells) {
    let count = Number.isFinite(requested) ? Math.floor(requested) : 0;
    if (count < 0)
        count = 0;
    const maxCount = Math.max(0, totalCells - 2);
    if (count > maxCount)
        count = maxCount;
    // Eslesebilir tile sayisi cift olmali.
    if ((totalCells - count) % 2 !== 0) {
        if (count < maxCount) {
            count += 1;
        }
        else {
            count -= 1;
        }
    }
    return Math.max(0, count);
}
function pickRandomUniqueIndices(total, take) {
    if (take <= 0)
        return [];
    const indices = Array.from({ length: total }, (_, i) => i);
    shuffle(indices);
    return indices.slice(0, take);
}
/** Fisher-Yates shuffle (in-place) */
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}
//# sourceMappingURL=board.js.map