import * as THREE from 'three';
import type { PhysicsWorld } from '../physics/PhysicsWorld';

export class ForestManager {
  public treeMeshes: THREE.Object3D[] = [];
  private animatedTrees: { object: THREE.Object3D; baseRotZ: number; baseRotX: number; phase: number; speed: number }[] = [];

  constructor() {}

  /**
   * High-Performance Optimizer & Batcher:
   * 1. Batches 170+ identical undergrowth meshes (ferns, grasses, bushes) into high-performance InstancedMesh nodes (reducing ~174 draw calls to 3).
   * 2. Replaces heavy 350,000-triangle tree canopy trimeshes with lightweight Rapier cylinder colliders for tree trunks.
   * 3. Disables shadow-casting on micro-foliage to eliminate shadow-pass fillrate bottlenecks.
   * 4. Adds organic wind sway to mature tree canopies.
   */
  public optimizeAndBatchForest(model: THREE.Object3D, scene: THREE.Scene, physics: PhysicsWorld): void {
    const groups: { [key: string]: THREE.Mesh[] } = {
      fern: [],
      grass: [],
      bush: [],
    };

    const treesToAnimate: THREE.Object3D[] = [];

    // Ensure model world transforms are up-to-date before extracting matrices
    model.updateMatrixWorld(true);

    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const name = mesh.name;

        // Soft foliage: NEVER cast shadows (only receive), eliminates 170+ shadow draw calls
        if (
          name.includes('Fern') ||
          name.includes('Grass') ||
          name.includes('Bush') ||
          name.includes('Flower')
        ) {
          mesh.castShadow = false;
          mesh.receiveShadow = true;
        }

        if (name.startsWith('Forest_Fern')) {
          groups.fern.push(mesh);
        } else if (name.startsWith('Forest_Grass')) {
          groups.grass.push(mesh);
        } else if (name.startsWith('Forest_BushB') || name.startsWith('Forest_Bush')) {
          groups.bush.push(mesh);
        } else if (name.startsWith('Forest_Maple') || name.startsWith('Forest_Birch')) {
          treesToAnimate.push(mesh);

          // Fast, lightweight cylinder collider for tree trunk (replaces massive 350k trimesh)
          const worldPos = new THREE.Vector3();
          mesh.getWorldPosition(worldPos);
          const trunkRadius = name.includes('Maple') ? 0.48 : 0.38;
          const trunkHalfH = 3.5;
          physics.addCylinderCollider(
            trunkHalfH,
            trunkRadius,
            new THREE.Vector3(worldPos.x, worldPos.y + trunkHalfH, worldPos.z)
          );
        }
      }
    });

    // Convert individual meshes into high-performance InstancedMesh (1 draw call per foliage type)
    Object.entries(groups).forEach(([key, meshList]) => {
      if (meshList.length === 0) return;

      const baseMesh = meshList[0];
      const geom = baseMesh.geometry;
      const mat = baseMesh.material;

      const instancedMesh = new THREE.InstancedMesh(geom, mat, meshList.length);
      instancedMesh.name = `Instanced_${key}`;
      instancedMesh.castShadow = false;
      instancedMesh.receiveShadow = true;

      meshList.forEach((mesh, idx) => {
        mesh.updateWorldMatrix(true, false);
        instancedMesh.setMatrixAt(idx, mesh.matrixWorld);
        // Hide individual original mesh to eliminate draw calls
        mesh.visible = false;
      });

      instancedMesh.instanceMatrix.needsUpdate = true;
      scene.add(instancedMesh);
    });

    // Register trees for lightweight ambient canopy wind sway
    treesToAnimate.forEach((tree, idx) => {
      this.treeMeshes.push(tree);
      this.animatedTrees.push({
        object: tree,
        baseRotZ: tree.rotation.z,
        baseRotX: tree.rotation.x,
        phase: idx * 0.65,
        speed: 1.1 + (idx % 4) * 0.2,
      });
    });

    console.log(
      `[ForestManager] Performance optimization complete:\n` +
      `  - Batched ${groups.fern.length} ferns into 1 InstancedMesh\n` +
      `  - Batched ${groups.grass.length} grass tufts into 1 InstancedMesh\n` +
      `  - Batched ${groups.bush.length} bushes into 1 InstancedMesh\n` +
      `  - Converted ${treesToAnimate.length} trees to lightweight cylinder trunk physics`
    );
  }

  public initFromModel(_model: THREE.Object3D): void {}

  public async loadAndSpawnForest(_walkableMeshes: THREE.Object3D[]): Promise<void> {}

  public update(elapsed: number): void {
    // Gentle natural wind sway across tree canopies
    for (let i = 0; i < this.animatedTrees.length; i++) {
      const item = this.animatedTrees[i];
      const sway = Math.sin(elapsed * item.speed + item.phase) * 0.018;
      item.object.rotation.z = item.baseRotZ + sway;
      item.object.rotation.x = item.baseRotX + Math.cos(elapsed * (item.speed * 0.8) + item.phase) * 0.012;
    }
  }
}
