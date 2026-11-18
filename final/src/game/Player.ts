import * as THREE from 'three';
import type { InputManager } from './InputManager';
import type { SoundEffects } from './SoundEffects';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type RAPIER from '@dimforge/rapier3d-compat';

export class Player {
  public readonly group: THREE.Group;
  public velocity = new THREE.Vector3();
  public verticalVelocity = 0;
  public isGrounded = true;
  public speed = 0;
  public isImmobilized = false;

  private walkSpeed = 3.8;
  private sprintSpeed = 7.6;
  private jumpForce = 8.6;
  private gravity = 24.0;

  // Jump responsiveness (Coyote time & Jump buffer)
  private timeSinceGrounded = 0;
  private jumpBufferTimer = 0;
  private readonly coyoteTime = 0.12;
  private readonly jumpBufferDuration = 0.15;

  // Rapier Physics state
  private collider: RAPIER.Collider | null = null;
  private rigidBody: RAPIER.RigidBody | null = null;
  private characterController: RAPIER.KinematicCharacterController | null = null;
  public readonly capsuleHalfHeight = 0.55;
  public readonly capsuleRadius = 0.32;
  // Calibrated so boots rest flush against ground geometry (capsule halfHeight 0.55 + radius 0.32 + controller skin 0.05 + boots vertex offset 0.041 = 0.961m)
  public readonly capsuleCenterOffset = 0.96;

  // Procedural animation state
  private walkPhase = 0;
  private legL: THREE.Object3D | null = null;
  private legR: THREE.Object3D | null = null;
  private lowerLegL: THREE.Object3D | null = null;
  private lowerLegR: THREE.Object3D | null = null;
  private armL: THREE.Object3D | null = null;
  private armR: THREE.Object3D | null = null;
  private forearmL: THREE.Object3D | null = null;
  private forearmR: THREE.Object3D | null = null;
  private spine: THREE.Object3D | null = null;
  private head: THREE.Object3D | null = null;
  private lastFootstepPhase = 0;

  // Base rest rotations (captured from GLTF model)
  private baseLegL = new THREE.Euler();
  private baseLegR = new THREE.Euler();
  private baseLowerLegL = new THREE.Euler();
  private baseLowerLegR = new THREE.Euler();
  private baseArmL = new THREE.Euler();
  private baseArmR = new THREE.Euler();
  private baseForearmL = new THREE.Euler();
  private baseForearmR = new THREE.Euler();
  private baseSpine = new THREE.Euler();
  private baseHead = new THREE.Euler();

  // Fallback raycasting
  private raycaster = new THREE.Raycaster();
  private rayDown = new THREE.Vector3(0, -1, 0);
  private walkableObjects: THREE.Object3D[] = [];

  constructor(
    characterRoot: THREE.Group,
    private readonly input: InputManager,
    private readonly sfx: SoundEffects
  ) {
    this.group = characterRoot;

    // Robust bone query matching sanitized names (e.g. UpperLegL) as well as dotted/underscored variants
    const findBone = (targetName: string): THREE.Object3D | null => {
      const cleanTarget = targetName.replace(/[\._]/g, '').toLowerCase();
      let match: THREE.Object3D | null = null;
      this.group.traverse((obj) => {
        if (!match && obj.name) {
          const cleanObj = obj.name.replace(/[\._]/g, '').toLowerCase();
          if (cleanObj === cleanTarget) {
            match = obj;
          }
        }
      });
      return match;
    };

    // Cache humanoid armature bones for lifelike skeletal locomotion
    this.legL = findBone('UpperLeg.L');
    this.legR = findBone('UpperLeg.R');
    this.lowerLegL = findBone('LowerLeg.L');
    this.lowerLegR = findBone('LowerLeg.R');
    this.armL = findBone('UpperArm.L');
    this.armR = findBone('UpperArm.R');
    this.forearmL = findBone('Forearm.L');
    this.forearmR = findBone('Forearm.R');
    this.spine = findBone('Spine');
    this.head = findBone('Head');

    // Capture resting orientations from GLTF armature
    if (this.legL) this.baseLegL.copy(this.legL.rotation);
    if (this.legR) this.baseLegR.copy(this.legR.rotation);
    if (this.lowerLegL) this.baseLowerLegL.copy(this.lowerLegL.rotation);
    if (this.lowerLegR) this.baseLowerLegR.copy(this.lowerLegR.rotation);
    if (this.armL) this.baseArmL.copy(this.armL.rotation);
    if (this.armR) this.baseArmR.copy(this.armR.rotation);
    if (this.forearmL) this.baseForearmL.copy(this.forearmL.rotation);
    if (this.forearmR) this.baseForearmR.copy(this.forearmR.rotation);
    if (this.spine) this.baseSpine.copy(this.spine.rotation);
    if (this.head) this.baseHead.copy(this.head.rotation);

    console.log('Humanoid armature mapped:', {
      legL: !!this.legL,
      legR: !!this.legR,
      kneeL: !!this.lowerLegL,
      kneeR: !!this.lowerLegR,
      armL: !!this.armL,
      armR: !!this.armR,
      elbowL: !!this.forearmL,
      elbowR: !!this.forearmR,
      spine: !!this.spine,
      head: !!this.head,
    });
  }

