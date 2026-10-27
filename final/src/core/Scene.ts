import * as THREE from 'three';

/**
 * Scene manages the primary Three.js Scene graph, background, and fog.
 */
export class Scene {
  public readonly instance: THREE.Scene;

  constructor() {
    this.instance = new THREE.Scene();
  }

  public add(...objects: THREE.Object3D[]): void {
    this.instance.add(...objects);
  }

  public remove(...objects: THREE.Object3D[]): void {
    this.instance.remove(...objects);
  }

  public destroy(): void {
    this.instance.clear();
  }
}
