const Vec2 = window.Vec2;

export default class Camera {
    constructor(PPM, canvas) {
        this.canvas = canvas;
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
        ctx.translate(this.canvas.width / 2, this.canvas.height / 2); // Move to center
        ctx.scale(this.scale, this.scale); // Apply scale
        ctx.rotate(this.angle); // Apply rotation
        ctx.translate(-this.canvas.width / 2, -this.canvas.height / 2); // Move back to top-left corner
        ctx.translate(-this.position.x * this.pixelsPerMeter, -this.position.y * this.pixelsPerMeter); // Apply camera position
    }

    screenToWorld(screen) {
        // Convert screen to normalized coordinates relative to center
        const normX = (screen.x - this.canvas.width / 2) / (this.scale * this.pixelsPerMeter);
        const normY = (screen.y - this.canvas.height / 2) / (this.scale * this.pixelsPerMeter);

        // Rotate in the opposite direction
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
        // Offset relative to camera position
        const offsetX = world.x - this.position.x;
        const offsetY = world.y - this.position.y;

        // Apply rotation
        const cosAngle = Math.cos(this.angle);
        const sinAngle = Math.sin(this.angle);
        const rotatedX = offsetX * cosAngle - offsetY * sinAngle;
        const rotatedY = offsetX * sinAngle + offsetY * cosAngle;

        // Scale and shift back to screen space
        return Vec2(
            rotatedX * this.scale * this.pixelsPerMeter + this.canvas.width / 2,
            rotatedY * this.scale * this.pixelsPerMeter + this.canvas.height / 2
        );
    }
}
