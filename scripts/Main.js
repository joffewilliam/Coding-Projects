import { FluidSimulation } from './scripts/FluidSimulation.js';
import { UIControls } from './scripts/UIControls.js';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('webglCanvas'); // Ensure canvas exists
  const simulation = new FluidSimulation(canvas);     // Pass it into FluidSimulation
  const interactionManager = new InteractionManager(canvas, simulation); // Add interaction manager
  const uiControls = new UIControls(simulation, canvas); // Now pass these to your UI controls if needed

  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  try {
    new UIControls(simulation, canvas);

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