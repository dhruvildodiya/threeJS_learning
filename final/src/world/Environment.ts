import * as THREE from 'three';
import type { Debug } from '../utils/Debug';

export interface EnvironmentSettings {
  sunColor: number;
  sunIntensity: number;
  sunPosition: THREE.Vector3;
  ambientColor: number;
  ambientIntensity: number;
  hemiSkyColor: number;
  hemiGroundColor: number;
  hemiIntensity: number;
  fogColor: number;
  fogNear: number;
  fogFar: number;
}

export const defaultEnvironmentSettings: EnvironmentSettings = {
  sunColor: 0xffedd0,
  sunIntensity: 2.8,
  sunPosition: new THREE.Vector3(38, 20, 50),
  ambientColor: 0x182c48,
  ambientIntensity: 0.7,
  hemiSkyColor: 0xff9966,
  hemiGroundColor: 0x07192d,
  hemiIntensity: 0.9,
  fogColor: 0x091c33,
  fogNear: 35,
  fogFar: 180,
};

/**
 * Environment configures scene lighting for the sunset golden hour,
 * including directional sun with PCF soft shadows, ambient fill, hemisphere bounce, and fog.
 */
export class Environment {
  public readonly sunLight: THREE.DirectionalLight;
  public readonly hemisphereLight: THREE.HemisphereLight;
  public readonly ambientLight: THREE.AmbientLight;
  public readonly fog: THREE.Fog;

  constructor(
    private readonly scene: THREE.Scene,
    public settings: EnvironmentSettings = defaultEnvironmentSettings,
    debug?: Debug
  ) {
    // 1. Fog
    this.fog = new THREE.Fog(
      this.settings.fogColor,
      this.settings.fogNear,
      this.settings.fogFar
    );
    this.scene.fog = this.fog;

    // 2. Directional Sun Light (Golden sunset angle)
    this.sunLight = new THREE.DirectionalLight(
      this.settings.sunColor,
      this.settings.sunIntensity
    );
    this.sunLight.position.copy(this.settings.sunPosition);
    this.sunLight.castShadow = true;

    // High quality soft shadow map
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 1.0;
    this.sunLight.shadow.camera.far = 160;
    this.sunLight.shadow.camera.left = -22;
    this.sunLight.shadow.camera.right = 22;
    this.sunLight.shadow.camera.top = 22;
    this.sunLight.shadow.camera.bottom = -22;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.03;

    this.scene.add(this.sunLight);

    // 3. Hemisphere Light (Sunset sky vs Deep ocean bounce)
    this.hemisphereLight = new THREE.HemisphereLight(
      this.settings.hemiSkyColor,
      this.settings.hemiGroundColor,
      this.settings.hemiIntensity
    );
    this.scene.add(this.hemisphereLight);

    // 4. Ambient Fill Light
    this.ambientLight = new THREE.AmbientLight(
      this.settings.ambientColor,
      this.settings.ambientIntensity
    );
    this.scene.add(this.ambientLight);

    if (debug?.active) {
      this.setupDebug(debug);
    }
  }

  public update(energy: number): void {
    // Volume / Atmosphere reactivity: Higher energy increases brightness and atmosphere slightly
    this.sunLight.intensity = this.settings.sunIntensity * (1.0 + energy * 0.3);
    this.ambientLight.intensity = this.settings.ambientIntensity * (1.0 + energy * 0.25);
  }

  private setupDebug(debug: Debug): void {
    const folder = debug.addFolder('Lighting & Atmosphere');
    if (!folder) return;

    folder.add(this.sunLight, 'intensity', 0, 6, 0.1).name('Sun Intensity');
    folder.add(this.sunLight.position, 'x', -80, 80, 1).name('Sun X');
    folder.add(this.sunLight.position, 'y', 5, 80, 1).name('Sun Y');
    folder.add(this.sunLight.position, 'z', -80, 80, 1).name('Sun Z');
    folder.addColor(this.sunLight, 'color').name('Sun Color');
    folder.add(this.ambientLight, 'intensity', 0, 3, 0.05).name('Ambient Intensity');
    folder.add(this.hemisphereLight, 'intensity', 0, 3, 0.05).name('Hemi Intensity');
  }

  public destroy(): void {
    this.scene.remove(this.sunLight);
    this.scene.remove(this.hemisphereLight);
    this.scene.remove(this.ambientLight);
    this.sunLight.dispose();
  }
}
