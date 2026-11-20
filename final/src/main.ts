import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { InputManager } from './game/InputManager';
import { SoundEffects } from './game/SoundEffects';
import { Player } from './game/Player';
import { FollowCamera } from './game/FollowCamera';
import { Collectibles } from './game/Collectibles';
import { ForestManager } from './world/ForestManager';
import { InteractionManager } from './game/InteractionManager';
import { GameHUD } from './game/GameHUD';
import { PhysicsWorld } from './physics/PhysicsWorld';
import { DynamicPropsManager } from './game/DynamicProps';

// Initialize Rapier 3D Physics
const physics = new PhysicsWorld();
await physics.init();

// 1. Setup Canvas & Loading Overlay
const canvas = document.querySelector<HTMLCanvasElement>('#webgl');
const loadingOverlay = document.querySelector<HTMLDivElement>('#loading');
const loadingText = document.querySelector<HTMLDivElement>('#loading-text');

if (!canvas) {
  throw new Error('Canvas #webgl not found');
}

// 2. Scene & Atmosphere
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6ca3c9);
scene.fog = new THREE.FogExp2(0x6ca3c9, 0.0035);

// 3. Camera & Renderer
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.05,
  1000
);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.32;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// 4. Lighting
const ambientLight = new THREE.AmbientLight(0xfffaed, 0.85);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0xbadcfb, 0x4a6b42, 0.95);
hemiLight.position.set(0, 50, 0);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xfff8e7, 2.5);
sunLight.position.set(45, 65, 35);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 10;
sunLight.shadow.camera.far = 180;
const d = 45;
sunLight.shadow.camera.left = -d;
sunLight.shadow.camera.right = d;
sunLight.shadow.camera.top = d;
sunLight.shadow.camera.bottom = -d;
sunLight.shadow.bias = -0.0003;
sunLight.shadow.normalBias = 0.03;
scene.add(sunLight);
scene.add(sunLight.target);

// 5. Ocean Water Disk
const oceanGeom = new THREE.CircleGeometry(250, 64);
oceanGeom.rotateX(-Math.PI / 2);
const oceanMat = new THREE.MeshStandardMaterial({
  color: 0x1d5f8a,
  roughness: 0.15,
  metalness: 0.1,
  depthWrite: true,
});
const oceanMesh = new THREE.Mesh(oceanGeom, oceanMat);
oceanMesh.position.y = -0.05;
oceanMesh.receiveShadow = true;
scene.add(oceanMesh);

// 6. Systems
const input = new InputManager(canvas);
const sfx = new SoundEffects();

let player: Player | null = null;
let followCamera: FollowCamera | null = null;
let collectibles: Collectibles | null = null;
let interaction: InteractionManager | null = null;
let hud: GameHUD | null = null;
let forestManager: ForestManager | null = null;
const palmTrees: THREE.Object3D[] = [];

// 7. Loading Manager & GLTFLoader
const loadingManager = new THREE.LoadingManager(
  () => {
    if (loadingOverlay) {
      loadingOverlay.classList.add('hidden');
    }
  },
  (_url, loaded, total) => {
    if (loadingText && total > 0) {
      loadingText.textContent = `Loading Island World (${Math.round((loaded / total) * 100)}%)...`;
    }
  },
  (err) => {
    console.error('Error loading assets:', err);
    if (loadingText) {
      loadingText.textContent = 'Failed to load model. Check console.';
      loadingText.style.color = '#ef4444';
    }
  }
);

const loader = new GLTFLoader(loadingManager);

