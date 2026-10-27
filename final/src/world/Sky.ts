import * as THREE from 'three';
import skyVertexShader from '../shaders/sky/sky.vert.glsl';
import skyFragmentShader from '../shaders/sky/sky.frag.glsl';
import type { AudioUniforms } from '../audio/types';
import type { Debug } from '../utils/Debug';

export class Sky {
  public readonly mesh: THREE.Mesh;
  public readonly geometry: THREE.SphereGeometry;
  public readonly material: THREE.ShaderMaterial;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly audioUniforms: AudioUniforms,
    sunPosition: THREE.Vector3,
    debug?: Debug
  ) {
    this.geometry = new THREE.SphereGeometry(450, 48, 32);

    this.material = new THREE.ShaderMaterial({
      vertexShader: skyVertexShader,
      fragmentShader: skyFragmentShader,
      uniforms: {
        uTime: this.audioUniforms.uTime,
        uEnergy: this.audioUniforms.uEnergy,
        uMid: this.audioUniforms.uMid,
        uTreble: this.audioUniforms.uTreble,
        uSunPosition: { value: sunPosition.clone() },
      },
      side: THREE.BackSide,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);

    if (debug?.active) {
      this.setupDebug(debug);
    }
  }

  public setSunPosition(position: THREE.Vector3): void {
    this.material.uniforms.uSunPosition.value.copy(position);
  }

  public update(_delta: number, _elapsed: number, cameraPosition?: THREE.Vector3): void {
    if (cameraPosition) {
      // Center the sky dome on the camera
      this.mesh.position.copy(cameraPosition);
    }
  }

  private setupDebug(debug: Debug): void {
    const folder = debug.addFolder('Sky Atmosphere');
    if (!folder) return;
    folder.add(this.mesh, 'visible').name('Sky Visible');
  }

  public destroy(): void {
    this.scene.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
  }
}
