import { Vec2 } from '../shared/Vec2.js';
import * as PIXI from 'pixi.js';

function degToRad(degrees) {
    return degrees * (Math.PI / 180);
}


const MAX_FACTOR = 2.0;

const vertexShader = `
precision mediump float;

attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;

uniform mat3 projectionMatrix;
uniform vec2 uResolution; // Screen resolution
uniform vec2 uTopLeftOffset;  // (Inward, Downward) shift for top-left
uniform vec2 uTopRightOffset; // (Inward, Downward) shift for top-right

varying vec2 vTextureCoord;

void main() {
    vec2 position = aVertexPosition;

    // Normalized Y position (0 at bottom, 1 at top)
    float yFactor = (1.0 - (position.y / uResolution.y));

    // Apply perspective tilt to top corners
    if (position.y > uResolution.y * 0.5) {
        float xOffset = mix(0.0, uTopLeftOffset.x, 1.0 - (position.x / uResolution.x));
        float yOffset = mix(0.0, uTopLeftOffset.y, yFactor);
        position.x += xOffset;
        position.y += yOffset;
    }

    gl_Position = vec4((projectionMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);
    vTextureCoord = aTextureCoord;
}

`;

const fragmentShader = `
precision mediump float;

varying vec2 vTextureCoord;
uniform sampler2D uSampler;

void main() {
    gl_FragColor = texture2D(uSampler, vTextureCoord);
}

`;
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

        // Create a render texture sized to the screen.
        this.renderTexture = PIXI.RenderTexture.create({
            width: width,
            height: height,
        });

        // Create a sprite to display the rendered world.
        // Anchor at bottom-center (like the original mesh).
        this.sprite = new PIXI.Sprite(this.renderTexture);
        this.sprite.anchor.set(0.5, 1);         // Anchor bottom-center.
        this.sprite.position.set(width / 2, height); // Position so the bottom is at screen bottom.


        // Create the custom perspective filter (shader).
        // The uniforms topInset and topShift are set by setPerspective().
        this.perspectiveFilter = new PIXI.Filter(vertexShader, fragmentShader, {
            uResolution: [width, height],
            uTopLeftOffset: [300, 400],  // Move top-left inward and downward
            uTopRightOffset: [300, 400]  // Move top-right inward and downward
        });
        this.sprite.filters = [this.perspectiveFilter];

        // Add the sprite to the stage.
        app.stage.addChild(this.sprite);

        // Set an initial perspective using a tilt of -10°.
        this.setPerspective(degToRad(-30));
    }

    // setPerspective calculates uniform values from the tilt angle.
    // A factor is computed similar to 1/cos(tilt) (clamped to MAX_FACTOR)
    // and then used to derive a normalized inset and vertical shift.
    setPerspective(tiltAngle) {
        const factor = Math.min(1 / Math.cos(tiltAngle), MAX_FACTOR);
        const offsetX = (factor - 1) * this.screenWidth * 0.5;
        const offsetY = (factor - 1) * this.screenHeight * 0.5;

        console.log(offsetX, offsetY);
        this.perspectiveFilter.uTopLeftOffset = [offsetX, offsetY];
        this.perspectiveFilter.uTopRightOffset = [-offsetX, offsetY];
    }


    // Update the world container’s transform.
    applyTransform() {
        const { width, height } = this.app.screen;
        this.container.position.set(width / 2, height / 2);
        this.container.pivot.set(
            this.position.x * this.pixelsPerMeter,
            this.position.y * this.pixelsPerMeter
        );
        this.container.rotation = this.angle;
        this.container.scale.set(this.scale);
        this.container.pivot.x += width / 2;
        this.container.pivot.y += height / 2;
    }

    // Render the world container into the render texture.
    render() {
        this.app.renderer.render(this.container, {
            renderTexture: this.renderTexture,
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