loader.load('./models/island.glb', (gltf) => {
  const model = gltf.scene;

  // Walkable collision candidates
  const walkableMeshes: THREE.Object3D[] = [];

  model.traverse((child) => {
    // Hide collision hulls
    if (child.name.startsWith('COLLISION_')) {
      child.visible = false;
      return;
    }

    // Hide blender ocean preview plane
    if (child.name.includes('Ocean_Preview')) {
      child.visible = false;
      return;
    }

    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const isSoftFoliage =
        mesh.name.includes('Fern') ||
        mesh.name.includes('Grass') ||
        mesh.name.includes('Bush') ||
        mesh.name.includes('Flower');

      mesh.castShadow = !isSoftFoliage;
      mesh.receiveShadow = true;

      if (mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          const isFoliage =
            mesh.name.includes('Leaf') ||
            mesh.name.includes('Leaves') ||
            mesh.name.includes('Grass') ||
            mesh.name.includes('Fern') ||
            mesh.name.includes('Birch') ||
            mesh.name.includes('Maple') ||
            mesh.name.includes('Bush');
          m.shadowSide = isFoliage ? THREE.DoubleSide : null;
          const std = m as THREE.MeshStandardMaterial;
          std.flatShading = false;
          if (isFoliage && std.transparent) {
            std.alphaTest = 0.45;
            std.depthWrite = true;
          }
        });
      }

      // Collect walkable ground / stairs / dock / hut floor
      const name = mesh.name;

      // Stylized Foliage, Rock & Architecture Material Enhancements (Smooth, Matte Surfaces)
      if (mesh.material) {
        const origMat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;

        if (name.includes('Plant_Bush')) {
          const bushMat = origMat.clone();
          bushMat.metalness = 0.0;
          bushMat.flatShading = false; // Smooth organic foliage shading (eliminates faceted rock edges & glare)
          if (name.includes('Plant_Bush_1') || name.includes('_1') || origMat.name === 'OW_Flower') {
            bushMat.color.setHex(0xff3d75); // Vibrant hibiscus coral blossoms
            bushMat.roughness = 0.8;
          } else {
            bushMat.color.setHex(0x389b3a); // Lush tropical foliage green
            bushMat.roughness = 0.85; // Natural matte leaf surface
          }
          bushMat.needsUpdate = true;
          mesh.material = bushMat;
        } else if (name.includes('Plant_Fern')) {
          const fernMat = origMat.clone();
          fernMat.color.setHex(0x43a047); // Lush tropical fern green
          fernMat.roughness = 0.85;
          fernMat.metalness = 0.0;
          fernMat.flatShading = false;
          fernMat.needsUpdate = true;
          mesh.material = fernMat;
        } else if (name.includes('Plant_GrassTuft')) {
          const grassMat = origMat.clone();
          grassMat.color.setHex(0x4caf50); // Warm golden meadow grass
          grassMat.roughness = 0.85;
          grassMat.metalness = 0.0;
          grassMat.flatShading = false;
          grassMat.needsUpdate = true;
          mesh.material = grassMat;
        } else if (name.includes('Palm')) {
          palmTrees.push(mesh);
          const palmMat = origMat.clone();
          palmMat.metalness = 0.0;
          palmMat.flatShading = false;
          if (origMat.name === 'OW_Bark' || name.endsWith('Palm_A') || name.endsWith('Palm_B')) {
            palmMat.color.setHex(0x9a6b43); // Warm fibrous coconut palm bark (visible golden-brown wood)
            palmMat.roughness = 0.82;
          } else if (origMat.name === 'OW_Leaf' || name.includes('_1')) {
            palmMat.color.setHex(0x389b3f); // Sunny emerald tropical palm fronds
            palmMat.roughness = 0.80;
          } else if (origMat.name === 'OW_Coconut' || name.includes('_2')) {
            palmMat.color.setHex(0x5d3a1e); // Coconut husk brown
            palmMat.roughness = 0.85;
          }
          palmMat.needsUpdate = true;
          mesh.material = palmMat;
        } else if (name.includes('Rock') || origMat.name === 'OW_Rock') {
          const rockMat = origMat.clone();
          rockMat.color.setHex(0x6e7872); // Natural weathered stone grey
          rockMat.roughness = 0.96; // Completely matte: zero polygon facet shine
          rockMat.metalness = 0.0;
          rockMat.flatShading = false; // Smooth interpolated boulder shading
          rockMat.needsUpdate = true;
          mesh.material = rockMat;
        } else {
          origMat.flatShading = false;
          origMat.needsUpdate = true;
        }
      }

      if (
        name.includes('Island') ||
        name.includes('Bridge') ||
        name.includes('Stairs') ||
        name.includes('Dock') ||
        name.includes('Path') ||
        name.includes('Flagstone') ||
        name.includes('Hut_Body') ||
        name.includes('INT_Rug')
      ) {
        walkableMeshes.push(mesh);
      }
    }
  });

  // Center island at world origin
  model.position.set(0, 0, 150);
  scene.add(model);
  model.updateMatrixWorld(true);

  // Build Rapier static Trimesh colliders for solid environment
  model.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const name = mesh.name;
      // Exclude non-solid decorative elements, character, and all soft foliage (bushes, ferns, grass, flowers)
      if (
        name.includes('CHR_') ||
        name.includes('Armature') ||
        name.includes('Ocean_Preview') ||
        name.startsWith('COLLISION_') ||
        name.includes('Hut_Door') ||
        name.includes('INT_Rug') ||
        name.includes('INT_Chart') ||
        name.includes('INT_HangingLantern') ||
        name.includes('Plant_Bush') ||
        name.includes('Plant_Fern') ||
        name.includes('Plant_GrassTuft') ||
        name.includes('Bush') ||
        name.includes('Fern') ||
        name.includes('Grass') ||
        name.includes('Flower') ||
        name.includes('Leaf') ||
        name.includes('Leaves') ||
        name.includes('Crystal')
      ) {
        return;
      }

      if (
        name.includes('Island') ||
        name.includes('Bridge') ||
        name.includes('Stairs') ||
        name.includes('Dock') ||
        name.includes('Path') ||
        name.includes('Flagstone') ||
        name.includes('Hut') ||
        name.includes('Lighthouse') ||
        name.includes('Rock') ||
        name.includes('Fence') ||
        name.includes('Palm') ||
        name.includes('Shrine') ||
        name.includes('PRP_') ||
        name.includes('INT_') ||
        name.includes('Rowboat') ||
        name.includes('Forest_Log') ||
        name.includes('Forest_Rock') ||
        name.includes('Forest_Dead_log')
      ) {
        physics.addTrimeshCollider(mesh);
      }
    }
  });

  // Solid ceiling barriers across the hut interior ceiling beams & porch overhang to prevent jumping into rafters/roof
  physics.addBoxCollider(
    new THREE.Vector3(1.70, 0.15, 2.15),
    new THREE.Vector3(5.70, 15.65, 7.46)
  );
  physics.addBoxCollider(
    new THREE.Vector3(1.90, 0.15, 0.85),
    new THREE.Vector3(5.70, 15.10, 5.25)
  );

  // Build occluders for follow camera (all solid structures, terrain, rocks, buildings)
  const cameraOccluders: THREE.Object3D[] = [];
  model.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const name = mesh.name;
      if (
        name.includes('CHR_') ||
        name.includes('Armature') ||
        name.includes('Ocean_Preview') ||
        name.startsWith('COLLISION_') ||
        name.includes('Crystal') ||
        name.includes('Plant_Bush') ||
        name.includes('Plant_Fern') ||
        name.includes('Plant_GrassTuft') ||
        name.includes('Bush') ||
        name.includes('Fern') ||
        name.includes('Grass') ||
        name.includes('Flower') ||
        name.includes('Leaf') ||
        name.includes('Leaves') ||
        name.includes('Palm_')
      ) {
        return;
      }
      cameraOccluders.push(mesh);
    }
  });

  // Spawn dynamic physics props (crates, barrels, beach ball) that physically react, tumble & bounce
  const dynamicProps = new DynamicPropsManager(scene, physics);
  dynamicProps.spawnIslandProps();

  // Extract keeper character
  const keeperObj = model.getObjectByName('CHR_Keeper_Root');
  if (keeperObj) {
    // Attach keeper directly to scene root in world space
    scene.attach(keeperObj);

    // Initialize Game Systems
    player = new Player(keeperObj as THREE.Group, input, sfx, gltf.animations);
    player.setupPhysics(physics);
    player.setWalkableObjects(walkableMeshes);

    followCamera = new FollowCamera(camera, input);
    followCamera.setOccluders(cameraOccluders);
    followCamera.snapToTarget(player.group.position);
    collectibles = new Collectibles(scene, sfx);
    interaction = new InteractionManager(player, input, sfx, collectibles, scene, model, gltf.animations, physics);
    hud = new GameHUD(interaction, collectibles, sfx);

    // Initialize & batch the forest foliage into InstancedMesh for buttery 60 FPS performance
    forestManager = new ForestManager();
    forestManager.optimizeAndBatchForest(model, scene, physics);
  } else {
    console.error('CHR_Keeper_Root not found in model');
  }
});