  public setupPhysics(physics: PhysicsWorld): void {
    const initialPos = this.group.position;

    // 1. Create Kinematic RigidBody for Player
    const bodyDesc = physics.rapier.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(initialPos.x, initialPos.y + this.capsuleCenterOffset, initialPos.z);
    this.rigidBody = physics.world.createRigidBody(bodyDesc);

    // 2. Create Capsule Collider matching character anatomy (1.74m total height)
    const colliderDesc = physics.rapier.ColliderDesc.capsule(this.capsuleHalfHeight, this.capsuleRadius);
    colliderDesc.setFriction(0.0);
    colliderDesc.setRestitution(0.0);
    this.collider = physics.world.createCollider(colliderDesc, this.rigidBody);

    // 3. Create Kinematic Character Controller with Autostep and Slope Snapping
    const offset = 0.05;
    this.characterController = physics.world.createCharacterController(offset);
    // Allow climbing up to 0.90m cliff stairs smoothly
    this.characterController.enableAutostep(0.90, 0.20, true);
    this.characterController.enableSnapToGround(0.60);
    this.characterController.setMaxSlopeClimbAngle((55 * Math.PI) / 180);
    this.characterController.setMinSlopeSlideAngle((45 * Math.PI) / 180);
  }

  public setWalkableObjects(objects: THREE.Object3D[]): void {
    this.walkableObjects = objects;
  }

  public teleport(pos: THREE.Vector3): void {
    this.group.position.copy(pos);
    if (this.rigidBody) {
      this.rigidBody.setTranslation(
        { x: pos.x, y: pos.y + this.capsuleCenterOffset, z: pos.z },
        true
      );
    }
    this.velocity.set(0, 0, 0);
    this.verticalVelocity = 0;
  }

  public update(delta: number, cameraAngleY: number): void {
    if (this.isImmobilized) {
      this.velocity.set(0, 0, 0);
      this.speed = 0;
      this.updateProceduralLocomotion(delta, false);
      return;
    }

    // 1. Update Coyote Time & Jump Buffer Timers
    if (this.isGrounded) {
      this.timeSinceGrounded = 0;
    } else {
      this.timeSinceGrounded += delta;
    }

    if (this.input.jump) {
      this.jumpBufferTimer = this.jumpBufferDuration;
    } else if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer -= delta;
    }

    const isMoving = this.input.forward || this.input.backward || this.input.left || this.input.right;
    const targetMaxSpeed = this.input.sprint ? this.sprintSpeed : this.walkSpeed;

