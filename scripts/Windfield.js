import { Vector2 } from './Vector2.js';

 export class WindField {
  constructor(gl) {
    this.gl = gl; // Store the WebGL context
    this.field = [];
    this.resolution = 32;
    this.initField();
  }

  initField() {
    const cols = Math.ceil(this.gl.canvas.width / this.resolution);
    const rows = Math.ceil(this.gl.canvas.height / this.resolution);

    this.field = new Array(cols);
    for (let x = 0; x < cols; x++) {
      this.field[x] = new Array(rows);
      for (let y = 0; y < rows; y++) {
        this.field[x][y] = new Vector2();
      }
    }
  }

  addWind(start, end, strength) {
    const direction = end.sub(start).normalize();
    const length = start.sub(end).mag();

    for (let x = 0; x < this.field.length; x++) {
      for (let y = 0; y < this.field[x].length; y++) {
        const pos = new Vector2(
          x * this.resolution,
          y * this.resolution
        );

        const dist = pos.sub(start).cross(direction) / length;
        if (Math.abs(dist) < this.resolution) {
          const t = pos.sub(start).dot(direction) / length;
          if (t >= 0 && t <= 1) {
            const falloff = Math.cos(dist / this.resolution * Math.PI / 2);
            this.field[x][y] = this.field[x][y].add(direction.mul(strength * falloff));
          }
        }
      }
    }
  }

  getWind(position) {
    const x = Math.floor(position.x / this.resolution);
    const y = Math.floor(position.y / this.resolution);

    if (x >= 0 && x < this.field.length && y >= 0 && y < this.field[x].length) {
      return this.field[x][y];
    }
    return new Vector2();
  }
  
  reset() {
        this.windForces = []; // Clear wind forces
    }
}