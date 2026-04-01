// ── constants.ts ──
// Görsel sabitler, tile tanımları ve zamanlama değerleri.
// Tüm magic number'lar burada toplanır.
/** Tile görsel tanımları: şekil adı ve dolgu rengi */
export const TILE_DEFS = [
    { shape: "circle", color: "#E74C3C" }, // 0: kırmızı
    { shape: "square", color: "#3498DB" }, // 1: mavi
    { shape: "triangle", color: "#2ECC71" }, // 2: yeşil
    { shape: "diamond", color: "#F39C12" }, // 3: turuncu
    { shape: "star", color: "#9B59B6" }, // 4: mor
    { shape: "hexagon", color: "#1ABC9C" }, // 5: teal
    { shape: "cross", color: "#E67E22" }, // 6: amber
    { shape: "pentagon", color: "#34495E" }, // 7: lacivert
    { shape: "heart", color: "#E91E63" }, // 8: pembe
    { shape: "crescent", color: "#00BCD4" }, // 9: cyan
    { shape: "arrow", color: "#8BC34A" }, // 10: lime
    { shape: "hourglass", color: "#FF5722" }, // 11: koyu turuncu
];
/** Board kenar boşluğu (piksel, CSS) */
export const BOARD_PADDING = 16;
/** HUD yüksekliği (piksel, CSS) */
export const HUD_HEIGHT = 56;
/** Hücreler arası boşluk (piksel) */
export const CELL_GAP = 3;
/** Path gösterim süresi (ms) */
export const PATH_DISPLAY_DURATION = 400;
/** Arka plan rengi */
export const BG_COLOR = "#f8d8c2";
/** Grid arka plan rengi */
export const GRID_BG_COLOR = "#e9b9a0";
/** Hücre arka plan rengi */
export const CELL_BG_COLOR = "#f3cfb8";
/** Seçili tile kenarlık rengi */
export const SELECTED_BORDER_COLOR = "#eb8686";
/** Path çizgi rengi */
export const PATH_LINE_COLOR = "#eb8686";
/** HUD metin rengi */
export const HUD_TEXT_COLOR = "#eeeeee";
/** Timer bar arka plan rengi */
export const TIMER_BG_COLOR = "#2c2c54";
/** Timer bar dolgu rengi */
export const TIMER_FILL_COLOR = "#44bd32";
/** Timer bar düşük süre rengi */
export const TIMER_LOW_COLOR = "#e84118";
/** Overlay arka plan */
export const OVERLAY_BG = "rgba(0, 0, 0, 0.7)";
//# sourceMappingURL=constants.js.map