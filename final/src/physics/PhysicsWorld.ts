import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

export class PhysicsWorld {
  public world!: RAPIER.World;
  public rapier = RAPIER;
  private isInitialized = false;

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    await RAPIER.init();
    // Realistic snappy gravity for platforming / third-person exploration
    const gravity = { x: 0.0, y: -24.0, z: 0.0 };
    this.world = new RAPIER.World(gravity);
    this.isInitialized = true;
  }

  public step(delta: number): void {
    if (!this.isInitialized) return;
    // Step simulation with capped delta to avoid physics explosion on tab blur
    this.world.timestep = Math.min(delta, 0.05);
    this.world.step();
  }

  /**
   * Generates a static Trimesh collider from a Three.js Mesh in world coordinates
   */
  public addTrimeshCollider(mesh: THREE.Mesh): RAPIER.Collider | null {
    if (!this.isInitialized) return null;

    const geometry = mesh.geometry;
    if (!geometry) return null;

    const posAttr = geometry.attributes.position;
    if (!posAttr) return null;

    // Ensure matrixWorld is up to date
    mesh.updateMatrixWorld(true);

    const vertexCount = posAttr.count;
    const vertices = new Float32Array(vertexCount * 3);
    const tempVec = new THREE.Vector3();

    // Transform all vertices to world coordinates
    for (let i = 0; i < vertexCount; i++) {
      tempVec.fromBufferAttribute(posAttr, i);
      tempVec.applyMatrix4(mesh.matrixWorld);
      vertices[i * 3 + 0] = tempVec.x;
      vertices[i * 3 + 1] = tempVec.y;
      vertices[i * 3 + 2] = tempVec.z;
    }

    // Get indices or generate sequential triangle indices
    let indices: Uint32Array;
    if (geometry.index) {
      indices = new Uint32Array(geometry.index.array);
    } else {
      indices = new Uint32Array(vertexCount);
      for (let i = 0; i < vertexCount; i++) {
        indices[i] = i;
      }
    }

    try {
      const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed();
      const rigidBody = this.world.createRigidBody(rigidBodyDesc);

      const colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices);
      colliderDesc.setFriction(0.7);
      colliderDesc.setRestitution(0.0);

      return this.world.createCollider(colliderDesc, rigidBody);
    } catch (e) {
      console.warn(`Failed to create trimesh for ${mesh.name}:`, e);
      return null;
    }
  }

  /**
   * Creates a cylinder collider (useful for towers, tree trunks, etc.)
   */
  public addCylinderCollider(halfHeight: number, radius: number, position: THREE.Vector3): RAPIER.Collider | null {
    if (!this.isInitialized) return null;

    const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z);
    const rigidBody = this.world.createRigidBody(rigidBodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.cylinder(halfHeight, radius);
    colliderDesc.setFriction(0.6);
    return this.world.createCollider(colliderDesc, rigidBody);
  }

  /**
   * Creates a box collider (useful for walls, cottages, docks)
   */
  public addBoxCollider(halfExtents: THREE.Vector3, position: THREE.Vector3): RAPIER.Collider | null {
    if (!this.isInitialized) return null;

    const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z);
    const rigidBody = this.world.createRigidBody(rigidBodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z);
    colliderDesc.setFriction(0.6);
    return this.world.createCollider(colliderDesc, rigidBody);
  }
}

