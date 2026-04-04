import { assetUrl } from "../platform/asset-url";

export const PLANET_TILE_TEXTURE_KEYS = [
  "tile_planet_01",
  "tile_planet_02",
  "tile_planet_03",
  "tile_planet_04",
  "tile_planet_05",
  "tile_planet_06",
  "tile_planet_07",
  "tile_planet_08",
] as const;

export type PlanetTileTextureKey = (typeof PLANET_TILE_TEXTURE_KEYS)[number];

export const PLANET_TILE_ASSET_PATHS: Record<PlanetTileTextureKey, string> = {
  tile_planet_01: assetUrl("assets/tiles/planets/planet_01.png"),
  tile_planet_02: assetUrl("assets/tiles/planets/planet_02.png"),
  tile_planet_03: assetUrl("assets/tiles/planets/planet_03.png"),
  tile_planet_04: assetUrl("assets/tiles/planets/planet_04.png"),
  tile_planet_05: assetUrl("assets/tiles/planets/planet_05.png"),
  tile_planet_06: assetUrl("assets/tiles/planets/planet_06.png"),
  tile_planet_07: assetUrl("assets/tiles/planets/planet_07.png"),
  tile_planet_08: assetUrl("assets/tiles/planets/planet_08.png"),
};

export interface TileThemeDefinition {
  id: string;
  tileTextureKeys: readonly PlanetTileTextureKey[];
  assetPathByKey: Record<PlanetTileTextureKey, string>;
}

export const PLANET_TILE_THEME: TileThemeDefinition = {
  id: "planets",
  tileTextureKeys: PLANET_TILE_TEXTURE_KEYS,
  assetPathByKey: PLANET_TILE_ASSET_PATHS,
};

export function getPlanetTileTextureKey(tileType: number): PlanetTileTextureKey {
  const length = PLANET_TILE_TEXTURE_KEYS.length;
  const safeIndex = ((tileType % length) + length) % length;
  return PLANET_TILE_TEXTURE_KEYS[safeIndex];
}
