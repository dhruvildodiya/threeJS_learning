import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { AudioUniforms } from '../audio/types';
import type { Debug } from '../utils/Debug';

export type CameraMode = 'cinematic' | 'free';

export interface CameraShot {
  name: string;
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
}

export const CAMERA_SHOTS: Record<string, CameraShot> = {
  overview: {
    name: 'Cinematic Overview',
    position: new THREE.Vector3(0, 28, 54),
    target: new THREE.Vector3(0, 6.5, 0),
    fov: 46,
  },
  dockHero: {
    name: 'Shoreline & Dock',
    position: new THREE.Vector3(28, 6.0, 14),
    target: new THREE.Vector3(14, 2.5, 2),
    fov: 44,
  },
  lighthouseHero: {
    name: 'Lighthouse Vista',
    position: new THREE.Vector3(-18, 20, 14),
    target: new THREE.Vector3(-3.0, 16.0, -3.5),
    fov: 40,
  },
  birdsEye: {
    name: "Bird's Eye",
    position: new THREE.Vector3(0, 68, 22),
    target: new THREE.Vector3(0, 4, 0),
    fov: 50,
  },
};

/**
 * CameraRig manages cinematic auto-orbiting, musical FOV punch & trauma shake,
 * preset cinematic camera shots, and interactive free OrbitControls.
 */
export class CameraRig {
  public readonly camera: THREE.PerspectiveCamera;
  public readonly controls: OrbitControls;
  private readonly audioUniforms: AudioUniforms;

  public mode: CameraMode = 'cinematic';
  public currentShotKey = 'overview';

  // Cinematic orbit parameters
  private orbitAngle = 0;
  private orbitRadius = 54;
  private orbitHeight = 26;
  public orbitSpeed = 0.10;

  // Music reactivity
  private baseFov = 46;
  private currentFov = 46;
  private shakeTrauma = 0;

  // Smoothing targets
  private targetPosition = new THREE.Vector3();
  private targetLookAt = new THREE.Vector3();
  private currentLookAt = new THREE.Vector3(0, 7.5, 0);

  constructor(
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    audioUniforms: AudioUniforms,
    debug?: Debug
  ) {
    this.audioUniforms = audioUniforms;

    this.camera = new THREE.PerspectiveCamera(this.baseFov, width / height, 0.1, 1000);
    this.camera.position.copy(CAMERA_SHOTS.overview.position);

    // OrbitControls for interactive navigation
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.copy(CAMERA_SHOTS.overview.target);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.04; // Keep above ocean plane
    this.controls.minDistance = 6;
    this.controls.maxDistance = 120;
    this.controls.enabled = false; // Disabled by default in cinematic mode

    this.targetPosition.copy(this.camera.position);
    this.targetLookAt.copy(this.controls.target);

    if (debug?.active) {
      this.setupDebug(debug);
    }
  }

  public setMode(mode: CameraMode): void {
    this.mode = mode;
    if (mode === 'free') {
      this.controls.enabled = true;
    } else {
      this.controls.enabled = false;
      // Resynchronize orbit angle with current camera position
      this.orbitAngle = Math.atan2(this.camera.position.x, this.camera.position.z);
    }
  }

  public setShot(shotKey: string): void {
    const shot = CAMERA_SHOTS[shotKey];
    if (!shot) return;

    this.currentShotKey = shotKey;
    this.baseFov = shot.fov;
    this.targetPosition.copy(shot.position);
    this.targetLookAt.copy(shot.target);

    if (this.mode === 'free') {
      this.setMode('cinematic');
    }
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  public update(delta: number, elapsed: number): void {
    const beat = this.audioUniforms.uBeat.value;
    const bass = this.audioUniforms.uBass.value;

    // Accumulate camera trauma shake on heavy beat drops
    if (beat > 0.4) {
      this.shakeTrauma = Math.min(1.0, this.shakeTrauma + beat * 0.45);
    }
    this.shakeTrauma = Math.max(0, this.shakeTrauma - delta * 2.8);

    // FOV Kick on beat
    const targetFov = this.baseFov - (beat * 3.2 + bass * 1.5);
    this.currentFov += (targetFov - this.currentFov) * Math.min(1.0, delta * 12.0);
    this.camera.fov = this.currentFov;
    this.camera.updateProjectionMatrix();

    if (this.mode === 'free') {
      this.controls.update();
      return;
    }

    // Cinematic mode
    if (this.currentShotKey === 'overview') {
      // Slow, sweeping orbit with sine vertical drift
      this.orbitAngle += delta * (this.orbitSpeed + bass * 0.05);
      const heaveY = Math.sin(elapsed * 0.4) * 1.2;

      const destX = Math.sin(this.orbitAngle) * this.orbitRadius;
      const destZ = Math.cos(this.orbitAngle) * this.orbitRadius;
      const destY = this.orbitHeight + heaveY;

      this.camera.position.lerp(new THREE.Vector3(destX, destY, destZ), delta * 2.5);
      this.currentLookAt.lerp(new THREE.Vector3(0, 7.5, 0), delta * 3.0);
    } else {
      // Other scripted shot: smooth interpolation to fixed shot position
      this.camera.position.lerp(this.targetPosition, delta * 3.0);
      this.currentLookAt.lerp(this.targetLookAt, delta * 3.0);
    }

    // Apply shake offset
    if (this.shakeTrauma > 0.01) {
      const shakeAmt = this.shakeTrauma * this.shakeTrauma * 0.22;
      this.camera.position.x += (Math.random() - 0.5) * shakeAmt;
      this.camera.position.y += (Math.random() - 0.5) * shakeAmt;
      this.camera.position.z += (Math.random() - 0.5) * shakeAmt;
    }

    this.camera.lookAt(this.currentLookAt);
    this.controls.target.copy(this.currentLookAt);
  }

  private setupDebug(debug: Debug): void {
    const folder = debug.addFolder('Camera Rig');
    if (!folder) return;

    folder.add(this, 'mode', ['cinematic', 'free']).name('Camera Mode').onChange((val: CameraMode) => this.setMode(val));
    folder.add(this, 'currentShotKey', Object.keys(CAMERA_SHOTS)).name('Preset Shot').onChange((val: string) => this.setShot(val));
    folder.add(this, 'orbitSpeed', 0, 0.6, 0.02).name('Orbit Speed');
  }

  public destroy(): void {
    this.controls.dispose();
  }
}
