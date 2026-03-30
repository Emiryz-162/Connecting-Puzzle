export type TileThemeId = "foods" | "landmarks" | "planets";

export interface TileThemeDefinition {
  id: TileThemeId;
  tileTextureKeys: readonly string[];
  assetPathByKey: Record<string, string>;
}

const THEME_IDS: TileThemeId[] = ["foods", "landmarks", "planets"];
const TILE_COUNT_PER_THEME = 8;

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

function buildThemeDefinition(id: TileThemeId): TileThemeDefinition {
  const tileTextureKeys: string[] = [];
  const assetPathByKey: Record<string, string> = {};

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

export const TILE_THEMES: Record<TileThemeId, TileThemeDefinition> = {
  foods: buildThemeDefinition("foods"),
  landmarks: buildThemeDefinition("landmarks"),
  planets: buildThemeDefinition("planets"),
};

export const ALL_TILE_THEME_DEFINITIONS: TileThemeDefinition[] = THEME_IDS.map(
  (id) => TILE_THEMES[id]
);

export function getThemeForLevel(level: number): TileThemeId {
  if (level <= 10) {
    return "foods";
  }
  if (level <= 20) {
    return "landmarks";
  }
  return "planets";
}

export function getTextureKeyForThemeTile(theme: TileThemeId, tileType: number): string {
  const keys = TILE_THEMES[theme].tileTextureKeys;
  const safeIndex = ((tileType % keys.length) + keys.length) % keys.length;
  return keys[safeIndex];
}

