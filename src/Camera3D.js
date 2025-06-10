
import Vec3 from "./Vec3.js";
import * as HELPERS from "../shared/HELPERS.js";
import * as PIXI3D from "pixi3d/pixi7";

export default class Camera3D {
    constructor(camera3D, target) {
        this.camera3D = camera3D;
        this.target = target;

        this.position = new Vec3(0, 25, 0);
        this.rotation = new Vec3(-90, 0, 180);

        this.setPosition(this.position);
        this.setRotation(this.rotation);

        this.targetDistance = 25;
        this.target2DYOffset = 7.5;

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
        // Calculate tilt and offsets
        let tiltAngle = HELPERS.degToRad(this.tiltAngle + 90);
        let upOffset = this.targetDistance * Math.sin(tiltAngle);
        let backOffset = this.targetDistance * Math.cos(tiltAngle);

        // Initialize camera destination
        let cameraDest = new Vec3(this.target.position.x, this.target.position.y, this.target.position.z);

        // Calculate target forward direction
        let targetForward = new Vec3(this.target.worldTransform.down).mul(-1);

        // Adjust camera destination based on target's forward direction and offsets
        cameraDest.sub(targetForward.mul(backOffset));
        cameraDest.add(new Vec3(0, upOffset, 0));

        // Set camera position
        this.setPosition(cameraDest);

        let eye = new PIXI3D.Point3D(cameraDest.x, cameraDest.y, cameraDest.z);
        let target = new PIXI3D.Point3D(this.target.position.x, this.target.position.y, this.target.position.z);
        let up = new PIXI3D.Point3D(0, 1, 0);

        let cameraMatrix = new PIXI3D.Matrix4x4();

        PIXI3D.Matrix4x4.targetTo(eye, target, up, cameraMatrix);

        // this.camera3D.transform.setFromMatrix(cameraMatrix);
        // this.camera3D.transform.lookAt(
        //     new PIXI3D.Point3D(cameraDest.x, cameraDest.y, cameraDest.z),
        //     new PIXI3D.Point3D(this.target.position.x, this.target.position.y, this.target.position.z),
        //     new PIXI3D.Point3D(0, 1, 0) // Up vector
        // );
    }
}