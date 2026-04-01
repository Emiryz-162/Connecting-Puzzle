// ── game/gravity.ts ──
// Match sonrası board üzerindeki tile'ları gravity yönüne doğru kaydırır.
//
// Yaklaşım: Her sütun/satır solid blocker'larla segmentlere bölünür.
// Her segment içindeki hareket edebilir tile'lar gravity yönüne doğru paketlenir.
// JumpingBlocker'lar gravity'den etkilenmez (yerinde kalır, segment böler).
//
// Generic fonksiyon dört yönü de tek bir mantıkla ele alır:
// primaryAxis = işlenen hat (sütun veya satır indeksi)
// secondaryAxis = hat boyunca pozisyon
// packToEnd = true ise yüksek indekse doğru paketle (down/right)
import { CellKind } from "../types";
/**
 * Board üzerindeki gravity'yi çözer.
 * Tile'ları gravity yönüne doğru kaydırır, board state'i günceller.
 * Yapılan hareketlerin listesini döndürür (animasyon için).
 */
export function resolveGravity(board) {
    switch (board.gravity) {
        case "none":
            return [];
        case "down":
            return packAxis(board, "vertical", true);
        case "up":
            return packAxis(board, "vertical", false);
        case "right":
            return packAxis(board, "horizontal", true);
        case "left":
            return packAxis(board, "horizontal", false);
    }
}
/**
 * Bir eksen boyunca tüm hatları işler.
 * orientation: "vertical" → sütunlar işlenir, "horizontal" → satırlar işlenir
 * packToEnd: true → yüksek indekse doğru paketle
 */
function packAxis(board, orientation, packToEnd) {
    const moves = [];
    const isVertical = orientation === "vertical";
    // primarySize: kaç hat var (sütun sayısı veya satır sayısı)
    // secondarySize: her hattın uzunluğu
    const primarySize = isVertical ? board.width : board.height;
    const secondarySize = isVertical ? board.height : board.width;
    for (let p = 0; p < primarySize; p++) {
        // Hattı segmentlere böl (solid/jumping blocker = segment sınırı)
        let segStart = 0;
        for (let s = 0; s <= secondarySize; s++) {
            let isBarrier = false;
            if (s < secondarySize) {
                const [row, col] = isVertical ? [s, p] : [p, s];
                const kind = board.cells[row][col].kind;
                isBarrier =
                    kind === CellKind.SolidBlocker ||
                        kind === CellKind.JumpingBlocker;
            }
            if (s === secondarySize || isBarrier) {
                // [segStart, s) segmentini işle
                if (s > segStart) {
                    packSegment(board, p, segStart, s, isVertical, packToEnd, moves);
                }
                segStart = s + 1;
            }
        }
    }
    return moves;
}
/**
 * Tek bir segment içindeki tile'ları paketler.
 * p: hat indeksi (sütun veya satır)
 * start, end: segment aralığı [start, end)
 */
function packSegment(board, p, start, end, isVertical, packToEnd, moves) {
    // Coord dönüşüm yardımcısı
    const toCoord = (s) => isVertical ? { row: s, col: p } : { row: p, col: s };
    // Hareket edebilir tile'ları topla (sırayı koru)
    const tiles = [];
    const originalPositions = [];
    for (let s = start; s < end; s++) {
        const coord = toCoord(s);
        const cell = board.cells[coord.row][coord.col];
        if (cell.kind === CellKind.Tile || cell.kind === CellKind.FrozenTile) {
            tiles.push({ kind: cell.kind, tileType: cell.tileType });
            originalPositions.push(s);
        }
    }
    // Hiç tile yoksa veya segment zaten dolu ise bir şey yapma
    const segLen = end - start;
    if (tiles.length === 0 || tiles.length === segLen)
        return;
    // Segmenti temizle
    for (let s = start; s < end; s++) {
        const coord = toCoord(s);
        board.cells[coord.row][coord.col] = { kind: CellKind.Empty, tileType: null };
    }
    // Tile'ları gravity yönüne doğru yerleştir
    const emptyCount = segLen - tiles.length;
    for (let i = 0; i < tiles.length; i++) {
        const targetS = packToEnd
            ? start + emptyCount + i // Segment sonuna paketle
            : start + i; // Segment başına paketle
        const coord = toCoord(targetS);
        board.cells[coord.row][coord.col] = tiles[i];
        // Pozisyon değiştiyse hareket kaydı oluştur
        if (originalPositions[i] !== targetS) {
            moves.push({
                from: toCoord(originalPositions[i]),
                to: coord,
            });
        }
    }
}
//# sourceMappingURL=gravity.js.map