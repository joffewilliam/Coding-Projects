export class SpatialHash {
  constructor(cellSize, canvas) {
    this.cellSize = cellSize;
    this.canvas = canvas; // Store the canvas
    this.grid = new Map();
    this.particleMap = new WeakMap();
  }

  hash(pos) {
    const x = Math.floor(pos.x / this.cellSize);
    const y = Math.floor(pos.y / this.cellSize);
    return `${x},${y}`;
  }

  insert(particle) {
    const key = this.hash(particle.position);
    if (!this.grid.has(key)) {
      this.grid.set(key, new Set());
    }
    this.grid.get(key).add(particle);
    this.particleMap.set(particle, key);
  }

  getNeighbors(particle) {
    const neighbors = new Set();
    const center = this.hash(particle.position);
    const [x, y] = center.split(',').map(Number);

    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const key = `${x + i},${y + j}`;
        if (this.grid.has(key)) {
          this.grid.get(key).forEach(p => {
            if (p !== particle) {
              neighbors.add(p);
            }
          });
        }
      }
    }
    return Array.from(neighbors);
  }

  update(particle) {
    const oldKey = this.particleMap.get(particle);
    const newKey = this.hash(particle.position);

    if (oldKey !== newKey) {
      this.grid.get(oldKey).delete(particle);
      if (this.grid.get(oldKey).size === 0) {
        this.grid.delete(oldKey);
      }
      this.insert(particle);
    }
  }

  clear() {
    this.grid.clear();
    this.particleMap = new WeakMap();
  }
}