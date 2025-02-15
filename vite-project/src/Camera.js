import { Vec2 } from '../shared/Vec2.js';
import * as PIXI from 'pixi.js';
import { MeshMaterial } from '@pixi/mesh';

export default class Camera {
    constructor(PPM, app) {
        this.app = app;
        this.pixelsPerMeter = PPM;
        this.position = Vec2(0, 0);
        this.scale = 1;
        this.angle = 0;

        // Get screen dimensions.
        const { width, height } = app.screen;
        this.screenWidth = width;
        this.screenHeight = height;

        // Create a container for all world objects.
        this.container = new PIXI.Container();

        // Create a render texture the same size as the screen.
        this.renderTexture = PIXI.RenderTexture.create({ width, height });

        // Define a simple rectangle for our mesh.
        // Vertices for a quad: top-left, top-right, bottom-right, bottom-left.
        const vertices = new Float32Array([
            0,    0,     // top-left
            width, 0,     // top-right
            width, height, // bottom-right
            0,    height  // bottom-left
        ]);

        // UVs map the full texture (from 0 to 1).
        const uvs = new Float32Array([
            0, 0,
            1, 0,
            1, 1,
            0, 1
        ]);

        // Define two triangles that form the quad.
        const indices = new Uint16Array([
            0, 1, 2,
            0, 2, 3
        ]);

        // Create the mesh geometry.
        const geometry = new PIXI.MeshGeometry(vertices, uvs, indices);

        // Create the mesh material using the render texture.
        const material = new MeshMaterial(this.renderTexture);

        // Create the mesh.
        this.mesh = new PIXI.Mesh(geometry, material);

        // Position the mesh at (0,0) so it fills the screen.
        this.mesh.position.set(0, 0);

        // Add the mesh to the stage.
        app.stage.addChild(this.mesh);
    }

    /**
     * Update the transform of the world container.
     * The container is centered on the screen and its pivot is set to the camera’s world position.
     */
    applyTransform() {
        const { width, height } = this.app.screen;

        // Set the container’s pivot based on the camera’s world position.
        this.container.pivot.set(
            this.position.x * this.pixelsPerMeter,
            this.position.y * this.pixelsPerMeter
        );

        // Place the container so that the pivot aligns with the screen center.
        this.container.position.set(width / 2, height / 2);
        this.container.rotation = this.angle;
        this.container.scale.set(this.scale);
    }

    /**
     * Render the world container into the render texture.
     */
    render() {
        // Render the container into our renderTexture.
        this.app.renderer.render(this.container, {
            renderTexture: this.renderTexture,
            clear: true
        });
    }

    // Setters for camera properties:
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

    /**
     * Convert a point from screen space to world space.
     */
    screenToWorld(screen) {
        const pos = this.container.toLocal(screen, this.app.stage);
        return Vec2(pos.x / this.pixelsPerMeter, pos.y / this.pixelsPerMeter);
    }

    /**
     * Convert a point from world space to screen space.
     */
    worldToScreen(world) {
        const pos = this.container.toGlobal(
            new PIXI.Point(world.x * this.pixelsPerMeter, world.y * this.pixelsPerMeter)
        );
        return Vec2(pos.x, pos.y);
    }
}
