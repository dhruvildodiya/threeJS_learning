import * as THREE from 'three';
import type { AudioUniforms } from '../audio/types';
import type { Debug } from '../utils/Debug';

/**
 * Clouds creates stylized low-poly fluffy clouds that drift over the ocean
 * catching golden sunset light and reacting gently to music volume.
 */
export class Clouds {
  public readonly group: THREE.Group;
  private readonly cloudMeshes: Array<{
    mesh: THREE.Group;
    baseY: number;
    speed: number;
    radius: number;
    angle: number;
  }> = [];
  private readonly disposables: Array<{ dispose: () => void }> = [];

  constructor(
    private readonly scene: THREE.Scene,
    private readonly audioUniforms: AudioUniforms,
    debug?: Debug
  ) {
    this.group = new THREE.Group();
    this.group.name = 'CloudsGroup';

    this.createClouds();
    this.scene.add(this.group);

    if (debug?.active) {
      this.setupDebug(debug);
    }
  }

  private createClouds(): void {
    // Cloud puff material: soft, warm sunset peach with subtle translucency
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffd1b3,
      roughness: 0.85,
      metalness: 0.05,
      transparent: true,
      opacity: 0.88,
      flatShading: true,
    });
    this.disposables.push(cloudMat);

    const puffGeometries = [
      new THREE.DodecahedronGeometry(2.4, 1),
      new THREE.DodecahedronGeometry(3.2, 1),
      new THREE.DodecahedronGeometry(1.8, 1),
    ];
    this.disposables.push(...puffGeometries);

    // Create 10 distinct cloud formations hovering between Y: 18 - 38 and radius 40 - 110
    const cloudCount = 10;
    for (let i = 0; i < cloudCount; i++) {
      const cloud = new THREE.Group();
      const puffCount = 5 + Math.floor(Math.random() * 4);

      for (let p = 0; p < puffCount; p++) {
        const geo = puffGeometries[Math.floor(Math.random() * puffGeometries.length)];
        const mesh = new THREE.Mesh(geo, cloudMat);
        mesh.position.set(
          (Math.random() - 0.5) * 7.0,
          (Math.random() - 0.5) * 1.8,
          (Math.random() - 0.5) * 5.0
        );
        mesh.scale.set(
          1.0 + Math.random() * 0.4,
          0.7 + Math.random() * 0.4,
          1.0 + Math.random() * 0.4
        );
        mesh.castShadow = true;
        cloud.add(mesh);
      }

      const radius = 45 + Math.random() * 65;
      const angle = (i / cloudCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const baseY = 20 + Math.random() * 16;
      const speed = 0.015 + Math.random() * 0.02;

      cloud.position.set(
        Math.cos(angle) * radius,
        baseY,
        Math.sin(angle) * radius
      );

      this.group.add(cloud);
      this.cloudMeshes.push({
        mesh: cloud,
        baseY,
        speed,
        radius,
        angle,
      });
    }
  }

  public update(delta: number, elapsed: number): void {
    const energy = this.audioUniforms.uEnergy.value;

    for (const c of this.cloudMeshes) {
      // Orbit slowly around the island
      c.angle += c.speed * delta;
      c.mesh.position.x = Math.cos(c.angle) * c.radius;
      c.mesh.position.z = Math.sin(c.angle) * c.radius;

      // Gentle vertical floating breathing with music energy
      c.mesh.position.y = c.baseY + Math.sin(elapsed * 0.5 + c.angle) * 0.8 + energy * 1.5;
    }
  }

  private setupDebug(debug: Debug): void {
    const folder = debug.addFolder('Clouds');
    if (!folder) return;
    folder.add(this.group, 'visible').name('Clouds Visible');
  }

  public destroy(): void {
    this.scene.remove(this.group);
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
