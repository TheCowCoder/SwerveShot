
export function quaternionToEuler(quaternion) {
    let qx = quaternion.x;
    let qy = quaternion.y;
    let qz = quaternion.z;
    let qw = quaternion.w;

    // Roll (x-axis rotation)
    let sinr_cosp = 2 * (qw * qx + qy * qz);
    let cosr_cosp = 1 - 2 * (qx * qx + qy * qy);
    let roll = Math.atan2(sinr_cosp, cosr_cosp);

    // Pitch (y-axis rotation)
    let sinp = 2 * (qw * qy - qz * qx);
    let pitch;
    if (Math.abs(sinp) >= 1) {
        pitch = Math.sign(sinp) * Math.PI / 2; // Use 90 degrees if out of range
    } else {
        pitch = Math.asin(sinp);
    }

    // Yaw (z-axis rotation)
    let siny_cosp = 2 * (qw * qz + qx * qy);
    let cosy_cosp = 1 - 2 * (qy * qy + qz * qz);
    let yaw = Math.atan2(siny_cosp, cosy_cosp);

    return {
        x: roll * (180 / Math.PI),   // Convert to degrees
        y: pitch * (180 / Math.PI),
        z: yaw * (180 / Math.PI)
    };
}


export function degToRad(deg) {
    return deg * (Math.PI / 180);
}

export function radToDeg(radians) {
    return radians * (180 / Math.PI);
}


export class Vec2Class {
    constructor(x = 0, y = 0) {
        if (isNaN(x)) {
            this.x = x.x;
            this.y = x.y;
        } else {
            this.x = x;
            this.y = y;
        }
    }

    dot(vec) {
        return this.x * vec.x + this.y * vec.y;
    }

    distance(vec) {
        return Math.sqrt((this.x - vec.x) ** 2 + (this.y - vec.y) ** 2);
    }

    add(vec) {
        this.x += vec.x;
        this.y += vec.y;
        return this;
    }

    sub(vec) {
        this.x -= vec.x;
        this.y -= vec.y;
        return this;
    }

    mul(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        const mag = this.magnitude();
        if (mag !== 0) {
            this.x /= mag;
            this.y /= mag;
        } else {
            this.x = 0;
            this.y = 0;
        }
        return this;
    }

    clone() {
        return new Vec2Class(this.x, this.y);
    }
}

export const Vec2 = (x = 0, y = 0) => new Vec2Class(x, y);
