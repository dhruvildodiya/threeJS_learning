// ===========================================================================
// MINI PROJECT 1 — 3D Object Showcase (Real-World Material Physics)
// ---------------------------------------------------------------------------
// Skills covered:
// 1. Scene: Realistic studio atmosphere, fog, environment reflections
// 2. Camera: PerspectiveCamera + OrbitControls with damping
// 3. Renderer: WebGLRenderer with tone mapping & PCFSoftShadowMap
// 4. Geometry:
//    - Standard: Box, Sphere, Cone, Torus, Cylinder, TorusKnot, Icosahedron, Dodecahedron
//    - Custom BufferGeometry: Raw Float32Array vertex buffer + computeVertexNormals()
// 5. Materials (Physically-Accurate Real-World Values):
//    - Architectural Blueprint (MeshBasicMaterial): wireframe CAD overlay
//    - Surface Normals (MeshNormalMaterial): flat-faceted geometric vectors
//    - Matte Terracotta Clay (MeshLambertMaterial): purely diffuse dielectric
//    - Glossy Molded Acrylic (MeshPhongMaterial): dielectric specular highlight
//    - Stylized Cel Resin (MeshToonMaterial): stepped non-photorealistic tone
//    - 24K Polished Gold (MeshStandardMaterial): metalness=1.0, albedo=(1.0, 0.76, 0.28)
//    - Automotive Metallic Lacquer (MeshPhysicalMaterial): clearcoat=1.0, metallic base
//    - Optical Crown Glass (MeshPhysicalMaterial): transmission=1.0, IOR=1.52, roughness=0.02
//    - Iridescent Emerald (MeshPhysicalMaterial): custom BufferGeometry crystal
// 6. Meshes & Pedestals: Dedicated gallery mounts with contact shadows
// 7. Transformations: Position, rotation, and parent-child orbital hierarchies
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
scene.fog = new THREE.Fog(0x0a0e17, 12, 30);

// Camera (Natural human field of view)
const camera = new THREE.PerspectiveCamera(
  42,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 5.2, 13);

// Renderer with ACES Filmic Tone Mapping (matches physical cameras)
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// PMREM Room Environment for real PBR light reflections and glass refraction
const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.02; // prevent camera clipping through floor
controls.minDistance = 3.5;
controls.maxDistance = 22;
controls.target.set(0, 1.1, 0);

// ---------------------------------------------------------------------------
// 2. PHYSICAL STUDIO LIGHT RIG
// ---------------------------------------------------------------------------
// Ambient fill light (soft bounce)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

// Key Light (Warm 5400K daylight spot with sharp soft shadows)
const keyLight = new THREE.SpotLight(0xfffaed, 42, 25, Math.PI / 4, 0.35, 1.2);
keyLight.position.set(6, 10, 7);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.bias = -0.0001;
scene.add(keyLight);
scene.add(keyLight.target);

// Fill Light (Cool sky bounce)
const fillLight = new THREE.SpotLight(0x93c5fd, 16, 25, Math.PI / 3, 0.55, 1.2);
fillLight.position.set(-8, 5, 4);
scene.add(fillLight);
scene.add(fillLight.target);

// Rim Backlight (Specular glints)
const rimLight = new THREE.DirectionalLight(0x818cf8, 0.7);
rimLight.position.set(0, 6, -8);
scene.add(rimLight);

// ---------------------------------------------------------------------------
// 3. GALLERY STAGE & PEDESTALS
// ---------------------------------------------------------------------------
// Main gallery platform disc
const mainStageGeo = new THREE.CylinderGeometry(7.2, 7.5, 0.3, 64);
const mainStageMat = new THREE.MeshStandardMaterial({
  color: 0x111827,
  roughness: 0.25,
  metalness: 0.5
});
const mainStage = new THREE.Mesh(mainStageGeo, mainStageMat);
mainStage.position.y = -0.15;
mainStage.receiveShadow = true;
scene.add(mainStage);

// Stage perimeter illumination ring
const stageTrimGeo = new THREE.TorusGeometry(7.2, 0.03, 16, 96);
const stageTrimMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
const stageTrim = new THREE.Mesh(stageTrimGeo, stageTrimMat);
stageTrim.rotation.x = Math.PI / 2;
stageTrim.position.y = 0.01;
scene.add(stageTrim);

// Studio Floor
const floorGeo = new THREE.PlaneGeometry(45, 45);
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x070a10,
  roughness: 0.85,
  metalness: 0.1
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.3;
floor.receiveShadow = true;
scene.add(floor);

