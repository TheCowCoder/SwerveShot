
import Vec3 from "./Vec3.js";
import * as HELPERS from "../shared/HELPERS.js";
import qte from "quaternion-to-euler";

export default class Camera3D {
    constructor(camera3D, target) {
        this.camera3D = camera3D;
        this.target = target;

        this.position = new Vec3(0, 25, 0);
        this.rotation = new Vec3(-90, 0, 180);

        this.camera3D.position.set(this.position.x, this.position.y, this.position.z);
        this.camera3D.rotationQuaternion.setEulerAngles(this.rotation.x, this.rotation.y, this.rotation.z);

        this.targetDistance = 25;
        this.target2DYOffset = 7.5;
    }


    setRotation(euler) {
        this.rotation = euler;
        this.camera3D.rotationQuaternion.setEulerAngles(euler.x, euler.y, euler.z);
    }

    setPosition(pos) {
        this.camera3D.position.set(pos.x, pos.y, pos.z);
    }

    update() {
        let cameraTiltAngle = HELPERS.degToRad(this.rotation.x + 180);

        let yOffset = this.targetDistance * Math.sin(cameraTiltAngle);
        let zOffset = this.targetDistance * Math.cos(cameraTiltAngle);

        let cameraDest = new Vec3(this.target.position.x, this.target.position.y, this.target.position.z);

        // let carForward = new Vec3(Math.sin(ourCar.angle), 0, -Math.cos(ourCar.angle));
        let targetForward = new Vec3(this.target.worldTransform.forward);
        // console.log(this.target.worldTransform);

        cameraDest.sub(targetForward.mul(zOffset));
        cameraDest.add(new Vec3(0, yOffset, 0));


        const matrix = this.camera3D.worldTransform;

        let downVector = new Vec3(matrix.down.x, matrix.down.y, matrix.down.z);

        cameraDest.sub(downVector.mul(this.target2DYOffset));

        this.setPosition(cameraDest);

        let targetAngle = HELPERS.quaternionToEuler(this.target.rotationQuaternion);

        this.setRotation(new Vec3(this.rotation.x, targetAngle.y, this.rotation.z));

    }
}