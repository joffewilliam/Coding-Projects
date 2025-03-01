export class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  add(v) {
    return new Vector2(this.x + v.x, this.y + v.y);
  }

  sub(v) {
    return new Vector2(this.x - v.x, this.y - v.y);
  }

  mul(scalar) {
    return new Vector2(this.x * scalar, this.y * scalar);
  }

  div(scalar) {
    return new Vector2(this.x / scalar, this.y / scalar);
  }

  mag() {
    return Math.hypot(this.x, this.y);
  }
  
  magSq() {
    return this.x * this.x + this.y * this.y;
  }

  normalize() {
    const m = this.mag();
    return m > 0 ? this.div(m) : new Vector2();
  }

  dot(v) {
    return this.x * v.x + this.y * v.y;
  }
  
    normalized() {
    const len = this.mag();
    if (len === 0) return new Vector2(0, 0);
    return this.div(len);
  }

  cross(v) {
    return this.x * v.y - this.y * v.x;
  }

  rotate90() {
    return new Vector2(-this.y, this.x);
  }
}