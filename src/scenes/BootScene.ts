import Phaser from "phaser";
import { GameScene } from "./GameScene";
import { PLANET_TILE_THEME } from "../themes/planet-theme";

export class BootScene extends Phaser.Scene {
  public static readonly SCENE_KEY = "BootScene";

  constructor() {
    super(BootScene.SCENE_KEY);
  }

  preload(): void {
    for (const textureKey of PLANET_TILE_THEME.tileTextureKeys) {
      if (!this.textures.exists(textureKey)) {
        this.load.image(textureKey, PLANET_TILE_THEME.assetPathByKey[textureKey]);
      }
    }
  }

  create(): void {
    this.scene.start(GameScene.SCENE_KEY);
  }
}
