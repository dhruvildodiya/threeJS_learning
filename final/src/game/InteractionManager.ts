import * as THREE from 'three';
import type { Player } from './Player';
import type { InputManager } from './InputManager';
import type { SoundEffects } from './SoundEffects';
import type { Collectibles } from './Collectibles';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type RAPIER from '@dimforge/rapier3d-compat';

export interface InteractionPrompt {
  text: string;
  action: () => void;
}

export class InteractionManager {
  private player: Player;
  private input: InputManager;
  private sfx: SoundEffects;
  private collectibles: Collectibles;

  // Door interaction
  private doorMixer: THREE.AnimationMixer | null = null;
  private doorAction: THREE.AnimationAction | null = null;
  private isDoorOpen = false;
  private doorPos = new THREE.Vector3(7.32, 12.95, 8.38);
  private doorCollider: RAPIER.Collider | null = null;

  // Lighthouse beacon interaction
  public isBeaconLit = false;
  private lighthousePos = new THREE.Vector3(-5.5, 15.5, -6.5);
  private beaconLight: THREE.SpotLight | null = null;
  private beaconBeam: THREE.Mesh | null = null;
  private beaconAngle = 0;

  // Rowboat interaction
  public isBoating = false;
  private rowboatPos = new THREE.Vector3(33.2, 0.46, 5.0);
  private rowboatObj: THREE.Object3D | null = null;
  private initialBoatY = 0.46;
  private initialBoatRotZ = 0;

  // Quest flags
  public questCottageEntered = false;
  public questBeaconLit = false;
  public questBoatRidden = false;

  public currentPrompt: string | null = null;

  constructor(
    player: Player,
    input: InputManager,
    sfx: SoundEffects,
    collectibles: Collectibles,
    scene: THREE.Scene,
    model: THREE.Group,
    animations: THREE.AnimationClip[],
    physics?: PhysicsWorld
  ) {
    this.player = player;
    this.input = input;
    this.sfx = sfx;
    this.collectibles = collectibles;

    // 1. Setup Door Animation & Rapier Collider
    const doorObj = model.getObjectByName('Hut_Door');
    if (doorObj) {
      doorObj.getWorldPosition(this.doorPos);

      // Create solid Rapier collider for closed door
      if (physics) {
        const doorBox = new THREE.Box3().setFromObject(doorObj);
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        doorBox.getCenter(center);
        doorBox.getSize(size);

        // Add small margin to half-extents to tightly seal doorway jambs
        const halfExtents = new THREE.Vector3(
          Math.max(size.x * 0.5, 0.14),
          size.y * 0.5,
          Math.max(size.z * 0.5, 0.45)
        );

        this.doorCollider = physics.addBoxCollider(halfExtents, center);
      }
    }

    if (animations.length > 0) {
      this.doorMixer = new THREE.AnimationMixer(model);
      const clip = animations.find((a) => a.name === 'Door_Open') || animations[0];
      if (clip) {
        this.doorAction = this.doorMixer.clipAction(clip);
        this.doorAction.setLoop(THREE.LoopOnce, 1);
        this.doorAction.clampWhenFinished = true;
      }
    }

    // 2. Setup Lighthouse Beacon effects
    this.setupLighthouseBeacon(scene);

    // 3. Find Rowboat object (ensuring we target the parent group containing both hull and frame)
    let boat =
      model.getObjectByName('Rowboat') ||
      model.getObjectByName('Rowboat001') ||
      model.getObjectByName('Rowboat.001') ||
      null;

    if (
      boat &&
      (boat as THREE.Mesh).isMesh &&
      boat.parent &&
      boat.parent !== model &&
      boat.parent.name.toLowerCase().includes('rowboat')
    ) {
      boat = boat.parent;
    }
    this.rowboatObj = boat;

    if (this.rowboatObj) {
      this.rowboatObj.getWorldPosition(this.rowboatPos);
      this.initialBoatY = this.rowboatObj.position.y;
      this.initialBoatRotZ = this.rowboatObj.rotation.z;

      // Ensure child primitive meshes (hull & frame) are flush at local origin
      this.rowboatObj.children.forEach((child) => {
        child.position.set(0, 0, 0);
        child.rotation.set(0, 0, 0);
      });
    }
  }

  private setupLighthouseBeacon(scene: THREE.Scene): void {
    const lanternPos = new THREE.Vector3(-5.5, 16.5, -6.5);
    const beaconGroup = new THREE.Group();
    beaconGroup.position.copy(lanternPos);

    this.beaconLight = new THREE.SpotLight(0xfffaed, 0, 70, Math.PI / 6, 0.4, 1.2);
    this.beaconLight.position.set(0, 0, 0);

    const targetObj = new THREE.Object3D();
    targetObj.position.set(25, 0, 0);
    beaconGroup.add(targetObj);
    this.beaconLight.target = targetObj;
    beaconGroup.add(this.beaconLight);

    // Volumetric cone
    const beamGeom = new THREE.ConeGeometry(3.5, 26, 24, 1, true);
    beamGeom.rotateX(-Math.PI / 2);
    beamGeom.translate(0, 0, 13);

    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfffae0,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    this.beaconBeam = new THREE.Mesh(beamGeom, beamMat);
    beaconGroup.add(this.beaconBeam);

    scene.add(beaconGroup);
    this.beaconGroup = beaconGroup;
  }

