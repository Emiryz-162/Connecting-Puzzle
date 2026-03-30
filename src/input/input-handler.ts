// ── input/input-handler.ts ──
// Mouse ve touch event'lerini grid koordinatlarına dönüştürür.
// Hem mobil hem desktop'ta çalışır.
// Touch event'lerinde preventDefault ile double-fire önlenir.

import { BoardLayout, Coord } from "../types";

export type TapCallback = (coord: Coord, boardWidth: number, boardHeight: number) => void;

/**
 * Input handler: canvas üzerindeki tap/click'leri grid koordinatına çevirip
 * callback'e iletir.
 */
export class InputHandler {
  private canvas: HTMLCanvasElement;
  private callback: TapCallback;
  private layout: BoardLayout;
  private boardWidth: number;
  private boardHeight: number;

  constructor(
    canvas: HTMLCanvasElement,
    callback: TapCallback,
    layout: BoardLayout,
    boardWidth: number,
    boardHeight: number
  ) {
    this.canvas = canvas;
    this.callback = callback;
    this.layout = layout;
    this.boardWidth = boardWidth;
    this.boardHeight = boardHeight;

    // Event listener'ları bağla
    this.canvas.addEventListener("mousedown", this.handleMouse);
    this.canvas.addEventListener("touchstart", this.handleTouch, { passive: false });
  }

  /** Layout veya board boyutu değiştiğinde güncelle */
  updateLayout(layout: BoardLayout, boardWidth: number, boardHeight: number): void {
    this.layout = layout;
    this.boardWidth = boardWidth;
    this.boardHeight = boardHeight;
  }

  /** Temizlik */
  destroy(): void {
    this.canvas.removeEventListener("mousedown", this.handleMouse);
    this.canvas.removeEventListener("touchstart", this.handleTouch);
  }

  private handleMouse = (e: MouseEvent): void => {
    // Touch cihazlarda mousedown'u atla (touchstart zaten tetikleniyor)
    this.processTap(e.clientX, e.clientY);
  };

  private handleTouch = (e: TouchEvent): void => {
    e.preventDefault(); // Scroll ve double-fire engelle
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      this.processTap(touch.clientX, touch.clientY);
    }
  };

  /**
   * Piksel koordinatını grid koordinatına çevirir ve callback'i çağırır.
   * Grid dışı tıklamalar yine callback'e gider (overlay vs. için).
   */
  private processTap(clientX: number, clientY: number): void {
    const col = Math.floor((clientX - this.layout.offsetX) / this.layout.cellSize);
    const row = Math.floor((clientY - this.layout.offsetY) / this.layout.cellSize);

    // Grid sınırları dahilinde mi kontrol et
    this.callback({ col, row }, this.boardWidth, this.boardHeight);
  }
}
