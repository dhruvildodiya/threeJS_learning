import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';
import type { Sizes } from './Sizes';
import type { Scene } from './Scene';

export interface CameraPreset {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export class Camera {
  public readonly instance: THREE.PerspectiveCamera;
  public readonly controls: OrbitControls;

  public readonly presets: Record<string, CameraPreset> = {
    overview: {
      position: new THREE.Vector3(26, 16, 26),
      target: new THREE.Vector3(0, 3, 0),
    },
    lighthouse: {
      position: new THREE.Vector3(12, 18, 12),
      target: new THREE.Vector3(2, 10, -1),
    },
    hut: {
      position: new THREE.Vector3(-14, 8, 4),
      target: new THREE.Vector3(-4, 4.5, -2),
    },
    dock: {
      position: new THREE.Vector3(16, 5, -16),
      target: new THREE.Vector3(5, 1, -6),
    },
  };

  constructor(
    private readonly scene: Scene,
    private readonly sizes: Sizes,
    private readonly canvas: HTMLCanvasElement
  ) {
    this.instance = new THREE.PerspectiveCamera(
      45,
      this.sizes.width / this.sizes.height,
      0.1,
      500
    );
    this.instance.position.copy(this.presets.overview.position);

    this.scene.instance.add(this.instance);

    this.controls = new OrbitControls(this.instance, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02; // Don't go below water
    this.controls.minDistance = 3;
    this.controls.maxDistance = 120;
    this.controls.target.copy(this.presets.overview.target);
    this.controls.update();
  }

  public resize(): void {
    this.instance.aspect = this.sizes.width / this.sizes.height;
    this.instance.updateProjectionMatrix();
  }

  public update(): void {
    this.controls.update();
  }

  public applyPreset(name: string, duration = 1.4): void {
    const preset = this.presets[name];
    if (!preset) return;

    gsap.killTweensOf(this.instance.position);
    gsap.killTweensOf(this.controls.target);

    gsap.to(this.instance.position, {
      x: preset.position.x,
      y: preset.position.y,
      z: preset.position.z,
      duration,
      ease: 'power3.inOut',
    });

    gsap.to(this.controls.target, {
      x: preset.target.x,
      y: preset.target.y,
      z: preset.target.z,
      duration,
      ease: 'power3.inOut',
    });
  }

  public destroy(): void {
    this.controls.dispose();
  }
}