// ---------------------------------------------------------------------------
// 4. HELPER: CUSTOM BUFFER GEOMETRY BUILDER (FROM RAW VERTEX BUFFERS)
// ---------------------------------------------------------------------------
function createCustomCrystalBufferGeometry() {
  const geometry = new THREE.BufferGeometry();

  // 8 triangular faces defined in Counter-Clockwise (CCW) winding order
  // so surface normals point outwards away from the center
  const vertices = new Float32Array([
    // Upper pyramid (4 faces, apex at (0, 0.75, 0))
    0, 0, 0.5,     0.5, 0, 0,     0, 0.75, 0,   // (+X, +Z)
    0.5, 0, 0,     0, 0, -0.5,    0, 0.75, 0,   // (+X, -Z)
    0, 0, -0.5,   -0.5, 0, 0,     0, 0.75, 0,   // (-X, -Z)
   -0.5, 0, 0,     0, 0, 0.5,     0, 0.75, 0,   // (-X, +Z)

    // Lower pyramid (4 faces, apex at (0, -0.75, 0))
    0.5, 0, 0,     0, 0, 0.5,     0, -0.75, 0,  // (+X, +Z)
    0, 0, -0.5,    0.5, 0, 0,     0, -0.75, 0,  // (+X, -Z)
   -0.5, 0, 0,     0, 0, -0.5,    0, -0.75, 0,  // (-X, -Z)
    0, 0, 0.5,    -0.5, 0, 0,     0, -0.75, 0   // (-X, +Z)
  ]);

  // Set position attribute with 3 components (X, Y, Z) per vertex
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

  // Compute outwards-facing surface normal vectors
  geometry.computeVertexNormals();

  return geometry;
}

// ---------------------------------------------------------------------------
// 5. EXHIBIT ITEMS (REAL-WORLD MATERIAL PHYSICS & GEOMETRIES)
// ---------------------------------------------------------------------------
const showcaseObjects = [];

const pedestalHeight = 1.0;
const pedestalGeo = new THREE.CylinderGeometry(0.5, 0.6, pedestalHeight, 36);
const pedestalMat = new THREE.MeshStandardMaterial({
  color: 0x1e293b,
  roughness: 0.35,
  metalness: 0.4
});
const pedestalRimGeo = new THREE.TorusGeometry(0.5, 0.015, 16, 36);
const pedestalRimMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

// Pairings using real-world physical values and diverse geometries
const items = [
  {
    // 1. MeshBasicMaterial: Holographic CAD Wireframe + BoxGeometry
    geometry: new THREE.BoxGeometry(0.85, 0.85, 0.85),
    material: new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.85
    })
  },
  {
    // 2. MeshNormalMaterial: Mathematical Normal Vectors + SphereGeometry
    geometry: new THREE.SphereGeometry(0.55, 32, 32),
    material: new THREE.MeshNormalMaterial({
      flatShading: true,
      wireframe: false
    })
  },
  {
    // 3. MeshLambertMaterial: Real Matte Terracotta Clay + ConeGeometry
    geometry: new THREE.ConeGeometry(0.55, 1.0, 32),
    material: new THREE.MeshLambertMaterial({
      color: 0xd97706, // Natural terracotta clay pigment
      emissive: 0x000000
    })
  },
  {
    // 4. MeshPhongMaterial: Molded Glossy Acrylic + TorusGeometry
    geometry: new THREE.TorusGeometry(0.44, 0.18, 24, 48),
    material: new THREE.MeshPhongMaterial({
      color: 0x0284c7,     // Deep cyan acrylic
      specular: 0x555555,  // Dielectric reflection (~4% F0 reflectance)
      shininess: 90,       // Glossy smooth finish
      emissive: 0x000000
    })
  },
  {
    // 5. MeshToonMaterial: Stylized Cel-Shaded Resin + CylinderGeometry
    geometry: new THREE.CylinderGeometry(0.42, 0.42, 0.95, 32),
    material: new THREE.MeshToonMaterial({
      color: 0x10b981
    })
  },
  {
    // 6. MeshStandardMaterial: Real 24K Polished Gold + TorusKnotGeometry
    geometry: new THREE.TorusKnotGeometry(0.38, 0.14, 100, 16),
    material: new THREE.MeshStandardMaterial({
      color: 0xffc72c,   // Real 24K gold wavelength
      metalness: 1.0,    // Pure conductive metal
      roughness: 0.12,   // Micro-polished luster
      emissive: 0x000000
    })
  },
  {
    // 7. MeshPhysicalMaterial: Multi-Layer Automotive Lacquer + IcosahedronGeometry
    geometry: new THREE.IcosahedronGeometry(0.58, 0),
    material: new THREE.MeshPhysicalMaterial({
      color: 0xbe123c,            // Crimson metallic basecoat
      metalness: 0.65,            // Metallic base flakes
      roughness: 0.18,            // Base roughness
      clearcoat: 1.0,             // Polyurethane glossy topcoat
      clearcoatRoughness: 0.03,   // Mirror lacquer polish
      sheen: 0.4,                 // Fresnel sheen
      sheenRoughness: 0.2,
      sheenColor: new THREE.Color(0xff6b81),
      specularIntensity: 1.0
    })
  },
  {
    // 8. MeshPhysicalMaterial: Real Optical Crown Glass + DodecahedronGeometry
    geometry: new THREE.DodecahedronGeometry(0.55, 0),
    material: new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 1.0,          // 100% optical light transmission
      ior: 1.52,                  // Exact physical index of refraction for crown glass
      thickness: 1.2,             // Optical volumetric thickness for refraction
      roughness: 0.02,            // Polished glass smoothness
      metalness: 0.0,             // Dielectric
      clearcoat: 1.0,             // Surface reflection
      clearcoatRoughness: 0.02,
      attenuationColor: new THREE.Color(0xe0f2fe), // Subtle cyan light absorption
      attenuationDistance: 2.0
    })
  },
  {
    // 9. Custom BufferGeometry: Faceted Emerald Crystal (built from raw Float32Array buffers)
    geometry: createCustomCrystalBufferGeometry(),
    material: new THREE.MeshPhysicalMaterial({
      color: 0x059669,            // Emerald green tint
      transmission: 0.9,          // Gemstone refraction
      ior: 1.77,                  // Sapphire/Ruby/Emerald mineral IOR
      thickness: 0.9,
      roughness: 0.05,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02
    })
  }
];

