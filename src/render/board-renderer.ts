import { BoardLayout, BoardState, CellKind, Coord, TilePath, TileTypeId } from "../types";
import {
  BOARD_PADDING,
  HUD_HEIGHT,
  CELL_GAP,
  CELL_BG_COLOR,
  SELECTED_BORDER_COLOR,
  PATH_LINE_COLOR,
  TILE_DEFS,
} from "../constants";

type TileImageResolver = (tileType: TileTypeId) => CanvasImageSource | null;
const TILE_IMAGE_FIT_RATIO = 0.92;
const TILE_GLITCH_IMAGE_ALPHA = 0.88;
const TRANSPARENT_TILE_CACHE = new WeakMap<CanvasImageSource, HTMLCanvasElement>();

export interface MergePullRenderItem {
  from: Coord;
  to: Coord;
  tileType: TileTypeId;
  progress: number; // 0..1
}

export interface GravitySlideRenderItem {
  from: Coord;
  to: Coord;
  tileType: TileTypeId;
  kind: CellKind.Tile | CellKind.FrozenTile;
  progress: number; // 0..1
}

export function calculateLayout(
  displayW: number,
  displayH: number,
  boardW: number,
  boardH: number
): BoardLayout {
  const isMobile =
    typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const layoutPadding = isMobile ? Math.max(8, BOARD_PADDING - 6) : BOARD_PADDING;
  const topReserved = isMobile ? Math.max(68, HUD_HEIGHT + 8) : HUD_HEIGHT;
  const availW = displayW - layoutPadding * 2;
  const availH = displayH - topReserved - layoutPadding * 2;
  const boardArea = boardW * boardH;
  const baseCell = Math.min(availW / boardW, availH / boardH);

  // Mobile: shrink cells progressively as tile count grows.
  // 6x4 (24 cells) keeps original size; larger boards are scaled down smoothly.
  let densityScale = 1;
  if (isMobile) {
    const overflowCells = Math.max(0, boardArea - 24);
    densityScale = Math.max(0.76, 1 - overflowCells * 0.0085);
  }

  const rawCellSize = baseCell * densityScale;
  const cellSize = Math.max(1, Math.floor(rawCellSize));
  const totalW = cellSize * boardW;
  const totalH = cellSize * boardH;
  const offsetX = Math.round((displayW - totalW) / 2);
  const offsetY = Math.round(topReserved + layoutPadding + (availH - totalH) / 2);
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
  resolveTileImage?: TileImageResolver,
  jumpingBlockerImage?: CanvasImageSource | null,
  frozenOverlayImage?: CanvasImageSource | null,
  mergePullItems?: MergePullRenderItem[],
  gravitySlideItems?: GravitySlideRenderItem[]
): void {
  const { offsetX, offsetY, cellSize } = layout;

  drawGridGlassBackdrop(
    ctx,
    offsetX - 4,
    offsetY - 4,
    board.width * cellSize + 8,
    board.height * cellSize + 8
  );

  for (let row = 0; row < board.height; row++) {
    for (let col = 0; col < board.width; col++) {
      const cell = board.cells[row][col];
      const x = offsetX + col * cellSize + CELL_GAP / 2;
      const y = offsetY + row * cellSize + CELL_GAP / 2;
      const size = cellSize - CELL_GAP;
      const cx = offsetX + (col + 0.5) * cellSize;
      const cy = offsetY + (row + 0.5) * cellSize;
      const radius = size * 0.32;

      drawCellPanel(ctx, x, y, size, row, col);

      if (cell.kind === CellKind.Tile && cell.tileType !== null) {
        drawTileSprite(ctx, cell.tileType, cx, cy, radius, size, resolveTileImage, row, col);
      }

      if (cell.kind === CellKind.FrozenTile && cell.tileType !== null) {
        drawTileSprite(ctx, cell.tileType, cx, cy, radius, size, resolveTileImage, row, col);
        drawFrozenOverlay(ctx, x, y, size, frozenOverlayImage ?? null);
      }

      if (cell.kind === CellKind.SolidBlocker) {
        drawSolidBlocker(ctx, x, y, size);
      }

      if (cell.kind === CellKind.JumpingBlocker) {
        drawJumpingBlocker(ctx, cx, cy, radius, size, jumpingBlockerImage ?? null);
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

  if (mergePullItems && mergePullItems.length > 0) {
    drawMergePullEffects(ctx, layout, cellSize, mergePullItems, resolveTileImage);
  }

  if (gravitySlideItems && gravitySlideItems.length > 0) {
    drawGravitySlideEffects(
      ctx,
      layout,
      cellSize,
      gravitySlideItems,
      resolveTileImage,
      frozenOverlayImage ?? null
    );
  }
}

function drawGridGlassBackdrop(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  ctx.save();

  // Main board panel: transparent glass, not solid blue.
  const panelGradient = ctx.createLinearGradient(x, y, x, y + h);
  panelGradient.addColorStop(0, "rgba(210, 238, 255, 0.10)");
  panelGradient.addColorStop(0.5, "rgba(182, 225, 255, 0.06)");
  panelGradient.addColorStop(1, "rgba(166, 218, 255, 0.03)");
  ctx.fillStyle = panelGradient;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();

  // Inner haze to keep board boundaries readable while staying transparent.
  ctx.fillStyle = "rgba(255, 255, 255, 0.035)";
  roundRect(ctx, x + 2, y + 2, w - 4, h - 4, 7);
  ctx.fill();

  // Glitch scan accents on board container (static, deterministic).
  const lineCount = Math.max(5, Math.floor(h / 70));
  for (let i = 0; i < lineCount; i++) {
    const n = stableNoise((i + 1) * 67 + Math.floor(w) * 3 + Math.floor(h));
    const yy = y + Math.floor(h * (0.05 + n * 0.9));
    const pad = Math.floor(w * (0.02 + stableNoise((i + 5) * 41) * 0.04));
    ctx.strokeStyle =
      i % 2 === 0 ? "rgba(108, 228, 255, 0.18)" : "rgba(255, 108, 206, 0.14)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + pad, yy + 0.5);
    ctx.lineTo(x + w - pad, yy + 0.5);
    ctx.stroke();
  }

  // Subtle border glow.
  ctx.strokeStyle = "rgba(208, 239, 255, 0.28)";
  ctx.lineWidth = 1.2;
  roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 8);
  ctx.stroke();

  ctx.restore();
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

function drawMergePullEffects(
  ctx: CanvasRenderingContext2D,
  layout: BoardLayout,
  cellSize: number,
  items: MergePullRenderItem[],
  resolveTileImage?: TileImageResolver
): void {
  for (const item of items) {
    const t = clamp01(item.progress);
    if (t <= 0 || t >= 1) {
      continue;
    }

    const eased = easeInCubic(t);
    const fromCenter = coordToPixel(item.from, layout);
    const toCenter = coordToPixel(item.to, layout);
    const midX = (fromCenter.x + toCenter.x) * 0.5;
    const midY = (fromCenter.y + toCenter.y) * 0.5;

    const p1 = {
      x: lerp(fromCenter.x, midX, eased),
      y: lerp(fromCenter.y, midY, eased),
    };
    const p2 = {
      x: lerp(toCenter.x, midX, eased),
      y: lerp(toCenter.y, midY, eased),
    };

    const alpha = 1 - t * 0.78;
    drawPullArrow(ctx, p1.x, p1.y, midX, midY, alpha);
    drawPullArrow(ctx, p2.x, p2.y, midX, midY, alpha);

    ctx.save();
    ctx.globalAlpha = alpha;
    drawTileSprite(
      ctx,
      item.tileType,
      p1.x,
      p1.y,
      cellSize * 0.32,
      cellSize,
      resolveTileImage,
      item.from.row,
      item.from.col
    );
    drawTileSprite(
      ctx,
      item.tileType,
      p2.x,
      p2.y,
      cellSize * 0.32,
      cellSize,
      resolveTileImage,
      item.to.row,
      item.to.col
    );
    ctx.restore();

    if (t > 0.84) {
      const burst = (t - 0.84) / 0.16;
      const r = Math.max(2, cellSize * 0.06 + burst * cellSize * 0.11);
      ctx.save();
      ctx.globalAlpha = (1 - burst) * 0.5;
      ctx.fillStyle = "rgba(255, 225, 180, 0.85)";
      ctx.beginPath();
      ctx.arc(midX, midY, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

function drawGravitySlideEffects(
  ctx: CanvasRenderingContext2D,
  layout: BoardLayout,
  cellSize: number,
  items: GravitySlideRenderItem[],
  resolveTileImage: TileImageResolver | undefined,
  frozenOverlayImage: CanvasImageSource | null
): void {
  for (const item of items) {
    const t = clamp01(item.progress);
    if (t <= 0 || t >= 1) {
      continue;
    }

    const fromCenter = coordToPixel(item.from, layout);
    const toCenter = coordToPixel(item.to, layout);
    const eased = easeOutCubic(t);
    const x = lerp(fromCenter.x, toCenter.x, eased);
    const y = lerp(fromCenter.y, toCenter.y, eased);

    const trailAlpha = (1 - t) * 0.34;
    ctx.save();
    ctx.globalAlpha = trailAlpha;
    ctx.strokeStyle = "rgba(180, 230, 255, 0.95)";
    ctx.lineWidth = Math.max(2, cellSize * 0.07);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(fromCenter.x, fromCenter.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();

    drawTileSprite(
      ctx,
      item.tileType,
      x,
      y,
      cellSize * 0.32,
      cellSize,
      resolveTileImage,
      item.to.row,
      item.to.col
    );

    if (item.kind === CellKind.FrozenTile) {
      const size = Math.max(8, cellSize * 0.9);
      drawFrozenOverlay(
        ctx,
        x - size / 2,
        y - size / 2,
        size,
        frozenOverlayImage
      );
    }
  }
}

function drawPullArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  alpha: number
): void {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.hypot(dx, dy);
  if (len < 8) {
    return;
  }

  const ux = dx / len;
  const uy = dy / len;
  const tipX = toX - ux * 2;
  const tipY = toY - uy * 2;
  const baseX = fromX + ux * Math.min(22, len * 0.45);
  const baseY = fromY + uy * Math.min(22, len * 0.45);

  ctx.save();
  ctx.globalAlpha = alpha * 0.9;
  ctx.strokeStyle = "rgba(255, 206, 110, 0.95)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  const head = Math.min(8, len * 0.16);
  const leftX = tipX - ux * head - uy * head * 0.55;
  const leftY = tipY - uy * head + ux * head * 0.55;
  const rightX = tipX - ux * head + uy * head * 0.55;
  const rightY = tipY - uy * head - ux * head * 0.55;
  ctx.fillStyle = "rgba(255, 206, 110, 0.98)";
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(leftX, leftY);
  ctx.lineTo(rightX, rightY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawTileSprite(
  ctx: CanvasRenderingContext2D,
  tileType: TileTypeId,
  cx: number,
  cy: number,
  radius: number,
  cellSize: number,
  resolveTileImage: TileImageResolver | undefined,
  row: number,
  col: number
): void {
  const imageSource = resolveTileImage?.(tileType) ?? null;
  if (imageSource) {
    drawGlitchTileImage(
      ctx,
      imageSource,
      cx,
      cy,
      cellSize * TILE_IMAGE_FIT_RATIO,
      cellSize * TILE_IMAGE_FIT_RATIO,
      row,
      col,
      tileType
    );
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

  ctx.globalAlpha = 0.82;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.stroke();
}

function drawCellPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  row: number,
  col: number
): void {
  ctx.save();

  // Glass base: bright and translucent (not dark), so background remains visible.
  const glassGradient = ctx.createLinearGradient(x, y, x, y + size);
  glassGradient.addColorStop(0, "rgba(210, 236, 255, 0.16)");
  glassGradient.addColorStop(0.45, "rgba(176, 224, 255, 0.10)");
  glassGradient.addColorStop(1, "rgba(165, 214, 255, 0.06)");
  ctx.fillStyle = glassGradient;
  roundRect(ctx, x, y, size, size, 6);
  ctx.fill();

  const inset = Math.max(2, size * 0.08);
  ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
  roundRect(ctx, x + inset, y + inset, size - inset * 2, size - inset * 2, 5);
  ctx.fill();

  ctx.strokeStyle = "rgba(214, 241, 255, 0.46)";
  ctx.lineWidth = 1.1;
  roundRect(ctx, x + 0.5, y + 0.5, size - 1, size - 1, 6);
  ctx.stroke();

  // Specular highlight strip for glass feel.
  const shineH = Math.max(2, Math.floor(size * 0.16));
  ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
  roundRect(ctx, x + 2, y + 2, size - 4, shineH, 4);
  ctx.fill();

  // Static (deterministic) glitch scan lines per-cell, no flicker.
  const lineCount = 2;
  for (let i = 0; i < lineCount; i++) {
    const n = stableNoise((row + 1) * 73 + (col + 1) * 97 + i * 17);
    const yy = y + Math.floor(size * (0.22 + n * 0.56));
    const pad = Math.floor(size * (0.14 + n * 0.12));
    ctx.strokeStyle = i % 2 === 0 ? "rgba(112, 232, 255, 0.24)" : "rgba(255, 104, 196, 0.20)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + pad, yy);
    ctx.lineTo(x + size - pad, yy);
    ctx.stroke();
  }

  ctx.restore();
}

function drawGlitchTileImage(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  cx: number,
  cy: number,
  maxW: number,
  maxH: number,
  row: number,
  col: number,
  tileType: number
): void {
  const prepared = prepareTransparentTileImage(image);
  const size = getImageSourceSize(prepared);
  if (!size) {
    return;
  }

  const scale = Math.min(maxW / size.width, maxH / size.height);
  const drawW = Math.max(1, Math.round(size.width * scale));
  const drawH = Math.max(1, Math.round(size.height * scale));
  const drawX = Math.round(cx - drawW / 2);
  const drawY = Math.round(cy - drawH / 2);

  ctx.save();
  ctx.globalAlpha = TILE_GLITCH_IMAGE_ALPHA;
  ctx.drawImage(prepared, drawX, drawY, drawW, drawH);
  ctx.restore();

  const glitchBands = 2;
  for (let i = 0; i < glitchBands; i++) {
    const seed = (row + 1) * 131 + (col + 1) * 197 + (tileType + 1) * 43 + i * 13;
    const n = stableNoise(seed);
    const n2 = stableNoise(seed + 11);
    const bandH = Math.max(2, Math.floor(drawH * (0.09 + n * 0.11)));
    const bandY = drawY + Math.floor((drawH - bandH) * n2);
    const shift = Math.floor(((stableNoise(seed + 23) - 0.5) * drawW) * 0.10);

    ctx.save();
    ctx.beginPath();
    ctx.rect(drawX, bandY, drawW, bandH);
    ctx.clip();
    ctx.globalAlpha = 0.26;
    ctx.drawImage(prepared, drawX + shift, drawY, drawW, drawH);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = i % 2 === 0 ? "#6de7ff" : "#ff66c4";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(drawX + 2, bandY + 0.5);
    ctx.lineTo(drawX + drawW - 2, bandY + 0.5);
    ctx.stroke();
    ctx.restore();
  }

  // Soft holographic frame so tile stays readable on busy backgrounds.
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.20)";
  ctx.lineWidth = 1;
  roundRect(ctx, drawX + 0.5, drawY + 0.5, drawW - 1, drawH - 1, Math.max(4, drawW * 0.11));
  ctx.stroke();
  ctx.restore();
}

function prepareTransparentTileImage(image: CanvasImageSource): CanvasImageSource {
  if (TRANSPARENT_TILE_CACHE.has(image)) {
    return TRANSPARENT_TILE_CACHE.get(image)!;
  }

  if (typeof document === "undefined") {
    return image;
  }

  const size = getImageSourceSize(image);
  if (!size) {
    return image;
  }

  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return image;
  }

  ctx.drawImage(image, 0, 0, size.width, size.height);
  const imageData = ctx.getImageData(0, 0, size.width, size.height);
  const d = imageData.data;
  const original = new Uint8ClampedArray(d);

  // IMPORTANT:
  // Remove only panel-blue pixels connected to the image border.
  // This preserves blue details inside the icon (planets/gems/etc).
  const w = size.width;
  const h = size.height;
  const visited = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;

  const tryEnqueue = (x: number, y: number): void => {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const idx = y * w + x;
    if (visited[idx] === 1) return;
    const p = idx * 4;
    if (!isLikelyPanelBlue(d[p], d[p + 1], d[p + 2], d[p + 3])) return;
    visited[idx] = 1;
    queue[tail++] = idx;
  };

  for (let x = 0; x < w; x++) {
    tryEnqueue(x, 0);
    tryEnqueue(x, h - 1);
  }
  for (let y = 1; y < h - 1; y++) {
    tryEnqueue(0, y);
    tryEnqueue(w - 1, y);
  }

  while (head < tail) {
    const idx = queue[head++];
    const x = idx % w;
    const y = (idx / w) | 0;
    tryEnqueue(x - 1, y);
    tryEnqueue(x + 1, y);
    tryEnqueue(x, y - 1);
    tryEnqueue(x, y + 1);
  }

  let totalOpaque = 0;
  let affectedOpaque = 0;
  for (let idx = 0; idx < visited.length; idx++) {
    const p = idx * 4;
    if (original[p + 3] > 8) {
      totalOpaque++;
      if (visited[idx] === 1) {
        affectedOpaque++;
      }
    }
  }
  const affectedRatio = totalOpaque > 0 ? affectedOpaque / totalOpaque : 0;

  // If the cleanup would wipe most of the icon, use a much softer pass.
  // This protects assets whose foreground itself is blue-ish (e.g. some planets).
  const destructiveCleanup = affectedRatio > 0.72;

  for (let idx = 0; idx < visited.length; idx++) {
    if (visited[idx] !== 1) continue;
    const p = idx * 4;
    const r = d[p];
    const g = d[p + 1];
    const b = d[p + 2];
    const a = d[p + 3];
    const maxRG = Math.max(r, g);
    const strength = Math.min(1, (b - maxRG) / 120 + (130 - Math.min(130, r)) / 220);
    const targetAlpha = destructiveCleanup
      ? a * (0.55 + (1 - strength) * 0.16)
      : a * (0.05 + (1 - strength) * 0.12);
    d[p + 3] = Math.max(0, Math.min(255, Math.round(targetAlpha)));
  }

  ctx.putImageData(imageData, 0, 0);
  TRANSPARENT_TILE_CACHE.set(image, canvas);
  return canvas;
}

function isLikelyPanelBlue(r: number, g: number, b: number, a: number): boolean {
  if (a <= 0) return false;
  const maxRG = Math.max(r, g);
  const blueDominant = b > maxRG * 1.18;
  return blueDominant && b > 58 && r < 170 && g < 185 && (b - maxRG) > 14;
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

function drawFrozenOverlay(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  overlayImage: CanvasImageSource | null
): void {
  if (overlayImage) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    drawTileImage(ctx, overlayImage, x + size / 2, y + size / 2, size * 0.94, size * 0.94);

    ctx.globalAlpha = 0.24;
    ctx.fillStyle = "#90ccff";
    roundRect(ctx, x + 1, y + 1, size - 2, size - 2, 6);
    ctx.fill();

    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = "rgba(196, 232, 255, 0.92)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, size, size, 6);
    ctx.stroke();
    ctx.restore();
    return;
  }

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

function drawJumpingBlocker(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  size: number,
  monkeyImage: CanvasImageSource | null
): void {
  if (monkeyImage) {
    drawTileImage(ctx, monkeyImage, cx, cy, size * 0.9, size * 0.9);
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.34)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(6, size * 0.43), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

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

function stableNoise(seed: number): number {
  const v = Math.sin(seed * 12.9898) * 43758.5453123;
  return v - Math.floor(v);
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInCubic(t: number): number {
  return t * t * t;
}

function easeOutCubic(t: number): number {
  const inv = 1 - t;
  return 1 - inv * inv * inv;
}
