import { BoardLayout, Coord } from "../types";

export type TapCallback = (coord: Coord, boardWidth: number, boardHeight: number) => void;

export class InputHandler {
  private readonly canvas: HTMLCanvasElement;
  private readonly callback: TapCallback;

  private layout: BoardLayout;
  private boardWidth: number;
  private boardHeight: number;
  private enabled = true;

  private readonly usePointerEvents: boolean;

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

    this.usePointerEvents = typeof window !== "undefined" && "PointerEvent" in window;

    if (this.usePointerEvents) {
      this.canvas.addEventListener("pointerdown", this.handlePointerDown, { passive: false });
    } else {
      this.canvas.addEventListener("mousedown", this.handleMouseDown);
      this.canvas.addEventListener("touchstart", this.handleTouchStart, { passive: false });
    }
  }

  updateLayout(layout: BoardLayout, boardWidth: number, boardHeight: number): void {
    this.layout = layout;
    this.boardWidth = boardWidth;
    this.boardHeight = boardHeight;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  destroy(): void {
    if (this.usePointerEvents) {
      this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    } else {
      this.canvas.removeEventListener("mousedown", this.handleMouseDown);
      this.canvas.removeEventListener("touchstart", this.handleTouchStart);
    }
  }

  private handlePointerDown = (event: PointerEvent): void => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    if (event.pointerType !== "mouse") {
      event.preventDefault();
    }
    this.processTap(event.clientX, event.clientY);
  };

  private handleMouseDown = (event: MouseEvent): void => {
    if (event.button !== 0) {
      return;
    }
    this.processTap(event.clientX, event.clientY);
  };

  private handleTouchStart = (event: TouchEvent): void => {
    event.preventDefault();
    const touch = event.touches[0];
    if (!touch) {
      return;
    }
    this.processTap(touch.clientX, touch.clientY);
  };

  private processTap(clientX: number, clientY: number): void {
    if (!this.enabled) {
      return;
    }
    if (!Number.isFinite(this.layout.cellSize) || this.layout.cellSize <= 0) {
      return;
    }

    const col = Math.floor((clientX - this.layout.offsetX) / this.layout.cellSize);
    const row = Math.floor((clientY - this.layout.offsetY) / this.layout.cellSize);

    this.callback({ col, row }, this.boardWidth, this.boardHeight);
  }
}
