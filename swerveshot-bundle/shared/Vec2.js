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