  private beaconGroup: THREE.Group | null = null;

  public update(delta: number): void {
    if (this.doorMixer) {
      this.doorMixer.update(delta);

      // Re-enable collider once door has finished swinging shut
      if (!this.isDoorOpen && this.doorCollider && !this.doorCollider.isEnabled()) {
        if (this.doorAction && (this.doorAction.time <= 0.05 || !this.doorAction.isRunning())) {
          this.doorCollider.setEnabled(true);
        }
      }
    }

    // Rotate beacon if lit
    if (this.isBeaconLit && this.beaconGroup) {
      this.beaconAngle += delta * 1.0;
      this.beaconGroup.rotation.y = this.beaconAngle;
    }

    // Rowboat bobbing (bobs the whole boat group together)
    if (this.rowboatObj) {
      const bob = Math.sin(performance.now() * 0.002) * 0.04;
      this.rowboatObj.position.y = this.initialBoatY + bob;
      this.rowboatObj.rotation.z = this.initialBoatRotZ + Math.sin(performance.now() * 0.0015) * 0.02;

      if (this.isBoating) {
        this.player.group.position.y = this.initialBoatY + 0.35 + bob;
      }
    }

    // Check interactions
    this.evaluateInteractions();
  }

  private evaluateInteractions(): void {
    const playerPos = this.player.group.position;
    this.currentPrompt = null;
    let pendingAction: (() => void) | null = null;

    // 1. Crystal Pickup
    const crystal = this.collectibles.checkProximity(playerPos);
    if (crystal) {
      this.currentPrompt = `Press [E] to Collect ${crystal.name} Crystal`;
      pendingAction = () => {
        this.collectibles.collect(crystal);
      };
    }

    // 2. Door Interaction
    if (!this.currentPrompt) {
      const distToDoor = playerPos.distanceTo(this.doorPos);
      if (distToDoor < 3.2) {
        this.currentPrompt = this.isDoorOpen ? 'Press [E] to Close Door' : 'Press [E] to Open Door';
        pendingAction = () => {
          this.toggleDoor();
        };
      }
    }

    // 3. Lighthouse Beacon Interaction
    if (!this.currentPrompt) {
      const distToLighthouse = playerPos.distanceTo(this.lighthousePos);
      if (distToLighthouse < 4.2) {
        this.currentPrompt = this.isBeaconLit ? 'Lighthouse Beacon is Active' : 'Press [E] to Ignite Beacon';
        if (!this.isBeaconLit) {
          pendingAction = () => {
            this.igniteBeacon();
          };
        }
      }
    }

    // 4. Rowboat Interaction
    if (!this.currentPrompt) {
      const distToBoat = playerPos.distanceTo(this.rowboatPos);
      if (distToBoat < 3.8) {
        this.currentPrompt = this.isBoating ? 'Press [E] to Dock Boat' : 'Press [E] to Board Boat';
        pendingAction = () => {
          this.toggleBoat();
        };
      }
    }

    // Execute if E was pressed
    if (this.input.consumeInteract() && pendingAction) {
      pendingAction();
    }
  }

  public toggleDoor(): void {
    if (!this.doorAction) return;

    if (!this.isDoorOpen) {
      this.doorAction.timeScale = 1.5;
      this.doorAction.paused = false;
      this.doorAction.play();
      this.isDoorOpen = true;
      this.questCottageEntered = true;
      this.sfx.playDoor(true);
      // Immediately disable door collider so player can walk freely inside
      if (this.doorCollider) {
        this.doorCollider.setEnabled(false);
      }
    } else {
      this.doorAction.timeScale = -1.5;
      this.doorAction.paused = false;
      this.doorAction.play();
      this.isDoorOpen = false;
      this.sfx.playDoor(false);
    }
  }

  public igniteBeacon(): void {
    if (this.isBeaconLit) return;
    this.isBeaconLit = true;
    this.questBeaconLit = true;

    if (this.beaconLight) this.beaconLight.intensity = 8.5;
    if (this.beaconBeam && this.beaconBeam.material instanceof THREE.MeshBasicMaterial) {
      this.beaconBeam.material.opacity = 0.16;
    }

    this.sfx.playBeacon();
  }

  public toggleBoat(): void {
    this.isBoating = !this.isBoating;
    this.questBoatRidden = true;

    if (this.isBoating) {
      // Place player on rowboat and immobilize normal walking
      this.player.isImmobilized = true;
      this.player.teleport(new THREE.Vector3(33.2, 0.8, 5.0));
    } else {
      // Return player to dock gangway and restore movement
      this.player.isImmobilized = false;
      this.player.teleport(new THREE.Vector3(29.0, 1.2, 5.0));
    }
  }
}
