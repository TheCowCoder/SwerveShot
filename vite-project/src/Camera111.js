import { Vec2 } from '../shared/Vec2.js';
import * as PIXI from 'pixi.js';
import { PerspectiveMesh } from 'pixi.js';

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

        // Create a container for world objects.
        this.container = new PIXI.Container();

        const { width, height } = app.screen;
        this.screenWidth = width;
        this.screenHeight = height;

        // Initially, we'll set up a default renderTexture.
        // It will be recalculated when setPerspective is called.
        this.rtWidth = width;  // placeholder
        this.rtHeight = height; // placeholder

        // Create the render texture (will update later in setPerspective).
        const renderTexture = PIXI.RenderTexture.create({ width: this.rtWidth, height: this.rtHeight });
        
        // Create and add the PerspectiveMesh.
        this.mesh = app.stage.addChild(
            new PerspectiveMesh({
                texture: renderTexture,
                pivot: { x: this.rtWidth / 2, y: this.rtHeight / 2 },
                x: width / 2,
                y: height / 2,
                width: this.rtWidth,
                height: this.rtHeight,
                // columns: 100,
                // rows: 100
            })
        );

        // This will also compute our yOffset.
        this.setPerspective(degToRad(-10));
    }
    setPerspective(tiltAngle) {
        this.tiltAngle = tiltAngle;
        const tilt = Math.abs(tiltAngle);
        
        // Normally, we'd use a factor = 1/cos(tilt). However, as tilt approaches 90°,
        // this factor becomes huge. So we clamp it to a maximum value.
        let factor = 1 / Math.cos(tilt);
        const MAX_FACTOR = 4; // Adjust this maximum based on your desired effect and limits.
        factor = Math.min(factor, MAX_FACTOR);
        
        // Compute new render texture dimensions.
        const newRTWidth = this.screenWidth * factor;
        const newRTHeight = this.screenHeight * factor;
        
        // The horizontal inset so that the top edge appears narrower.
        const inwardOffset = (newRTWidth - this.screenWidth) / 2;
        // The top edge should also be moved downward.
        const downwardOffset = newRTHeight * (1 - Math.cos(tilt));
        
        this.rtWidth = newRTWidth;
        this.rtHeight = newRTHeight;
        
        // Create a new render texture with the computed dimensions.
        this.mesh.texture = PIXI.RenderTexture.create({ 
            width: newRTWidth, 
            height: newRTHeight, 
            resolution: 5
        });
        
        // For bottom anchoring, set the pivot to the bottom center.
        this.mesh.pivot.set(newRTWidth / 2, newRTHeight);
        // Position the mesh so its bottom edge is exactly at the screen’s bottom.
        this.mesh.x = this.screenWidth / 2;
        this.mesh.y = this.screenHeight;
        
        this.width = newRTWidth;
        this.height = newRTHeight;
        
        // Set up the perspective mesh’s four corners.
        // The top edge is inset horizontally by inwardOffset and moved down by downwardOffset.
        this.outPoints = [
            Vec2(inwardOffset, downwardOffset),                // Top-left.
            Vec2(newRTWidth - inwardOffset, downwardOffset),     // Top-right.
            Vec2(newRTWidth, newRTHeight),                       // Bottom-right.
            Vec2(0, newRTHeight)                                 // Bottom-left.
        ];
        
        this.mesh.setCorners(
            Math.round(this.outPoints[0].x), Math.round(this.outPoints[0].y),
            Math.round(this.outPoints[1].x), Math.round(this.outPoints[1].y),
            Math.round(this.outPoints[2].x), Math.round(this.outPoints[2].y),
            Math.round(this.outPoints[3].x), Math.round(this.outPoints[3].y)
        );
        
        // Compute vertical offset correction for the container’s transform.
        this.yOffset = (newRTHeight - this.screenHeight) / 2;
    }
    
    applyTransform() {
        const { width, height } = this.app.screen;
        // Position the container so its center is at (rtWidth/2, rtHeight/2) adjusted by yOffset.
        this.container.position.set(this.rtWidth / 2, this.rtHeight / 2 + this.yOffset);

        // Set pivot so that the container’s contents are moved relative to the
        // “world” coordinate (scaled by pixels per meter).
        this.container.pivot.set(
            this.position.x * this.pixelsPerMeter,
            this.position.y * this.pixelsPerMeter
        );
        
        this.container.rotation = this.angle;
        this.container.scale.set(this.scale);

        // Adjust the pivot to be relative to screen center.
        this.container.pivot.x += width / 2;
        this.container.pivot.y += height / 2;
    }

    render() {
        // Render the world container into the mesh’s texture.
        this.app.renderer.render(this.container, {
            renderTexture: this.mesh.texture,
        });
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

    screenToWorld(screen) {
        const pos = this.container.toLocal(screen, this.app.stage);
        return Vec2(pos.x / this.pixelsPerMeter, pos.y / this.pixelsPerMeter);
    }

    worldToScreen(world) {
        const pos = this.container.toGlobal(new PIXI.Point(world.x * this.pixelsPerMeter, world.y * this.pixelsPerMeter));
        return Vec2(pos.x, pos.y);
    }
}
