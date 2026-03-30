// ── render/board-renderer.ts ──
// Board ve tile'ların Canvas2D ile çizimi.
// Layout hesaplama, tile şekilleri, seçim vurgusu ve path çizgisi burada.

import { BoardLayout, BoardState, CellKind, Coord, TilePath, TileTypeId } from "../types";
import {
  BOARD_PADDING, HUD_HEIGHT, CELL_GAP,
  CELL_BG_COLOR, GRID_BG_COLOR, SELECTED_BORDER_COLOR,
  PATH_LINE_COLOR, TILE_DEFS,
} from "../constants";

/**
 * Canvas boyutlarına göre board layout'unu hesaplar.
 * Board viewport içinde ortalanır, HUD için üstte alan bırakılır.
 */
export function calculateLayout(
  displayW: number,
  displayH: number,
  boardW: number,
  boardH: number
): BoardLayout {
  const availW = displayW - BOARD_PADDING * 2;
  const availH = displayH - HUD_HEIGHT - BOARD_PADDING * 2;
  const cellSize = Math.min(availW / boardW, availH / boardH);
  const totalW = cellSize * boardW;
  const totalH = cellSize * boardH;
  const offsetX = (displayW - totalW) / 2;
  const offsetY = HUD_HEIGHT + BOARD_PADDING + (availH - totalH) / 2;
  return { offsetX, offsetY, cellSize };
}

/**
 * Grid koordinatını piksel merkezine dönüştürür.
 * Border space koordinatları (grid dışı) board kenarının hemen dışına yerleşir.
 */
export function coordToPixel(coord: Coord, layout: BoardLayout): { x: number; y: number } {
  return {
    x: layout.offsetX + (coord.col + 0.5) * layout.cellSize,
    y: layout.offsetY + (coord.row + 0.5) * layout.cellSize,
  };
}

/**
 * Board'un tamamını çizer: grid arka planı, hücreler, tile'lar, seçim, path.
 */
export function drawBoard(
  ctx: CanvasRenderingContext2D,
  board: BoardState,
  layout: BoardLayout,
  selectedTile: Coord | null,
  activePath: TilePath | null,
  pathAlpha = 1
): void {
  const { offsetX, offsetY, cellSize } = layout;

  // Grid arka planı
  ctx.fillStyle = GRID_BG_COLOR;
  roundRect(
    ctx,
    offsetX - 4, offsetY - 4,
    board.width * cellSize + 8,
    board.height * cellSize + 8,
    8
  );
  ctx.fill();

  // Hücreleri çiz
  for (let row = 0; row < board.height; row++) {
    for (let col = 0; col < board.width; col++) {
      const cell = board.cells[row][col];
      const x = offsetX + col * cellSize + CELL_GAP / 2;
      const y = offsetY + row * cellSize + CELL_GAP / 2;
      const size = cellSize - CELL_GAP;

      // Hücre arka planı
      ctx.fillStyle = CELL_BG_COLOR;
      roundRect(ctx, x, y, size, size, 6);
      ctx.fill();

      const cx = offsetX + (col + 0.5) * cellSize;
      const cy = offsetY + (row + 0.5) * cellSize;
      const radius = size * 0.32;

      // Normal tile
      if (cell.kind === CellKind.Tile && cell.tileType !== null) {
        drawTileSprite(ctx, cell.tileType, cx, cy, radius);
      }

      // Frozen tile — buz-mavi overlay + tile şekli
      if (cell.kind === CellKind.FrozenTile && cell.tileType !== null) {
        drawTileSprite(ctx, cell.tileType, cx, cy, radius);
        drawFrozenOverlay(ctx, x, y, size);
      }

      // Solid blocker — koyu gri tuğla deseni
      if (cell.kind === CellKind.SolidBlocker) {
        drawSolidBlocker(ctx, x, y, size);
      }

      // Jumping blocker — yay/spring ikonu
      if (cell.kind === CellKind.JumpingBlocker) {
        drawJumpingBlocker(ctx, cx, cy, radius);
      }
    }
  }

  // Seçili tile vurgusu
  if (selectedTile) {
    const x = offsetX + selectedTile.col * cellSize + CELL_GAP / 2;
    const y = offsetY + selectedTile.row * cellSize + CELL_GAP / 2;
    const size = cellSize - CELL_GAP;

    ctx.strokeStyle = SELECTED_BORDER_COLOR;
    ctx.lineWidth = 3;
    roundRect(ctx, x, y, size, size, 6);
    ctx.stroke();

    // İç parlama efekti
    ctx.strokeStyle = "rgba(233, 69, 96, 0.3)";
    ctx.lineWidth = 6;
    roundRect(ctx, x - 2, y - 2, size + 4, size + 4, 8);
    ctx.stroke();
  }

  // Bağlantı yolu çizgisi
  if (activePath && activePath.length >= 2) {
    drawPath(ctx, activePath, layout, pathAlpha);
  }
}

