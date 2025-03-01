export class UIControls {
  constructor(simulation) {
    this.simulation = simulation;
    this.initControls();
  }

  initControls() {
    // Tool Selection
    const toolButtons = [
  document.getElementById('waterToolBtn'),
  document.getElementById('windToolBtn'),
  document.getElementById('eraseWaterBtn'),
  document.getElementById('eraseWindBtn')
];
    if (!toolButtons.length) {
      console.error('Tool buttons not found');
      return;
    }

    toolButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.simulation.interactionManager.setTool(btn.dataset.tool);
        document.querySelector('.tool-btn.active')?.classList.remove('active');
        btn.classList.add('active');
      });
    });

    // Brush Controls
    const brushSize = document.getElementById('brushSize');
    if (!brushSize) {
      console.error('Brush size input not found');
      return;
    }
    brushSize.addEventListener('input', () => {
      this.simulation.interactionManager.setBrushSize(brushSize.value);
      document.getElementById('brushSizeValue').textContent = brushSize.value;
    });

    const brushStrength = document.getElementById('brushStrength');
    if (!brushStrength) {
      console.error('Brush strength input not found');
      return;
    }
    brushStrength.addEventListener('input', () => {
      this.simulation.interactionManager.setBrushStrength(brushStrength.value);
      document.getElementById('brushStrengthValue').textContent = brushStrength.value;
    });

    // Simulation Parameters
    const viscosity = document.getElementById('viscosity');
    if (!viscosity) {
      console.error('Viscosity input not found');
      return;
    }
    viscosity.addEventListener('input', () => {
      this.simulation.sph.viscosity = viscosity.value;
      document.getElementById('viscosityValue').textContent = viscosity.value;
    });

    const surfaceTension = document.getElementById('surfaceTension');
    if (!surfaceTension) {
      console.error('Surface tension input not found');
      return;
    }
    surfaceTension.addEventListener('input', () => {
      this.simulation.sph.surfaceTension = surfaceTension.value;
      document.getElementById('surfaceTensionValue').textContent = surfaceTension.value;
    });

    // Reset Button
    const resetBtn = document.getElementById('resetBtn');
    if (!resetBtn) {
      console.error('Reset button not found');
      return;
    }
    resetBtn.addEventListener('click', () => {
      this.simulation.sph.particles = [];
      this.simulation.init();
    });
  }
}
