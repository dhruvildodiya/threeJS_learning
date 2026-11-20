import * as THREE from 'three';
import type { PhysicsWorld } from '../physics/PhysicsWorld';

export class DynamicPropsManager {
  private scene: THREE.Scene;
  private physics: PhysicsWorld;
  public meshes: THREE.Object3D[] = [];

  constructor(scene: THREE.Scene, physics: PhysicsWorld) {
    this.scene = scene;
    this.physics = physics;
  }

  public spawnIslandProps(): void {
    // 1. Wooden Cargo Crates (Dock, beach, and plateau)
    this.createCrate(new THREE.Vector3(25.5, 2.8, 5.2), 0.7);
    this.createCrate(new THREE.Vector3(26.2, 2.8, 4.2), 0.6);
    this.createCrate(new THREE.Vector3(21.2, 2.5, 6.8), 0.75);
    this.createCrate(new THREE.Vector3(4.8, 14.2, 6.5), 0.7);
    this.createCrate(new THREE.Vector3(-3.2, 16.0, -2.0), 0.65);

    // 2. Wooden Barrels (Pier, beach, cottage path)
    this.createBarrel(new THREE.Vector3(27.8, 2.8, 4.6));
    this.createBarrel(new THREE.Vector3(18.5, 2.2, 10.0));
    this.createBarrel(new THREE.Vector3(7.2, 14.2, 5.2));
    this.createBarrel(new THREE.Vector3(2.5, 14.2, 7.5));

    // 3. Tropical Beach Ball / Coconuts (Beach shore and grass)
    this.createBeachBall(new THREE.Vector3(19.8, 2.2, 7.8), 0.28);
    this.createBeachBall(new THREE.Vector3(1.2, 14.2, 9.2), 0.24);
  }

  private createCrate(pos: THREE.Vector3, size = 0.7): void {
    const halfSize = size * 0.5;
    const group = new THREE.Group();

    // Main wooden box
    const boxGeom = new THREE.BoxGeometry(size, size, size);
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0x9b6b43, // Rich warm wood
      roughness: 0.8,
      metalness: 0.05,
      flatShading: true,
    });
    const boxMesh = new THREE.Mesh(boxGeom, boxMat);
    boxMesh.castShadow = true;
    boxMesh.receiveShadow = true;
    group.add(boxMesh);

    // Corner iron reinforcement strips
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0x3e3127, // Darker wood/iron trim
      roughness: 0.9,
      metalness: 0.2,
      flatShading: true,
    });
    const edgeThickness = size * 0.08;
    const edgeGeomH = new THREE.BoxGeometry(size * 1.02, edgeThickness, edgeThickness);
    const edgeTop = new THREE.Mesh(edgeGeomH, edgeMat);
    edgeTop.position.set(0, halfSize, halfSize);
    group.add(edgeTop);

    const edgeBottom = new THREE.Mesh(edgeGeomH, edgeMat);
    edgeBottom.position.set(0, -halfSize, halfSize);
    group.add(edgeBottom);

    group.position.copy(pos);
    this.scene.add(group);
    this.meshes.push(group);

    // Add to physics world as dynamic rigid body
    this.physics.addDynamicBox(
      group,
      new THREE.Vector3(halfSize, halfSize, halfSize),
      pos,
      12.0, // mass in kg
      0.15, // restitution
      0.75  // friction
    );
  }

  private createBarrel(pos: THREE.Vector3, radius = 0.32, height = 0.82): void {
    const halfHeight = height * 0.5;
    const group = new THREE.Group();

    // Barrel stave body
    const cylGeom = new THREE.CylinderGeometry(radius * 0.92, radius * 0.92, height, 14);
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0x7a4e28, // Oak wood
      roughness: 0.75,
      metalness: 0.05,
      flatShading: true,
    });
    const barrelMesh = new THREE.Mesh(cylGeom, barrelMat);
    barrelMesh.castShadow = true;
    barrelMesh.receiveShadow = true;
    group.add(barrelMesh);

    // Metal barrel rings / hoops
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x222224, // Wrought iron hoop
      roughness: 0.5,
      metalness: 0.6,
      flatShading: true,
    });

    const ringGeom = new THREE.CylinderGeometry(radius * 0.94, radius * 0.94, height * 0.08, 14);
    const topRing = new THREE.Mesh(ringGeom, ringMat);
    topRing.position.y = halfHeight * 0.65;
    group.add(topRing);

    const midRing = new THREE.Mesh(ringGeom, ringMat);
    midRing.position.y = 0;
    group.add(midRing);

    const botRing = new THREE.Mesh(ringGeom, ringMat);
    botRing.position.y = -halfHeight * 0.65;
    group.add(botRing);

    group.position.copy(pos);
    this.scene.add(group);
    this.meshes.push(group);

    // Dynamic cylinder in Rapier physics
    this.physics.addDynamicCylinder(
      group,
      halfHeight,
      radius,
      pos,
      15.0, // mass in kg
      0.2,  // restitution
      0.65  // friction
    );
  }

  private createBeachBall(pos: THREE.Vector3, radius = 0.28): void {
    const group = new THREE.Group();

    const sphereGeom = new THREE.SphereGeometry(radius, 16, 12);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xe65100, // Vibrant tropical coral orange
      roughness: 0.35,
      metalness: 0.1,
      flatShading: true,
    });
    const sphereMesh = new THREE.Mesh(sphereGeom, ballMat);
    sphereMesh.castShadow = true;
    sphereMesh.receiveShadow = true;
    group.add(sphereMesh);

    group.position.copy(pos);
    this.scene.add(group);
    this.meshes.push(group);

    // Dynamic bouncy sphere in Rapier
    this.physics.addDynamicSphere(
      group,
      radius,
      pos,
      3.5,  // light mass in kg
      0.65, // high restitution for bouncy physical kicks
      0.45  // friction
    );
  }
}
