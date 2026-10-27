import * as THREE from 'three';
import oceanVertexShader from '../shaders/ocean/ocean.vert.glsl';
import oceanFragmentShader from '../shaders/ocean/ocean.frag.glsl';
import type { AudioUniforms } from '../audio/types';
import type { Debug } from '../utils/Debug';

export interface OceanConfig {
  size: number;
  segments: number;
  deepColor: number;
  shallowColor: number;
  foamColor: number;
  skyColor: number;
}

export const defaultOceanConfig: OceanConfig = {
  size: 320,
  segments: 220,
  deepColor: 0x041b38,
  shallowColor: 0x0db8a8,
  foamColor: 0xe8fbff,
  skyColor: 0xffa066, // Warm sunset reflection
};

/**
 * Ocean manages the high-resolution audio-reactive ocean surface using custom GLSL shaders.
 * It simulates Gerstner waves driven by bass, surface ripple turbulence driven by treble,
 * radial beat ripples, crest foam, and sun reflections.
 */
export class Ocean {
  public readonly mesh: THREE.Mesh;
  public readonly geometry: THREE.PlaneGeometry;
  public readonly material: THREE.ShaderMaterial;
  private readonly audioUniforms: AudioUniforms;

  // Grid snapping state
  private readonly gridSize = 1.0;

  constructor(
    private readonly scene: THREE.Scene,
    audioUniforms: AudioUniforms,
    config: OceanConfig = defaultOceanConfig,
    debug?: Debug
  ) {
    this.audioUniforms = audioUniforms;

    // Subdivided plane for smooth vertex displacement
    this.geometry = new THREE.PlaneGeometry(
      config.size,
      config.size,
      config.segments,
      config.segments
    );

    this.material = new THREE.ShaderMaterial({
      vertexShader: oceanVertexShader,
      fragmentShader: oceanFragmentShader,
      uniforms: {
        // Audio uniforms from FeatureBus
        uTime: this.audioUniforms.uTime,
        uBass: this.audioUniforms.uBass,
        uMid: this.audioUniforms.uMid,
        uTreble: this.audioUniforms.uTreble,
        uEnergy: this.audioUniforms.uEnergy,
        uBeat: this.audioUniforms.uBeat,
        uSpectrum: this.audioUniforms.uSpectrum,

        // Environmental uniforms
        uSunPosition: { value: new THREE.Vector3(30, 18, 45) },
        uSunColor: { value: new THREE.Color(0xfff0c8) },
        uDeepColor: { value: new THREE.Color(config.deepColor) },
        uShallowColor: { value: new THREE.Color(config.shallowColor) },
        uFoamColor: { value: new THREE.Color(config.foamColor) },
        uSkyColor: { value: new THREE.Color(config.skyColor) },
        uFogColor: { value: new THREE.Color(0x0a1e38) },
        uFogNear: { value: 30.0 },
        uFogFar: { value: 160.0 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    // Orient horizontal: PlaneGeometry lies on XY, rotate around X by -90 deg so it lies on XZ
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = 0;
    this.mesh.receiveShadow = true;

    this.scene.add(this.mesh);

    if (debug?.active) {
      this.setupDebug(debug);
    }
  }

  /**
   * Set sun lighting parameters in the ocean shader.
   */
  public setSun(position: THREE.Vector3, color: THREE.Color): void {
    this.material.uniforms.uSunPosition.value.copy(position);
    this.material.uniforms.uSunColor.value.copy(color);
  }

  /**
   * Set fog parameters in the ocean shader.
   */
  public setFog(color: THREE.Color, near: number, far: number): void {
    this.material.uniforms.uFogColor.value.copy(color);
    this.material.uniforms.uFogNear.value = near;
    this.material.uniforms.uFogFar.value = far;
  }

  /**
   * Per-frame update with camera grid snapping.
   */
  public update(_delta: number, _elapsed: number, cameraPos?: THREE.Vector3): void {
    if (cameraPos) {
      // Snap ocean mesh position to grid around camera to give illusion of infinite ocean
      // keep Y = 0 (sea level)
      const snapX = Math.floor(cameraPos.x / this.gridSize) * this.gridSize;
      const snapZ = Math.floor(cameraPos.z / this.gridSize) * this.gridSize;
      this.mesh.position.set(snapX, 0, snapZ);
    }
  }

  private setupDebug(debug: Debug): void {
    const folder = debug.addFolder('Ocean Shader');
    if (!folder) return;

    folder.addColor(this.material.uniforms.uDeepColor, 'value').name('Deep Color');
    folder.addColor(this.material.uniforms.uShallowColor, 'value').name('Shallow Color');
    folder.addColor(this.material.uniforms.uFoamColor, 'value').name('Foam Color');
    folder.addColor(this.material.uniforms.uSkyColor, 'value').name('Sky Refl Color');
    folder.add(this.material, 'wireframe').name('Wireframe');
  }

  public destroy(): void {
    this.scene.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
  }
}
