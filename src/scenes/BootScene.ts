import Phaser from "phaser";
import { GameScene } from "./GameScene";
import { ALL_TILE_THEME_DEFINITIONS } from "../themes/tile-themes";
import { SPECIAL_ASSET_PATHS, SPECIAL_TEXTURE_KEYS } from "../themes/special-assets";

export class BootScene extends Phaser.Scene {
  public static readonly SCENE_KEY = "BootScene";

  constructor() {
    super(BootScene.SCENE_KEY);
  }

  preload(): void {
    for (const theme of ALL_TILE_THEME_DEFINITIONS) {
      for (const textureKey of theme.tileTextureKeys) {
        if (!this.textures.exists(textureKey)) {
          this.load.image(textureKey, theme.assetPathByKey[textureKey]);
        }
      }
    }

    if (!this.textures.exists(SPECIAL_TEXTURE_KEYS.monkey)) {
      this.load.image(SPECIAL_TEXTURE_KEYS.monkey, SPECIAL_ASSET_PATHS[SPECIAL_TEXTURE_KEYS.monkey]);
    }
    if (!this.textures.exists(SPECIAL_TEXTURE_KEYS.iceOverlay)) {
      this.load.image(
        SPECIAL_TEXTURE_KEYS.iceOverlay,
        SPECIAL_ASSET_PATHS[SPECIAL_TEXTURE_KEYS.iceOverlay]
      );
    }
    if (!this.textures.exists(SPECIAL_TEXTURE_KEYS.foodsBackground)) {
      this.load.image(
        SPECIAL_TEXTURE_KEYS.foodsBackground,
        SPECIAL_ASSET_PATHS[SPECIAL_TEXTURE_KEYS.foodsBackground]
      );
    }
  }

  create(): void {
    this.scene.start(GameScene.SCENE_KEY);
  }
}
