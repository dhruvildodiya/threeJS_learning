import * as THREE from 'three';
import { AssetManager } from '../assets/AssetManager';
import type { AudioUniforms } from '../audio/types';
import type { Debug } from '../utils/Debug';

/**
 * Island orchestrates the 3D Blender models according to island_layout.json:
 * - Island terrain with rock underside and grassy plateau (Island.glb)
 * - Cascading waterfalls (Waterfall_A, Waterfall_B)
 * - Lighthouse (Lighthouse_Body.glb) with sweeping volumetric light beam
 * - Coastal Hut (Hut.glb) with warm glowing lantern light
 * - Wooden Dock (Dock.glb) and buoyant Rowboat (Rowboat.glb)
 * - Palm trees (Palm_A, Palm_B) swaying with MID frequencies
 * - Lush coastal flora (Plant_Bush, Plant_Fern, Plant_GrassTuft)
 * - Natural shoreline rock clusters (Rock_L, Rock_M, Rock_S, Rock_Spire)
 */
export class Island {
  public readonly group: THREE.Group;
  private readonly audioUniforms: AudioUniforms;
  private readonly disposables: Array<{ dispose: () => void }> = [];

  // Dynamic audio-reactive elements
  private lighthouseLanternGroup: THREE.Group | null = null;
  private lighthouseBeam: THREE.Mesh | null = null;
  private lighthouseLight: THREE.SpotLight | null = null;
  private rowboat: THREE.Group | null = null;
  private rowboatBaseY = 0;
  private palmTrees: Array<{
    group: THREE.Group;
    baseRotX: number;
    baseRotZ: number;
    phase: number;
  }> = [];
  private crystalMeshes: THREE.Mesh[] = [];
  private waterfallMeshes: THREE.Mesh[] = [];

  private lighthouseAngle = 0;

  constructor(
    private readonly scene: THREE.Scene,
    audioUniforms: AudioUniforms,
    debug?: Debug
  ) {
    this.audioUniforms = audioUniforms;
    this.group = new THREE.Group();
    this.group.name = 'IslandRoot';

    this.scene.add(this.group);

    // Build world purely from Blender models & layout
    this.buildFromBlender();

    if (debug?.active) {
      this.setupDebug(debug);
    }
  }

