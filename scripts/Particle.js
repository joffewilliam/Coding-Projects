import { Vector2 } from './Vector2.js';

export class Particle {
  constructor(position, velocity, mass = 5) {
    this.position = position;
    this.velocity = velocity;
    this.force = new Vector2(0, 0);
    this.mass = mass;
    this.density = 0;
    this.pressure = 0;
  }
}