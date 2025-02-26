import { Vec2 } from '../shared/Vec2.js';
import * as PIXI from 'pixi.js';
import * as PIXI3D from "pixi3d/pixi7";

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


        const { width, height } = app.screen;
        this.screenWidth = width;
        this.screenHeight = height;


        this.container = new PIXI.Container();
        // app.stage.addChild(this.container);

        this.renderTexture = PIXI.RenderTexture.create({
            width: width,
            height: height
        });

        let sprite3D = new PIXI3D.Sprite3D();
        sprite3D.texture = this.renderTexture;
        sprite3D.position.set(0, 0, 0);
        // app.stage.addChild(sprite3D);
        

        // this.camera3D = PIXI3D.Camera.main;

        // this.camera3D.position.set(this.camera3D.position.x, this.camera3D.position.y - 3, this.camera3D.position.z)

    }

    render() {
        // this.app.renderer.render(this.container, { renderTexture: this.renderTexture });
    }


    setPerspective(tiltAngle) {
        // this.camera3D.rotationQuaternion.setEulerAngles(180 + tiltAngle, 0, 180);
    }


    // Update the world container’s transform.
    applyTransform() {
        this.container.position.set(this.screenWidth / 2, this.screenHeight / 2);
        this.container.pivot.set(
            this.position.x * this.pixelsPerMeter,
            this.position.y * this.pixelsPerMeter
        );
        this.container.rotation = this.angle;
        this.container.scale.set(this.scale);
        this.container.pivot.x += this.screenWidth / 2;
        this.container.pivot.y += this.screenHeight / 2;
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
