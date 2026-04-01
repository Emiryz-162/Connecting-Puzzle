import * as Phaser from 'phaser';
export default class AmbientMenuScene extends Phaser.Scene {
    constructor() {
        super('AmbientMenuScene');
        this.currentTheme = 'foods';
    }
    init(data) {
        this.currentTheme = data.theme || 'foods';
    }
    create() {
        const { width, height } = this.scale;
        const palettes = {
            foods: { top: 0xffd1dc, bottom: 0xffb6c1 },
            landmarks: { top: 0x87ceeb, bottom: 0xe0f6ff },
            planets: { top: 0x191970, bottom: 0x483d8b }
        };
        const colors = palettes[this.currentTheme];
        this.background = this.add.graphics();
        this.background.fillGradientStyle(colors.top, colors.top, colors.bottom, colors.bottom, 1);
        this.background.fillRect(0, 0, width, height);
        this.createVibeParticles(width, height);
    }
    createVibeParticles(width, height) {
        let gfx = this.make.graphics({ x: 0, y: 0 }, false);
        gfx.fillStyle(0xffffff, 1);
        gfx.fillCircle(10, 10, 10);
        gfx.generateTexture('ambient-circle', 20, 20);
        if (this.currentTheme === 'foods') {
            this.add.particles(0, -50, 'ambient-circle', {
                x: { min: 0, max: width },
                y: 0,
                lifespan: 12000,
                speedY: { min: 15, max: 40 },
                speedX: { min: -10, max: 10 },
                scale: { min: 1, max: 3 },
                alpha: { start: 0.3, end: 0 },
                tint: [0xffffff, 0xffa07a, 0xff69b4, 0xffe4e1],
                frequency: 1200,
                blendMode: 'NORMAL'
            });
        }
        else if (this.currentTheme === 'landmarks') {
            this.add.particles(width + 100, 0, 'ambient-circle', {
                y: { min: height * 0.1, max: height * 0.7 },
                lifespan: 20000,
                speedX: { min: -10, max: -30 },
                scale: { min: 4, max: 8 },
                alpha: 0.1,
                frequency: 3000
            });
        }
        else if (this.currentTheme === 'planets') {
            this.add.particles(0, 0, 'ambient-circle', {
                x: { min: 0, max: width },
                y: { min: 0, max: height },
                lifespan: { min: 2000, max: 4000 },
                scale: { start: 0.2, end: 0.8 },
                alpha: { start: 0, end: 0.6 },
                frequency: 300,
                blendMode: 'ADD',
                tint: [0xffffff, 0xadd8e6, 0xffe4b5]
            });
        }
    }
}
//# sourceMappingURL=AmbientMenuScene.js.map