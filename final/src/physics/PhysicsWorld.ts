import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

export interface DynamicProp {
  mesh: THREE.Object3D;
  body: RAPIER.RigidBody;
}

export class PhysicsWorld {
  public world!: RAPIER.World;
  public rapier = RAPIER;
  private isInitialized = false;
  public dynamicProps: DynamicProp[] = [];

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    await RAPIER.init();
    // Snappy responsive gravity for platforming / third-person exploration
    const gravity = { x: 0.0, y: -24.0, z: 0.0 };
    this.world = new RAPIER.World(gravity);
    this.isInitialized = true;
  }

  public step(delta: number): void {
    if (!this.isInitialized) return;
    // Step simulation with capped delta to avoid physics explosion on tab blur
    this.world.timestep = Math.min(delta, 0.05);
    this.world.step();

    // Synchronize dynamic rigid bodies with Three.js meshes
    for (let i = 0; i < this.dynamicProps.length; i++) {
      const prop = this.dynamicProps[i];
      const t = prop.body.translation();
      const r = prop.body.rotation();
      prop.mesh.position.set(t.x, t.y, t.z);
      prop.mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }
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

  /**
   * Registers a dynamic box/cuboid prop with full physics simulation
   */
  public addDynamicBox(
    mesh: THREE.Object3D,
    halfExtents: THREE.Vector3,
    position: THREE.Vector3,
    mass = 12,
    restitution = 0.2,
    friction = 0.7
  ): RAPIER.RigidBody | null {
    if (!this.isInitialized) return null;

    const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z)
      .setLinearDamping(0.8)
      .setAngularDamping(0.8);
    const rigidBody = this.world.createRigidBody(rigidBodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z)
      .setMass(mass)
      .setRestitution(restitution)
      .setFriction(friction);

    this.world.createCollider(colliderDesc, rigidBody);
    this.dynamicProps.push({ mesh, body: rigidBody });
    return rigidBody;
  }

  /**
   * Registers a dynamic cylinder prop (e.g. rolling barrels)
   */
  public addDynamicCylinder(
    mesh: THREE.Object3D,
    halfHeight: number,
    radius: number,
    position: THREE.Vector3,
    mass = 15,
    restitution = 0.2,
    friction = 0.6
  ): RAPIER.RigidBody | null {
    if (!this.isInitialized) return null;

    const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z)
      .setLinearDamping(0.6)
      .setAngularDamping(0.6);
    const rigidBody = this.world.createRigidBody(rigidBodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.cylinder(halfHeight, radius)
      .setMass(mass)
      .setRestitution(restitution)
      .setFriction(friction);

    this.world.createCollider(colliderDesc, rigidBody);
    this.dynamicProps.push({ mesh, body: rigidBody });
    return rigidBody;
  }

  /**
   * Registers a dynamic sphere prop (e.g. beach balls, coconuts)
   */
  public addDynamicSphere(
    mesh: THREE.Object3D,
    radius: number,
    position: THREE.Vector3,
    mass = 4,
    restitution = 0.6,
    friction = 0.5
  ): RAPIER.RigidBody | null {
    if (!this.isInitialized) return null;

    const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z)
      .setLinearDamping(0.5)
      .setAngularDamping(0.5);
    const rigidBody = this.world.createRigidBody(rigidBodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.ball(radius)
      .setMass(mass)
      .setRestitution(restitution)
      .setFriction(friction);

    this.world.createCollider(colliderDesc, rigidBody);
    this.dynamicProps.push({ mesh, body: rigidBody });
    return rigidBody;
  }

  /**
   * Applies an impulse force to dynamic objects within close contact range directly in front of the player
   */
  public kickNearbyDynamicProps(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance = 1.15,
    forceMagnitude = 200
  ): number {
    let kickedCount = 0;
    const forward2D = new THREE.Vector2(direction.x, direction.z).normalize();
    const normDir = direction.clone().normalize();
    normDir.y = Math.max(normDir.y + 0.35, 0.25);
    normDir.normalize();

    const footPos = origin.clone();
    footPos.y += 0.25;

    for (const prop of this.dynamicProps) {
      const trans = prop.body.translation();
      const propPos = new THREE.Vector3(trans.x, trans.y, trans.z);

      // Horizontal distance check (requires close physical contact)
      const dx = propPos.x - footPos.x;
      const dz = propPos.z - footPos.z;
      const horizDist = Math.hypot(dx, dz);
      if (horizDist > maxDistance) continue;

      // Vertical reach check (cannot kick objects far above head or deep below floor)
      const dy = Math.abs(propPos.y - footPos.y);
      if (dy > 1.2) continue;

      // Forward direction check: object must be directly in front of the player (within ~65° cone)
      const dirToProp = new THREE.Vector2(dx, dz).normalize();
      const dot = forward2D.dot(dirToProp);
      if (dot < 0.45) continue;

      const impulseScale = Math.max(0.4, 1.0 - horizDist / maxDistance);
      const impulse = {
        x: normDir.x * forceMagnitude * impulseScale,
        y: normDir.y * forceMagnitude * impulseScale,
        z: normDir.z * forceMagnitude * impulseScale,
      };
      prop.body.applyImpulse(impulse, true);
      prop.body.applyTorqueImpulse(
        {
          x: (Math.random() - 0.5) * forceMagnitude * 0.15,
          y: (Math.random() - 0.5) * forceMagnitude * 0.15,
          z: (Math.random() - 0.5) * forceMagnitude * 0.15,
        },
        true
      );
      kickedCount++;
    }
    return kickedCount;
  }
}


