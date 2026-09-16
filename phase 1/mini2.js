// ===========================================================================
// MINI PROJECT 2 — Interactive 3D Scene
// ---------------------------------------------------------------------------
// Skills covered:
// 1. Raycasting: Raycaster from camera through Normalized Device Coordinates
// 2. Mouse interaction: Pointermove (hover detection) & Pointerdown (click selection)
// 3. Vector3: Distance calculations, target positions, direction offsets, lerping
// 4. Animation: Smooth hover scaling, selection elevation, camera dolly interpolation
// 5. Object selection: Active selection state, visual highlight rings, deselect logic
// ===========================================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// ---------------------------------------------------------------------------
// 1. SCENE, CAMERA & RENDERER SETUP
// ---------------------------------------------------------------------------
const canvas = document.querySelector('#webgl-canvas');

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e17);
scene.fog = new THREE.Fog(0x0a0e17, 10, 26);

// Camera default positions (Vector3)
const DEFAULT_CAM_POS = new THREE.Vector3(0, 4.2, 10.5);
const DEFAULT_LOOK_AT = new THREE.Vector3(0, 1.0, 0);

const camera = new THREE.PerspectiveCamera(
  42,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.copy(DEFAULT_CAM_POS);

// Target vectors for camera animation
const currentLookAt = new THREE.Vector3().copy(DEFAULT_LOOK_AT);
const targetCamPos = new THREE.Vector3().copy(DEFAULT_CAM_POS);
const targetLookAt = new THREE.Vector3().copy(DEFAULT_LOOK_AT);

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Environment map (for realistic reflections on PBR materials)
const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

// Orbit Controls (auto-disabled during cinematic camera transition)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.02;
controls.minDistance = 3;
controls.maxDistance = 18;
controls.target.copy(DEFAULT_LOOK_AT);

// ---------------------------------------------------------------------------
// 2. LIGHTING RIG
// ---------------------------------------------------------------------------
// Ambient Light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambientLight);

// Key Directional Light (Casts soft shadows)
const keyLight = new THREE.DirectionalLight(0xfffaed, 1.6);
keyLight.position.set(6, 10, 6);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.bias = -0.0001;
scene.add(keyLight);

// Fill Light (Cool sky bounce)
const fillLight = new THREE.SpotLight(0x38bdf8, 18, 25, Math.PI / 3, 0.5, 1.2);
fillLight.position.set(-8, 6, 4);
scene.add(fillLight);

// ---------------------------------------------------------------------------
// 3. GALLERY STAGE & PEDESTALS
// ---------------------------------------------------------------------------
// Main gallery platform
const mainStage = new THREE.Mesh(
  new THREE.CylinderGeometry(6.5, 6.8, 0.3, 64),
  new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.3, metalness: 0.4 })
);
mainStage.position.y = -0.15;
mainStage.receiveShadow = true;
scene.add(mainStage);

// Outer illuminated rim ring
const stageTrim = new THREE.Mesh(
  new THREE.TorusGeometry(6.5, 0.025, 16, 96),
  new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
);
stageTrim.rotation.x = Math.PI / 2;
stageTrim.position.y = 0.01;
scene.add(stageTrim);

