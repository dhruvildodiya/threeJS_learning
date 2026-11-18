import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { InputManager } from './game/InputManager';
import { SoundEffects } from './game/SoundEffects';
import { Player } from './game/Player';
import { FollowCamera } from './game/FollowCamera';
import { Collectibles } from './game/Collectibles';
import { InteractionManager } from './game/InteractionManager';
import { GameHUD } from './game/GameHUD';
import { PhysicsWorld } from './physics/PhysicsWorld';

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
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// 4. Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x3b5971, 0.9);
hemiLight.position.set(0, 50, 0);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xfffaed, 2.2);
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
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => {
            m.shadowSide = THREE.DoubleSide;
          });
        } else {
          mesh.material.shadowSide = THREE.DoubleSide;
        }
      }

      // Collect walkable ground / stairs / dock / hut floor
      const name = mesh.name;
      if (
        name.includes('Island') ||
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
      if (
        name.includes('CHR_') ||
        name.includes('Armature') ||
        name.includes('Ocean_Preview') ||
        name.startsWith('COLLISION_') ||
        name.includes('Hut_Door')
      ) {
        return;
      }

      if (
        name.includes('Island') ||
        name.includes('Stairs') ||
        name.includes('Dock') ||
        name.includes('Path') ||
        name.includes('Flagstone') ||
        name.includes('Hut') ||
        name.includes('Lighthouse') ||
        name.includes('Rock') ||
        name.includes('Fence')
      ) {
        physics.addTrimeshCollider(mesh);
      }
    }
  });

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
        name.includes('Palm_')
      ) {
        return;
      }
      cameraOccluders.push(mesh);
    }
  });

  // Extract keeper character
  const keeperObj = model.getObjectByName('CHR_Keeper_Root');
  if (keeperObj) {
    // Attach keeper directly to scene root in world space
    scene.attach(keeperObj);

    // Initialize Game Systems
    player = new Player(keeperObj as THREE.Group, input, sfx);
    player.setupPhysics(physics);
    player.setWalkableObjects(walkableMeshes);

    followCamera = new FollowCamera(camera, input);
    followCamera.setOccluders(cameraOccluders);
    followCamera.snapToTarget(player.group.position);
    collectibles = new Collectibles(scene, sfx);
    interaction = new InteractionManager(player, input, sfx, collectibles, scene, model, gltf.animations, physics);
    hud = new GameHUD(interaction, collectibles, sfx);
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

  if (player && followCamera) {
    player.update(delta, followCamera.yaw);
    followCamera.update(player.group.position, delta);
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

  renderer.render(scene, camera);
}
animate();
