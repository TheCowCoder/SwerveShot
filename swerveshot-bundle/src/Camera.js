const Vec2 = window.Vec2;
import * as PIXI from 'pixi.js';
import * as PROJECTION from 'pixi-projection';



export default class Camera {
    constructor(PPM, app) {
        this.app = app;
        this.position = Vec2(0, 0);
        this.scale = 1;
        this.angle = 0;
        this.pixelsPerMeter = PPM;

        // Create a projection container for perspective transformations
        this.container = new PROJECTION.Container2d();
        this.app.stage.addChild(this.container);
    }

    setPosition(position) {
        this.position = position;
    }

    setScale(scale) {
        this.scale = scale;
    }

    setAngle(angle) {
        this.angle = angle;
    }

    setPixelsPerMeter(ppm) {
        this.pixelsPerMeter = ppm;
    }

    applyTransform() {
        const renderer = this.app.renderer;

        // Set the pivot point to focus on the object (convert world position to pixels)
        this.cameraContainer.pivot.set(
            this.position.x * this.pixelsPerMeter,
            this.position.y * this.pixelsPerMeter
        );

        // Position the camera at the center of the screen
        this.cameraContainer.position.set(renderer.width / 2, renderer.height / 2);

        // Apply scale
        this.cameraContainer.scale.set(this.scale, this.scale);

        // Apply rotation
        this.cameraContainer.rotation = this.angle;

        // Apply perspective shift
        this.cameraContainer.proj.euler.set(
            Math.PI / 6, // Tilt the camera forward (adjust as needed)
            0,
            0
        );
    }



    screenToWorld(screen) {
        const normX = (screen.x - this.app.renderer.width / 2) / (this.scale * this.pixelsPerMeter);
        const normY = (screen.y - this.app.renderer.height / 2) / (this.scale * this.pixelsPerMeter);

        const cosAngle = Math.cos(-this.angle);
        const sinAngle = Math.sin(-this.angle);
        const rotatedX = normX * cosAngle - normY * sinAngle;
        const rotatedY = normX * sinAngle + normY * cosAngle;

        return Vec2(
            rotatedX + this.position.x,
            rotatedY + this.position.y
        );
    }

    worldToScreen(world) {
        const offsetX = world.x - this.position.x;
        const offsetY = world.y - this.position.y;

        const cosAngle = Math.cos(this.angle);
        const sinAngle = Math.sin(this.angle);
        const rotatedX = offsetX * cosAngle - offsetY * sinAngle;
        const rotatedY = offsetX * sinAngle + offsetY * cosAngle;

        return Vec2(
            rotatedX * this.scale * this.pixelsPerMeter + this.app.renderer.width / 2,
            rotatedY * this.scale * this.pixelsPerMeter + this.app.renderer.height / 2
        );
    }
}