/**
 * Bağlantı yolunu çizer (kalın renkli çizgi).
 */
function drawPath(
  ctx: CanvasRenderingContext2D,
  path: TilePath,
  layout: BoardLayout,
  alpha = 1
): void {
  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  if (clampedAlpha <= 0) {
    return;
  }

  ctx.save();
  ctx.globalAlpha = clampedAlpha;
  ctx.strokeStyle = PATH_LINE_COLOR;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  for (let i = 0; i < path.length; i++) {
    const p = coordToPixel(path[i], layout);
    if (i === 0) {
      ctx.moveTo(p.x, p.y);
    } else {
      ctx.lineTo(p.x, p.y);
    }
  }
  ctx.stroke();

  // Path üzerindeki dönüş noktalarında küçük daireler
  ctx.fillStyle = PATH_LINE_COLOR;
  for (let i = 1; i < path.length - 1; i++) {
    const p = coordToPixel(path[i], layout);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Tek bir tile şeklini çizer.
 * Her tile tipi farklı bir geometrik şekil ve renk ile temsil edilir.
 */
function drawTileSprite(
  ctx: CanvasRenderingContext2D,
  tileType: TileTypeId,
  cx: number,
  cy: number,
  radius: number
): void {
  const def = TILE_DEFS[tileType % TILE_DEFS.length];
  ctx.fillStyle = def.color;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  switch (def.shape) {
    case "circle":
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      break;

    case "square": {
      const s = radius * 0.85;
      ctx.rect(cx - s, cy - s, s * 2, s * 2);
      break;
    }

    case "triangle":
      regularPolygon(ctx, cx, cy, radius, 3, -Math.PI / 2);
      break;

    case "diamond":
      ctx.moveTo(cx, cy - radius);
      ctx.lineTo(cx + radius * 0.7, cy);
      ctx.lineTo(cx, cy + radius);
      ctx.lineTo(cx - radius * 0.7, cy);
      ctx.closePath();
      break;

    case "star":
      star(ctx, cx, cy, radius, radius * 0.45, 5);
      break;

    case "hexagon":
      regularPolygon(ctx, cx, cy, radius, 6, 0);
      break;

    case "cross": {
      const w = radius * 0.35;
      ctx.moveTo(cx - w, cy - radius);
      ctx.lineTo(cx + w, cy - radius);
      ctx.lineTo(cx + w, cy - w);
      ctx.lineTo(cx + radius, cy - w);
      ctx.lineTo(cx + radius, cy + w);
      ctx.lineTo(cx + w, cy + w);
      ctx.lineTo(cx + w, cy + radius);
      ctx.lineTo(cx - w, cy + radius);
      ctx.lineTo(cx - w, cy + w);
      ctx.lineTo(cx - radius, cy + w);
      ctx.lineTo(cx - radius, cy - w);
      ctx.lineTo(cx - w, cy - w);
      ctx.closePath();
      break;
    }

    case "pentagon":
      regularPolygon(ctx, cx, cy, radius, 5, -Math.PI / 2);
      break;

    case "heart": {
      const r = radius * 0.55;
      ctx.moveTo(cx, cy + radius * 0.8);
      ctx.bezierCurveTo(cx - radius * 1.2, cy, cx - radius * 0.6, cy - radius, cx, cy - radius * 0.4);
      ctx.bezierCurveTo(cx + radius * 0.6, cy - radius, cx + radius * 1.2, cy, cx, cy + radius * 0.8);
      break;
    }

    case "crescent": {
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // İç kesim — arka plan rengiyle üst üste çiz
      ctx.fillStyle = CELL_BG_COLOR;
      ctx.beginPath();
      ctx.arc(cx + radius * 0.35, cy, radius * 0.8, 0, Math.PI * 2);
      ctx.fill();
      // Tekrar dolgu rengini ayarla (stroke zaten yapıldı)
      return;
    }

    case "arrow": {
      ctx.moveTo(cx, cy - radius);
      ctx.lineTo(cx + radius * 0.8, cy + radius * 0.2);
      ctx.lineTo(cx + radius * 0.3, cy + radius * 0.2);
      ctx.lineTo(cx + radius * 0.3, cy + radius);
      ctx.lineTo(cx - radius * 0.3, cy + radius);
      ctx.lineTo(cx - radius * 0.3, cy + radius * 0.2);
      ctx.lineTo(cx - radius * 0.8, cy + radius * 0.2);
      ctx.closePath();
      break;
    }

    case "hourglass": {
      ctx.moveTo(cx - radius * 0.7, cy - radius);
      ctx.lineTo(cx + radius * 0.7, cy - radius);
      ctx.lineTo(cx + radius * 0.15, cy);
      ctx.lineTo(cx + radius * 0.7, cy + radius);
      ctx.lineTo(cx - radius * 0.7, cy + radius);
      ctx.lineTo(cx - radius * 0.15, cy);
      ctx.closePath();
      break;
    }

    default:
      // Bilinmeyen şekil için fallback: daire
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      break;
  }

  ctx.fill();
  ctx.stroke();
}

/** Düzgün çokgen çizer (üçgen, beşgen, altıgen vb.) */
function regularPolygon(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  radius: number, sides: number,
  startAngle: number
): void {
  for (let i = 0; i < sides; i++) {
    const angle = startAngle + (i * 2 * Math.PI) / sides;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Yıldız çizer */
function star(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  outerR: number, innerR: number,
  points: number
): void {
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = -Math.PI / 2 + (i * Math.PI) / points;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Frozen tile üzerine buz efekti çizer */
function drawFrozenOverlay(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number
): void {
  // Yarı saydam buz-mavi overlay
  ctx.fillStyle = "rgba(100, 180, 255, 0.35)";
  roundRect(ctx, x, y, size, size, 6);
  ctx.fill();

  // Çapraz çizgiler (buz çatlak efekti)
  ctx.strokeStyle = "rgba(200, 230, 255, 0.5)";
  ctx.lineWidth = 1;
  const step = size / 4;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * step, y);
    ctx.lineTo(x, y + i * step);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + size - i * step, y + size);
    ctx.lineTo(x + size, y + size - i * step);
    ctx.stroke();
  }

  // Kenarlık
  ctx.strokeStyle = "rgba(100, 180, 255, 0.6)";
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, size, size, 6);
  ctx.stroke();
}

/** Solid blocker çizer — koyu gri, tuğla deseni */
function drawSolidBlocker(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number
): void {
  // Koyu gri arka plan
  ctx.fillStyle = "#2c3e50";
  roundRect(ctx, x, y, size, size, 6);
  ctx.fill();

  // Çapraz çizgiler (tuğla/engel deseni)
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 1.5;
  const gap = size / 5;
  for (let i = 1; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * gap, y + 2);
    ctx.lineTo(x + i * gap, y + size - 2);
    ctx.stroke();
  }
  for (let i = 1; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 2, y + i * gap);
    ctx.lineTo(x + size - 2, y + i * gap);
    ctx.stroke();
  }

  // Kenarlık
  ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, size, size, 6);
  ctx.stroke();
}

/** Jumping blocker çizer — yay/spring ikonu */
function drawJumpingBlocker(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, radius: number
): void {
  const r = radius * 1.1;

  // Arka plan daire
  ctx.fillStyle = "#e67e22";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Yay çizimi (zigzag)
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  const segments = 5;
  const springH = r * 1.4;
  const springW = r * 0.6;
  const startY = cy + springH / 2;
  ctx.moveTo(cx, startY);
  for (let i = 0; i < segments; i++) {
    const segY = startY - (springH / segments) * (i + 1);
    const segX = i % 2 === 0 ? cx + springW : cx - springW;
    ctx.lineTo(segX, segY);
  }
  ctx.stroke();

  // Kenarlık
  ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
}

/** Yuvarlatılmış köşeli dikdörtgen path'i oluşturur */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