    // 2. Calculate movement direction relative to camera heading
    const moveDir = new THREE.Vector3();
    if (this.input.forward) moveDir.z -= 1;
    if (this.input.backward) moveDir.z += 1;
    if (this.input.left) moveDir.x -= 1;
    if (this.input.right) moveDir.x += 1;

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraAngleY);

      // Responsive acceleration: high on ground, controlled in air
      const accel = this.isGrounded ? 22.0 : 8.0;
      this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, moveDir.x * targetMaxSpeed, accel * delta);
      this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, moveDir.z * targetMaxSpeed, accel * delta);

      // Snappy, smooth rotation towards movement heading
      const targetRotation = Math.atan2(moveDir.x, moveDir.z);
      let diff = targetRotation - this.group.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.group.rotation.y += diff * 16.0 * delta;
    } else {
      // Natural deceleration with ground friction
      const friction = this.isGrounded ? 18.0 : 3.0;
      this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, 0, friction * delta);
      this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, 0, friction * delta);
    }

    this.speed = Math.hypot(this.velocity.x, this.velocity.z);

    // 3. Jump Execution with Coyote Time and Buffering
    const canJump = this.isGrounded || this.timeSinceGrounded < this.coyoteTime;
    if (this.jumpBufferTimer > 0 && canJump && this.verticalVelocity <= 0.1) {
      this.verticalVelocity = this.jumpForce;
      this.isGrounded = false;
      this.timeSinceGrounded = this.coyoteTime;
      this.jumpBufferTimer = 0;
      this.sfx.playJump();
    }

    // 4. Rapier Character Physics Simulation
    if (this.characterController && this.collider && this.rigidBody) {
      this.verticalVelocity -= this.gravity * delta;
      this.verticalVelocity = Math.max(this.verticalVelocity, -28.0); // Terminal velocity

      const desiredTranslation = {
        x: this.velocity.x * delta,
        y: this.verticalVelocity * delta,
        z: this.velocity.z * delta,
      };

      // Compute physics-driven translation with Rapier
      this.characterController.computeColliderMovement(this.collider, desiredTranslation);
      const computedMove = this.characterController.computedMovement();

      const wasGrounded = this.isGrounded;
      this.isGrounded = this.characterController.computedGrounded();

      if (this.isGrounded) {
        if (!wasGrounded && this.verticalVelocity < -3.0) {
          this.sfx.playLand();
        }
        if (this.verticalVelocity < 0) {
          // Maintain downward contact velocity to stay firmly planted on slopes and stairs without mid-air flickering
          this.verticalVelocity = -3.0;
        }
      }

      // Update rigid body & Three.js character group
      const currentTrans = this.rigidBody.translation();
      const nextX = currentTrans.x + computedMove.x;
      // Wading clamp allows player to wade in shallow water rather than hovering above the water surface
      const nextY = Math.max(currentTrans.y + computedMove.y, this.capsuleCenterOffset - 0.45);
      const nextZ = currentTrans.z + computedMove.z;

      if (nextY <= this.capsuleCenterOffset - 0.43) {
        this.isGrounded = true;
        this.verticalVelocity = -3.0;
      }

      this.rigidBody.setNextKinematicTranslation({ x: nextX, y: nextY, z: nextZ });
      this.group.position.set(nextX, nextY - this.capsuleCenterOffset, nextZ);
    } else {
      // Fallback raycasting
      this.verticalVelocity -= this.gravity * delta;
      this.group.position.x += this.velocity.x * delta;
      this.group.position.z += this.velocity.z * delta;
      this.group.position.y += this.verticalVelocity * delta;
      this.handleGroundCollision();
    }

    // 5. Procedural Skeletal Locomotion Animation
    this.updateProceduralLocomotion(delta, isMoving);
  }

  private handleGroundCollision(): void {
    if (this.walkableObjects.length === 0) return;

    const rayOrigin = new THREE.Vector3(
      this.group.position.x,
      this.group.position.y + 1.2,
      this.group.position.z
    );

    this.raycaster.set(rayOrigin, this.rayDown);
    this.raycaster.far = 4.0;

    const hits = this.raycaster.intersectObjects(this.walkableObjects, true);

    if (hits.length > 0) {
      const groundHit = hits[0];
      const groundY = groundHit.point.y;

      const stepUpThreshold = 0.88;
      if (this.group.position.y <= groundY + stepUpThreshold) {
        if (!this.isGrounded && this.verticalVelocity < -2.0) {
          this.sfx.playLand();
        }
        this.group.position.y = THREE.MathUtils.lerp(this.group.position.y, groundY, 0.45);
        this.verticalVelocity = 0;
        this.isGrounded = true;
      } else {
        this.isGrounded = false;
      }
    } else {
      const waterY = -0.45;
      if (this.group.position.y <= waterY) {
        this.group.position.y = waterY;
        this.verticalVelocity = -3.0;
        this.isGrounded = true;
      } else {
        this.isGrounded = false;
      }
    }
  }

  private updateProceduralLocomotion(delta: number, isMoving: boolean): void {
    if (this.isGrounded) {
      if (isMoving) {
        // Continuous walk-to-sprint factor [0 .. 1]
        const sprintFactor = THREE.MathUtils.clamp(
          (this.speed - this.walkSpeed) / (this.sprintSpeed - this.walkSpeed),
          0,
          1
        );

        // Dynamic stride frequency scaled with velocity
        const strideFreq = 3.2 + (this.speed / this.sprintSpeed) * 3.8;
        this.walkPhase += delta * strideFreq;

        const legSwing = Math.sin(this.walkPhase) * (0.48 + 0.26 * sprintFactor);
        const armSwing = Math.sin(this.walkPhase) * (0.42 + 0.30 * sprintFactor);
        // Knees bend backward when the leg is swinging backward (sin < 0 for left leg)
        const kneeBendL = Math.max(0, -Math.sin(this.walkPhase)) * (0.65 + 0.35 * sprintFactor);
        const kneeBendR = Math.max(0, Math.sin(this.walkPhase)) * (0.65 + 0.35 * sprintFactor);

        // Elbows naturally flex forward on the forward swing
        const elbowFlexL = 0.20 + Math.max(0, Math.sin(this.walkPhase)) * (0.35 + 0.25 * sprintFactor);
        const elbowFlexR = 0.20 + Math.max(0, -Math.sin(this.walkPhase)) * (0.35 + 0.25 * sprintFactor);

        // 1. Legs and Knees (pitch forward/backward on local X)
        // Left Leg forward (- rot.x), Right Leg backward (+ rot.x) when legSwing > 0
        if (this.legL) {
          const targetRot = this.baseLegL.x - legSwing;
          this.legL.rotation.x = THREE.MathUtils.lerp(this.legL.rotation.x, targetRot, 20.0 * delta);
        }
        if (this.legR) {
          const targetRot = this.baseLegR.x + legSwing;
          this.legR.rotation.x = THREE.MathUtils.lerp(this.legR.rotation.x, targetRot, 20.0 * delta);
        }
        // Human knees bend strictly BACKWARD (+ rot.x)
        if (this.lowerLegL) {
          const targetRot = this.baseLowerLegL.x + kneeBendL;
          this.lowerLegL.rotation.x = THREE.MathUtils.lerp(this.lowerLegL.rotation.x, targetRot, 20.0 * delta);
        }
        if (this.lowerLegR) {
          const targetRot = this.baseLowerLegR.x + kneeBendR;
          this.lowerLegR.rotation.x = THREE.MathUtils.lerp(this.lowerLegR.rotation.x, targetRot, 20.0 * delta);
        }

        // 2. Arms (swing on local Y) and Forearms (flex forward on local X: - rot.x)
        if (this.armL) {
          const targetRot = this.baseArmL.y + armSwing;
          this.armL.rotation.y = THREE.MathUtils.lerp(this.armL.rotation.y, targetRot, 20.0 * delta);
        }
        if (this.armR) {
          const targetRot = this.baseArmR.y + armSwing;
          this.armR.rotation.y = THREE.MathUtils.lerp(this.armR.rotation.y, targetRot, 20.0 * delta);
        }
        if (this.forearmL) {
          const targetRot = this.baseForearmL.x - elbowFlexL;
          this.forearmL.rotation.x = THREE.MathUtils.lerp(this.forearmL.rotation.x, targetRot, 20.0 * delta);
        }
        if (this.forearmR) {
          const targetRot = this.baseForearmR.x - elbowFlexR;
          this.forearmR.rotation.x = THREE.MathUtils.lerp(this.forearmR.rotation.x, targetRot, 20.0 * delta);
        }

        // 3. Torso counter-twist & forward athletic lean
        if (this.spine) {
          const twist = Math.sin(this.walkPhase) * (0.06 + 0.05 * sprintFactor);
          this.spine.rotation.y = THREE.MathUtils.lerp(this.spine.rotation.y, this.baseSpine.y + twist, 16.0 * delta);
        }
        if (this.head) {
          this.head.rotation.y = THREE.MathUtils.lerp(this.head.rotation.y, this.baseHead.y - Math.sin(this.walkPhase) * 0.03, 16.0 * delta);
        }
        this.group.rotation.x = (this.speed / this.sprintSpeed) * (0.05 + 0.06 * sprintFactor);

        // 4. Trigger Footstep Audio on stride zero-crossings
        const currentSign = Math.sign(Math.sin(this.walkPhase));
        if (this.lastFootstepPhase !== 0 && currentSign !== this.lastFootstepPhase) {
          const surface = this.group.position.y < 3.0 ? 'wood' : 'grass';
          this.sfx.playFootstep(surface);
        }
        this.lastFootstepPhase = currentSign;
      } else {
        // Return smoothly to natural resting posture
        const recoverSpeed = 12.0 * delta;
        if (this.legL) this.legL.rotation.x = THREE.MathUtils.lerp(this.legL.rotation.x, this.baseLegL.x, recoverSpeed);
        if (this.legR) this.legR.rotation.x = THREE.MathUtils.lerp(this.legR.rotation.x, this.baseLegR.x, recoverSpeed);
        if (this.lowerLegL) this.lowerLegL.rotation.x = THREE.MathUtils.lerp(this.lowerLegL.rotation.x, this.baseLowerLegL.x, recoverSpeed);
        if (this.lowerLegR) this.lowerLegR.rotation.x = THREE.MathUtils.lerp(this.lowerLegR.rotation.x, this.baseLowerLegR.x, recoverSpeed);
        if (this.armL) this.armL.rotation.y = THREE.MathUtils.lerp(this.armL.rotation.y, this.baseArmL.y, recoverSpeed);
        if (this.armR) this.armR.rotation.y = THREE.MathUtils.lerp(this.armR.rotation.y, this.baseArmR.y, recoverSpeed);
        // Relaxed resting elbow bend forward in front of hips (- rot.x)
        if (this.forearmL) this.forearmL.rotation.x = THREE.MathUtils.lerp(this.forearmL.rotation.x, this.baseForearmL.x - 0.15, recoverSpeed);
        if (this.forearmR) this.forearmR.rotation.x = THREE.MathUtils.lerp(this.forearmR.rotation.x, this.baseForearmR.x - 0.15, recoverSpeed);
        if (this.spine) {
          this.spine.rotation.y = THREE.MathUtils.lerp(this.spine.rotation.y, this.baseSpine.y, recoverSpeed);
        }
        if (this.head) {
          this.head.rotation.y = THREE.MathUtils.lerp(this.head.rotation.y, this.baseHead.y, recoverSpeed);
        }
        this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, 0, 8.0 * delta);

        // Idle natural breathing cycle
        const breath = Math.sin(performance.now() * 0.0025) * 0.022;
        if (this.spine) this.spine.rotation.x = this.baseSpine.x + breath;
        if (this.head) this.head.rotation.x = this.baseHead.x - breath * 0.45;
        this.lastFootstepPhase = 0;
      }
    } else {
      // Dynamic in-air jump / fall pose
      const airSpeed = 10.0 * delta;
      // Knees tucked naturally BACKWARD (+ rot.x)
      if (this.lowerLegL) this.lowerLegL.rotation.x = THREE.MathUtils.lerp(this.lowerLegL.rotation.x, this.baseLowerLegL.x + 0.40, airSpeed);
      if (this.lowerLegR) this.lowerLegR.rotation.x = THREE.MathUtils.lerp(this.lowerLegR.rotation.x, this.baseLowerLegR.x + 0.35, airSpeed);
      // Legs slightly forward (- rot.x)
      if (this.legL) this.legL.rotation.x = THREE.MathUtils.lerp(this.legL.rotation.x, this.baseLegL.x - 0.20, airSpeed);
      if (this.legR) this.legR.rotation.x = THREE.MathUtils.lerp(this.legR.rotation.x, this.baseLegR.x - 0.12, airSpeed);

      // Arms raised outward/forward for dynamic balance
      if (this.armL) this.armL.rotation.y = THREE.MathUtils.lerp(this.armL.rotation.y, this.baseArmL.y - 0.25, airSpeed);
      if (this.armR) this.armR.rotation.y = THREE.MathUtils.lerp(this.armR.rotation.y, this.baseArmR.y + 0.25, airSpeed);
      // Elbows flexed forward (- rot.x)
      if (this.forearmL) this.forearmL.rotation.x = THREE.MathUtils.lerp(this.forearmL.rotation.x, this.baseForearmL.x - 0.35, airSpeed);
      if (this.forearmR) this.forearmR.rotation.x = THREE.MathUtils.lerp(this.forearmR.rotation.x, this.baseForearmR.x - 0.35, airSpeed);

      this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, 0.06, airSpeed);
      this.lastFootstepPhase = 0;
    }
  }
}

