export default class Vec3 {
    static UP = new Vec3(0, 1, 0);

    constructor(x = 0, y = 0, z = 0) {
        if (x.x !== undefined) {
            this.x = x.x;
            this.y = x.y;
            this.z = x.z
                ;
        } else {
            this.x = x;
            this.y = y;
            this.z = z;
        }

    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }

    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }

    mul(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        this.z *= scalar;
        return this;
    }

    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    cross(v) {
        const x = this.y * v.z - this.z * v.y;
        const y = this.z * v.x - this.x * v.z;
        const z = this.x * v.y - this.y * v.x;
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    magnitude() {
        return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2);
    }

    normalize() {
        const mag = this.magnitude();
        if (mag !== 0) {
            this.scale(1 / mag);
        }
        return this;
    }

    toString() {
        return `Vec3(${this.x}, ${this.y}, ${this.z})`;
    }
}
