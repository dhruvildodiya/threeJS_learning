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
  // Slimmer capsule matching human foot/hip stance (0.48m diameter) to prevent edge/slope propping
  public readonly capsuleHalfHeight = 0.63;
  public readonly capsuleRadius = 0.24;
  // Calibrated so boots rest firmly planted against ground geometry (0.63 + 0.24 + 0.03 skin + 0.041 boot offset + 0.015 plant = 0.956m)
  public readonly capsuleCenterOffset = 0.96;

  // Armature root reference for gait weight transfer bobbing
  private armature: THREE.Object3D | null = null;
  private baseArmatureY = 0;

  // Procedural animation state
  private walkPhase = 0;
  private physicsWorld: PhysicsWorld | null = null;
  public isKicking = false;
  private kickTimer = 0;
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

  // Keyframed Model Animations (Mixer & Actions)
  private mixer: THREE.AnimationMixer | null = null;
  private walkAction: THREE.AnimationAction | null = null;
  private sprintAction: THREE.AnimationAction | null = null;
  private jumpAction: THREE.AnimationAction | null = null;
  private idleAction: THREE.AnimationAction | null = null;
  private currentAction: THREE.AnimationAction | null = null;
  private currentAnimState: 'idle' | 'walk' | 'sprint' | 'jump' = 'idle';

  // Base rest rotations (captured from GLTF model)
  private baseLegL = new THREE.Euler();
  private baseLegR = new THREE.Euler();
  private baseLowerLegL = new THREE.Euler();
  private baseLowerLegR = new THREE.Euler();
  private baseQuatArmL = new THREE.Quaternion();
  private baseQuatArmR = new THREE.Quaternion();
  private baseQuatForearmL = new THREE.Quaternion();
  private baseQuatForearmR = new THREE.Quaternion();
  private baseSpine = new THREE.Euler();
  private baseHead = new THREE.Euler();

  // Reusable math objects for GC-free anatomical arm kinematics
  private readonly tempPitchAxis = new THREE.Vector3();
  private readonly tempElbowAxis = new THREE.Vector3();
  private readonly tempParentInv = new THREE.Quaternion();
  private readonly tempArmInv = new THREE.Quaternion();
  private readonly tempDeltaQuat = new THREE.Quaternion();
  private readonly targetQuatArmL = new THREE.Quaternion();
  private readonly targetQuatArmR = new THREE.Quaternion();
  private readonly targetQuatForearmL = new THREE.Quaternion();
  private readonly targetQuatForearmR = new THREE.Quaternion();

  // Fallback raycasting
  private raycaster = new THREE.Raycaster();
  private rayDown = new THREE.Vector3(0, -1, 0);
  private walkableObjects: THREE.Object3D[] = [];

  constructor(
    characterRoot: THREE.Group,
    private readonly input: InputManager,
    private readonly sfx: SoundEffects,
    animations: THREE.AnimationClip[] = []
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
    if (this.armL) this.baseQuatArmL.copy(this.armL.quaternion);
    if (this.armR) this.baseQuatArmR.copy(this.armR.quaternion);
    if (this.forearmL) this.baseQuatForearmL.copy(this.forearmL.quaternion);
    if (this.forearmR) this.baseQuatForearmR.copy(this.forearmR.quaternion);
    if (this.spine) this.baseSpine.copy(this.spine.rotation);
    if (this.head) this.baseHead.copy(this.head.rotation);

    this.armature = this.group.getObjectByName('Armature_Keeper') || null;
    if (this.armature) {
      this.baseArmatureY = this.armature.position.y;
    }

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

    this.setupAnimations(animations);
  }

  private setupAnimations(animations: THREE.AnimationClip[]): void {
    if (!animations || animations.length === 0) return;

    this.mixer = new THREE.AnimationMixer(this.group);
    console.log('[Player] Initializing animations from model:', animations.map((a) => a.name));

    const rootName = this.group.name;
    const prefix = `${rootName}/`;

    animations.forEach((origClip) => {
      // Fix track names if glTF exported with root container prefix
      let clip = origClip;
      const needsPrefixFix = origClip.tracks.some((t) => t.name.startsWith(prefix));
      if (needsPrefixFix) {
        const adjustedTracks = origClip.tracks.map((t) => {
          if (t.name.startsWith(prefix)) {
            const cloned = t.clone();
            cloned.name = cloned.name.substring(prefix.length);
            return cloned;
          }
          return t;
        });
        clip = new THREE.AnimationClip(origClip.name, origClip.duration, adjustedTracks);
      }

      const lowerName = clip.name.toLowerCase();
      const action = this.mixer!.clipAction(clip);

      if (lowerName.includes('sprint') || lowerName.includes('run') || lowerName.includes('fast')) {
        this.sprintAction = action;
        console.log(`[Player] Mapped Sprint action: "${clip.name}" (${clip.duration.toFixed(2)}s)`);
      } else if (lowerName.includes('walk') || lowerName.includes('jog')) {
        this.walkAction = action;
        console.log(`[Player] Mapped Walk action: "${clip.name}" (${clip.duration.toFixed(2)}s)`);
      } else if (lowerName.includes('jump') || lowerName.includes('leap') || lowerName.includes('air')) {
        this.jumpAction = action;
        console.log(`[Player] Mapped Jump action: "${clip.name}" (${clip.duration.toFixed(2)}s)`);
      } else if (lowerName.includes('idle') || lowerName.includes('rest') || lowerName.includes('breath')) {
        this.idleAction = action;
        console.log(`[Player] Mapped Idle action: "${clip.name}" (${clip.duration.toFixed(2)}s)`);
      }
    });

    if (this.idleAction) {
      this.idleAction.play();
      this.currentAction = this.idleAction;
      this.currentAnimState = 'idle';
    }
  }

  public setupPhysics(physics: PhysicsWorld): void {
    this.physicsWorld = physics;
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
    const offset = 0.03;
    this.characterController = physics.world.createCharacterController(offset);
    // Allow climbing up to 0.70m cliff stairs smoothly without high-ledge snapping
    this.characterController.enableAutostep(0.70, 0.20, true);
    this.characterController.enableSnapToGround(0.60);
    this.characterController.setMaxSlopeClimbAngle((55 * Math.PI) / 180);
    // Walkable slopes up to 65° will not slide down automatically
    this.characterController.setMinSlopeSlideAngle((65 * Math.PI) / 180);

    // Apply impulses to dynamic bodies when character pushes or bumps into them
    this.characterController.setApplyImpulsesToDynamicBodies(true);
    this.characterController.setCharacterMass(75.0);
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

    // Physical kick action
    if (this.input.consumeKick() && !this.isKicking) {
      this.isKicking = true;
      this.kickTimer = 0.38;
      this.sfx.playKick();

      if (this.physicsWorld) {
        // Kick forward in player's current facing direction (requires close physical contact)
        const kickDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          this.group.rotation.y
        );
        this.physicsWorld.kickNearbyDynamicProps(this.group.position, kickDir, 1.35, 260);
      }
    }

    if (this.isKicking) {
      this.kickTimer -= delta;
      if (this.kickTimer <= 0) {
        this.isKicking = false;
      }
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

      // Ceiling / overhead obstacle head-bump: cancel upward velocity if blocked from above
      if (desiredTranslation.y > 0.001 && computedMove.y < desiredTranslation.y * 0.5) {
        this.verticalVelocity = Math.min(this.verticalVelocity, 0);
      }

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
      // When grounded and stationary on a slope, lock lateral movement so character stays firmly planted without downhill sliding
      const moveX = (this.isGrounded && !isMoving) ? 0 : computedMove.x;
      const moveZ = (this.isGrounded && !isMoving) ? 0 : computedMove.z;
      const nextX = currentTrans.x + moveX;
      // Wading clamp allows player to wade in shallow water rather than hovering above the water surface
      const nextY = Math.max(currentTrans.y + computedMove.y, this.capsuleCenterOffset - 0.45);
      const nextZ = currentTrans.z + moveZ;

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

    // 5. Skeletal Locomotion: use keyframed model animation mixer if available, otherwise procedural fallback
    if (this.mixer && (this.walkAction || this.sprintAction || this.jumpAction || this.idleAction)) {
      this.updateModelAnimations(delta, isMoving);
    } else {
      this.updateProceduralLocomotion(delta, isMoving);
    }
  }

  private updateModelAnimations(delta: number, isMoving: boolean): void {
    if (!this.mixer) return;

    let targetState: 'idle' | 'walk' | 'sprint' | 'jump' = 'idle';
    if (!this.isGrounded) {
      targetState = 'jump';
    } else if (isMoving) {
      targetState = (this.input.sprint && this.sprintAction) ? 'sprint' : 'walk';
    } else {
      targetState = 'idle';
    }

    if (this.currentAnimState !== targetState) {
      const prevAction = this.currentAction;
      let nextAction: THREE.AnimationAction | null = null;

      if (targetState === 'jump') {
        nextAction = this.jumpAction;
      } else if (targetState === 'sprint') {
        nextAction = this.sprintAction || this.walkAction;
      } else if (targetState === 'walk') {
        nextAction = this.walkAction;
      } else {
        nextAction = this.idleAction;
      }

      if (nextAction && nextAction !== prevAction) {
        // Stride phase matching between walk and sprint for seamless gait continuity
        let matchedTime = 0;
        if (
          prevAction &&
          ((prevAction === this.walkAction && nextAction === this.sprintAction) ||
           (prevAction === this.sprintAction && nextAction === this.walkAction))
        ) {
          const prevDuration = prevAction.getClip().duration;
          const nextDuration = nextAction.getClip().duration;
          if (prevDuration > 0 && nextDuration > 0) {
            const progress = (prevAction.time % prevDuration) / prevDuration;
            matchedTime = progress * nextDuration;
          }
        }

        nextAction.reset();
        if (matchedTime > 0) {
          nextAction.time = matchedTime;
        }

        if (targetState === 'jump') {
          // Play jump smoothly once or hold last frame in air
          nextAction.setLoop(THREE.LoopOnce, 1);
          nextAction.clampWhenFinished = true;
          nextAction.fadeIn(0.12);
        } else {
          nextAction.setLoop(THREE.LoopRepeat, Infinity);
          const isGaitShift = (prevAction === this.walkAction || prevAction === this.sprintAction) &&
                              (nextAction === this.walkAction || nextAction === this.sprintAction);
          const fadeDuration = isGaitShift ? 0.15 : 0.2;
          nextAction.fadeIn(fadeDuration);
        }

        if (prevAction) {
          const isGaitShift = (prevAction === this.walkAction || prevAction === this.sprintAction) &&
                              (targetState === 'walk' || targetState === 'sprint');
          const fadeDuration = isGaitShift ? 0.15 : 0.2;
          prevAction.fadeOut(fadeDuration);
        }

        nextAction.play();
        this.currentAction = nextAction;
      } else if (!nextAction && prevAction) {
        prevAction.fadeOut(0.2);
        this.currentAction = null;
      }

      this.currentAnimState = targetState;
    }

    // Dynamic walk/sprint playback rate scaling matched to physical velocity
    if (this.currentAnimState === 'walk' && this.walkAction) {
      const speedRatio = this.speed / this.walkSpeed;
      this.walkAction.timeScale = THREE.MathUtils.clamp(speedRatio, 0.6, 2.0);
    } else if (this.currentAnimState === 'sprint' && this.sprintAction) {
      const speedRatio = this.speed / this.sprintSpeed;
      this.sprintAction.timeScale = THREE.MathUtils.clamp(speedRatio, 0.6, 2.0);
    }

    // Footstep audio triggered during walk and sprint animations
    const activeMovingAction = this.currentAnimState === 'sprint'
      ? this.sprintAction
      : (this.currentAnimState === 'walk' ? this.walkAction : null);

    if (activeMovingAction) {
      const animTime = activeMovingAction.time;
      const animDuration = activeMovingAction.getClip().duration;
      if (animDuration > 0) {
        const normalizedTime = (animTime % animDuration) / animDuration;
        const footPhase = normalizedTime < 0.5 ? 1 : 2;
        if (footPhase !== this.lastFootstepPhase) {
          const isBridge = this.group.position.x < -26.0 && this.group.position.x > -59.0 && Math.abs(this.group.position.z) < 2.5;
          const surface = (this.group.position.y < 3.0 || isBridge) ? 'wood' : 'grass';
          this.sfx.playFootstep(surface);
          this.lastFootstepPhase = footPhase;
        }
      }
    } else if (this.currentAnimState !== 'walk' && this.currentAnimState !== 'sprint') {
      this.lastFootstepPhase = 0;
    }

    this.mixer.update(delta);

    // Dynamic forward martial-arts kick override on top of model animations
    if (this.isKicking && this.legR) {
      const progress = THREE.MathUtils.clamp(1.0 - (this.kickTimer / 0.38), 0, 1);
      const strikeCurve = Math.sin(progress * Math.PI);
      const hipKickAngle = strikeCurve * 1.35; // ~77 degrees forward kick lift
      const kneeSnap = Math.sin(Math.pow(progress, 0.75) * Math.PI) * 0.65;

      this.tempPitchAxis.set(1, 0, 0);
      this.tempDeltaQuat.setFromAxisAngle(this.tempPitchAxis, -hipKickAngle);
      this.legR.quaternion.multiply(this.tempDeltaQuat);

      if (this.lowerLegR) {
        this.tempDeltaQuat.setFromAxisAngle(this.tempPitchAxis, kneeSnap);
        this.lowerLegR.quaternion.multiply(this.tempDeltaQuat);
      }

      if (this.spine) {
        // Athletic torso counter-lean for balance
        this.tempDeltaQuat.setFromAxisAngle(this.tempPitchAxis, strikeCurve * 0.22);
        this.spine.quaternion.multiply(this.tempDeltaQuat);
      }

      if (this.armR) {
        // Right arm swings back for balance
        this.tempDeltaQuat.setFromAxisAngle(this.tempPitchAxis, strikeCurve * 0.45);
        this.armR.quaternion.multiply(this.tempDeltaQuat);
      }
      if (this.armL) {
        // Left arm extends forward
        this.tempDeltaQuat.setFromAxisAngle(this.tempPitchAxis, -strikeCurve * 0.35);
        this.armL.quaternion.multiply(this.tempDeltaQuat);
      }
    }
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
    if (this.isKicking && this.legR) {
      const progress = THREE.MathUtils.clamp(1.0 - (this.kickTimer / 0.38), 0, 1);
      const strikeCurve = Math.sin(progress * Math.PI);
      const kickAngle = strikeCurve * 1.35;
      this.legR.rotation.x = this.baseLegR.x - kickAngle;
      if (this.lowerLegR) {
        this.lowerLegR.rotation.x = this.baseLowerLegR.x + Math.sin(Math.pow(progress, 0.75) * Math.PI) * 0.65;
      }
      return;
    }

    if (this.isGrounded) {
      if (isMoving) {
        // Continuous walk-to-sprint factor [0 .. 1]
        const sprintFactor = THREE.MathUtils.clamp(
          (this.speed - this.walkSpeed) / (this.sprintSpeed - this.walkSpeed),
          0,
          1
        );

        // Calibrated realistic human cadence (relaxed, grounded steps instead of rapid cartoon flapping)
        // Walk (~3.8 m/s): ~8.0 rad/s (1.27 strides/sec, 2.5 steps/sec - calm, natural pace)
        // Sprint (~7.6 m/s): ~12.0 rad/s (1.91 strides/sec, 3.8 steps/sec - athletic sprint)
        const baseWalkCadence = 8.0;
        const sprintCadence = 12.0;
        const speedRatio = Math.min(this.speed / this.walkSpeed, 1.0);
        const strideFreq = (speedRatio * baseWalkCadence) + (sprintFactor * (sprintCadence - baseWalkCadence));
        this.walkPhase += delta * strideFreq;

        const cycle = Math.sin(this.walkPhase);
        const cycleCos = Math.cos(this.walkPhase);

        // Natural human gait amplitudes
        const legSwingAmp = THREE.MathUtils.lerp(0.36, 0.54, sprintFactor);
        const armSwingAmp = THREE.MathUtils.lerp(0.28, 0.44, sprintFactor);
        const kneeBendAmp = THREE.MathUtils.lerp(0.48, 0.82, sprintFactor);

        // 1. Biomechanical Pelvis & Weight Transfer (removes hovercraft gliding)
        // Vertical hip bobbing (drops during passing position)
        const hipBob = -Math.abs(cycle) * (0.016 + 0.014 * sprintFactor);
        // Lateral hip sway (shifts body weight over the planted stance leg)
        const hipSway = cycleCos * (0.010 + 0.008 * sprintFactor);
        if (this.armature) {
          this.armature.position.y = this.baseArmatureY + hipBob;
          this.armature.position.x = hipSway;
          this.armature.rotation.z = cycleCos * 0.014;
        }

        // 2. Legs: Alternate pitch on local X with natural muscle inertia
        const legBlendSpeed = 14.0 * delta;
        // Left leg swings forward when cycle > 0 (- rot.x); Right leg forward when cycle < 0 (- rot.x)
        if (this.legL) {
          const targetRot = this.baseLegL.x - cycle * legSwingAmp;
          this.legL.rotation.x = THREE.MathUtils.lerp(this.legL.rotation.x, targetRot, legBlendSpeed);
        }
        if (this.legR) {
          const targetRot = this.baseLegR.x + cycle * legSwingAmp;
          this.legR.rotation.x = THREE.MathUtils.lerp(this.legR.rotation.x, targetRot, legBlendSpeed);
        }

        // Knees: Flex backward (+ rot.x) strictly during the SWING phase to clear the ground
        const kneeBendL = Math.max(0, cycle) * kneeBendAmp;
        const kneeBendR = Math.max(0, -cycle) * kneeBendAmp;
        if (this.lowerLegL) {
          const targetRot = this.baseLowerLegL.x + kneeBendL;
          this.lowerLegL.rotation.x = THREE.MathUtils.lerp(this.lowerLegL.rotation.x, targetRot, 15.0 * delta);
        }
        if (this.lowerLegR) {
          const targetRot = this.baseLowerLegR.x + kneeBendR;
          this.lowerLegR.rotation.x = THREE.MathUtils.lerp(this.lowerLegR.rotation.x, targetRot, 15.0 * delta);
        }

        // 3. Arms: Biomechanically accurate sagittal pitch alongside torso (zero sideways flailing or hand crossover)
        const armBlendSpeed = Math.min(1.0, 14.0 * delta);
        // Contralateral swing: Left leg forward -> Left arm backward (+swing), Right arm forward (-swing)
        const swingL = cycle * armSwingAmp;
        const swingR = -cycle * armSwingAmp;
        // Natural subtle elbow flexion when swinging forward:
        const flexL = 0.05 + Math.max(0, -swingL) * (0.35 + 0.15 * sprintFactor);
        const flexR = 0.05 + Math.max(0, -swingR) * (0.35 + 0.15 * sprintFactor);

        if (this.armL) {
          const parentObj = this.armL.parent || this.armature;
          const parentQuat = parentObj ? parentObj.quaternion : this.tempParentInv.identity();
          this.tempParentInv.copy(parentQuat).invert();
          this.tempPitchAxis.set(1, 0, 0).applyQuaternion(this.tempParentInv);
          this.tempDeltaQuat.setFromAxisAngle(this.tempPitchAxis, swingL);
          this.targetQuatArmL.multiplyQuaternions(this.tempDeltaQuat, this.baseQuatArmL);
          this.armL.quaternion.slerp(this.targetQuatArmL, armBlendSpeed);

          if (this.forearmL) {
            this.tempArmInv.copy(this.armL.quaternion).invert();
            this.tempElbowAxis.copy(this.tempPitchAxis).applyQuaternion(this.tempArmInv);
            this.tempDeltaQuat.setFromAxisAngle(this.tempElbowAxis, flexL);
            this.targetQuatForearmL.multiplyQuaternions(this.tempDeltaQuat, this.baseQuatForearmL);
            this.forearmL.quaternion.slerp(this.targetQuatForearmL, armBlendSpeed);
          }
        }

        if (this.armR) {
          const parentObj = this.armR.parent || this.armature;
          const parentQuat = parentObj ? parentObj.quaternion : this.tempParentInv.identity();
          this.tempParentInv.copy(parentQuat).invert();
          this.tempPitchAxis.set(1, 0, 0).applyQuaternion(this.tempParentInv);
          this.tempDeltaQuat.setFromAxisAngle(this.tempPitchAxis, swingR);
          this.targetQuatArmR.multiplyQuaternions(this.tempDeltaQuat, this.baseQuatArmR);
          this.armR.quaternion.slerp(this.targetQuatArmR, armBlendSpeed);

          if (this.forearmR) {
            this.tempArmInv.copy(this.armR.quaternion).invert();
            this.tempElbowAxis.copy(this.tempPitchAxis).applyQuaternion(this.tempArmInv);
            this.tempDeltaQuat.setFromAxisAngle(this.tempElbowAxis, flexR);
            this.targetQuatForearmR.multiplyQuaternions(this.tempDeltaQuat, this.baseQuatForearmR);
            this.forearmR.quaternion.slerp(this.targetQuatForearmR, armBlendSpeed);
          }
        }

        // 4. Torso Counter-Twist & Natural Athletic Lean
        if (this.spine) {
          const twist = cycle * (0.045 + 0.035 * sprintFactor);
          this.spine.rotation.y = THREE.MathUtils.lerp(this.spine.rotation.y, this.baseSpine.y + twist, 16.0 * delta);
        }
        if (this.head) {
          this.head.rotation.y = THREE.MathUtils.lerp(this.head.rotation.y, this.baseHead.y - cycle * 0.02, 16.0 * delta);
        }
        this.group.rotation.x = (this.speed / this.sprintSpeed) * (0.04 + 0.05 * sprintFactor);

        // 5. Trigger Footstep Audio on heel-strike transitions
        const currentSign = Math.sign(cycle);
        if (this.lastFootstepPhase !== 0 && currentSign !== this.lastFootstepPhase) {
          const isBridge = this.group.position.x < -26.0 && this.group.position.x > -59.0 && Math.abs(this.group.position.z) < 2.5;
          const surface = (this.group.position.y < 3.0 || isBridge) ? 'wood' : 'grass';
          this.sfx.playFootstep(surface);
        }
        this.lastFootstepPhase = currentSign;
      } else {
        // Return smoothly to natural resting posture
        const recoverSpeed = 12.0 * delta;
        if (this.armature) {
          this.armature.position.y = THREE.MathUtils.lerp(this.armature.position.y, this.baseArmatureY, recoverSpeed);
          this.armature.position.x = THREE.MathUtils.lerp(this.armature.position.x, 0, recoverSpeed);
          this.armature.rotation.z = THREE.MathUtils.lerp(this.armature.rotation.z, 0, recoverSpeed);
        }
        if (this.legL) this.legL.rotation.x = THREE.MathUtils.lerp(this.legL.rotation.x, this.baseLegL.x, recoverSpeed);
        if (this.legR) this.legR.rotation.x = THREE.MathUtils.lerp(this.legR.rotation.x, this.baseLegR.x, recoverSpeed);
        if (this.lowerLegL) this.lowerLegL.rotation.x = THREE.MathUtils.lerp(this.lowerLegL.rotation.x, this.baseLowerLegL.x, recoverSpeed);
        if (this.lowerLegR) this.lowerLegR.rotation.x = THREE.MathUtils.lerp(this.lowerLegR.rotation.x, this.baseLowerLegR.x, recoverSpeed);
        if (this.armL) this.armL.quaternion.slerp(this.baseQuatArmL, recoverSpeed);
        if (this.armR) this.armR.quaternion.slerp(this.baseQuatArmR, recoverSpeed);
        if (this.forearmL) this.forearmL.quaternion.slerp(this.baseQuatForearmL, recoverSpeed);
        if (this.forearmR) this.forearmR.quaternion.slerp(this.baseQuatForearmR, recoverSpeed);
        if (this.spine) {
          this.spine.rotation.y = THREE.MathUtils.lerp(this.spine.rotation.y, this.baseSpine.y, recoverSpeed);
        }
        if (this.head) {
          this.head.rotation.y = THREE.MathUtils.lerp(this.head.rotation.y, this.baseHead.y, recoverSpeed);
        }
        this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, 0, 8.0 * delta);

        // Idle natural breathing cycle with subtle weight shift
        const now = performance.now();
        const breath = Math.sin(now * 0.0025) * 0.018;
        const weightShift = Math.sin(now * 0.0008) * 0.006;
        if (this.spine) {
          this.spine.rotation.x = this.baseSpine.x + breath;
          this.spine.rotation.z = this.baseSpine.z + weightShift;
        }
        if (this.head) this.head.rotation.x = this.baseHead.x - breath * 0.35;
        this.lastFootstepPhase = 0;
      }
    } else {
      // Dynamic in-air jump / fall pose
      const airSpeed = 10.0 * delta;
      // Knees tucked naturally BACKWARD (+ rot.x)
      if (this.lowerLegL) this.lowerLegL.rotation.x = THREE.MathUtils.lerp(this.lowerLegL.rotation.x, this.baseLowerLegL.x + 0.32, airSpeed);
      if (this.lowerLegR) this.lowerLegR.rotation.x = THREE.MathUtils.lerp(this.lowerLegR.rotation.x, this.baseLowerLegR.x + 0.28, airSpeed);
      // Legs slightly forward (- rot.x)
      if (this.legL) this.legL.rotation.x = THREE.MathUtils.lerp(this.legL.rotation.x, this.baseLegL.x - 0.16, airSpeed);
      if (this.legR) this.legR.rotation.x = THREE.MathUtils.lerp(this.legR.rotation.x, this.baseLegR.x - 0.10, airSpeed);

      // Arms held naturally for dynamic balance
      if (this.armL) this.armL.quaternion.slerp(this.baseQuatArmL, airSpeed);
      if (this.armR) this.armR.quaternion.slerp(this.baseQuatArmR, airSpeed);
      if (this.forearmL) this.forearmL.quaternion.slerp(this.baseQuatForearmL, airSpeed);
      if (this.forearmR) this.forearmR.quaternion.slerp(this.baseQuatForearmR, airSpeed);

      this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, 0.05, airSpeed);
      this.lastFootstepPhase = 0;
    }
  }
}

