import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export interface IslandLayoutItem {
  model: string;
  blender?: [number, number, number];
  three: [number, number, number];
  rotationY: number;
  scale: number;
}

export interface IslandLayoutData {
  units: string;
  note: string;
  items: IslandLayoutItem[];
}

/**
 * AssetManager handles loading Blender models from public/models/
 * and parsing the exported island_layout.json.
 */
export class AssetManager {
  private static instance: AssetManager | null = null;
  private loader: GLTFLoader;

  public layout: IslandLayoutData | null = null;
  public models: Map<string, THREE.Group> = new Map();
  public isLoaded = false;
  private loadPromise: Promise<void> | null = null;

  constructor() {
    this.loader = new GLTFLoader();
  }

  public static getInstance(): AssetManager {
    if (!AssetManager.instance) {
      AssetManager.instance = new AssetManager();
    }
    return AssetManager.instance;
  }

  /**
   * Load the layout JSON and all referenced 3D models.
   */
  public async load(): Promise<void> {
    if (this.isLoaded) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = this.executeLoad();
    return this.loadPromise;
  }

  private async executeLoad(): Promise<void> {
    try {
      // 1. Fetch layout JSON
      const res = await fetch('/models/island_layout.json');
      if (!res.ok) {
        throw new Error(`Failed to fetch island_layout.json: HTTP ${res.status}`);
      }
      this.layout = await res.json() as IslandLayoutData;

      // 2. Identify unique models needed
      const uniqueModelNames = new Set<string>();
      if (this.layout && this.layout.items) {
        this.layout.items.forEach((item) => uniqueModelNames.add(item.model));
      }
      // Also ensure Island and Crystal_Cluster are in the set
      uniqueModelNames.add('Island');
      uniqueModelNames.add('Crystal_Cluster');

      // 3. Load all models in parallel
      const loadTasks = Array.from(uniqueModelNames).map(async (name) => {
        const url = name === 'Crystal_Cluster'
          ? '/models/optional/Crystal_Cluster.glb'
          : `/models/${name}.glb`;

        try {
          const gltf = await this.loadGLTF(url);
          this.processModel(name, gltf.scene);
          this.models.set(name, gltf.scene);
        } catch (err) {
          console.warn(`Could not load model ${name} from ${url}:`, err);
        }
      });

      await Promise.all(loadTasks);
      this.isLoaded = true;
    } catch (err) {
      console.error('AssetManager loading failed:', err);
      throw err;
    }
  }

  private loadGLTF(url: string): Promise<{ scene: THREE.Group }> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => resolve(gltf),
        undefined,
        (err) => reject(err)
      );
    });
  }

  private processModel(name: string, scene: THREE.Group): void {
    scene.name = name;

    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat) => this.enhanceMaterial(name, mesh.name, mat));
          } else {
            this.enhanceMaterial(name, mesh.name, mesh.material);
          }
        }
      }
    });
  }

  private enhanceMaterial(modelName: string, meshName: string, material: THREE.Material): void {
    const matName = material.name;

    // Emissive lantern for bloom
    if (matName.includes('OW_Lantern_Emissive') || meshName.includes('Lantern')) {
      const std = material as THREE.MeshStandardMaterial;
      std.emissive = new THREE.Color(0xffe57e);
      std.emissiveIntensity = 4.5;
      std.toneMapped = false;
    }

    // Glowing warm hut windows
    if (matName.includes('OW_Window_Lit') || meshName.includes('Windows')) {
      const std = material as THREE.MeshStandardMaterial;
      std.emissive = new THREE.Color(0xff9e28);
      std.emissiveIntensity = 3.0;
      std.toneMapped = false;
    }

    // Glowing magical crystals
    if (matName.includes('OW_Crystal')) {
      const std = material as THREE.MeshStandardMaterial;
      std.emissive = new THREE.Color(0x1fe5d3);
      std.emissiveIntensity = 2.5;
      std.roughness = 0.15;
      std.metalness = 0.2;
      std.toneMapped = false;
    }

    // Translucent animated waterfall
    if (matName.includes('OW_Waterfall') || meshName.includes('Waterfall')) {
      const std = material as THREE.MeshStandardMaterial;
      std.transparent = true;
      std.opacity = 0.78;
      std.roughness = 0.05;
      std.metalness = 0.1;
      std.side = THREE.DoubleSide;
    }

    // Double sided leaves for foliage and palms
    if (matName.includes('OW_Leaf') || matName.includes('Foliage') || modelName.startsWith('Palm_') || modelName.startsWith('Plant_')) {
      material.side = THREE.DoubleSide;
    }
  }

  /**
   * Clone a model template for placement in the scene.
   */
  public cloneModel(name: string): THREE.Group | null {
    const template = this.models.get(name);
    if (!template) {
      console.warn(`Model template "${name}" not found in AssetManager.`);
      return null;
    }
    return template.clone(true);
  }
}
