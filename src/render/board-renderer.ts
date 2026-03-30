import { BoardLayout, BoardState, CellKind, Coord, TilePath, TileTypeId } from "../types";
import {
  BOARD_PADDING,
  HUD_HEIGHT,
  CELL_GAP,
  CELL_BG_COLOR,
  GRID_BG_COLOR,
  SELECTED_BORDER_COLOR,
  PATH_LINE_COLOR,
  TILE_DEFS,
} from "../constants";

type TileImageResolver = (tileType: TileTypeId) => CanvasImageSource | null;
const TILE_IMAGE_FIT_RATIO = 0.92;

export function calculateLayout(
  displayW: number,
  displayH: number,
  boardW: number,
  boardH: number
): BoardLayout {
  const availW = displayW - BOARD_PADDING * 2;
  const availH = displayH - HUD_HEIGHT - BOARD_PADDING * 2;
  const rawCellSize = Math.min(availW / boardW, availH / boardH);
  const cellSize = Math.max(1, Math.floor(rawCellSize));
  const totalW = cellSize * boardW;
  const totalH = cellSize * boardH;
  const offsetX = Math.round((displayW - totalW) / 2);
  const offsetY = Math.round(HUD_HEIGHT + BOARD_PADDING + (availH - totalH) / 2);
  return { offsetX, offsetY, cellSize };
}

export function coordToPixel(coord: Coord, layout: BoardLayout): { x: number; y: number } {
  return {
    x: layout.offsetX + (coord.col + 0.5) * layout.cellSize,
    y: layout.offsetY + (coord.row + 0.5) * layout.cellSize,
  };
}

export function drawBoard(
  ctx: CanvasRenderingContext2D,
  board: BoardState,
  layout: BoardLayout,
  selectedTile: Coord | null,
  activePath: TilePath | null,
  pathAlpha = 1,
  resolveTileImage?: TileImageResolver
): void {
  const { offsetX, offsetY, cellSize } = layout;

  ctx.fillStyle = GRID_BG_COLOR;
  roundRect(
    ctx,
    offsetX - 4,
    offsetY - 4,
    board.width * cellSize + 8,
    board.height * cellSize + 8,
    8
  );
  ctx.fill();

  for (let row = 0; row < board.height; row++) {
    for (let col = 0; col < board.width; col++) {
      const cell = board.cells[row][col];
      const x = offsetX + col * cellSize + CELL_GAP / 2;
      const y = offsetY + row * cellSize + CELL_GAP / 2;
      const size = cellSize - CELL_GAP;
      const cx = offsetX + (col + 0.5) * cellSize;
      const cy = offsetY + (row + 0.5) * cellSize;
      const radius = size * 0.32;

      ctx.fillStyle = CELL_BG_COLOR;
      roundRect(ctx, x, y, size, size, 6);
      ctx.fill();

      if (cell.kind === CellKind.Tile && cell.tileType !== null) {
        drawTileSprite(ctx, cell.tileType, cx, cy, radius, size, resolveTileImage);
      }

      if (cell.kind === CellKind.FrozenTile && cell.tileType !== null) {
        drawTileSprite(ctx, cell.tileType, cx, cy, radius, size, resolveTileImage);
        drawFrozenOverlay(ctx, x, y, size);
      }

      if (cell.kind === CellKind.SolidBlocker) {
        drawSolidBlocker(ctx, x, y, size);
      }

      if (cell.kind === CellKind.JumpingBlocker) {
        drawJumpingBlocker(ctx, cx, cy, radius);
      }
    }
  }

  if (selectedTile) {
    const x = offsetX + selectedTile.col * cellSize + CELL_GAP / 2;
    const y = offsetY + selectedTile.row * cellSize + CELL_GAP / 2;
    const size = cellSize - CELL_GAP;

    ctx.strokeStyle = SELECTED_BORDER_COLOR;
    ctx.lineWidth = 3;
    roundRect(ctx, x, y, size, size, 6);
    ctx.stroke();

    ctx.strokeStyle = "rgba(233, 69, 96, 0.3)";
    ctx.lineWidth = 6;
    roundRect(ctx, x - 2, y - 2, size + 4, size + 4, 8);
    ctx.stroke();
  }

  if (activePath && activePath.length >= 2) {
    drawPath(ctx, activePath, layout, pathAlpha);
  }
}

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

  ctx.fillStyle = PATH_LINE_COLOR;
  for (let i = 1; i < path.length - 1; i++) {
    const p = coordToPixel(path[i], layout);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTileSprite(
  ctx: CanvasRenderingContext2D,
  tileType: TileTypeId,
  cx: number,
  cy: number,
  radius: number,
  cellSize: number,
  resolveTileImage?: TileImageResolver
): void {
  const imageSource = resolveTileImage?.(tileType) ?? null;
  if (imageSource) {
    drawTileImage(ctx, imageSource, cx, cy, cellSize * TILE_IMAGE_FIT_RATIO, cellSize * TILE_IMAGE_FIT_RATIO);
    return;
  }

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
    case "heart":
      ctx.moveTo(cx, cy + radius * 0.8);
      ctx.bezierCurveTo(
        cx - radius * 1.2,
        cy,
        cx - radius * 0.6,
        cy - radius,
        cx,
        cy - radius * 0.4
      );
      ctx.bezierCurveTo(
        cx + radius * 0.6,
        cy - radius,
        cx + radius * 1.2,
        cy,
        cx,
        cy + radius * 0.8
      );
      break;
    case "crescent":
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = CELL_BG_COLOR;
      ctx.beginPath();
      ctx.arc(cx + radius * 0.35, cy, radius * 0.8, 0, Math.PI * 2);
      ctx.fill();
      return;
    case "arrow":
      ctx.moveTo(cx, cy - radius);
      ctx.lineTo(cx + radius * 0.8, cy + radius * 0.2);
      ctx.lineTo(cx + radius * 0.3, cy + radius * 0.2);
      ctx.lineTo(cx + radius * 0.3, cy + radius);
      ctx.lineTo(cx - radius * 0.3, cy + radius);
      ctx.lineTo(cx - radius * 0.3, cy + radius * 0.2);
      ctx.lineTo(cx - radius * 0.8, cy + radius * 0.2);
      ctx.closePath();
      break;
    case "hourglass":
      ctx.moveTo(cx - radius * 0.7, cy - radius);
      ctx.lineTo(cx + radius * 0.7, cy - radius);
      ctx.lineTo(cx + radius * 0.15, cy);
      ctx.lineTo(cx + radius * 0.7, cy + radius);
      ctx.lineTo(cx - radius * 0.7, cy + radius);
      ctx.lineTo(cx - radius * 0.15, cy);
      ctx.closePath();
      break;
    default:
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      break;
  }

  ctx.fill();
  ctx.stroke();
}

