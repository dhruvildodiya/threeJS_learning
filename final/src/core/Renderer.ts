import * as THREE from 'three';
import type { Sizes } from './Sizes';
import type { Scene } from './Scene';
import type { Camera } from './Camera';

export class Renderer {
  public readonly instance: THREE.WebGLRenderer;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly sizes: Sizes,
    private readonly scene: Scene,
    private readonly camera: Camera
  ) {
    this.instance = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
    });

    this.instance.setSize(this.sizes.width, this.sizes.height);
    this.instance.setPixelRatio(this.sizes.pixelRatio);

    this.instance.shadowMap.enabled = true;
    this.instance.shadowMap.type = THREE.PCFSoftShadowMap;

    this.instance.toneMapping = THREE.ACESFilmicToneMapping;
    this.instance.toneMappingExposure = 1.15;
  }

  public resize(): void {
    this.instance.setSize(this.sizes.width, this.sizes.height);
    this.instance.setPixelRatio(this.sizes.pixelRatio);
  }

  public update(): void {
    this.instance.render(this.scene.instance, this.camera.instance);
  }

  public destroy(): void {
    this.instance.dispose();
  }
}

