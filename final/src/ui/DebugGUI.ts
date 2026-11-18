import GUI from 'lil-gui';
import * as THREE from 'three';
import type { World } from '../world/World';
import type { Camera } from '../core/Camera';
import type { Scene } from '../core/Scene';

export class DebugGUI {
  public readonly gui: GUI;

  constructor(
    private readonly world: World,
    private readonly camera: Camera,
    private readonly scene: Scene
  ) {
    this.gui = new GUI({ title: '🏝️ Island Controls', width: 280 });

    this.setupAnimationsFolder();
    this.setupCameraFolder();
    this.setupLightingFolder();
    this.setupEnvironmentFolder();
    this.setupInspectionFolder();
  }

  private setupAnimationsFolder(): void {
    const folder = this.gui.addFolder('Animation');

    const params = {
      toggleDoor: () => {
        this.world.island.toggleDoor();
      },
    };

    folder.add(params, 'toggleDoor').name('🚪 Toggle Hut Door');
    folder.open();
  }

  private setupCameraFolder(): void {
    const folder = this.gui.addFolder('Camera Shots');

    const params = {
      overview: () => this.camera.applyPreset('overview'),
      lighthouse: () => this.camera.applyPreset('lighthouse'),
      hut: () => this.camera.applyPreset('hut'),
      dock: () => this.camera.applyPreset('dock'),
    };

    folder.add(params, 'overview').name('🔭 Island Overview');
    folder.add(params, 'lighthouse').name('🗼 Lighthouse');
    folder.add(params, 'hut').name('🏡 Hut & Keeper');
    folder.add(params, 'dock').name('⛵ Dock & Boat');
  }

  private setupLightingFolder(): void {
    const folder = this.gui.addFolder('Lighting');

    const sunParams = {
      elevation: 40,
      azimuth: 45,
    };

    const updateSun = () => {
      this.world.environment.updateSunPosition(sunParams.elevation, sunParams.azimuth);
    };

    folder.add(this.world.environment.sunLight, 'intensity', 0, 5, 0.1).name('Sun Intensity');
    folder.add(sunParams, 'elevation', 5, 85, 1).name('Sun Elevation').onChange(updateSun);
    folder.add(sunParams, 'azimuth', 0, 360, 1).name('Sun Azimuth').onChange(updateSun);

    folder.add(this.world.environment.ambientLight, 'intensity', 0, 2, 0.05).name('Ambient Light');
    folder.add(this.world.environment.hemisphereLight, 'intensity', 0, 2, 0.05).name('Hemisphere Light');
    folder.add(this.world.environment.hutPointLight, 'intensity', 0, 5, 0.1).name('Hut Porch Light');

    folder.close();
  }

  private setupEnvironmentFolder(): void {
    const folder = this.gui.addFolder('Atmosphere');

    if (this.scene.instance.fog instanceof THREE.FogExp2) {
      folder.add(this.scene.instance.fog, 'density', 0, 0.04, 0.001).name('Fog Density');
    }

    folder.close();
  }

  private setupInspectionFolder(): void {
    const folder = this.gui.addFolder('Inspection');

    const params = {
      showColliders: false,
      wireframe: false,
    };

    folder.add(params, 'showColliders').name('Show Colliders').onChange((val: boolean) => {
      this.world.island.setColliderVisibility(val);
    });

    folder.add(params, 'wireframe').name('Wireframe Mode').onChange((val: boolean) => {
      this.scene.instance.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const applyWireframe = (mat: THREE.Material) => {
            if ('wireframe' in mat) {
              (mat as THREE.MeshStandardMaterial).wireframe = val;
            }
          };

          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(applyWireframe);
          } else if (mesh.material) {
            applyWireframe(mesh.material);
          }
        }
      });
    });

    folder.close();
  }

  public destroy(): void {
    this.gui.destroy();
  }
}
