import * as THREE from 'three';
import type { InputManager } from './InputManager';

export class FollowCamera {
  public readonly camera: THREE.PerspectiveCamera;
  // Positioned naturally behind the character facing forward toward the coast
  public yaw = -2.4;
  public pitch = 0.28;
  public distance = 5.2;

  private minDistance = 2.0;
  private maxDistance = 16.0;
  private minPitch = -0.15;
  private maxPitch = 1.25;

  private currentTarget = new THREE.Vector3();
  private idealPosition = new THREE.Vector3();
  private currentPosition = new THREE.Vector3();

  // Obstacle occlusion raycaster
  private raycaster = new THREE.Raycaster();
  private occluders: THREE.Object3D[] = [];

  constructor(
    camera: THREE.PerspectiveCamera,
    private readonly input: InputManager
  ) {
    this.camera = camera;
    this.currentPosition.copy(this.camera.position);
  }

  public setOccluders(objects: THREE.Object3D[]): void {
    this.occluders = objects;
  }

  /**
   * Instantly snaps camera to ideal over-the-shoulder angle without lerp lag on initial load
   */
  public snapToTarget(playerPos: THREE.Vector3): void {
    const targetOffset = new THREE.Vector3(0, 1.6, 0);
    this.currentTarget.copy(playerPos).add(targetOffset);

    const cosPitch = Math.cos(this.pitch);
    const offsetX = this.distance * cosPitch * Math.sin(this.yaw);
    const offsetZ = this.distance * cosPitch * Math.cos(this.yaw);
    const offsetY = this.distance * Math.sin(this.pitch);

    this.idealPosition.set(
      this.currentTarget.x + offsetX,
      Math.max(this.currentTarget.y + offsetY, 0.5),
      this.currentTarget.z + offsetZ
    );

    this.currentPosition.copy(this.idealPosition);
    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentTarget);
  }

  public update(playerPos: THREE.Vector3, delta: number): void {
    // 1. Process mouse drag / look inputs
    const sens = 0.0035;
    this.yaw -= this.input.mouseDeltaX * sens;
    this.pitch += this.input.mouseDeltaY * sens;
    this.pitch = THREE.MathUtils.clamp(this.pitch, this.minPitch, this.maxPitch);

    // Zoom
    this.distance += this.input.zoomDelta;
    this.distance = THREE.MathUtils.clamp(this.distance, this.minDistance, this.maxDistance);

    this.input.resetDeltas();

    // 2. Compute camera target (player head height ~1.6m above ground)
    const targetOffset = new THREE.Vector3(0, 1.6, 0);
    const targetPos = playerPos.clone().add(targetOffset);
    this.currentTarget.lerp(targetPos, 14.0 * delta);

    // 3. Spherical coordinates to world offset
    const cosPitch = Math.cos(this.pitch);
    const offsetX = this.distance * cosPitch * Math.sin(this.yaw);
    const offsetZ = this.distance * cosPitch * Math.cos(this.yaw);
    const offsetY = this.distance * Math.sin(this.pitch);

    this.idealPosition.set(
      this.currentTarget.x + offsetX,
      Math.max(this.currentTarget.y + offsetY, 0.5), // Keep camera above ocean water
      this.currentTarget.z + offsetZ
    );

    // 4. Camera collision / occlusion check against hills and structures
    if (this.occluders.length > 0) {
      const camDir = this.idealPosition.clone().sub(this.currentTarget);
      const targetDist = camDir.length();
      if (targetDist > 0.01) {
        camDir.normalize();

        this.raycaster.set(this.currentTarget, camDir);
        this.raycaster.far = targetDist;

        const hits = this.raycaster.intersectObjects(this.occluders, true);
        if (hits.length > 0) {
          // Clamp camera position in front of hit surface with safety buffer (45cm cushion)
          const safeHitDist = Math.max(0.65, hits[0].distance - 0.45);
          this.idealPosition.copy(this.currentTarget).addScaledVector(camDir, safeHitDist);
          this.idealPosition.y = Math.max(this.idealPosition.y, 0.45);

          // Instantly bring camera in front of wall so it never clips during lerp
          const currentDist = this.currentPosition.distanceTo(this.currentTarget);
          if (currentDist > safeHitDist) {
            this.currentPosition.copy(this.currentTarget).addScaledVector(camDir, safeHitDist);
          }
        }
      }
    }

    // 5. Smooth spring interpolation to target position
    this.currentPosition.lerp(this.idealPosition, 14.0 * delta);
    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentTarget);
  }
}

