import { InteractionManager } from './InteractionManager.js';

export class UIControls {
  constructor(simulation, canvas) {
    this.simulation = simulation;
    // Create a new InteractionManager instance
    this.interactionManager = new InteractionManager(canvas, simulation);
    this.bindUI();
    this.setupSliders();
  }

  bindUI() {
    document.getElementById('waterToolBtn').addEventListener('click', () => {
      this.interactionManager.setTool('water');
    });
    document.getElementById('windToolBtn').addEventListener('click', () => {
      this.interactionManager.setTool('wind');
    });
    document.getElementById('eraseWaterBtn').addEventListener('click', () => {
      this.interactionManager.setTool('eraseWater');
    });
    document.getElementById('eraseWindBtn').addEventListener('click', () => {
      this.interactionManager.setTool('eraseWind');
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
        
        // Update shader constants by modifying the update shader
        // This is a simplified approach - in a production app, you'd use uniforms
        const shaderElement = document.getElementById('update-shader');
        if (shaderElement) {
          const shaderText = shaderElement.textContent;
          // For demonstration, we're not actually modifying the shader text here
          // In a real implementation, you would pass this as a uniform to the shader
          
          // Instead, we'll update the simulation's viscosity parameter
          // This would require adding a setViscosity method to FluidSimulation
          if (this.simulation.setViscosity) {
            this.simulation.setViscosity(value * 50000); // Scale to appropriate range for shader
          }
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
        
        // Similar to viscosity, in a real implementation you would
        // pass this as a uniform to the shader
        if (this.simulation.setSurfaceTension) {
          this.simulation.setSurfaceTension(value);
        }
      });
    }
  }
}