// Arrange pedestals in a circular gallery ring
const galleryRadius = 4.8;

items.forEach((item, index) => {
  const angle = (index / items.length) * Math.PI * 2;
  const x = Math.sin(angle) * galleryRadius;
  const z = Math.cos(angle) * galleryRadius;

  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.lookAt(0, 0, 0);
  scene.add(group);

  // Pedestal Base & Rim
  const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
  pedestal.position.y = pedestalHeight / 2;
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  group.add(pedestal);

  const pedRim = new THREE.Mesh(pedestalRimGeo, pedestalRimMat);
  pedRim.rotation.x = Math.PI / 2;
  pedRim.position.y = pedestalHeight + 0.005;
  group.add(pedRim);

  // Showcase Mesh mounted on top
  const mesh = new THREE.Mesh(item.geometry, item.material);
  mesh.position.y = pedestalHeight + 0.85;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  showcaseObjects.push({ mesh, baseY: pedestalHeight + 0.85 });
});

// ---------------------------------------------------------------------------
// 6. CENTERPIECE — HIERARCHICAL TRANSFORMS (PARENT-CHILD GROUP)
// ---------------------------------------------------------------------------
// Center Pedestal
const centerPedestalGeo = new THREE.CylinderGeometry(0.9, 1.05, 0.7, 48);
const centerPedestal = new THREE.Mesh(centerPedestalGeo, pedestalMat);
centerPedestal.position.y = 0.35;
centerPedestal.castShadow = true;
centerPedestal.receiveShadow = true;
scene.add(centerPedestal);

const centerRimGeo = new THREE.TorusGeometry(0.9, 0.02, 16, 48);
const centerRim = new THREE.Mesh(centerRimGeo, pedestalRimMat);
centerRim.rotation.x = Math.PI / 2;
centerRim.position.y = 0.705;
scene.add(centerRim);

// Centerpiece Parent-Child Hierarchy Group
const centerGroup = new THREE.Group();
centerGroup.position.set(0, 1.55, 0);
scene.add(centerGroup);

// Parent Mesh: Brushed Mirror Chromium (metalness=1.0, roughness=0.06)
const parentMesh = new THREE.Mesh(
  new THREE.OctahedronGeometry(0.65, 0),
  new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 1.0,
    roughness: 0.06
  })
);
parentMesh.castShadow = true;
parentMesh.receiveShadow = true;
centerGroup.add(parentMesh);

// Child Mesh: Luminous LED Core Satellite (emissive light emitter)
const childMesh = new THREE.Mesh(
  new THREE.SphereGeometry(0.18, 24, 24),
  new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 1.5,
    roughness: 0.1
  })
);
childMesh.position.set(1.3, 0, 0);
childMesh.castShadow = true;
centerGroup.add(childMesh);

// ---------------------------------------------------------------------------
// 7. ANIMATION LOOP
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const elapsedTime = clock.getElapsedTime();

  // Subtle continuous rotation on pedestals
  showcaseObjects.forEach((item, i) => {
    item.mesh.rotation.y = elapsedTime * 0.5 + i * 0.15;
    item.mesh.rotation.x = Math.sin(elapsedTime * 0.7 + i) * 0.12;
  });

  // Hierarchical parent-child rotation (satellite orbits parent)
  centerGroup.rotation.y = elapsedTime * 0.85;
  parentMesh.rotation.x = elapsedTime * 0.45;

  controls.update();
  renderer.render(scene, camera);
}

animate();

// ---------------------------------------------------------------------------
// 8. RESPONSIVE RESIZE
// ---------------------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});