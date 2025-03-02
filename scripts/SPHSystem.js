import { Vector2 } from './Vector2.js';
import { SpatialHash } from './SpatialHash.js';

export class SPHSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.particles = [];
    this.spatialHash = new SpatialHash(10, canvas); // Initialize spatial hash with cell size 10
    // Gravity now pulls downward (negative Y) so particles fall toward bottom of canvas
    this.gravity = new Vector2(0, -9.81); 
    this.viscosity = 0.02; // Increased viscosity for smoother flow
    this.surfaceTension = 0.0728; // Example surface tension value
    this.stiffness = 100; // Lowered stiffness reduces the magnitude of pressure forces
    this.restDensity = 500; // Rest density for pressure calculation
    this.smoothingLength = 10; // Smoothing length for SPH kernels
    this.epsilon = 0.5; // Increased epsilon to avoid extreme forces when particles nearly overlap

    this.kernel = {
      spikyGradient: (r, rLen) => {
        const h = this.smoothingLength;
        if (rLen <= h && rLen > this.epsilon) {
          const coeff = 15 / (Math.PI * Math.pow(h, 6));
          // Clamp r if rLen is extremely small:
          const safeR = rLen < this.epsilon ? this.epsilon : rLen;
          return r.normalized().mul(coeff * Math.pow(h - safeR, 2));
        }
        return new Vector2(0, 0);
      },
      viscosityLaplacian: (rLen) => {
        const h = this.smoothingLength;
        if (rLen <= h) {
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
    // Update spatial hash with current particle positions
    this.spatialHash.clear();
    this.particles.forEach(p => this.spatialHash.insert(p));

    // Calculate densities, pressures, and forces
    this.calculateDensitiesAndPressures();
    this.calculateForces();

    // Integrate forces (including boundary forces) in one step per particle
    this.particles.forEach(p => {
      // Compute boundary repulsive force
      let boundaryForce = new Vector2(0, 0);
      const boundaryStrength = 100; // Tune as needed

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

      // Add boundary force to the already accumulated forces
      p.force = p.force.add(boundaryForce);

      // Single integration step with damping
      p.velocity = p.velocity.add(p.force.mul(dt / p.mass)).mul(0.99);
      p.position = p.position.add(p.velocity.mul(dt));

      // Update the spatial hash for the new position
      this.spatialHash.update(p);

      // Reset force after integration to avoid accumulation over frames
      p.force = new Vector2(0, 0);
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
        if (rLen > this.epsilon && rLen <= this.smoothingLength) {
          // Pressure force
          const gradW = this.kernel.spikyGradient(r, rLen);
          let pressureTerm = -(pi.pressure + pj.pressure) / (2 * pj.density);
          pressureForce = pressureForce.add(gradW.mul(pressureTerm * pj.mass));

          // Viscosity force
          viscosityForce = viscosityForce.add(
            pj.velocity.sub(pi.velocity).mul(
              this.viscosity * this.kernel.viscosityLaplacian(rLen) * (pj.mass / pj.density)
            )
          );

          // Surface tension: accumulate normals and curvature
          let poly6Val = this.kernel.poly6(r.dot(r));
          normal = normal.add(r.mul((pj.mass / pj.density) * poly6Val));
          curvature += (pj.mass / pj.density) * poly6Val;
        }
      });

      // Surface tension: if normal is nonzero, compute force
      const normalLen = normal.mag();
      if (normalLen > this.epsilon) {
        normal = normal.div(normalLen);
        curvature = Math.abs(curvature) / normalLen;
        surfaceTensionForce = normal.mul(-this.surfaceTension * curvature);
      }

      // Gravity force (now with negative Y so particles fall downward)
      const gravityForce = this.gravity.mul(pi.mass);

      // Total force accumulation
      // Clamp pressure force magnitude to avoid explosive behavior
      const maxPressureForce = 500;
      if (pressureForce.mag() > maxPressureForce) {
        pressureForce = pressureForce.normalized().mul(maxPressureForce);
      }
      pi.force = pressureForce.add(viscosityForce).add(surfaceTensionForce).add(gravityForce);
    });
  }

  reset() {
    this.particles = []; // Clear all particles
    this.spatialHash.clear();
    // Reset gravity downward
    this.gravity = new Vector2(0, -9.81);
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