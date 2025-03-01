// ========================
// Advanced Boundary Handling
// ========================

import { Vector2 } from './Vector2.js';

export class BoundaryHandler {
  constructor(canvas) {
    this.canvas = canvas;
    this.boundaries = [];
    this.initDefaultBoundaries();
  }

  initDefaultBoundaries() {
    // Add canvas edges as boundaries
    this.addBoundary(new Vector2(0, 0), new Vector2(this.canvas.width, 0)); // Top
    this.addBoundary(new Vector2(this.canvas.width, 0), new Vector2(this.canvas.width, this.canvas.height)); // Right
    this.addBoundary(new Vector2(this.canvas.width, this.canvas.height), new Vector2(0, this.canvas.height)); // Bottom
    this.addBoundary(new Vector2(0, this.canvas.height), new Vector2(0, 0)); // Left
  }

  addBoundary(start, end) {
    this.boundaries.push({
      start,
      end,
      normal: end.sub(start).normalize().rotate90(), // Use rotate90 here
      elasticity: 0.5,
      friction: 0.5
    });
  }

  handleCollisions(particles) {
    particles.forEach(p => {
      this.boundaries.forEach(b => {
        const toParticle = p.position.sub(b.start);
        const edgeLength = b.end.sub(b.start).mag();
        const projection = toParticle.dot(b.end.sub(b.start).normalize());

        if (projection > 0 && projection < edgeLength) {
          const distance = Math.abs(toParticle.cross(b.end.sub(b.start).normalize()));

          if (distance < p.radius) {
            // Collision response
            const penetration = p.radius - distance;
            const velocityNormal = p.velocity.dot(b.normal);

            if (velocityNormal < 0) {
              // Position correction
              p.position = p.position.add(b.normal.mul(penetration));

              // Velocity reflection
              const normalImpulse = -velocityNormal * (1 + b.elasticity);
              const tangentImpulse = -p.velocity.dot(b.end.sub(b.start).normalize()) * b.friction;

              p.velocity = p.velocity
                .add(b.normal.mul(normalImpulse))
                .add(b.end.sub(b.start).normalize().mul(tangentImpulse));
            }
          }
        }
      });
    });
  }
}