function drawTileImage(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  cx: number,
  cy: number,
  maxW: number,
  maxH: number
): void {
  const size = getImageSourceSize(image);
  if (!size) {
    return;
  }

  const scale = Math.min(maxW / size.width, maxH / size.height);
  const drawW = size.width * scale;
  const drawH = size.height * scale;
  const drawX = Math.round(cx - drawW / 2);
  const drawY = Math.round(cy - drawH / 2);
  const finalW = Math.max(1, Math.round(drawW));
  const finalH = Math.max(1, Math.round(drawH));
  ctx.drawImage(image, drawX, drawY, finalW, finalH);
}

function getImageSourceSize(source: CanvasImageSource): { width: number; height: number } | null {
  const candidate = source as {
    width?: number;
    height?: number;
    naturalWidth?: number;
    naturalHeight?: number;
    videoWidth?: number;
    videoHeight?: number;
  };
  const width = candidate.naturalWidth ?? candidate.videoWidth ?? candidate.width ?? 0;
  const height = candidate.naturalHeight ?? candidate.videoHeight ?? candidate.height ?? 0;
  if (width <= 0 || height <= 0) {
    return null;
  }
  return { width, height };
}

function regularPolygon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  sides: number,
  startAngle: number
): void {
  for (let i = 0; i < sides; i++) {
    const angle = startAngle + (i * 2 * Math.PI) / sides;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
}

function star(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  points: number
): void {
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = -Math.PI / 2 + (i * Math.PI) / points;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
}

function drawFrozenOverlay(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.fillStyle = "rgba(100, 180, 255, 0.35)";
  roundRect(ctx, x, y, size, size, 6);
  ctx.fill();

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

  ctx.strokeStyle = "rgba(100, 180, 255, 0.6)";
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, size, size, 6);
  ctx.stroke();
}

function drawSolidBlocker(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.fillStyle = "#2c3e50";
  roundRect(ctx, x, y, size, size, 6);
  ctx.fill();

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

  ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, size, size, 6);
  ctx.stroke();
}

function drawJumpingBlocker(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number): void {
  const r = radius * 1.1;

  ctx.fillStyle = "#e67e22";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

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

  ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
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
