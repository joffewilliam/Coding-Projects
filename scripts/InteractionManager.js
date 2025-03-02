import { Vector2 } from './Vector2.js';
import { Particle } from './Particle.js';

export class InteractionManager {
  constructor(canvas, simulation) {
    this.canvas = canvas;
    this.simulation = simulation;
    this.currentTool = 'water'; // Options: 'water', 'wind', 'eraseWater', 'eraseWind'
    this.isDrawing = false;
    this.brushSize = 50; // Brush radius for wind/erase tools
    this.lastMousePos = null; // For optional delta calculations

    // Add properties to throttle water drops:
    this.lastWaterDropTime = 0;
    this.waterDropCooldown = 100; // in milliseconds

    this.initEvents();
  }

  initEvents() {
    // Mouse events
    this.canvas.addEventListener('mousedown', (event) => {
      this.isDrawing = true;
      this.lastMousePos = this.getMousePosition(event);
      this.handleInteraction(event);
    });

    this.canvas.addEventListener('mousemove', (event) => {
      this.handleInteraction(event);
    });

    window.addEventListener('mouseup', () => {
      this.isDrawing = false;
      this.lastMousePos = null;
    });

    // Touch events
    this.canvas.addEventListener('touchstart', (event) => {
      event.preventDefault();
      this.isDrawing = true;
      this.lastMousePos = this.getMousePosition(event.touches[0]);
      this.handleInteraction(event.touches[0]);
    });

    this.canvas.addEventListener('touchmove', (event) => {
      event.preventDefault();
      this.handleInteraction(event.touches[0]);
    });

    this.canvas.addEventListener('touchend', (event) => {
      event.preventDefault();
      this.isDrawing = false;
      this.lastMousePos = null;
    });
  }

  getMousePosition(event) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (this.canvas.width / rect.width),
      // Flip the Y coordinate.
      y: this.canvas.height - (event.clientY - rect.top) * (this.canvas.height / rect.height)
    };
  }

  handleInteraction(event) {
    if (!this.isDrawing) return;
    const pos = this.getMousePosition(event);

    if (this.currentTool === 'water') {
      // Throttle water drops based on cooldown.
      const now = Date.now();
      if (now - this.lastWaterDropTime >= this.waterDropCooldown) {
        this.simulation.addWaterParticles(pos.x, pos.y, 10);
        this.lastWaterDropTime = now;
      }
    } else if (this.currentTool === 'wind') {
      const forceX = 1.0;
      const forceY = 1.0;
      this.simulation.addWindForce(pos.x, pos.y, forceX, forceY, this.brushSize);
    } else if (this.currentTool === 'eraseWater' || this.currentTool === 'eraseWind') {
      this.simulation.eraseWater(pos.x, pos.y, this.brushSize);
    }

    this.lastMousePos = pos;
  }

  setTool(tool) {
    this.currentTool = tool;
  }

  setBrushSize(size) {
    this.brushSize = size;
  }
}
