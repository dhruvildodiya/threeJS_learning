import * as THREE from 'three';
import type { RendererConfig } from '../config/experience.config';

/**
 * Renderer configures a production-quality WebGLRenderer with physically-based
 * tone mapping, SRGB color space, PCF soft shadows, and DPR limiting.
 */
export class Renderer {
  public readonly instance: THREE.WebGLRenderer;

  constructor(
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    private readonly config: RendererConfig
  ) {
    this.instance = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });

    // Color management & tone mapping
    this.instance.outputColorSpace = THREE.SRGBColorSpace;
    this.instance.toneMapping = this.config.toneMapping;
    this.instance.toneMappingExposure = this.config.toneMappingExposure;

    // Shadow configuration
    this.instance.shadowMap.enabled = true;
    this.instance.shadowMap.type = this.config.shadowMapType;

    // Sizing and DPR
    this.resize(width, height);
  }

  public resize(width: number, height: number): void {
    this.instance.setSize(width, height);
    this.instance.setPixelRatio(Math.min(window.devicePixelRatio, this.config.maxPixelRatio));
  }

  public render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.instance.render(scene, camera);
  }

  public destroy(): void {
    this.instance.dispose();
  }
}
