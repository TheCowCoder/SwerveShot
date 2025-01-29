
export default class Renderer {
    constructor(game, FPS) {
        this.game = game;
        this.dt = 1 / FPS;

        this.elapsedTime = 0;
        this.accumulator = 0;

        this.currentTime = performance.now();

        this.lastUpdateTime = performance.now();

        this.fpsHistory = [];
        this.fpsHistorySize = 10;

        this.running = true;


        this.animate = this.animate.bind(this);
        this.animate(performance.now());


        this.alpha = 0;

    }

    stop() {
        this.running = false;
    }

    calculateAverageFPS(fps) {
        this.fpsHistory.push(fps);
        if (this.fpsHistory.length > this.fpsHistorySize) {
            this.fpsHistory.shift();
        }
        const avgFps = this.fpsHistory.reduce((sum, value) => sum + value, 0) / this.fpsHistory.length;
        return avgFps.toFixed(2);
    }

    animate(timeTest) {
        let newTime = performance.now();
        let frameTime = (newTime - this.currentTime) / 1000;

        if (frameTime > 0.25) {
            frameTime = 0.25;
        }

        this.currentTime = newTime;
        this.accumulator += frameTime;
        while (this.accumulator >= this.dt) {
            let updateTime = (newTime - this.lastUpdateTime) / 1000;
            this.lastUpdateTime = newTime;

            if (updateTime > 0) {
                const fps = 1 / updateTime;
                const avgfps = this.calculateAverageFPS(fps);
                console.log(avgfps);
            }

            this.elapsedTime += this.dt;
            this.accumulator -= this.dt;

            this.game.step(updateTime);

            this.alpha = 0;
        }

        if (this.running) setImmediate(this.animate);
    }
}