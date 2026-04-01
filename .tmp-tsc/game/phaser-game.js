import Phaser from "phaser";
import { BootScene } from "../scenes/BootScene";
import { GameScene } from "../scenes/GameScene";
import AmbientMenuScene from "../scenes/AmbientMenuScene";
export function createPhaserGame(parent) {
    const renderResolution = Math.min(window.devicePixelRatio || 1, 3);
    const config = {
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
    config.resolution = renderResolution;
    return new Phaser.Game(config);
}
//# sourceMappingURL=phaser-game.js.map