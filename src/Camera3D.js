
import Vec3 from "./Vec3.js";
import * as HELPERS from "../shared/HELPERS.js";

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
        // let cameraTiltAngle = HELPERS.degToRad(this.rotation.x + 180);
        let tiltAngle = HELPERS.degToRad(this.tiltAngle + 90);
        let upOffset = this.targetDistance * Math.sin(tiltAngle);
        let backOffset = this.targetDistance * Math.cos(tiltAngle);

        let cameraDest = new Vec3(this.target.position.x, this.target.position.y, this.target.position.z);

        // let carForward = new Vec3(Math.sin(ourCar.angle), 0, -Math.cos(ourCar.angle));
        let targetForward = new Vec3(this.target.worldTransform.down).mul(-1);
        // console.log(this.target.worldTransform);

        cameraDest.sub(targetForward.mul(backOffset));
        // cameraDest.sub(targetForward.mul(6));

        cameraDest.add(new Vec3(0, upOffset, 0));
        // cameraDest.add(new Vec3(0, 25, 0));


        // const matrix = this.camera3D.worldTransform;

        // let downVector = new Vec3(matrix.down.x, matrix.down.y, matrix.down.z);

        // cameraDest.sub(downVector.mul(this.target2DYOffset));

        this.setPosition(cameraDest);

        // let targetAngle = HELPERS.quaternionToEuler(this.target.rotationQuaternion);

        // this.setRotation(new Vec3(this.rotation.x, targetAngle.y, this.rotation.z));

    }
}