// 8. Window Resize Handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// 9. Main Game Loop
let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const currentTime = performance.now();
  const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
  lastTime = currentTime;
  const elapsed = currentTime / 1000;

  // Step Rapier Physics
  physics.step(delta);

  // Gentle ambient wind sway for tropical palm canopies
  for (let i = 0; i < palmTrees.length; i++) {
    const tree = palmTrees[i];
    tree.rotation.z = Math.sin(elapsed * 1.4 + i * 0.9) * 0.012;
    tree.rotation.x = Math.cos(elapsed * 1.1 + i * 0.9) * 0.008;
  }

  if (player && followCamera) {
    player.update(delta, followCamera.yaw);
    followCamera.update(player.group.position, delta);

    // Keep sunlight shadow map centered dynamically around player
    const pPos = player.group.position;
    sunLight.target.position.set(pPos.x, pPos.y, pPos.z);
    sunLight.position.set(pPos.x + 35, pPos.y + 55, pPos.z + 28);
    sunLight.target.updateMatrixWorld();
  }

  if (collectibles) {
    collectibles.update(elapsed);
  }

  if (interaction) {
    interaction.update(delta);
  }

  if (hud) {
    hud.update();
  }

  if (forestManager) {
    forestManager.update(elapsed);
  }

  renderer.render(scene, camera);
}
animate();
