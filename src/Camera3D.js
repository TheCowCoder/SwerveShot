
import Vec3 from "./Vec3.js";
import * as HELPERS from "../shared/HELPERS.js";
import * as PIXI3D from "pixi3d/pixi7";
import * as CONSTANTS from "../shared/CONSTANTS.js";

export default class Camera3D {
    constructor(camera3D, target, app) {
        this.camera3D = camera3D;
        this.target = target;
        this.app = app;

        this.position = new Vec3(0, 25, 0);
        this.rotation = new Vec3(-90, 0, 180);

        this.setPosition(this.position);
        this.setRotation(this.rotation);

        this.targetDistance = 25;
        this.screenYOffset = 0.5;

        this.tiltAngle = 0;
    }


    setRotation(euler) {
        this.rotation = euler;
        this.camera3D.rotationQuaternion.setEulerAngles(euler.x, euler.y, euler.z);
    }

    setPosition(pos) {
        this.camera3D.position.set(pos.x, pos.y, pos.z);
    }
    update() {
        // 1) Compute the full camera orientation (including tilt)
        const angles = new Vec3(
          this.rotation.x + this.tiltAngle,
          -this.target.rotationEuler.y,
          this.rotation.z
        );
        const rotQuat = PIXI3D.Quat.fromEuler(
          angles.x,
          angles.y,
          angles.z,
          new Float32Array(4)
        );
    
        // 2) Compute the forward direction (what the camera is looking along)
        const forward = PIXI3D.Vec3.transformQuat(
          PIXI3D.Vec3.set(0, 0, 1, new Float32Array(3)),
          rotQuat,
          new Float32Array(3)
        );
    
        // 3) Compute the camera’s LOCAL up-vector in world space
        const cameraUp = PIXI3D.Vec3.transformQuat(
          PIXI3D.Vec3.set(0, 1, 0, new Float32Array(3)),
          rotQuat,
          new Float32Array(3)
        );
    
        // 4) Build the *pivot* point by taking the car’s world-position
        //    and nudging it up along the camera’s up-vector
        const carPos = PIXI3D.Vec3.set(
          this.target.x,
          this.target.y,
          this.target.z,
          new Float32Array(3)
        );

        let screenHeightMeters = this.app.renderer.height / CONSTANTS.SCALE;

        console.log("SCREEN HEIGHT", screenHeightMeters);

        const pivot = PIXI3D.Vec3.add(
          carPos,
          PIXI3D.Vec3.scale(cameraUp, screenHeightMeters * (0.5 - this.screenYOffset), new Float32Array(3)),
          new Float32Array(3)
        );
    
        // 5) Position the camera `distance` units back from that pivot, along forward
        const camPos = PIXI3D.Vec3.subtract(
          pivot,
          PIXI3D.Vec3.scale(forward, this.targetDistance, new Float32Array(3)),
          new Float32Array(3)
        );
    
        // 6) Apply to the actual camera
        this.camera3D.position.set(camPos[0], camPos[1], camPos[2]);
        this.camera3D.rotationQuaternion.set(
          rotQuat[0],
          rotQuat[1],
          rotQuat[2],
          rotQuat[3]
        );
    }
    }