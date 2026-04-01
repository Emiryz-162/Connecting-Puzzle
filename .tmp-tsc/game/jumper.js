// ── game/jumper.ts ──
// Jumping blocker (monkey benzeri engel) hareket sistemi.
//
// Her başarılı match sonrası, board üzerindeki tüm jumping blocker'lar
// rastgele bir boş hücreye sıçrar. Timer-based değil match-triggered
// tercih edildi çünkü:
// - Oyuncu kontrolünde, daha adil
// - Deterministic test edilebilir (random seed ile)
// - Timer-based olsa frustrating olurdu
//
// Jumping blocker'lar:
// - Path'i bloklar (isWalkable = false)
// - Gravity'den etkilenmez
// - Eşleşmez, seçilemez
import { CellKind } from "../types";
/**
 * Board üzerindeki tüm jumping blocker'ları rastgele boş hücrelere taşır.
 * Board state'i mutate eder.
 * Yapılan hareketleri döndürür (animasyon için).
 */
export function moveJumpingBlockers(board) {
    const moves = [];
    // Tüm jumping blocker'ları bul
    const jumpers = [];
    for (let row = 0; row < board.height; row++) {
        for (let col = 0; col < board.width; col++) {
            if (board.cells[row][col].kind === CellKind.JumpingBlocker) {
                jumpers.push({ row, col });
            }
        }
    }
    if (jumpers.length === 0)
        return moves;
    // Her jumper'ı sırayla taşı
    for (const jumper of jumpers) {
        // Mevcut boş hücreleri bul
        const emptyCells = [];
        for (let row = 0; row < board.height; row++) {
            for (let col = 0; col < board.width; col++) {
                if (board.cells[row][col].kind === CellKind.Empty) {
                    emptyCells.push({ row, col });
                }
            }
        }
        if (emptyCells.length === 0)
            continue; // Boş hücre yoksa atlat
        // Rastgele boş hücre seç
        // Not: Math.random() burada state değişim anında çağrılıyor (render loop dışı)
        const targetIdx = Math.floor(Math.random() * emptyCells.length);
        const target = emptyCells[targetIdx];
        // Swap: jumper eski yerini boşalt, yeni yere taşı
        board.cells[jumper.row][jumper.col] = { kind: CellKind.Empty, tileType: null };
        board.cells[target.row][target.col] = { kind: CellKind.JumpingBlocker, tileType: null };
        moves.push({ from: jumper, to: target });
    }
    return moves;
}
//# sourceMappingURL=jumper.js.map