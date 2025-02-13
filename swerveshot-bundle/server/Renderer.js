export default class Renderer {
    constructor(game, FPS) {
        this.game = game;
        this.targetFPS = FPS; // Target FPS, 60 by default
        this.dt = 1 / FPS;    // Fixed time step per frame
        this.elapsedTime = 0;
        this.accumulator = 0;

        this.currentTime = performance.now();
        this.lastUpdateTime = performance.now();

        this.running = true;

        this.animate = this.animate.bind(this);
        this.animate(this.currentTime);

        this.alpha = 0;

        // Add a timer to log FPS every second
        this.lastLogTime = this.currentTime;
    }

    stop() {
        this.running = false;
    }

    animate(timeTest) {
        let newTime = performance.now();
        let frameTime = (newTime - this.currentTime) / 1000; // Convert to seconds

        if (frameTime > 0.25) {
            frameTime = 0.25; // Cap frameTime to prevent huge jumps
        }

        this.currentTime = newTime;
        this.accumulator += frameTime;

        // Ensure we process enough updates based on the target FPS
        while (this.accumulator >= this.dt) {
            let updateTime = (newTime - this.lastUpdateTime) / 1000; // Time since last update in seconds
            this.lastUpdateTime = newTime;

            // Calculate FPS for debugging purposes and log every second
            const fps = 1 / updateTime;
            const now = performance.now();

            if (now - this.lastLogTime >= 1000) { // 1000ms = 1 second
                // console.log(`FPS: ${fps.toFixed(2)}`);
                this.lastLogTime = now; // Update last log time
            }

            this.elapsedTime += this.dt;
            this.accumulator -= this.dt;

            // Run game logic (you can add the actual game step logic here)
            this.game.step(frameTime);

            // Reset alpha if needed (used in interpolation or other things)
            this.alpha = 0;
        }

        // Use a fixed interval (60 FPS here) to smooth out the update loop
        if (this.running) setTimeout(this.animate, 1000 / this.targetFPS); // 60 FPS target
    }
}
