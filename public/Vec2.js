// Vec2.js
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

    add(vec) {
        return new Vec2Class(this.x + vec.x, this.y + vec.y);
    }

    sub(vec) {
        return new Vec2Class(this.x - vec.x, this.y - vec.y);
    }

    mul(scalar) {
        return new Vec2Class(this.x * scalar, this.y * scalar);
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        const mag = this.magnitude();
        return mag === 0 ? new Vec2Class(0, 0) : new Vec2Class(this.x / mag, this.y / mag);
    }

    clone() {
        return new Vec2Class(this.x, this.y);
    }
}

export const Vec2 = (x = 0, y = 0) => new Vec2Class(x, y);
