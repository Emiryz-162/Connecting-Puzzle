import Phaser from "phaser";
import { BootScene } from "../scenes/BootScene";
import { GameScene } from "../scenes/GameScene";

export function createPhaserGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#1a1a2e",
    scene: [BootScene, GameScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: window.innerWidth,
      height: window.innerHeight,
      autoCenter: Phaser.Scale.NO_CENTER,
    },
    input: {
      activePointers: 3,
    },
    render: {
      antialias: true,
      pixelArt: false,
    },
  });
}
