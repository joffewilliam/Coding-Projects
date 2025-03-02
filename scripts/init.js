import { FluidSimulation } from './FluidSimulation.js';
import { UIControls } from './UIControls.js';
const canvas = document.getElementById('webglCanvas');
const fluidSimulation = new FluidSimulation(canvas);
new UIControls(fluidSimulation, canvas);