// Studio Floor
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({ color: 0x070a10, roughness: 0.9, metalness: 0.1 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.3;
floor.receiveShadow = true;
scene.add(floor);

// ---------------------------------------------------------------------------
// 4. INTERACTIVE OBJECTS (GEOMETRIES & MATERIALS)
// ---------------------------------------------------------------------------
const interactiveObjects = [];
const interactiveMeshes = [];

const pedestalHeight = 0.95;
const pedestalGeo = new THREE.CylinderGeometry(0.5, 0.58, pedestalHeight, 36);
const pedestalMat = new THREE.MeshStandardMaterial({
  color: 0x1e293b,
  roughness: 0.4,
  metalness: 0.3
});

// Selection Highlight Ring Geometry & Material (pulses when object is selected)
const selectRingGeo = new THREE.TorusGeometry(0.52, 0.025, 16, 48);
const selectRingMat = new THREE.MeshStandardMaterial({
  color: 0x38bdf8,
  emissive: 0x0284c7,
  emissiveIntensity: 2.5
});

// Interactive exhibits configuration
const exhibitsData = [
  {
    geometry: new THREE.TorusKnotGeometry(0.38, 0.14, 120, 20),
    material: new THREE.MeshStandardMaterial({
      color: 0xffc72c, // 24K Gold
      metalness: 1.0,
      roughness: 0.12
    })
  },
  {
    geometry: new THREE.IcosahedronGeometry(0.58, 0),
    material: new THREE.MeshPhysicalMaterial({
      color: 0xbe123c, // Ruby Metallic Lacquer
      metalness: 0.65,
      roughness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03
    })
  },
  {
    geometry: new THREE.DodecahedronGeometry(0.54, 0),
    material: new THREE.MeshPhysicalMaterial({
      color: 0xffffff, // Optical Glass
      transmission: 1.0,
      ior: 1.52,
      thickness: 1.2,
      roughness: 0.02,
      attenuationColor: new THREE.Color(0x38bdf8),
      attenuationDistance: 2.0
    })
  },
  {
    geometry: new THREE.TorusGeometry(0.44, 0.18, 24, 48),
    material: new THREE.MeshPhongMaterial({
      color: 0x0284c7, // Glossy Acrylic
      specular: 0x555555,
      shininess: 100
    })
  },
  {
    geometry: new THREE.OctahedronGeometry(0.58, 0),
    material: new THREE.MeshStandardMaterial({
      color: 0xf1f5f9, // Chromium Mirror
      metalness: 1.0,
      roughness: 0.05
    })
  }
];

// Layout pedestals along a circular arc
const arcRadius = 4.2;

exhibitsData.forEach((data, index) => {
  const angle = ((index - (exhibitsData.length - 1) / 2) / exhibitsData.length) * (Math.PI * 0.75);
  const x = Math.sin(angle) * arcRadius;
  const z = Math.cos(angle) * arcRadius - 1.2;

  const group = new THREE.Group();
  group.position.set(x, 0, z);
  scene.add(group);

  // Pedestal Base
  const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
  pedestal.position.y = pedestalHeight / 2;
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  group.add(pedestal);

  // Selection Highlight Ring (hidden initially)
  const selectRing = new THREE.Mesh(selectRingGeo, selectRingMat.clone());
  selectRing.rotation.x = Math.PI / 2;
  selectRing.position.y = pedestalHeight + 0.01;
  selectRing.visible = false;
  group.add(selectRing);

  // Interactive Mesh
  const mesh = new THREE.Mesh(data.geometry, data.material);
  const defaultY = pedestalHeight + 0.8;
  mesh.position.set(0, defaultY, 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  // Store world position (Vector3)
  const worldPosition = new THREE.Vector3();
  mesh.getWorldPosition(worldPosition);

  // Record item state
  const item = {
    index,
    group,
    mesh,
    selectRing,
    worldPosition,
    defaultY,
    currentY: defaultY,
    targetY: defaultY,
    currentScale: 1.0,
    targetScale: 1.0,
    isHovered: false,
    isSelected: false
  };

  mesh.userData = { item };
  interactiveMeshes.push(mesh);
  interactiveObjects.push(item);
});

// ---------------------------------------------------------------------------
// 5. RAYCASTING & MOUSE INTERACTION
// ---------------------------------------------------------------------------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(-1000, -1000); // Normalized Device Coordinates (NDC)
let hoveredItem = null;
let selectedItem = null;

// Track mouse movements
window.addEventListener('pointermove', (e) => {
  // Convert screen coordinates to Normalized Device Coordinates ([-1, 1])
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

// Handle Click / Object Selection
window.addEventListener('pointerdown', (e) => {
  if (e.target !== canvas) return;

  // Raycast from camera
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(interactiveMeshes);

  if (intersects.length > 0) {
    const clickedItem = intersects[0].object.userData.item;

    if (selectedItem === clickedItem) {
      // Clicking already selected object deselects it
      deselectCurrent();
    } else {
      // Select newly clicked object
      selectObject(clickedItem);
    }
  } else {
    // Clicking empty space deselects
    deselectCurrent();
  }
});

// Object Selection logic
function selectObject(item) {
  if (selectedItem) {
    selectedItem.isSelected = false;
    selectedItem.selectRing.visible = false;
  }

  selectedItem = item;
  item.isSelected = true;
  item.selectRing.visible = true;

  // Compute camera target position (Vector3 arithmetic: offset camera in front of selected object)
  const objWorldPos = new THREE.Vector3();
  item.mesh.getWorldPosition(objWorldPos);

  // Offset vector from object toward camera direction
  const camOffset = new THREE.Vector3(0, 0.8, 3.2);
  targetCamPos.copy(objWorldPos).add(camOffset);
  targetLookAt.copy(objWorldPos);
}

// Deselect logic
function deselectCurrent() {
  if (selectedItem) {
    selectedItem.isSelected = false;
    selectedItem.selectRing.visible = false;
    selectedItem = null;
  }

  // Restore camera to default overview
  targetCamPos.copy(DEFAULT_CAM_POS);
  targetLookAt.copy(DEFAULT_LOOK_AT);
}

// ---------------------------------------------------------------------------
// 6. ANIMATION & INTERACTION LOOP
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();

  // --- 1. Raycasting for hover detection ---
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(interactiveMeshes);

  let currentIntersected = null;
  if (intersects.length > 0) {
    currentIntersected = intersects[0].object.userData.item;
  }

  // Update cursor pointer
  renderer.domElement.style.cursor = currentIntersected ? 'pointer' : 'default';

  // Update hover states
  interactiveObjects.forEach((item) => {
    item.isHovered = (item === currentIntersected);

    // Target scale & elevation based on hover and selection state
    if (item.isSelected) {
      item.targetScale = 1.25;
      item.targetY = item.defaultY + 0.35;
    } else if (item.isHovered) {
      item.targetScale = 1.12;
      item.targetY = item.defaultY + 0.15;
    } else {
      item.targetScale = 1.0;
      item.targetY = item.defaultY;
    }

    // Smooth interpolation (MathUtils.lerp) for scale and position
    item.currentScale = THREE.MathUtils.lerp(item.currentScale, item.targetScale, delta * 10);
    item.currentY = THREE.MathUtils.lerp(item.currentY, item.targetY, delta * 10);

    item.mesh.scale.setScalar(item.currentScale);
    item.mesh.position.y = item.currentY;

    // Rotation: active object spins faster; idle objects spin gently
    const spinSpeed = item.isSelected ? 2.0 : (item.isHovered ? 1.2 : 0.4);
    item.mesh.rotation.y += delta * spinSpeed;
    item.mesh.rotation.x = Math.sin(elapsedTime * 0.8 + item.index) * 0.1;

    // Pulse selection ring if active
    if (item.isSelected) {
      item.selectRing.material.emissiveIntensity = 2.0 + Math.sin(elapsedTime * 5) * 0.8;
      item.selectRing.rotation.z += delta * 1.5;
    }
  });

  // --- 2. Camera Dolly Animation (Vector3.lerp) ---
  camera.position.lerp(targetCamPos, delta * 4);
  currentLookAt.lerp(targetLookAt, delta * 4);
  controls.target.copy(currentLookAt);

  controls.update();
  renderer.render(scene, camera);
}

animate();

// ---------------------------------------------------------------------------
// 7. RESPONSIVE RESIZE
// ---------------------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
