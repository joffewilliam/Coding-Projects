import { FluidSimulation } from './FluidSimulation.js';
import { UIControls } from './UIControls.js';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('webglCanvas'); // Ensure canvas exists
const simulation = new FluidSimulation(canvas);     // Pass it into FluidSimulation
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  try {
    const simulation = new FluidSimulation(canvas);
    new UIControls(simulation);

    // Handle window resize
    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      simulation.renderer.updateResolution();
    });
  } catch (error) {
    console.error('Failed to initialize simulation:', error);
    alert('Failed to initialize simulation. Please check browser compatibility.');
  }
});