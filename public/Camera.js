import { Vec2 } from './Vec2.js';

export default class Camera {
    constructor(PPM) {
        this.position = Vec2(0, 0);
        this.scale = 1;
        this.angle = 0;
        this.pixelsPerMeter = PPM;
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

    applyTransform(ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transformations
        ctx.translate(-this.position.x * this.pixelsPerMeter, -this.position.y * this.pixelsPerMeter);
        ctx.rotate(this.angle);
        ctx.scale(this.scale, this.scale);
    }

    screenToWorld(screen) {
        const scaledX = screen.x / (this.scale * this.pixelsPerMeter);
        const scaledY = screen.y / (this.scale * this.pixelsPerMeter);

        const cosAngle = Math.cos(-this.angle);
        const sinAngle = Math.sin(-this.angle);
        const rotatedX = scaledX * cosAngle - scaledY * sinAngle;
        const rotatedY = scaledX * sinAngle + scaledY * cosAngle;

        return Vec2(
            rotatedX + this.position.x,
            rotatedY + this.position.y,
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
            rotatedX * this.scale * this.pixelsPerMeter,
            rotatedY * this.scale * this.pixelsPerMeter,
        );
    }
}
