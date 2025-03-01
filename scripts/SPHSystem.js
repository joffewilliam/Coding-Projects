import { Vector2 } from './Vector2.js';
import { SpatialHash } from './SpatialHash.js';

export class SPHSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.particles = [];
    this.spatialHash = new SpatialHash(10, canvas); // Initialize spatial hash with cell size 10
    this.gravity = new Vector2(0, -9.81); // Gravity vector (downward in canvas coordinates)
    this.viscosity = 0.02; // Increased viscosity for smoother flow
    this.surfaceTension = 0.0728; // Example surface tension value
    this.stiffness = 1000; // Stiffness constant for pressure calculation
    this.restDensity = 1000; // Rest density for pressure calculation
    this.smoothingLength = 10; // Smoothing length for SPH kernels
    this.kernel = {
      spikyGradient: (r, rLen) => {
        if (rLen <= this.smoothingLength) {
          const h = this.smoothingLength;
          const coeff = 15 / (Math.PI * Math.pow(h, 6));
          return r.normalized().mul(coeff * Math.pow(h - rLen, 2));
        }
        return new Vector2(0, 0);
      },
      viscosityLaplacian: (rLen) => {
        if (rLen <= this.smoothingLength) {
          const h = this.smoothingLength;
          const coeff = 45 / (Math.PI * Math.pow(h, 6));
          return coeff * Math.pow(h - rLen, 2);
        }
        return 0;
      },
      poly6: (rSquared) => {
        const h = this.smoothingLength;
        const r = Math.sqrt(rSquared);
        if (r <= h) {
          const coeff = 315 / (64 * Math.PI * Math.pow(h, 9));
          return coeff * Math.pow(h * h - r * r, 3);
        }
        return 0;
      }
    };
  }

  update(dt) {
    // Update spatial hash
    this.spatialHash.clear();
    this.particles.forEach(p => this.spatialHash.insert(p));

    // Calculate densities and pressures
    this.calculateDensitiesAndPressures();

    // Calculate forces
    this.calculateForces();

    // Integrate forces to update velocities and positions
    this.particles.forEach(p => {
      p.velocity = p.velocity.add(p.force.mul(dt / p.mass)).mul(0.99); // Damping factor for stability
      p.position = p.position.add(p.velocity.mul(dt));

      // Update spatial hash
      this.spatialHash.update(p);

      // Boundary conditions (repulsive force)
      const boundaryForce = new Vector2(0, 0);
      const boundaryDamping = 0.5; // Damping factor for boundary forces
      const boundaryStrength = 100; // Strength of the boundary repulsive force

      if (p.position.x < 0) {
        boundaryForce.x += boundaryStrength * (-p.position.x);
      }
      if (p.position.x > this.canvas.width) {
        boundaryForce.x += boundaryStrength * (this.canvas.width - p.position.x);
      }
      if (p.position.y < 0) {
        boundaryForce.y += boundaryStrength * (-p.position.y);
      }
      if (p.position.y > this.canvas.height) {
        boundaryForce.y += boundaryStrength * (this.canvas.height - p.position.y);
      }

      p.force = p.force.add(boundaryForce);
      p.velocity = p.velocity.add(p.force.mul(dt / p.mass)).mul(0.99); // Damping factor for stability
      p.position = p.position.add(p.velocity.mul(dt));
    });
  }

  calculateDensitiesAndPressures() {
    this.particles.forEach(pi => {
      pi.density = 0;
      const neighbors = this.spatialHash.getNeighbors(pi);
      neighbors.forEach(pj => {
        const rSquared = pi.position.sub(pj.position).dot(pi.position.sub(pj.position));
        pi.density += pj.mass * this.kernel.poly6(rSquared);
      });
      pi.pressure = this.stiffness * (pi.density - this.restDensity);
    });
  }

  calculateForces() {
    this.particles.forEach(pi => {
      let pressureForce = new Vector2();
      let viscosityForce = new Vector2();
      let surfaceTensionForce = new Vector2();
      let normal = new Vector2();
      let curvature = 0;

      const neighbors = this.spatialHash.getNeighbors(pi);
      neighbors.forEach(pj => {
        const r = pi.position.sub(pj.position);
        const rLen = r.mag();
        if (rLen > 0 && rLen <= this.smoothingLength) {
          // Pressure force
          const pressureKernel = this.kernel.spikyGradient(r, rLen);
          pressureForce = pressureForce.add(
            pressureKernel.mul(
              -(pi.pressure + pj.pressure) / (2 * pj.density) * pj.mass
            )
          );

          // Viscosity force
          viscosityForce = viscosityForce.add(
            pj.velocity.sub(pi.velocity).mul(
              this.viscosity * this.kernel.viscosityLaplacian(rLen) / pj.density * pj.mass
            )
          );

          // Surface tension
          normal = normal.add(r.mul(this.kernel.poly6(r.dot(r)) / pj.density * pj.mass));
          curvature += this.kernel.poly6(r.dot(r)) / pj.density * pj.mass;
        }
      });

      // Normalize surface tension components
      const normalLen = normal.mag();
      if (normalLen > 0) {
        normal = normal.div(normalLen);
        curvature = Math.abs(curvature) / normalLen;
        surfaceTensionForce = normal.mul(-this.surfaceTension * curvature);
      }

      // Gravity is now applied downward (using positive Y for canvas)
      const gravityForce = this.gravity.mul(pi.mass);

      // Total force
      pi.force = pressureForce
        .add(viscosityForce)
        .add(surfaceTensionForce)
        .add(gravityForce);
    });
  }

  reset() {
    this.particles = []; // Clear particles
    this.spatialHash.clear(); // Clear spatial hash
    this.gravity = new Vector2(0, -9.81); // Reset gravity
  }

  drawForces() {
    const ctx = document.getElementById('overlayCanvas').getContext('2d');
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    this.particles.forEach(p => {
      ctx.beginPath();
      ctx.moveTo(p.position.x, p.position.y);
      ctx.lineTo(p.position.x + p.force.x * 0.1, p.position.y + p.force.y * 0.1);
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.stroke();
    });
  }
}