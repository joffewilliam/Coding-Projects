import { Particle } from './Particle.js';
import { createShader } from './ShaderUtils.js';
import { createProgram } from './ShaderUtils.js';


export class FluidRenderer {
    constructor(gl, canvas) {
        this.gl = gl;
        this.program = this.initShaderProgram();
        this.aPositionLocation = gl.getAttribLocation(this.program, 'a_position');
        this.uResolutionLocation = gl.getUniformLocation(this.program, 'u_resolution');
        this.uPointSizeLocation = gl.getUniformLocation(this.program, 'u_pointSize');
		this.canvas = canvas;  // ⬅️ Make sure this line exists!


        if (this.aPositionLocation === -1) {
            console.error('Attribute location for a_position not found.');
        }
        if (this.uResolutionLocation === -1) {
            console.error('Uniform location for u_resolution not found.');
        }
        if (this.uPointSizeLocation === -1) {
            console.error('Uniform location for u_pointSize not found.');
        }

        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    }

    initShaderProgram() {
        const vertexShaderSource = document.getElementById('vertex-shader').text;
        const fragmentShaderSource = document.getElementById('fragment-shader').text;

        const vertexShader = createShader(this.gl, this.gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = createShader(this.gl, this.gl.FRAGMENT_SHADER, fragmentShaderSource);

        return createProgram(this.gl, vertexShader, fragmentShader);
    }
	
	updateResolution(width, height) {
  this.canvas.width = width;
  this.canvas.height = height;
  this.gl.viewport(0, 0, width, height);
}

    render(particles) {
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.gl.useProgram(this.program);

        // Bind the position buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);

        // Put the particle positions in the buffer
        const positions = particles.map(particle => [particle.position.x, particle.position.y]).flat();
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.DYNAMIC_DRAW);

        // Tell the attribute how to get data out of the positionBuffer (ARRAY_BUFFER)
        const size = 2;          // 2 components per iteration
        const type = this.gl.FLOAT;   // the data is 32bit floats
        const normalize = false;  // don't normalize the data
        const stride = 0;         // 0 = move forward size * sizeof(type) each iteration to get the next position
        const offset = 0;         // start at the beginning of the buffer
        this.gl.vertexAttribPointer(this.aPositionLocation, size, type, normalize, stride, offset);
        this.gl.enableVertexAttribArray(this.aPositionLocation);

        // Set the resolution
        this.gl.uniform2f(this.uResolutionLocation, this.gl.canvas.width, this.gl.canvas.height);

        // Set the point size
        this.gl.uniform1f(this.uPointSizeLocation, 10.0); // Adjust point size as needed

        // Draw the points
        this.gl.drawArrays(this.gl.POINTS, 0, particles.length);
    }
}