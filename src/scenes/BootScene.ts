import Phaser from "phaser";
import { GameScene } from "./GameScene";

export class BootScene extends Phaser.Scene {
  public static readonly SCENE_KEY = "BootScene";

  constructor() {
    super(BootScene.SCENE_KEY);
  }

  create(): void {
    this.scene.start(GameScene.SCENE_KEY);
  }
}
