import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Scene } from '../core/Scene';

export interface IslandModelCallbacks {
  onProgress?: (progress: number) => void;
  onLoaded?: () => void;
  onError?: (error: unknown) => void;
}

export class IslandModel {
  public group: THREE.Group | null = null;
  public mixer: THREE.AnimationMixer | null = null;
  public doorAction: THREE.AnimationAction | null = null;
  public isDoorOpen = false;

  public collisionMeshes: THREE.Object3D[] = [];
  public waterfallMeshes: THREE.Mesh[] = [];
  public lighthouseLantern: THREE.Object3D | null = null;
  public lighthouseSpotlight: THREE.SpotLight | null = null;
  public lighthouseBeam: THREE.Mesh | null = null;

  public showColliders = false;
  private lighthouseAngle = 0;

  constructor(
    private readonly scene: Scene,
    private readonly callbacks?: IslandModelCallbacks
  ) {
    this.load();
  }

  private load(): void {
    const manager = new THREE.LoadingManager(
      () => {
        this.callbacks?.onLoaded?.();
      },
      (_url, loaded, total) => {
        const progress = (loaded / total) * 100;
        this.callbacks?.onProgress?.(progress);
      },
      (url) => {
        console.error(`Error loading asset: ${url}`);
        this.callbacks?.onError?.(url);
      }
    );

    const loader = new GLTFLoader(manager);

    loader.load(
      './models/island.glb',
      (gltf) => {
        this.group = gltf.scene;
        this.group.name = 'IslandScene';

        // 1. Setup Animation Mixer
        if (gltf.animations.length > 0) {
          this.mixer = new THREE.AnimationMixer(this.group);
          const doorClip = gltf.animations.find((a) => a.name === 'Door_Open') || gltf.animations[0];
          if (doorClip) {
            this.doorAction = this.mixer.clipAction(doorClip);
            this.doorAction.setLoop(THREE.LoopOnce, 1);
            this.doorAction.clampWhenFinished = true;
          }
        }

        // 2. Process hierarchy, shadows, and materials
        this.group.traverse((child) => {
          // Detect collision geometry
          if (child.name.startsWith('COLLISION')) {
            this.collisionMeshes.push(child);
            child.visible = this.showColliders;
            return;
          }

          // Hide Blender preview ocean plane to prevent z-fighting with our water shader
          if (child.name.includes('Ocean_Preview')) {
            child.visible = false;
            return;
          }

          // Lighthouse lantern detection
          if (child.name === 'Lighthouse_Lantern' || child.name === 'Lighthouse_Lantern.001') {
            this.lighthouseLantern = child;
          }

          // Waterfalls detection
          if (child.name.includes('Waterfall')) {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              this.waterfallMeshes.push(mesh);
              if (mesh.material instanceof THREE.MeshStandardMaterial) {
                mesh.material.transparent = true;
                mesh.material.opacity = 0.85;
                mesh.material.roughness = 0.1;
                mesh.material.metalness = 0.1;
              }
            }
          }

          // Mesh shadow configuration
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            if (mesh.material) {
              if (Array.isArray(mesh.material)) {
                mesh.material.forEach((mat) => {
                  mat.shadowSide = THREE.DoubleSide;
                });
              } else {
                mesh.material.shadowSide = THREE.DoubleSide;
              }
            }
          }
        });

        // 3. Attach lighthouse beacon spotlight & volumetric beam
        this.setupLighthouseBeacon();

        this.scene.instance.add(this.group);
      },
      (event) => {
        if (event.total > 0) {
          const progress = (event.loaded / event.total) * 100;
          this.callbacks?.onProgress?.(progress);
        }
      },
      (error) => {
        console.error('Failed to load island.glb:', error);
        this.callbacks?.onError?.(error);
      }
    );
  }

  private setupLighthouseBeacon(): void {
    // Lighthouse lantern room is located near (2.2, 13.8, -1.0)
    const lanternPos = new THREE.Vector3(2.2, 13.8, -1.0);

    const lightGroup = new THREE.Group();
    lightGroup.position.copy(lanternPos);

    // Warm high-intensity rotating spotlight
    this.lighthouseSpotlight = new THREE.SpotLight(0xfffaed, 8.0, 60, Math.PI / 7, 0.4, 1.2);
    this.lighthouseSpotlight.position.set(0, 0, 0);
    this.lighthouseSpotlight.castShadow = true;
    this.lighthouseSpotlight.shadow.bias = -0.002;
    this.lighthouseSpotlight.shadow.mapSize.width = 512;
    this.lighthouseSpotlight.shadow.mapSize.height = 512;

    const targetObject = new THREE.Object3D();
    targetObject.position.set(20, 0, 0);
    lightGroup.add(targetObject);
    this.lighthouseSpotlight.target = targetObject;

    lightGroup.add(this.lighthouseSpotlight);

    // Volumetric beam cone
    const beamGeom = new THREE.ConeGeometry(3.5, 24, 24, 1, true);
    beamGeom.rotateX(-Math.PI / 2);
    beamGeom.translate(0, 0, 12);

    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfffae0,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    this.lighthouseBeam = new THREE.Mesh(beamGeom, beamMat);
    lightGroup.add(this.lighthouseBeam);

    this.scene.instance.add(lightGroup);
    this.lighthouseLantern = lightGroup;
  }

  public toggleDoor(): void {
    if (!this.doorAction) return;

    if (!this.isDoorOpen) {
      this.doorAction.timeScale = 1;
      this.doorAction.paused = false;
      this.doorAction.play();
      this.isDoorOpen = true;
    } else {
      this.doorAction.timeScale = -1;
      this.doorAction.paused = false;
      this.doorAction.play();
      this.isDoorOpen = false;
    }
  }

  public setColliderVisibility(visible: boolean): void {
    this.showColliders = visible;
    this.collisionMeshes.forEach((mesh) => {
      mesh.visible = visible;
    });
  }

  public update(delta: number, elapsed: number): void {
    // 1. Update door animation
    if (this.mixer) {
      this.mixer.update(delta);
    }

    // 2. Rotate lighthouse beam
    if (this.lighthouseLantern) {
      this.lighthouseAngle += delta * 0.9;
      this.lighthouseLantern.rotation.y = this.lighthouseAngle;
    }

    // 3. Shimmer waterfalls
    if (this.waterfallMeshes.length > 0) {
      const shimmer = (Math.sin(elapsed * 4.0) + 1.0) * 0.5;
      this.waterfallMeshes.forEach((mesh) => {
        if (mesh.material instanceof THREE.MeshStandardMaterial) {
          mesh.material.opacity = 0.75 + shimmer * 0.15;
        }
      });
    }
  }

  public destroy(): void {
    if (this.mixer) {
      this.mixer.stopAllAction();
    }
    if (this.group) {
      this.scene.instance.remove(this.group);
    }
  }
}

