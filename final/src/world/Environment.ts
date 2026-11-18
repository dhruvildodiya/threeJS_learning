import * as THREE from 'three';
import type { Scene } from '../core/Scene';

export class Environment {
  public sunLight: THREE.DirectionalLight;
  public ambientLight: THREE.AmbientLight;
  public hemisphereLight: THREE.HemisphereLight;
  public hutPointLight: THREE.PointLight;

  constructor(private readonly scene: Scene) {
    // 1. Directional Sun Light
    this.sunLight = new THREE.DirectionalLight(0xffeedd, 2.2);
    this.sunLight.position.set(30, 45, 20);
    this.sunLight.castShadow = true;

    // High quality shadow configuration
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 120;

    const d = 32;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.04;

    this.scene.instance.add(this.sunLight);

    // 2. Ambient Light for soft fill
    this.ambientLight = new THREE.AmbientLight(0xdbeafe, 0.45);
    this.scene.instance.add(this.ambientLight);

    // 3. Hemisphere Light for sky/ground contrast
    this.hemisphereLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.7);
    this.hemisphereLight.position.set(0, 50, 0);
    this.scene.instance.add(this.hemisphereLight);

    // 4. Warm Point Light at coastal hut porch
    this.hutPointLight = new THREE.PointLight(0xffaa44, 2.0, 15, 1.5);
    this.hutPointLight.position.set(-6, 3.5, -4);
    this.hutPointLight.castShadow = true;
    this.hutPointLight.shadow.bias = -0.001;
    this.scene.instance.add(this.hutPointLight);
  }

  public updateSunPosition(elevation: number, azimuth: number): void {
    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);
    const radius = 50;

    this.sunLight.position.setFromSphericalCoords(radius, phi, theta);
    this.sunLight.updateMatrixWorld();
  }

  public destroy(): void {
    this.sunLight.dispose();
    this.ambientLight.dispose();
    this.hemisphereLight.dispose();
    this.hutPointLight.dispose();
  }
}

