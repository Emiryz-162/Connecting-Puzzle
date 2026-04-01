import { CellKind } from "../types";
import { BOARD_PADDING, CELL_GAP, CELL_BG_COLOR, SELECTED_BORDER_COLOR, PATH_LINE_COLOR, TILE_DEFS, } from "../constants";
const TILE_IMAGE_FIT_RATIO = 0.92;
const TILE_IMAGE_ALPHA = 0.92;
const TRANSPARENT_TILE_CACHE = new WeakMap();
export function calculateLayout(displayW, displayH, boardW, boardH) {
    const isMobile = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
    const layoutPadding = isMobile ? Math.max(8, BOARD_PADDING - 6) : BOARD_PADDING;
    // Use percentage-based safe area margins for fully responsive board framing.
    const hudBottomCss = resolveHudBottomFromCss();
    const hudGap = isMobile ? 12 : 10;
    const hudReserved = Math.max(isMobile ? 214 : 136, Math.round(displayH * (isMobile ? 0.285 : 0.215)), hudBottomCss > 0 ? Math.round(hudBottomCss + hudGap) : 0);
    const innerMarginX = Math.max(isMobile ? 8 : 10, Math.round(displayW * (isMobile ? 0.034 : 0.028)));
    const innerMarginTop = Math.max(isMobile ? 6 : 8, Math.round(displayH * (isMobile ? 0.012 : 0.014)));
    const innerMarginBottom = Math.max(isMobile ? 18 : 14, Math.round(displayH * (isMobile ? 0.085 : 0.065)));
    const playLeft = layoutPadding + innerMarginX;
    const playTop = hudReserved + innerMarginTop;
    const playRight = displayW - layoutPadding - innerMarginX;
    const playBottom = displayH - layoutPadding - innerMarginBottom;
    const playW = Math.max(1, playRight - playLeft);
    const playH = Math.max(1, playBottom - playTop);
    // Fit board into safe play area; larger grids naturally yield smaller cells.
    const fitCell = Math.min(playW / boardW, playH / boardH);
    const maxCell = isMobile ? 78 : 92;
    const cellSize = Math.max(1, Math.floor(Math.min(fitCell, maxCell)));
    const totalW = cellSize * boardW;
    const totalH = cellSize * boardH;
    const offsetX = Math.round(playLeft + (playW - totalW) / 2);
    const offsetY = Math.round(playTop + (playH - totalH) / 2);
    return { offsetX, offsetY, cellSize };
}
function resolveHudBottomFromCss() {
    if (typeof window === "undefined" || typeof document === "undefined") {
        return 0;
    }
    const raw = window
        .getComputedStyle(document.documentElement)
        .getPropertyValue("--cp-hud-bottom")
        .trim();
    if (!raw) {
        return 0;
    }
    const parsed = Number.parseFloat(raw.replace("px", ""));
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return 0;
    }
    return parsed;
}
export function coordToPixel(coord, layout) {
    return {
        x: layout.offsetX + (coord.col + 0.5) * layout.cellSize,
        y: layout.offsetY + (coord.row + 0.5) * layout.cellSize,
    };
}
export function drawBoard(ctx, board, layout, selectedTile, activePath, pathAlpha = 1, resolveTileImage, jumpingBlockerImage, frozenOverlayImage, mergePullItems, gravitySlideItems, hiddenTileCoords, gravityEdgePulse = 0) {
    const { offsetX, offsetY, cellSize } = layout;
    const hiddenCoordKeys = hiddenTileCoords && hiddenTileCoords.length > 0
        ? new Set(hiddenTileCoords.map((coord) => `${coord.row},${coord.col}`))
        : null;
    drawGridGlassBackdrop(ctx, offsetX - 4, offsetY - 4, board.width * cellSize + 8, board.height * cellSize + 8);
    for (let row = 0; row < board.height; row++) {
        for (let col = 0; col < board.width; col++) {
            const cell = board.cells[row][col];
            const x = offsetX + col * cellSize + CELL_GAP / 2;
            const y = offsetY + row * cellSize + CELL_GAP / 2;
            const size = cellSize - CELL_GAP;
            const cx = offsetX + (col + 0.5) * cellSize;
            const cy = offsetY + (row + 0.5) * cellSize;
            const radius = size * 0.32;
            const isHidden = hiddenCoordKeys?.has(`${row},${col}`) ?? false;
            if (isHidden) {
                drawEmptyCellPortal(ctx, x, y, size, row, col);
                continue;
            }
            if (cell.kind === CellKind.Empty) {
                drawEmptyCellPortal(ctx, x, y, size, row, col);
                continue;
            }
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
    drawGravityEdgeArrows(ctx, board, layout, gravityEdgePulse);
    if (selectedTile) {
        const x = offsetX + selectedTile.col * cellSize + CELL_GAP / 2;
        const y = offsetY + selectedTile.row * cellSize + CELL_GAP / 2;
        const size = cellSize - CELL_GAP;
        ctx.strokeStyle = SELECTED_BORDER_COLOR;
        ctx.lineWidth = 3;
        roundRect(ctx, x, y, size, size, 6);
        ctx.stroke();
        ctx.strokeStyle = "rgba(235, 134, 134, 0.42)";
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
        drawGravitySlideEffects(ctx, layout, cellSize, gravitySlideItems, resolveTileImage, frozenOverlayImage ?? null);
    }
}
function drawGravityEdgeArrows(ctx, board, layout, pulse) {
    if (board.gravity === "none") {
        return;
    }
    const p = clamp01(pulse);
    const baseAlpha = 0.42 + p * 0.4;
    const glowAlpha = 0.18 + p * 0.2;
    const arrowSize = Math.max(7, layout.cellSize * (0.17 + p * 0.05));
    const x0 = layout.offsetX;
    const y0 = layout.offsetY;
    const w = board.width * layout.cellSize;
    const h = board.height * layout.cellSize;
    const sideOffset = Math.max(6, layout.cellSize * 0.16);
    const spanCount = board.gravity === "left" || board.gravity === "right"
        ? Math.max(4, Math.min(7, Math.floor(board.height * 0.9)))
        : Math.max(4, Math.min(7, Math.floor(board.width * 0.9)));
    const drawArrows = () => {
        for (let i = 0; i < spanCount; i++) {
            const t = spanCount === 1 ? 0.5 : (i + 0.5) / spanCount;
            let cx = x0;
            let cy = y0;
            if (board.gravity === "left") {
                cx = x0 - sideOffset;
                cy = y0 + t * h;
                drawDirectionalArrow(ctx, cx, cy, arrowSize, "left");
            }
            else if (board.gravity === "right") {
                cx = x0 + w + sideOffset;
                cy = y0 + t * h;
                drawDirectionalArrow(ctx, cx, cy, arrowSize, "right");
            }
            else if (board.gravity === "up") {
                cx = x0 + t * w;
                cy = y0 - sideOffset;
                drawDirectionalArrow(ctx, cx, cy, arrowSize, "up");
            }
            else if (board.gravity === "down") {
                cx = x0 + t * w;
                cy = y0 + h + sideOffset;
                drawDirectionalArrow(ctx, cx, cy, arrowSize, "down");
            }
        }
    };
    ctx.save();
    ctx.strokeStyle = `rgba(255, 255, 255, ${glowAlpha})`;
    ctx.lineWidth = Math.max(2.2, layout.cellSize * 0.06);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    drawArrows();
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = `rgba(235, 134, 134, ${baseAlpha})`;
    ctx.lineWidth = Math.max(1.65, layout.cellSize * 0.045);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    drawArrows();
    ctx.restore();
}
function drawDirectionalArrow(ctx, x, y, size, direction) {
    let angle = 0;
    if (direction === "left")
        angle = Math.PI;
    if (direction === "up")
        angle = -Math.PI / 2;
    if (direction === "down")
        angle = Math.PI / 2;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const rotate = (px, py) => ({
        x: x + px * c - py * s,
        y: y + px * s + py * c,
    });
    const stemBack = rotate(-size * 1.15, 0);
    const tip = rotate(size * 1.05, 0);
    const wingUp = rotate(size * 0.2, -size * 0.56);
    const wingDown = rotate(size * 0.2, size * 0.56);
    ctx.beginPath();
    ctx.moveTo(stemBack.x, stemBack.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(wingUp.x, wingUp.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(wingDown.x, wingDown.y);
    ctx.stroke();
}
export function drawFallingTiles(ctx, cellSize, items, resolveTileImage) {
    if (items.length === 0) {
        return;
    }
    const radius = Math.max(8, cellSize * 0.32);
    for (const item of items) {
        const alpha = clamp01(item.alpha);
        if (alpha <= 0) {
            continue;
        }
        const scale = Math.max(0.12, item.scale);
        ctx.save();
        ctx.translate(item.x, item.y);
        ctx.rotate(item.rotationRad);
        ctx.scale(scale, scale);
        ctx.globalAlpha = alpha;
        ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
        ctx.shadowBlur = Math.max(4, cellSize * 0.14);
        ctx.shadowOffsetY = Math.max(2, cellSize * 0.06);
        drawTileSprite(ctx, item.tileType, 0, 0, radius, cellSize, resolveTileImage, 0, 0);
        ctx.restore();
    }
}
export function drawJumperFlights(ctx, layout, cellSize, items, jumpingBlockerImage) {
    if (items.length === 0) {
        return;
    }
    const radius = Math.max(8, cellSize * 0.32);
    for (const item of items) {
        const t = clamp01(item.progress);
        if (t <= 0 || t >= 1) {
            continue;
        }
        const fromCenter = coordToPixel(item.from, layout);
        const toCenter = coordToPixel(item.to, layout);
        const lead = sampleJumperArcPoint(fromCenter, toCenter, t, item.arcHeightPx);
        const tailT = Math.max(0, t - 0.24);
        const tail = sampleJumperArcPoint(fromCenter, toCenter, tailT, item.arcHeightPx);
        const midT = (tailT + t) * 0.5;
        const control = sampleJumperArcPoint(fromCenter, toCenter, midT, item.arcHeightPx * 0.94);
        const trailAlpha = (1 - t) * 0.6;
        ctx.save();
        ctx.globalAlpha = trailAlpha;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.lineWidth = Math.max(1.2, cellSize * 0.04);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(tail.x, tail.y);
        ctx.quadraticCurveTo(control.x, control.y, lead.x, lead.y);
        ctx.stroke();
        ctx.restore();
        drawJumpingBlocker(ctx, lead.x, lead.y, radius, cellSize, jumpingBlockerImage ?? null);
    }
}
function drawGridGlassBackdrop(ctx, x, y, w, h) {
    ctx.save();
    const panelGradient = ctx.createLinearGradient(x, y, x, y + h);
    panelGradient.addColorStop(0, "rgba(253, 228, 203, 0.42)");
    panelGradient.addColorStop(0.5, "rgba(251, 203, 183, 0.34)");
    panelGradient.addColorStop(1, "rgba(249, 183, 169, 0.28)");
    ctx.shadowColor = "rgba(119, 82, 67, 0.18)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = panelGradient;
    roundRect(ctx, x, y, w, h, 14);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    roundRect(ctx, x + 3, y + 3, w - 6, h - 6, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.42)";
    ctx.lineWidth = 1.25;
    roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 14);
    ctx.stroke();
    ctx.restore();
}
function drawPath(ctx, path, layout, alpha = 1) {
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
        }
        else {
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
function drawMergePullEffects(ctx, layout, cellSize, items, resolveTileImage) {
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
        drawTileSprite(ctx, item.tileType, p1.x, p1.y, cellSize * 0.32, cellSize, resolveTileImage, item.from.row, item.from.col);
        drawTileSprite(ctx, item.tileType, p2.x, p2.y, cellSize * 0.32, cellSize, resolveTileImage, item.to.row, item.to.col);
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
function sampleJumperArcPoint(from, to, t, arcHeightPx) {
    const x = lerp(from.x, to.x, t);
    const yLinear = lerp(from.y, to.y, t);
    const arcLift = Math.sin(Math.PI * t) * arcHeightPx;
    return { x, y: yLinear - arcLift };
}
function drawGravitySlideEffects(ctx, layout, cellSize, items, resolveTileImage, frozenOverlayImage) {
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
        ctx.strokeStyle = "rgba(235, 134, 134, 0.92)";
        ctx.lineWidth = Math.max(2, cellSize * 0.07);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(fromCenter.x, fromCenter.y);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.restore();
        drawTileSprite(ctx, item.tileType, x, y, cellSize * 0.32, cellSize, resolveTileImage, item.to.row, item.to.col);
        if (item.kind === CellKind.FrozenTile) {
            const size = Math.max(8, cellSize * 0.9);
            drawFrozenOverlay(ctx, x - size / 2, y - size / 2, size, frozenOverlayImage);
        }
    }
}
function drawPullArrow(ctx, fromX, fromY, toX, toY, alpha) {
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
    ctx.strokeStyle = "rgba(235, 134, 134, 0.98)";
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
    ctx.fillStyle = "rgba(235, 134, 134, 0.98)";
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(leftX, leftY);
    ctx.lineTo(rightX, rightY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}
function drawTileSprite(ctx, tileType, cx, cy, radius, cellSize, resolveTileImage, row, col) {
    const imageSource = resolveTileImage?.(tileType) ?? null;
    if (imageSource) {
        drawStyledTileImage(ctx, imageSource, cx, cy, cellSize * TILE_IMAGE_FIT_RATIO, cellSize * TILE_IMAGE_FIT_RATIO);
        return;
    }
    const def = TILE_DEFS[tileType % TILE_DEFS.length];
    const chipGradient = ctx.createLinearGradient(cx, cy - radius, cx, cy + radius);
    chipGradient.addColorStop(0, "rgba(255, 247, 239, 0.97)");
    chipGradient.addColorStop(1, "rgba(248, 223, 204, 0.95)");
    ctx.fillStyle = chipGradient;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.68)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = def.color;
    ctx.strokeStyle = "rgba(111, 83, 70, 0.22)";
    ctx.lineWidth = 1.25;
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
            ctx.bezierCurveTo(cx - radius * 1.2, cy, cx - radius * 0.6, cy - radius, cx, cy - radius * 0.4);
            ctx.bezierCurveTo(cx + radius * 0.6, cy - radius, cx + radius * 1.2, cy, cx, cy + radius * 0.8);
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
function drawCellPanel(ctx, x, y, size, row, col) {
    ctx.save();
    const baseGradient = ctx.createLinearGradient(x, y, x, y + size);
    baseGradient.addColorStop(0, "rgba(255, 243, 231, 0.72)");
    baseGradient.addColorStop(1, "rgba(250, 213, 192, 0.62)");
    ctx.fillStyle = baseGradient;
    roundRect(ctx, x, y, size, size, 10);
    ctx.fill();
    const inset = Math.max(2, size * 0.09);
    ctx.fillStyle = "rgba(255, 255, 255, 0.24)";
    roundRect(ctx, x + inset, y + inset, size - inset * 2, size - inset * 2, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.64)";
    ctx.lineWidth = 1.2;
    roundRect(ctx, x + 0.5, y + 0.5, size - 1, size - 1, 10);
    ctx.stroke();
    const shineH = Math.max(2, Math.floor(size * 0.17));
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    roundRect(ctx, x + 3, y + 3, size - 6, shineH, 6);
    ctx.fill();
    const accentNoise = stableNoise((row + 1) * 53 + (col + 1) * 71);
    const accentY = y + size * (0.72 + accentNoise * 0.08);
    ctx.strokeStyle = "rgba(235, 134, 134, 0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + size * 0.2, accentY);
    ctx.lineTo(x + size * 0.8, accentY);
    ctx.stroke();
    ctx.restore();
}
function drawEmptyCellPortal(ctx, x, y, size, row, col) {
    ctx.save();
    const depthGradient = ctx.createLinearGradient(x, y, x, y + size);
    depthGradient.addColorStop(0, "rgba(33, 28, 37, 0.34)");
    depthGradient.addColorStop(1, "rgba(10, 16, 30, 0.48)");
    ctx.fillStyle = depthGradient;
    roundRect(ctx, x, y, size, size, 10);
    ctx.fill();
    const innerInset = Math.max(2, size * 0.1);
    const innerGlow = ctx.createRadialGradient(x + size * 0.5, y + size * 0.45, size * 0.06, x + size * 0.5, y + size * 0.5, size * 0.56);
    innerGlow.addColorStop(0, "rgba(255, 255, 255, 0.16)");
    innerGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = innerGlow;
    roundRect(ctx, x + innerInset, y + innerInset, size - innerInset * 2, size - innerInset * 2, 8);
    ctx.fill();
    const rimAlpha = 0.26 + stableNoise((row + 1) * 97 + (col + 1) * 31) * 0.08;
    ctx.strokeStyle = `rgba(255, 255, 255, ${rimAlpha})`;
    ctx.lineWidth = 1.1;
    roundRect(ctx, x + 0.5, y + 0.5, size - 1, size - 1, 10);
    ctx.stroke();
    ctx.restore();
}
function drawStyledTileImage(ctx, image, cx, cy, maxW, maxH) {
    const prepared = prepareTransparentTileImage(image);
    const size = getImageSourceSize(prepared);
    if (!size) {
        return;
    }
    const frameSize = Math.max(8, Math.min(maxW, maxH));
    const frameX = cx - frameSize / 2;
    const frameY = cy - frameSize / 2;
    const frameRadius = Math.max(8, frameSize * 0.22);
    const innerPadding = Math.max(4, frameSize * 0.12);
    const drawAreaW = frameSize - innerPadding * 2;
    const drawAreaH = frameSize - innerPadding * 2;
    ctx.save();
    ctx.shadowColor = "rgba(119, 82, 67, 0.2)";
    ctx.shadowBlur = Math.max(4, frameSize * 0.1);
    ctx.shadowOffsetY = Math.max(2, frameSize * 0.06);
    const frameGradient = ctx.createLinearGradient(frameX, frameY, frameX, frameY + frameSize);
    frameGradient.addColorStop(0, "rgba(255, 248, 242, 0.98)");
    frameGradient.addColorStop(1, "rgba(248, 223, 205, 0.95)");
    ctx.fillStyle = frameGradient;
    roundRect(ctx, frameX, frameY, frameSize, frameSize, frameRadius);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.lineWidth = 1.2;
    roundRect(ctx, frameX + 0.5, frameY + 0.5, frameSize - 1, frameSize - 1, frameRadius);
    ctx.stroke();
    ctx.restore();
    const scale = Math.min(drawAreaW / size.width, drawAreaH / size.height);
    const drawW = Math.max(1, Math.round(size.width * scale));
    const drawH = Math.max(1, Math.round(size.height * scale));
    const drawX = Math.round(cx - drawW / 2);
    const drawY = Math.round(cy - drawH / 2);
    ctx.save();
    roundRect(ctx, frameX + innerPadding / 2, frameY + innerPadding / 2, frameSize - innerPadding, frameSize - innerPadding, Math.max(6, frameRadius - innerPadding * 0.4));
    ctx.clip();
    ctx.globalAlpha = TILE_IMAGE_ALPHA;
    ctx.drawImage(prepared, drawX, drawY, drawW, drawH);
    ctx.restore();
}
function prepareTransparentTileImage(image) {
    if (TRANSPARENT_TILE_CACHE.has(image)) {
        return TRANSPARENT_TILE_CACHE.get(image);
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
    const tryEnqueue = (x, y) => {
        if (x < 0 || x >= w || y < 0 || y >= h)
            return;
        const idx = y * w + x;
        if (visited[idx] === 1)
            return;
        const p = idx * 4;
        if (!isLikelyPanelBlue(d[p], d[p + 1], d[p + 2], d[p + 3]))
            return;
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
        if (visited[idx] !== 1)
            continue;
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
function isLikelyPanelBlue(r, g, b, a) {
    if (a <= 0)
        return false;
    const maxRG = Math.max(r, g);
    const blueDominant = b > maxRG * 1.18;
    return blueDominant && b > 58 && r < 170 && g < 185 && (b - maxRG) > 14;
}
function drawTileImage(ctx, image, cx, cy, maxW, maxH) {
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
function getImageSourceSize(source) {
    const candidate = source;
    const width = candidate.naturalWidth ?? candidate.videoWidth ?? candidate.width ?? 0;
    const height = candidate.naturalHeight ?? candidate.videoHeight ?? candidate.height ?? 0;
    if (width <= 0 || height <= 0) {
        return null;
    }
    return { width, height };
}
function regularPolygon(ctx, cx, cy, radius, sides, startAngle) {
    for (let i = 0; i < sides; i++) {
        const angle = startAngle + (i * 2 * Math.PI) / sides;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        if (i === 0) {
            ctx.moveTo(x, y);
        }
        else {
            ctx.lineTo(x, y);
        }
    }
    ctx.closePath();
}
function star(ctx, cx, cy, outerR, innerR, points) {
    for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = -Math.PI / 2 + (i * Math.PI) / points;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) {
            ctx.moveTo(x, y);
        }
        else {
            ctx.lineTo(x, y);
        }
    }
    ctx.closePath();
}
function drawFrozenOverlay(ctx, x, y, size, overlayImage) {
    if (overlayImage) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        drawTileImage(ctx, overlayImage, x + size / 2, y + size / 2, size * 0.94, size * 0.94);
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = "#f5f8ff";
        roundRect(ctx, x + 1, y + 1, size - 2, size - 2, 6);
        ctx.fill();
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = "rgba(238, 245, 255, 0.95)";
        ctx.lineWidth = 1.5;
        roundRect(ctx, x, y, size, size, 6);
        ctx.stroke();
        ctx.restore();
        return;
    }
    ctx.fillStyle = "rgba(240, 247, 255, 0.32)";
    roundRect(ctx, x, y, size, size, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(229, 240, 255, 0.55)";
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
    ctx.strokeStyle = "rgba(214, 228, 248, 0.75)";
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, size, size, 6);
    ctx.stroke();
}
function drawSolidBlocker(ctx, x, y, size) {
    ctx.fillStyle = "#9a6d5d";
    roundRect(ctx, x, y, size, size, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
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
    ctx.strokeStyle = "rgba(80, 51, 41, 0.35)";
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, size, size, 6);
    ctx.stroke();
}
function drawJumpingBlocker(ctx, cx, cy, radius, size, monkeyImage) {
    if (monkeyImage) {
        drawTileImage(ctx, monkeyImage, cx, cy, size * 0.9, size * 0.9);
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.42)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(6, size * 0.43), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        return;
    }
    const r = radius * 1.1;
    ctx.fillStyle = "#eb8686";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff6f0";
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
    ctx.strokeStyle = "rgba(93, 58, 46, 0.25)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
}
function roundRect(ctx, x, y, w, h, r) {
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
function stableNoise(seed) {
    const v = Math.sin(seed * 12.9898) * 43758.5453123;
    return v - Math.floor(v);
}
function clamp01(v) {
    return Math.max(0, Math.min(1, v));
}
function lerp(a, b, t) {
    return a + (b - a) * t;
}
function easeInCubic(t) {
    return t * t * t;
}
function easeOutCubic(t) {
    const inv = 1 - t;
    return 1 - inv * inv * inv;
}
//# sourceMappingURL=board-renderer.js.map