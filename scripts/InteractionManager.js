import { Vector2 } from './Vector2.js';
import { Particle } from './Particle.js';

export class InteractionManager {
  constructor(canvas, sphSystem, windField) {
    this.canvas = canvas;
    this.sph = sphSystem;
    this.windField = windField;
    this.initEvents();
    this.currentTool = 'water';  // default tool is water
    this.brushSize = 50;         // default brush size
    this.brushStrength = 100;    // default brush strength
    this.lastWindPos = null;    // store last wind drawing position
  }

  initEvents() {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  getMousePos(event) {
    const rect = this.canvas.getBoundingClientRect();
    return new Vector2(
      event.clientX - rect.left,
      event.clientY - rect.top
    );
  }

  onMouseDown(event) {
    this.isDrawing = true;
    this.handleInteraction(event);
  }

  onMouseMove(event) {
    if (this.isDrawing) {
      this.handleInteraction(event);
    }
  }

  onMouseUp() {
    this.isDrawing = false;
  }

  handleInteraction(event) {
    const pos = this.getMousePos(event);

    switch (this.currentTool) {
      case 'water':
        this.addWater(pos);
        break;
      case 'wind':
        this.addWind(pos);
        break;
      case 'eraseWater':
        this.removeWaterParticles(pos);
        break;
      case 'eraseWind':
        this.removeWind(pos);
        break;
    }
  }
  
      reset() {
        // Reset any interaction-specific state if necessary
        this.tool = 'none';
        this.brushSize = 50;
        this.brushStrength = 100;
    }

  addWater(position) {
    const count = Math.floor(this.brushSize / 4);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * this.brushSize;
      const pos = new Vector2(
        position.x + Math.cos(angle) * radius,
        position.y + Math.sin(angle) * radius
      );
      
      const vel = new Vector2(
        (Math.random() - 0.5) * this.brushStrength,
        (Math.random() - 0.5) * this.brushStrength
      );
      
      this.sph.particles.push(new Particle(pos, vel));
    }
  }

  addWind(position) {
    if (!this.lastWindPos) {
      this.lastWindPos = position;
      return;
    }

    const strength = this.brushStrength * 0.1;
    this.windField.addWind(this.lastWindPos, position, strength);
    this.lastWindPos = position;
  }

  removeWaterParticles(position) {
    const radiusSq = this.brushSize * this.brushSize;
    this.sph.particles = this.sph.particles.filter(p => {
      const distSq = p.position.sub(position).magSq();
      return distSq > radiusSq;  // Keep particles outside of the brush radius
    });
  }

  removeWind(position) {
    const radiusSq = this.brushSize * this.brushSize;
    const cols = Math.ceil(this.windField.field.length);
    const rows = Math.ceil(this.windField.field[0].length);

    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        const fieldPos = new Vector2(x * this.windField.resolution, y * this.windField.resolution);
        const distSq = fieldPos.sub(position).magSq();
        if (distSq < radiusSq) {
          this.windField.field[x][y] = new Vector2(); // Remove wind field in this area
        }
      }
    }
  }

  setTool(tool) {
    this.currentTool = tool;
    this.lastWindPos = null;  // Reset wind drawing state on tool change
  }

  setBrushSize(size) {
    this.brushSize = size;
  }

  setBrushStrength(strength) {
    this.brushStrength = strength;
  }

  // Touch event handlers
  onTouchStart(event) {
    event.preventDefault();
    this.isDrawing = true;
    this.handleInteraction(event.touches[0]);
  }

  onTouchMove(event) {
    event.preventDefault();
    if (this.isDrawing) {
      this.handleInteraction(event.touches[0]);
    }
  }

  onTouchEnd() {
    this.isDrawing = false;
  }
}
