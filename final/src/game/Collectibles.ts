import * as THREE from 'three';
import type { SoundEffects } from './SoundEffects';

export interface CrystalData {
  id: number;
  name: string;
  position: THREE.Vector3;
  mesh: THREE.Mesh;
  light: THREE.PointLight;
  isCollected: boolean;
}

export class Collectibles {
  public crystals: CrystalData[] = [];
  public collectedCount = 0;
  public totalCount = 8;

  private scene: THREE.Scene;
  private sfx: SoundEffects;

  constructor(scene: THREE.Scene, sfx: SoundEffects) {
    this.scene = scene;
    this.sfx = sfx;

    this.createCrystals();
  }

  private createCrystals(): void {
    // 8 landmark spots across Lighthouse Bay and the new Forest Isle
    const spots = [
      { name: 'Lighthouse Overlook', pos: new THREE.Vector3(-5.5, 16.66, -3.5) },
      { name: 'Waterfall Basin', pos: new THREE.Vector3(-14.5, 14.16, 1.5) },
      { name: "Keeper's Cottage", pos: new THREE.Vector3(4.5, 13.15, 9.8) },
      { name: 'Sandy Beach Landing', pos: new THREE.Vector3(27.5, 3.91, 3.2) },
      { name: 'Ancient Shrine Arch', pos: new THREE.Vector3(12.0, 12.79, -10.5) },
      { name: 'Suspension Bridge Arch', pos: new THREE.Vector3(-58.5, 9.85, 0.0) },
      { name: 'Ancient Forest Shrine', pos: new THREE.Vector3(-92.0, 14.65, 0.0) },
      { name: 'Secluded Forest Beach', pos: new THREE.Vector3(-85.0, 1.85, 22.0) },
    ];

    const geom = new THREE.OctahedronGeometry(0.38, 0);

    const colors = [
      0x38bdf8, // Sky Blue
      0x818cf8, // Indigo
      0x34d399, // Emerald
      0xf472b6, // Rose
      0xfbbf24, // Amber
      0x10b981, // Mint
      0xa855f7, // Mystical Violet
      0xf97316, // Sunset Orange
    ];

    spots.forEach((spot, idx) => {
      const color = colors[idx % colors.length];

      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.65,
        roughness: 0.1,
        metalness: 0.2,
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(spot.pos);
      mesh.castShadow = true;

      const light = new THREE.PointLight(color, 1.5, 6.0, 1.2);
      light.position.copy(spot.pos);

      this.scene.add(mesh);
      this.scene.add(light);

      this.crystals.push({
        id: idx + 1,
        name: spot.name,
        position: spot.pos,
        mesh,
        light,
        isCollected: false,
      });
    });
  }

  public update(elapsed: number): void {
    this.crystals.forEach((c) => {
      if (c.isCollected) return;

      // Gentle floating bob and rotation
      const bob = Math.sin(elapsed * 2.5 + c.id) * 0.12;
      c.mesh.position.y = c.position.y + bob;
      c.mesh.rotation.y = elapsed * 1.8 + c.id;
      c.mesh.rotation.z = Math.sin(elapsed * 1.2) * 0.2;

      // Pulse emissive light
      const pulse = 1.0 + Math.sin(elapsed * 3.5 + c.id) * 0.35;
      c.light.intensity = pulse * 1.4;
    });
  }

  public checkProximity(playerPos: THREE.Vector3): CrystalData | null {
    for (const c of this.crystals) {
      if (!c.isCollected) {
        const dist = playerPos.distanceTo(c.mesh.position);
        if (dist < 1.6) {
          return c;
        }
      }
    }
    return null;
  }

  public collect(crystal: CrystalData): void {
    if (crystal.isCollected) return;

    crystal.isCollected = true;
    this.collectedCount++;
    this.sfx.playCrystal();

    // Scale down & remove
    crystal.mesh.scale.set(0.001, 0.001, 0.001);
    crystal.light.intensity = 0;
    this.scene.remove(crystal.mesh);
    this.scene.remove(crystal.light);
  }
}

