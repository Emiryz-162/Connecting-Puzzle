const TOTAL_LEVELS = 90;
const GRAVITY_CYCLE = ["down", "left", "up", "right"];
const SIZE_BANDS = [
    { start: 1, end: 10, width: 3, height: 5 },
    { start: 11, end: 40, width: 4, height: 5 },
    { start: 41, end: 70, width: 5, height: 6 },
    { start: 71, end: 90, width: 6, height: 8 },
];
function clampInt(value, min, max) {
    return Math.max(min, Math.min(max, Math.floor(value)));
}
function createSeededRng(seed) {
    let state = seed >>> 0;
    if (state === 0) {
        state = 0x6d2b79f5;
    }
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 0x100000000;
    };
}
function shuffleWithRng(items, rng) {
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
}
function resolveBoardSize(levelId) {
    const band = SIZE_BANDS.find((item) => levelId >= item.start && levelId <= item.end);
    if (!band) {
        return { width: 6, height: 8 };
    }
    return {
        width: band.width,
        height: band.height,
    };
}
function resolvePhase(levelId) {
    if (levelId <= 15) {
        return "classic";
    }
    if (levelId <= 30) {
        return "gravity";
    }
    if (levelId <= 42) {
        return "frozen";
    }
    if (levelId <= 48) {
        return "monkey";
    }
    if (levelId <= 70) {
        return "mixed";
    }
    if (levelId <= 80) {
        return "hard";
    }
    return "nightmare";
}
function resolveGravity(levelId, phase) {
    if (phase === "gravity" || phase === "mixed" || phase === "hard" || phase === "nightmare") {
        return GRAVITY_CYCLE[(levelId - 1) % GRAVITY_CYCLE.length];
    }
    return "none";
}
function resolveTileTypeCount(levelId, phase) {
    switch (phase) {
        case "classic":
            return clampInt(3 + (levelId - 1) / 5, 3, 8);
        case "gravity":
            return clampInt(4 + (levelId - 16) / 6, 4, 8);
        case "frozen":
            return clampInt(5 + (levelId - 31) / 6, 5, 8);
        case "monkey":
            return clampInt(6 + (levelId - 43) / 4, 6, 8);
        case "mixed":
            return clampInt(6 + (levelId - 49) / 8, 6, 8);
        case "hard":
            return clampInt(7 + (levelId - 71) / 5, 7, 8);
        case "nightmare":
            return 8;
        default:
            return 6;
    }
}
function resolveTimerSeconds(levelId, phase) {
    let timer;
    switch (phase) {
        case "classic":
            timer = 132 - (levelId - 1) * 2;
            break;
        case "gravity":
            timer = 110 - (levelId - 16);
            break;
        case "frozen":
            timer = 102 - (levelId - 31);
            break;
        case "monkey":
            timer = 96 - (levelId - 43);
            break;
        case "mixed":
            timer = 94 - Math.floor((levelId - 49) * 0.9);
            break;
        case "hard":
            timer = 80 - (levelId - 71);
            break;
        case "nightmare":
            timer = 72 - Math.floor((levelId - 81) * 0.7);
            break;
        default:
            timer = 96;
            break;
    }
    return clampInt(timer, 62, 140);
}
function convertFirst(layout, from, to) {
    for (let row = 0; row < layout.length; row++) {
        for (let col = 0; col < layout[row].length; col++) {
            if (layout[row][col] === from) {
                layout[row][col] = to;
                return true;
            }
        }
    }
    return false;
}
function countCells(layout, predicate) {
    let count = 0;
    for (let row = 0; row < layout.length; row++) {
        for (let col = 0; col < layout[row].length; col++) {
            if (predicate(layout[row][col])) {
                count++;
            }
        }
    }
    return count;
}
function buildLayout(width, height, options) {
    const totalCells = width * height;
    const layout = Array.from({ length: height }, () => Array.from({ length: width }, () => 1));
    let emptyCount = clampInt(options.emptyCount ?? 0, 0, totalCells);
    let solidCount = clampInt(options.solidCount ?? 0, 0, totalCells - emptyCount);
    let jumperCount = clampInt(options.jumperCount ?? 0, 0, totalCells - emptyCount - solidCount);
    const reserved = emptyCount + solidCount + jumperCount;
    const minimumRegularTiles = Math.max(10, Math.floor(totalCells * 0.35));
    const maxFrozenByRegular = Math.max(0, totalCells - reserved - minimumRegularTiles);
    let frozenCount = clampInt(options.frozenCount ?? 0, 0, maxFrozenByRegular);
    const coords = [];
    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            coords.push({ row, col });
        }
    }
    const rng = createSeededRng(options.seed);
    shuffleWithRng(coords, rng);
    const place = (targetCount, value) => {
        let placed = 0;
        for (let i = 0; i < coords.length && placed < targetCount; i++) {
            const { row, col } = coords[i];
            if (layout[row][col] !== 1) {
                continue;
            }
            layout[row][col] = value;
            placed++;
        }
    };
    place(solidCount, -1);
    place(jumperCount, -3);
    place(emptyCount, 0);
    place(frozenCount, -2);
    let pairAssignable = countCells(layout, (value) => value === 1 || value === -2);
    if (pairAssignable % 2 !== 0) {
        const changed = convertFirst(layout, 1, 0) || convertFirst(layout, -2, 0);
        if (changed) {
            pairAssignable -= 1;
        }
    }
    const minimumVisibleTiles = Math.max(8, Math.floor(totalCells * 0.3));
    while (countCells(layout, (value) => value === 1) < minimumVisibleTiles) {
        if (!convertFirst(layout, -2, 1)) {
            break;
        }
    }
    if (pairAssignable < 2) {
        convertFirst(layout, 0, 1);
        convertFirst(layout, 0, 1);
    }
    return layout;
}
function buildLevel(levelId) {
    const phase = resolvePhase(levelId);
    const { width, height } = resolveBoardSize(levelId);
    const level = {
        id: levelId,
        width,
        height,
        gravity: resolveGravity(levelId, phase),
        timerSeconds: resolveTimerSeconds(levelId, phase),
        tileTypeCount: resolveTileTypeCount(levelId, phase),
    };
    if (phase === "classic") {
        if (width * height % 2 !== 0) {
            level.layout = buildLayout(width, height, {
                seed: levelId * 101 + 7,
                emptyCount: 1,
            });
        }
        if (levelId === 1) {
            level.tutorialText = "Tap two matching tiles to connect them!";
        }
        return level;
    }
    if (phase === "gravity") {
        if (levelId === 16) {
            level.tutorialText = "Gravity is active. Cleared tiles pull the board.";
        }
        return level;
    }
    if (phase === "frozen") {
        const progress = levelId - 31;
        const frozenCount = width === 4 ? 4 + Math.floor(progress * 0.6) : 7 + Math.floor(progress * 0.8);
        level.layout = buildLayout(width, height, {
            seed: levelId * 113 + 17,
            frozenCount,
            emptyCount: progress % 3 === 0 ? 1 : 0,
        });
        if (levelId === 31) {
            level.tutorialText = "Frozen tiles unlock when nearby matches pop.";
        }
        return level;
    }
    if (phase === "monkey") {
        const progress = levelId - 43;
        level.jumpingBlockerCount = clampInt(1 + progress / 2, 1, 3);
        if (levelId === 43) {
            level.tutorialText = "Monkeys jump after every match and block your routes.";
        }
        return level;
    }
    if (phase === "mixed") {
        const progress = levelId - 49;
        level.layout = buildLayout(width, height, {
            seed: levelId * 127 + 23,
            frozenCount: 7 + Math.floor(progress * 0.5),
            jumperCount: 1 + Math.floor(progress / 9),
            solidCount: progress >= 8 ? 1 + Math.floor((progress - 8) / 7) : 0,
            emptyCount: 1 + (progress % 2),
        });
        if (levelId === 49) {
            level.tutorialText = "Now combine gravity, frozen tiles and monkeys.";
        }
        return level;
    }
    if (phase === "hard") {
        const progress = levelId - 71;
        level.layout = buildLayout(width, height, {
            seed: levelId * 131 + 29,
            frozenCount: 14 + progress,
            jumperCount: 2 + Math.floor(progress / 3),
            solidCount: 2 + Math.floor(progress / 4),
            emptyCount: 2 + (progress % 2),
        });
        return level;
    }
    const progress = levelId - 81;
    level.layout = buildLayout(width, height, {
        seed: levelId * 137 + 31,
        frozenCount: 18 + progress * 2,
        jumperCount: 3 + Math.floor(progress / 2),
        solidCount: 4 + Math.floor(progress / 3),
        emptyCount: 3 + (progress % 3 === 0 ? 1 : 0),
    });
    if (levelId === 81) {
        level.tutorialText = "Final stretch: every challenge is active now.";
    }
    return level;
}
export const LEVELS = Array.from({ length: TOTAL_LEVELS }, (_, index) => buildLevel(index + 1));
if (LEVELS.length !== TOTAL_LEVELS) {
    throw new Error(`Expected ${TOTAL_LEVELS} levels, got ${LEVELS.length}.`);
}
//# sourceMappingURL=level-data.js.map