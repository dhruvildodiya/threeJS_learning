import * as THREE from 'three';

export class Scene {
  public readonly instance: THREE.Scene;

  constructor() {
    this.instance = new THREE.Scene();
    this.instance.background = new THREE.Color(0x0e1b2d);
    this.instance.fog = new THREE.FogExp2(0x0e1b2d, 0.012);
  }

  public destroy(): void {
    this.instance.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => mat.dispose());
        } else if (mesh.material) {
          mesh.material.dispose();
        }
      }
    });
    this.instance.clear();
  }
}

