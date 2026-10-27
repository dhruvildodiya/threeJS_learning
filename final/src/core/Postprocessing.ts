import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import type { AudioUniforms } from '../audio/types';
import type { Debug } from '../utils/Debug';

// Custom Chromatic Aberration Shader for beat hits
const ChromaticAberrationShader = {
  uniforms: {
    tDiffuse: { value: null },
    uAmount: { value: 0.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uAmount;
    varying vec2 vUv;

    void main() {
      if (uAmount <= 0.0001) {
        gl_FragColor = texture2D(tDiffuse, vUv);
        return;
      }
      vec2 dir = vUv - 0.5;
      float dist = length(dir);
      float r = texture2D(tDiffuse, vUv - dir * uAmount * dist).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv + dir * uAmount * dist).b;
      gl_FragColor = vec4(r, g, b, 1.0);
    }
  `,
};

/**
 * Postprocessing manages EffectComposer, UnrealBloomPass for glowing emissive elements,
 * and audio-reactive chromatic aberration on heavy beat hits.
 */
export class Postprocessing {
  public readonly composer: EffectComposer;
  public readonly renderPass: RenderPass;
  public readonly bloomPass: UnrealBloomPass;
  public readonly chromaticPass: ShaderPass;

  public isBloomEnabled = true;

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.Camera,
    width: number,
    height: number,
    private readonly audioUniforms: AudioUniforms,
    debug?: Debug
  ) {
    this.composer = new EffectComposer(this.renderer);

    // 1. Base RenderPass
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    // 2. UnrealBloomPass (emissive glow for lighthouse, crystals, fireflies, sun specular)
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.85, // strength
      0.45, // radius
      0.72  // threshold
    );
    this.composer.addPass(this.bloomPass);

    // 3. Chromatic Aberration Pass (beats trigger subtle RGB split)
    this.chromaticPass = new ShaderPass(ChromaticAberrationShader);
    this.composer.addPass(this.chromaticPass);

    if (debug?.active) {
      this.setupDebug(debug);
    }
  }

  public setBloom(enabled: boolean): void {
    this.isBloomEnabled = enabled;
    this.bloomPass.enabled = enabled;
  }

  public resize(width: number, height: number): void {
    this.composer.setSize(width, height);
    this.bloomPass.resolution.set(width, height);
  }

  public render(delta: number): void {
    const beat = this.audioUniforms.uBeat.value;

    // Modulate chromatic aberration by beat impulse
    const targetAberration = beat > 0.4 ? (beat - 0.4) * 0.015 : 0.0;
    const cur = this.chromaticPass.uniforms.uAmount.value;
    this.chromaticPass.uniforms.uAmount.value = cur + (targetAberration - cur) * Math.min(1.0, delta * 15.0);

    // Render composer passes
    this.composer.render();
  }

  private setupDebug(debug: Debug): void {
    const folder = debug.addFolder('Postprocessing & Bloom');
    if (!folder) return;

    folder.add(this.bloomPass, 'enabled').name('Bloom Enabled');
    folder.add(this.bloomPass, 'strength', 0, 3.0, 0.05).name('Bloom Strength');
    folder.add(this.bloomPass, 'radius', 0, 1.5, 0.05).name('Bloom Radius');
    folder.add(this.bloomPass, 'threshold', 0, 1.0, 0.02).name('Bloom Threshold');
  }

  public destroy(): void {
    this.composer.dispose();
  }
}
