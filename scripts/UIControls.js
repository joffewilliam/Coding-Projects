import { InteractionManager } from './InteractionManager.js';

export class UIControls {
  constructor(simulation, canvas) {
    this.simulation = simulation;
    // Create a new InteractionManager instance
    this.interactionManager = new InteractionManager(canvas, simulation);
    this.bindUI();
    this.setupSliders();
    this.initParticleCountSlider();
  }

  bindUI() {
    document.getElementById('waterToolBtn').addEventListener('click', () => {
      this.interactionManager.setTool('water');
    });

    document.getElementById('eraseWaterBtn').addEventListener('click', () => {
      this.interactionManager.setTool('eraseWater');
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
      this.simulation.resetSimulation();
    });
    
    // Set up brush size control
    const brushSizeSlider = document.getElementById('brushSize');
    if (brushSizeSlider) {
      brushSizeSlider.addEventListener('input', (e) => {
        this.interactionManager.setBrushSize(parseInt(e.target.value));
      });
      // Initialize with default value
      this.interactionManager.setBrushSize(parseInt(brushSizeSlider.value));
    }
  }
  
  setupSliders() {
    // Viscosity slider
    const viscositySlider = document.getElementById('viscosity');
    const viscosityValue = document.getElementById('viscosityValue');
    
    if (viscositySlider && viscosityValue) {
      viscositySlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        viscosityValue.textContent = value.toFixed(3);
        
        // Update the simulation's viscosity parameter directly
        // Note: The scaling is handled in FluidSimulation.js
        if (this.simulation.setViscosity) {
          this.simulation.setViscosity(value);
        }
      });
    }
    
    // Surface tension slider
    const surfaceTensionSlider = document.getElementById('surfaceTension');
    const surfaceTensionValue = document.getElementById('surfaceTensionValue');
    
    if (surfaceTensionSlider && surfaceTensionValue) {
      surfaceTensionSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        surfaceTensionValue.textContent = value.toFixed(4);
        
        // Update the simulation's surface tension parameter directly
        if (this.simulation.setSurfaceTension) {
          this.simulation.setSurfaceTension(value);
        }
      });
    }
  }

  initParticleCountSlider() {
    const slider = document.getElementById('particleCountSlider');
    const valueDisplay = document.getElementById('particleCountValue');
    
    if (slider && valueDisplay) {
      // Set initial value
      valueDisplay.textContent = slider.value;
      this.interactionManager.setParticleCount(parseInt(slider.value));
      
      // Update when slider changes
      slider.addEventListener('input', () => {
        const count = parseInt(slider.value);
        valueDisplay.textContent = count;
        this.interactionManager.setParticleCount(count);
      });
    }
  }
}
