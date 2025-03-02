import { Particle } from './Particle.js';
import { FluidRenderer } from './FluidRenderer.js';
import { SPHSystem } from './SPHSystem.js';
import { BoundaryHandler } from './BoundaryHandler.js';
import { InteractionManager } from './InteractionManager.js';
import { Vector2 } from './Vector2.js';
import { WindField } from './WindField.js';
import { createShader, createProgram } from './ShaderUtils.js';

export class FluidSimulation {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2');
    if (!this.gl) {
      console.error("WebGL2 is not supported in your browser.");
      return;
    }

    // Simulation parameters
    this.dt = 0.016;
    this.gravity = [0.0, -9.81];

    // Maximum number of particles and active count.
    this.maxParticles = 10000;
    this.activeParticleCount = 0;
    // CPU–side copy of particle data (interleaved: pos.xy, vel.xy)
    this.particleData = new Float32Array(this.maxParticles * 4);
    // Initially, all values are zero (simulation starts empty)
    for (let i = 0; i < this.maxParticles * 4; i++) {
      this.particleData[i] = 0;
    }

    this.gl.getExtension('EXT_color_buffer_float');

    // Setup GPU simulation and rendering
    this.setupUpdateProgram();
    this.setupRenderProgram();
    this.setupParticleBuffers();
    this.setupTransformFeedback();

