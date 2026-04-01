const THEME_IDS = ["foods", "landmarks", "planets"];
const TILE_COUNT_PER_THEME = 8;
function pad2(value) {
    return value.toString().padStart(2, "0");
}
function buildThemeDefinition(id) {
    const tileTextureKeys = [];
    const assetPathByKey = {};
    for (let i = 1; i <= TILE_COUNT_PER_THEME; i++) {
        const suffix = pad2(i);
        const singularPrefix = id === "foods" ? "food" : id === "landmarks" ? "landmark" : "planet";
        const textureKey = `tile_${id}_${suffix}`;
        tileTextureKeys.push(textureKey);
        assetPathByKey[textureKey] = `/assets/tiles/${id}/${singularPrefix}_${suffix}.png`;
    }
    return {
        id,
        tileTextureKeys,
        assetPathByKey,
    };
}
export const TILE_THEMES = {
    foods: buildThemeDefinition("foods"),
    landmarks: buildThemeDefinition("landmarks"),
    planets: buildThemeDefinition("planets"),
};
export const ALL_TILE_THEME_DEFINITIONS = THEME_IDS.map((id) => TILE_THEMES[id]);
export function getThemeForLevel(level) {
    const normalizedLevel = Math.max(1, Math.floor(level));
    const index = (normalizedLevel - 1) % THEME_IDS.length;
    return THEME_IDS[index];
}
export function getTextureKeyForThemeTile(theme, tileType) {
    const keys = TILE_THEMES[theme].tileTextureKeys;
    const safeIndex = ((tileType % keys.length) + keys.length) % keys.length;
    return keys[safeIndex];
}
//# sourceMappingURL=tile-themes.js.map