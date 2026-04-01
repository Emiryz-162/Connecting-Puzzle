// ── game/frozen.ts ──
// Frozen tile unlock mekanizması.
//
// Frozen tile doğrudan seçilemez. Komşusundaki (4-neighbor) bir tile
// match ile kaldırıldığında frozen tile açılır ve normal Tile olur.
//
// 4-neighbor tercih edildi (8 değil) çünkü:
// - Oyuncuya daha öngörülebilir ve adil hissettiriyor
// - Diagonal komşuluk kafa karıştırıcı olabiliyor
// - Daha temiz ve test edilebilir
import { CellKind } from "../types";
/** 4-yönlü komşuluk offset'leri */
const NEIGHBOR_OFFSETS = [
    { dr: -1, dc: 0 }, // üst
    { dr: 1, dc: 0 }, // alt
    { dr: 0, dc: -1 }, // sol
    { dr: 0, dc: 1 }, // sağ
];
/**
 * Verilen koordinatların 4-neighbor komşuları arasında frozen tile varsa
 * bunları bulur ve unlock eder (FrozenTile → Tile).
 * Unlock edilen hücrelerin koordinatlarını döndürür (animasyon için).
 *
 * @param board Board state (mutate edilir)
 * @param removedCoords Kaldırılan tile'ların koordinatları
 */
export function unfreezeNeighbors(board, removedCoords) {
    const unfrozen = [];
    // Tekrar açmayı önlemek için set tut
    const seen = new Set();
    for (const coord of removedCoords) {
        for (const offset of NEIGHBOR_OFFSETS) {
            const nr = coord.row + offset.dr;
            const nc = coord.col + offset.dc;
            // Board sınırları kontrolü
            if (nr < 0 || nr >= board.height || nc < 0 || nc >= board.width)
                continue;
            const key = `${nr},${nc}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            const cell = board.cells[nr][nc];
            if (cell.kind === CellKind.FrozenTile) {
                // Frozen → normal Tile
                board.cells[nr][nc] = {
                    kind: CellKind.Tile,
                    tileType: cell.tileType,
                };
                unfrozen.push({ row: nr, col: nc });
            }
        }
    }
    return unfrozen;
}
//# sourceMappingURL=frozen.js.map