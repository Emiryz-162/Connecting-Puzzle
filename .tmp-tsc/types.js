// ── types.ts ──
// Oyunun tüm veri modellerini tanımlar.
// Her dosya bu tiplere bağımlıdır.
/** Bir grid hücresinin içeriği */
export var CellKind;
(function (CellKind) {
    CellKind[CellKind["Empty"] = 0] = "Empty";
    CellKind[CellKind["Tile"] = 1] = "Tile";
    CellKind[CellKind["FrozenTile"] = 2] = "FrozenTile";
    CellKind[CellKind["SolidBlocker"] = 3] = "SolidBlocker";
    CellKind[CellKind["JumpingBlocker"] = 4] = "JumpingBlocker";
})(CellKind || (CellKind = {}));
//# sourceMappingURL=types.js.map