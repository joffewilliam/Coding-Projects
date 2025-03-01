import { Particle } from './Particle.js';
import { FluidRenderer } from './FluidRenderer.js';
import { SPHSystem } from './SPHSystem.js';
import { BoundaryHandler } from './BoundaryHandler.js';
import { InteractionManager } from './InteractionManager.js';
import { Vector2 } from './Vector2.js';
import { WindField } from './WindField.js';  // Add this import

export class FluidSimulation {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!this.gl) {
      console.error('WebGL not supported');
      return;
    }
    this.windField = new WindField(this.gl);  // Initialize wind field
    this.sph = new SPHSystem(canvas); // Pass canvas to SPHSystem
    this.renderer = new FluidRenderer(this.gl);
    this.boundaryHandler = new BoundaryHandler(canvas);
    this.interactionManager = new InteractionManager(canvas, this.sph);
    this.init();
    this.animate();
  }

  init() {
    // Ensure no initial particles are added
    this.sph.particles = []; // Clear any existing particles
    console.log('Initial particles:', this.sph.particles); // Debug log
    this.updateParticleCount();

    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.isDrawing = false;
    this.lastPosition = null;
  }

  onMouseDown(event) {
    this.isDrawing = true;
    this.lastPosition = this.getMousePosition(event);
    this.interactionManager.handleInteraction(this.lastPosition);
  }

  onMouseMove(event) {
    if (this.isDrawing) {
      const currentPosition = this.getMousePosition(event);
      this.windField.addWind(this.lastPosition, currentPosition, 0.1); // Add wind force from the last position to the current one
      this.lastPosition = currentPosition;

      // Draw brush on the canvas with opacity if using the wind tool
      if (this.interactionManager.tool === 'wind') {
        this.drawBrush(currentPosition);
      }

      // Handle interaction
      this.interactionManager.handleInteraction(currentPosition);
    }
  }

  onMouseUp() {
    this.isDrawing = false;
  }

  getMousePosition(event) {
    const rect = this.canvas.getBoundingClientRect();
    return new Vector2(event.clientX - rect.left, event.clientY - rect.top);
  }

  drawBrush(position) {
    const ctx = document.getElementById('overlayCanvas').getContext('2d');
    ctx.beginPath();
    ctx.arc(position.x, position.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 0, 0, 0.6)'; // Red with 60% opacity
    ctx.fill();
  }

  animate() {
    const dt = 1 / 30;  // Assuming 60 FPS, adjust this if needed

    // Update SPH system forces and integration
    this.sph.update(dt);

    // Apply wind force to each particle:
    this.sph.particles.forEach(p => {
      const windForce = this.windField.getWind(p.position);

      // Optionally scale the wind force by time step (dt)
      const windVelocityChange = windForce.mul(dt);  // Apply wind as force * dt
      p.velocity = p.velocity.add(windVelocityChange);
    });

    // Handle particle collisions with boundaries
    this.boundaryHandler.handleCollisions(this.sph.particles);

    // Render the particles
    this.renderer.render(this.sph.particles);

    // Update particle count display
    this.updateParticleCount();

    // Continue the animation loop
    requestAnimationFrame(() => this.animate());
  }

  resetSimulation() {
    // Clear the 2D canvas
    const overlayCanvas = document.getElementById('overlayCanvas');
    const ctx = overlayCanvas.getContext('2d');
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // Clear particles
    this.sph.particles = [];

    // Reset wind field
    this.windField.reset();

    // Reset interaction manager
    this.interactionManager.reset();

    // Update particle count display
    this.updateParticleCount();

    console.log('Simulation reset');
  }

  updateParticleCount() {
    const particleCountElement = document.getElementById('particleCount');
    particleCountElement.textContent = `Particles: ${this.sph.particles.length}`;
  }
}