    // Add texture for particle positions and velocities
    // We'll store positions in the first half and velocities in the second half
    this.positionTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.positionTexture);
    this.gl.texImage2D(
        this.gl.TEXTURE_2D, 0, this.gl.RG32F, 
        this.maxParticles, 2, 0,
        this.gl.RG, this.gl.FLOAT, null
    );
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

    // Start with swap flag false (buffers[0] is current state)
    this.swap = false;

    // Start the animation loop
    this.animate();
  }

  setupUpdateProgram() {
    const gl = this.gl;
    const vsSource = document.getElementById('update-shader').textContent;
    const updateVS = createShader(gl, gl.VERTEX_SHADER, vsSource);
    // Dummy fragment shader for transform feedback
    const fsSource = `#version 300 es
precision highp float;
void main() { }
    `;
    const updateFS = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    this.updateProgram = gl.createProgram();
    gl.attachShader(this.updateProgram, updateVS);
    gl.attachShader(this.updateProgram, updateFS);
    // Capture both output varyings into a single interleaved buffer.
    const feedbackVars = ["v_position", "v_velocity"];
    gl.transformFeedbackVaryings(this.updateProgram, feedbackVars, gl.INTERLEAVED_ATTRIBS);
    gl.linkProgram(this.updateProgram);
    if (!gl.getProgramParameter(this.updateProgram, gl.LINK_STATUS)) {
      console.error("Unable to link update program: " + gl.getProgramInfoLog(this.updateProgram));
    }
    this.upd_a_positionLoc = gl.getAttribLocation(this.updateProgram, "a_position");
    this.upd_a_velocityLoc = gl.getAttribLocation(this.updateProgram, "a_velocity");
    this.upd_u_dtLoc = gl.getUniformLocation(this.updateProgram, "u_dt");
    this.upd_u_gravityLoc = gl.getUniformLocation(this.updateProgram, "u_gravity");
    this.upd_u_positionsLoc = gl.getUniformLocation(this.updateProgram, "u_positions");
    this.upd_u_particleCountLoc = gl.getUniformLocation(this.updateProgram, "u_particleCount");
  }

  setupRenderProgram() {
    const gl = this.gl;
    const vsSource = document.getElementById('vertex-shader').textContent;
    const fsSource = document.getElementById('fragment-shader').textContent;
    const renderVS = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const renderFS = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    this.renderProgram = createProgram(gl, renderVS, renderFS);
    this.r_u_resolutionLoc = gl.getUniformLocation(this.renderProgram, "u_resolution");
    this.r_u_pointSizeLoc = gl.getUniformLocation(this.renderProgram, "u_pointSize");
    this.r_a_positionLoc = gl.getAttribLocation(this.renderProgram, "a_position");
  }

  setupParticleBuffers() {
    const gl = this.gl;
    // Create two buffers for double buffering.
    this.buffers = [gl.createBuffer(), gl.createBuffer()];
    for (let i = 0; i < 2; i++) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[i]);
      // Allocate full buffer size using our CPU particleData.
      gl.bufferData(gl.ARRAY_BUFFER, this.particleData, gl.DYNAMIC_COPY);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  setupTransformFeedback() {
    const gl = this.gl;
    // Create two transform feedback objects, each attached to one buffer.
    this.transformFeedbacks = [gl.createTransformFeedback(), gl.createTransformFeedback()];
    for (let i = 0; i < 2; i++) {
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this.transformFeedbacks[i]);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.buffers[i]);
    }
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
  }

  updateSimulation() {
    const gl = this.gl;
    
    // Create a temporary array to hold both position and velocity data for the texture
    const textureData = new Float32Array(this.maxParticles * 4);
    
    // Copy position data to the first half of the texture
    for (let i = 0; i < this.activeParticleCount; i++) {
      textureData[i * 2] = this.particleData[i * 4]; // x position
      textureData[i * 2 + 1] = this.particleData[i * 4 + 1]; // y position
    }
    
    // Copy velocity data to the second half of the texture
    for (let i = 0; i < this.activeParticleCount; i++) {
      textureData[(i + this.maxParticles) * 2] = this.particleData[i * 4 + 2]; // x velocity
      textureData[(i + this.maxParticles) * 2 + 1] = this.particleData[i * 4 + 3]; // y velocity
    }
    
    // Update position texture with current particle data
    gl.bindTexture(gl.TEXTURE_2D, this.positionTexture);
    gl.texSubImage2D(
        gl.TEXTURE_2D, 0, 0, 0,
        this.maxParticles, 2,
        gl.RG, gl.FLOAT,
        textureData
    );
    
    gl.useProgram(this.updateProgram);
    
    // Bind position texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.positionTexture);
    gl.uniform1i(this.upd_u_positionsLoc, 0);
    
    // Set uniforms
    gl.uniform1f(this.upd_u_dtLoc, this.dt);
    gl.uniform2fv(this.upd_u_gravityLoc, this.gravity);
    gl.uniform1i(this.upd_u_particleCountLoc, this.activeParticleCount);

    // Use current (source) buffer and destination transform feedback based on swap flag.
    const srcBuffer = this.swap ? this.buffers[1] : this.buffers[0];
    const dstTF = this.swap ? this.transformFeedbacks[0] : this.transformFeedbacks[1];

    gl.bindBuffer(gl.ARRAY_BUFFER, srcBuffer);
    gl.enableVertexAttribArray(this.upd_a_positionLoc);
    gl.vertexAttribPointer(this.upd_a_positionLoc, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(this.upd_a_velocityLoc);
    gl.vertexAttribPointer(this.upd_a_velocityLoc, 2, gl.FLOAT, false, 16, 8);

    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, dstTF);
    gl.enable(gl.RASTERIZER_DISCARD);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, this.activeParticleCount);
    gl.endTransformFeedback();
    gl.disable(gl.RASTERIZER_DISCARD);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);

    // Swap buffers for next frame
    this.swap = !this.swap;
  }

  render() {
    const gl = this.gl;
    gl.useProgram(this.renderProgram);
    const bufferToRender = this.swap ? this.buffers[1] : this.buffers[0];
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferToRender);
    gl.enableVertexAttribArray(this.r_a_positionLoc);
    gl.vertexAttribPointer(this.r_a_positionLoc, 2, gl.FLOAT, false, 16, 0);
    gl.uniform2f(this.r_u_resolutionLoc, gl.canvas.width, gl.canvas.height);
    gl.uniform1f(this.r_u_pointSizeLoc, 10.0);
    gl.drawArrays(gl.POINTS, 0, this.activeParticleCount);
  }

  animate() {
    const loop = () => {
      this.updateSimulation();
      this.render();
      requestAnimationFrame(loop);
    };
    loop();
  }

  // Resets the simulation to an empty state.
  resetSimulation() {
    this.activeParticleCount = 0;
    for (let i = 0; i < this.maxParticles * 4; i++) {
      this.particleData[i] = 0;
    }
    const gl = this.gl;
    for (let i = 0; i < 2; i++) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[i]);
      gl.bufferData(gl.ARRAY_BUFFER, this.particleData, gl.DYNAMIC_COPY);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  // Adds water particles near (x,y) in a circular area.
  addWaterParticles(x, y, count = 10) {
    const gl = this.gl;
    const oldActiveCount = this.activeParticleCount; // Save current count

    // Add new particles and update activeParticleCount.
    for (let i = 0; i < count; i++) {
      if (this.activeParticleCount >= this.maxParticles) break;
      // Offset positions randomly around (x, y)
      const offsetX = (Math.random() - 0.5) * 40;
      const offsetY = (Math.random() - 0.5) * 40;
      const posX = x + offsetX;
      const posY = y + offsetY;
      const velX = 0.0;
      const velY = 0.0;
      const index = this.activeParticleCount * 4;
      this.particleData.set([posX, posY, velX, velY], index);
      this.activeParticleCount++;
    }

    // Calculate the byte offset and subarray for only the new particles.
    const byteOffset = oldActiveCount * 4 * Float32Array.BYTES_PER_ELEMENT;
    const newData = this.particleData.subarray(oldActiveCount * 4, this.activeParticleCount * 4);

    // Update the GPU buffers only for the new particle data.
    for (let i = 0; i < 2; i++) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[i]);
      gl.bufferSubData(gl.ARRAY_BUFFER, byteOffset, newData);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // Optionally update the displayed particle count in the UI.
    const countElem = document.getElementById('particleCount');
    if (countElem) {
      countElem.innerText = this.activeParticleCount;
    }
  }

  // Adds wind forces to particles within a given radius of (x,y)
  addWindForce(x, y, forceX, forceY, radius = 50) {
    const gl = this.gl;
    for (let i = 0; i < this.activeParticleCount; i++) {
      const idx = i * 4;
      const posX = this.particleData[idx];
      const posY = this.particleData[idx + 1];
      const dx = posX - x;
      const dy = posY - y;
      if (dx * dx + dy * dy < radius * radius) {
        // Adjust the velocity components
        this.particleData[idx + 2] += forceX;
        this.particleData[idx + 3] += forceY;
      }
    }
    for (let i = 0; i < 2; i++) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[i]);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.particleData);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  // Erases (removes) particles within a given radius by moving them offscreen.
  eraseWater(x, y, radius = 50) {
    const gl = this.gl;
    let i = 0;
    while (i < this.activeParticleCount) {
      const idx = i * 4;
      const posX = this.particleData[idx];
      const posY = this.particleData[idx + 1];
      const dx = posX - x;
      const dy = posY - y;
      if (dx * dx + dy * dy < radius * radius) {
        // Swap with the last active particle.
        const lastIdx = (this.activeParticleCount - 1) * 4;
        // Only perform swap if we are not already at the last element.
        if (i !== this.activeParticleCount - 1) {
          this.particleData[idx] = this.particleData[lastIdx];
          this.particleData[idx + 1] = this.particleData[lastIdx + 1];
          this.particleData[idx + 2] = this.particleData[lastIdx + 2];
          this.particleData[idx + 3] = this.particleData[lastIdx + 3];
        }
        // Decrement active count so the last particle is effectively removed.
        this.activeParticleCount--;
        // Do not increment i, re-check the particle swapped in.
      } else {
        i++;
      }
    }

    // Re-upload the modified particleData to both buffers.
    for (let i = 0; i < 2; i++) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[i]);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.particleData);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  getParticleCount() {
    return this.activeParticleCount;
  }
  
  // Add methods to update simulation parameters
  setViscosity(value) {
    // In a full implementation, this would update a uniform in the shader
    // For now, we'll just store the value for future use
    this.viscosity = value;
    console.log(`Viscosity set to: ${value}`);
    // In a real implementation, you would update a uniform in the shader:
    // const gl = this.gl;
    // gl.useProgram(this.updateProgram);
    // gl.uniform1f(this.upd_u_viscosityLoc, value);
  }
  
  setSurfaceTension(value) {
    // Similar to setViscosity
    this.surfaceTension = value;
    console.log(`Surface tension set to: ${value}`);
    // In a real implementation, you would update a uniform in the shader
  }
}
