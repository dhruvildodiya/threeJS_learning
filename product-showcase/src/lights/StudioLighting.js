import * as THREE from 'three';

export class StudioLighting {
  constructor(scene) {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(this.ambientLight);

    this.keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    this.keyLight.position.set(2.5, 3.5, 2.5);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.bias = -0.0001;
    scene.add(this.keyLight);

    this.fillLight = new THREE.DirectionalLight(0x7dd3fc, 0.9);
    this.fillLight.position.set(-3, 1.5, 1.5);
    scene.add(this.fillLight);

    this.rimLight = new THREE.DirectionalLight(0xffffff, 1.4);
    this.rimLight.position.set(0, 2.5, -2.5);
    scene.add(this.rimLight);
  }
}
