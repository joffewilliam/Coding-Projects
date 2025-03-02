import { Particle } from './Particle.js';

export class FluidRenderer {
  constructor(gl) {
    this.gl = gl;
    this.program = this.initShaderProgram();
    this.positionBuffer = this.gl.createBuffer();
    this.aPositionLocation = this.gl.getAttribLocation(this.program, 'a_position');
    this.uResolutionLocation = this.gl.getUniformLocation(this.program, 'u_resolution');
    this.uPointSizeLocation = this.gl.getUniformLocation(this.program, 'u_pointSize');
    this.updateResolution();
  }

  initShaderProgram() {
    const vertexShaderSource = document.getElementById('vertex-shader').textContent;
    const fragmentShaderSource = document.getElementById('fragment-shader').textContent;
    const vertexShader = this.loadShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.loadShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);
    return this.createProgram(vertexShader, fragmentShader);
  }

  loadShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('An error occurred compiling the shaders: ' + this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  createProgram(vertexShader, fragmentShader) {
    const program = this.gl.createProgram();
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Unable to initialize the shader program: ' + this.gl.getProgramInfoLog(program));
      return null;
    }
    return program;
  }

  updateResolution() {
    const canvas = this.gl.canvas;
    const displayWidth  = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width  = displayWidth;
      canvas.height = displayHeight;
    }
    this.gl.viewport(0, 0, canvas.width, canvas.height);
  }

  render(particles) {
    this.updateResolution();
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    // Enable additive blending so that overlapping particles blend together.
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.ONE, this.gl.ONE);

    this.gl.useProgram(this.program);

    // Bind the position buffer and update particle positions as before…
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    const positions = particles.map(p => [p.position.x, p.position.y]).flat();
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.DYNAMIC_DRAW);

    const size = 2, type = this.gl.FLOAT, normalize = false, stride = 0, offset = 0;
    this.gl.vertexAttribPointer(this.aPositionLocation, size, type, normalize, stride, offset);
    this.gl.enableVertexAttribArray(this.aPositionLocation);

    this.gl.uniform2f(this.uResolutionLocation, this.gl.canvas.width, this.gl.canvas.height);
    // Use a fixed point size that matches your shader’s expectation.
    this.gl.uniform1f(this.uPointSizeLocation, 10.0);

    // Draw the particles as points.
    this.gl.drawArrays(this.gl.POINTS, 0, particles.length);

    // Optionally disable blending or reset to your default state after drawing.
    this.gl.disable(this.gl.BLEND);
  }
}