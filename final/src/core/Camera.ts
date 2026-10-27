import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CameraConfig } from '../config/experience.config';

/**
 * Camera handles the main PerspectiveCamera and smooth OrbitControls.
 */
export class Camera {
  public readonly instance: THREE.PerspectiveCamera;
  public readonly controls: OrbitControls;

  constructor(
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    private readonly config: CameraConfig
  ) {
    // Initialize PerspectiveCamera
    this.instance = new THREE.PerspectiveCamera(
      this.config.fov,
      width / height,
      this.config.near,
      this.config.far
    );
    this.instance.position.copy(this.config.initialPosition);

    // Initialize OrbitControls with damping for smooth cinematic feel
    this.controls = new OrbitControls(this.instance, canvas);
    this.controls.target.copy(this.config.targetPosition);
    this.controls.enableDamping = this.config.orbitControls.enableDamping;
    this.controls.dampingFactor = this.config.orbitControls.dampingFactor;
    this.controls.autoRotate = this.config.orbitControls.autoRotate;
    this.controls.autoRotateSpeed = this.config.orbitControls.autoRotateSpeed;
    this.controls.maxPolarAngle = this.config.orbitControls.maxPolarAngle;
    this.controls.minDistance = this.config.orbitControls.minDistance;
    this.controls.maxDistance = this.config.orbitControls.maxDistance;

    this.controls.update();
  }

  public resize(width: number, height: number): void {
    this.instance.aspect = width / height;
    this.instance.updateProjectionMatrix();
  }

  public update(_delta: number): void {
    this.controls.update();
  }

  public destroy(): void {
    this.controls.dispose();
  }
}
