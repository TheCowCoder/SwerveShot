import { Vec2 } from '../shared/Vec2.js';
import * as PIXI from 'pixi.js';

function degToRad(degrees) {
    return degrees * (Math.PI / 180);
}

export default class Camera {
    constructor(PPM, app) {
        this.app = app;
        this.position = Vec2(0, 0);
        this.scale = 1;
        this.angle = 0;
        this.pixelsPerMeter = PPM;
        this.tiltAngle = degToRad(-10);

        const { width, height } = app.screen;
        this.screenWidth = width;
        this.screenHeight = height;

        // Create a container for world objects
        this.container = new PIXI.Container();

        // Create a render texture
        this.renderTexture = PIXI.RenderTexture.create({ width, height, resolution: 1 });

        // Initialize SimpleMesh
        this.mesh = this.createPerspectiveMesh();
        this.app.stage.addChild(this.mesh);

        this.setPerspective(this.tiltAngle);
    }

    createPerspectiveMesh() {
        const cols = 10;
        const rows = 10;
        const vertices = [];
        const uvs = [];
        const indices = [];

        // Generate vertices & UVs
        for (let y = 0; y <= rows; y++) {
            for (let x = 0; x <= cols; x++) {
                const u = x / cols;
                const v = y / rows;

                // Vertex positions (to be adjusted in setPerspective)
                vertices.push(u * this.screenWidth, v * this.screenHeight);
                uvs.push(u, v);
            }
        }

        // Generate indices
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const i = y * (cols + 1) + x;
                indices.push(i, i + 1, i + cols + 1);
                indices.push(i + 1, i + cols + 2, i + cols + 1);
            }
        }

        const geometry = new PIXI.Geometry()
            .addAttribute('aVertexPosition', vertices, 2)
            .addAttribute('aTextureCoord', uvs, 2)
            .addIndex(indices);

        return new PIXI.SimpleMesh({
            texture: this.renderTexture,
            geometry: geometry
        });
    }

    setPerspective(tiltAngle) {
        this.tiltAngle = tiltAngle;
        const tilt = Math.abs(tiltAngle);

        let factor = 1 / Math.cos(tilt);
        const MAX_FACTOR = 4;
        factor = Math.min(factor, MAX_FACTOR);

        const newRTWidth = this.screenWidth * factor;
        const newRTHeight = this.screenHeight * factor;
        const inwardOffset = (newRTWidth - this.screenWidth) / 2;
        const downwardOffset = newRTHeight * (1 - Math.cos(tilt));

        // Update vertices for perspective effect
        const verts = this.mesh.geometry.getBuffer('aVertexPosition').data;
        for (let i = 0; i < verts.length; i += 2) {
            const x = verts[i];
            const y = verts[i + 1];
            const yRatio = y / this.screenHeight;
            verts[i] = x - inwardOffset * (1 - yRatio);
            verts[i + 1] = y + downwardOffset * yRatio;
        }
        this.mesh.geometry.getBuffer('aVertexPosition').update();
    }

    applyTransform() {
        this.container.position.set(this.screenWidth / 2, this.screenHeight / 2);
        this.container.pivot.set(this.position.x * this.pixelsPerMeter, this.position.y * this.pixelsPerMeter);
        this.container.rotation = this.angle;
        this.container.scale.set(this.scale);
    }

    render() {
        this.app.renderer.render(this.container, {
            renderTexture: this.renderTexture,
        });
    }
}