  private async buildFromBlender(): Promise<void> {
    try {
      const assetManager = AssetManager.getInstance();
      await assetManager.load();

      const layout = assetManager.layout;
      if (!layout || !layout.items) {
        console.error('No layout data available in AssetManager.');
        return;
      }

      // 1. Instantiate all items from layout
      for (const item of layout.items) {
        const model = assetManager.cloneModel(item.model);
        if (!model) continue;

        model.position.set(item.three[0], item.three[1], item.three[2]);
        model.rotation.y = item.rotationY;
        model.scale.setScalar(item.scale);
        this.group.add(model);

        // Classify dynamic objects for audio-reactive updates
        if (item.model === 'Lighthouse_Body') {
          this.attachLighthouseEffects(model, item.three);
        } else if (item.model === 'Hut') {
          this.attachHutEffects(model);
        } else if (item.model === 'Rowboat') {
          this.rowboat = model;
          this.rowboatBaseY = item.three[1];
        } else if (item.model.startsWith('Palm_')) {
          this.palmTrees.push({
            group: model,
            baseRotX: model.rotation.x,
            baseRotZ: model.rotation.z,
            phase: Math.random() * Math.PI * 2,
          });
        } else if (item.model === 'Island') {
          // Find waterfalls in Island model
          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh && child.name.includes('Waterfall')) {
              this.waterfallMeshes.push(child as THREE.Mesh);
            }
          });
        }
      }

      // 2. Add magical glowing crystal cluster from optional assets
      const crystal = assetManager.cloneModel('Crystal_Cluster');
      if (crystal) {
        // Place crystal near rocky cliff crevice
        crystal.position.set(-6.5, 11.2, -6.5);
        crystal.scale.setScalar(0.7);
        this.group.add(crystal);

        crystal.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            this.crystalMeshes.push(child as THREE.Mesh);
          }
        });
      }
    } catch (err) {
      console.error('Failed to construct island from Blender models:', err);
    }
  }

  /**
   * Attach rotating SpotLight and volumetric light cone to the Lighthouse lantern room.
   */
  private attachLighthouseEffects(_lhModel: THREE.Group, pos: [number, number, number]): void {
    this.lighthouseLanternGroup = new THREE.Group();
    this.lighthouseLanternGroup.name = 'LighthouseLanternBeam';
    // Lantern is located at top of lighthouse tower (~9.8 units above base)
    this.lighthouseLanternGroup.position.set(pos[0], pos[1] + 9.8, pos[2]);
    this.group.add(this.lighthouseLanternGroup);

    // 1. High-intensity spotlight sweeping the water
    this.lighthouseLight = new THREE.SpotLight(0xfff5c0, 6.5, 180, Math.PI / 7, 0.3, 1.2);
    this.lighthouseLight.position.set(0, 0, 0);
    this.lighthouseLanternGroup.add(this.lighthouseLight);

    const lightTarget = new THREE.Object3D();
    lightTarget.position.set(0, -4, 50);
    this.lighthouseLanternGroup.add(lightTarget);
    this.lighthouseLight.target = lightTarget;

    // 2. Volumetric visual light cone (narrow tip at lantern z=0, expanding outwards to z=50)
    const beamGeo = new THREE.ConeGeometry(6.5, 50, 32, 1, true);
    // Move apex (tip) to origin (0, 0, 0)
    beamGeo.translate(0, -25, 0);
    // Rotate so cone projects outwards along +Z
    beamGeo.rotateX(-Math.PI / 2);
    // Subtle downward pitch towards the ocean surface
    beamGeo.rotateX(0.08);

    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfff6c8,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.disposables.push(beamGeo, beamMat);

    this.lighthouseBeam = new THREE.Mesh(beamGeo, beamMat);
    this.lighthouseLanternGroup.add(this.lighthouseBeam);

    // 3. Local lantern PointLight for omnidirectional amber glow
    const lanternOmni = new THREE.PointLight(0xffea88, 3.8, 22);
    lanternOmni.position.set(0, 0, 0);
    this.lighthouseLanternGroup.add(lanternOmni);
  }

  /**
   * Warm point light outside cottage door.
   */
  private attachHutEffects(hutModel: THREE.Group): void {
    const hutLight = new THREE.PointLight(0xff9922, 1.8, 12);
    hutLight.position.set(0, 1.4, 1.6);
    hutModel.add(hutLight);
  }

  /**
   * Per-frame audio-reactive updates.
   */
  public update(delta: number, elapsed: number): void {
    const bass = this.audioUniforms.uBass.value;
    const mid = this.audioUniforms.uMid.value;
    const treble = this.audioUniforms.uTreble.value;
    const beat = this.audioUniforms.uBeat.value;
    const energy = this.audioUniforms.uEnergy.value;

    // 1. Island Buoyancy: Majestic floating heave with ocean swell
    this.group.position.y = Math.sin(elapsed * 0.7) * 0.12 + bass * 0.08;
    this.group.rotation.z = Math.sin(elapsed * 0.45) * 0.008;
    this.group.rotation.x = Math.cos(elapsed * 0.4) * 0.006;

    // 2. Lighthouse Sweeping Beam: 360-degree rotation, speed and intensity reacting to energy
    if (this.lighthouseLanternGroup) {
      const rotSpeed = 0.7 + energy * 0.8;
      this.lighthouseAngle += delta * rotSpeed;
      this.lighthouseLanternGroup.rotation.y = this.lighthouseAngle;

      if (this.lighthouseBeam) {
        const mat = this.lighthouseBeam.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.26 + energy * 0.28 + beat * 0.18;
      }

      if (this.lighthouseLight) {
        this.lighthouseLight.intensity = 5.5 + energy * 4.0 + beat * 3.5;
      }
    }

    // 3. Palm Trees Sway: Modulated by MID frequencies (per reference spec)
    const windTime = elapsed * 1.6;
    const midSway = mid * 0.18;
    for (const tree of this.palmTrees) {
      const swayZ = Math.sin(windTime + tree.phase) * (0.04 + midSway);
      const swayX = Math.cos(windTime * 0.85 + tree.phase) * (0.03 + midSway * 0.7);
      tree.group.rotation.z = tree.baseRotZ + swayZ;
      tree.group.rotation.x = tree.baseRotX + swayX;
    }

    // 4. Rowboat Bobbing on Waves
    if (this.rowboat) {
      const wavePhase = elapsed * 2.2;
      this.rowboat.position.y = this.rowboatBaseY + Math.sin(wavePhase) * 0.1 + bass * 0.14;
      this.rowboat.rotation.x = Math.sin(wavePhase * 0.85) * 0.07;
      this.rowboat.rotation.z = Math.cos(wavePhase * 1.1) * 0.06;
    }

    // 5. Crystal Clusters Emissive Pulse with Beat & Treble
    if (this.crystalMeshes.length > 0) {
      const crystalIntensity = 1.6 + treble * 3.2 + beat * 3.8;
      for (const mesh of this.crystalMeshes) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat && mat.emissiveIntensity !== undefined) {
          mat.emissiveIntensity = crystalIntensity;
        }
      }
    }

    // 6. Waterfall Shimmer
    if (this.waterfallMeshes.length > 0) {
      const alpha = 0.72 + Math.sin(elapsed * 7.0) * 0.08 + bass * 0.14;
      for (const mesh of this.waterfallMeshes) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat && mat.opacity !== undefined) {
          mat.opacity = alpha;
        }
      }
    }
  }

  private setupDebug(debug: Debug): void {
    const folder = debug.addFolder('Blender Island');
    if (!folder) return;

    folder.add(this.group.position, 'y', -5, 5, 0.1).name('Island Elevation');
  }

  public destroy(): void {
    this.scene.remove(this.group);
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
