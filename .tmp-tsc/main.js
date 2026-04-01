import { createPhaserGame } from "./game/phaser-game";
const root = document.getElementById("game-root");
if (!root) {
    throw new Error("Root element #game-root bulunamadi!");
}
createPhaserGame(root);
//# sourceMappingURL=main.js.map