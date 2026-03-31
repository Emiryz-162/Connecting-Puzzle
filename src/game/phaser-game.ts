import Phaser from "phaser";
import { BootScene } from "../scenes/BootScene";
import { GameScene } from "../scenes/GameScene";
import AmbientMenuScene from "../scenes/AmbientMenuScene";

export function createPhaserGame(parent: HTMLElement): Phaser.Game {
  const renderResolution = Math.min(window.devicePixelRatio || 1, 3);

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent,
    autoRound: true,
    backgroundColor: "#1a1a2e",
    scene: [BootScene, GameScene, AmbientMenuScene],
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
  };

  (config as Phaser.Types.Core.GameConfig & { resolution: number }).resolution = renderResolution;
  return new Phaser.Game(config);
}
