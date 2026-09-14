import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// ============================================================================
// 1. SETUP CANVAS & SIZES
// ============================================================================
const canvas = document.querySelector('#webgl-canvas');
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
};

// ============================================================================
// 2. SCENE & PHOTOREALISTIC ENVIRONMENT (PMREM + RoomEnvironment)
// ============================================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color('#090d16');

// ============================================================================
// 3. RENDERER WITH TONE MAPPING & SHADOWS
// ============================================================================
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio,3));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

// Generate HDR studio environment map for realistic physical reflections
const environment = new RoomEnvironment();
const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(environment).texture;
pmremGenerator.dispose();

// ============================================================================
// 4. CAMERA & ORBIT CONTROLS
// ============================================================================
const camera = new THREE.PerspectiveCamera(50, sizes.width / sizes.height, 0.1, 100);
camera.position.set(0, 3, 9.5);
scene.add(camera);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't clip below ground
controls.minDistance = 3;
controls.maxDistance = 18;

// ============================================================================
// 5. STUDIO LIGHTING
// ============================================================================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

// Key Directional Light
const keyLight = new THREE.DirectionalLight(0xfff5ea, 2.0);
keyLight.position.set(6, 10, 6);
scene.add(keyLight);

// Fill Light (Cool Cyan Tone)
const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
fillLight.position.set(-8, 6, 4);
scene.add(fillLight);

// Rim Light (Warm Violet Tone)
const rimLight = new THREE.DirectionalLight(0xa855f7, 1.5);
rimLight.position.set(0, 8, -8);
scene.add(rimLight);

// Dynamic floating point lights with visible glowing bulbs
const glowLight1 = new THREE.PointLight(0x6366f1, 2.5, 10);
const glowBulb1 = new THREE.Mesh(
  new THREE.SphereGeometry(0.12, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0x6366f1 })
);
glowLight1.add(glowBulb1);

const glowLight2 = new THREE.PointLight(0xec4899, 2.5, 10);
const glowBulb2 = new THREE.Mesh(
  new THREE.SphereGeometry(0.12, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xec4899 })
);
glowLight2.add(glowBulb2);

scene.add(glowLight1, glowLight2);

// ============================================================================
// 5.1 LIGHT HELPERS (Visualizing Light Sources & Ray Directions)
// ============================================================================
// Directional Light Helpers (Square grid showing light plane & perpendicular beam pointing at target)
const keyLightHelper = new THREE.DirectionalLightHelper(keyLight, 1.5, 0xfff5ea);
const fillLightHelper = new THREE.DirectionalLightHelper(fillLight, 1.2, 0x38bdf8);
const rimLightHelper = new THREE.DirectionalLightHelper(rimLight, 1.2, 0xa855f7);
scene.add(keyLightHelper, fillLightHelper, rimLightHelper);

// Point Light Helpers (Wireframe diamonds showing spherical light radius)
const pointHelper1 = new THREE.PointLightHelper(glowLight1, 0.3);
const pointHelper2 = new THREE.PointLightHelper(glowLight2, 0.3);
scene.add(pointHelper1, pointHelper2);

// ============================================================================
// 5.2 INTERACTIVE CURSOR / LIGHT TRACKING
// ============================================================================
// Interactive tracking spotlight & point light that follows cursor movement
const trackingLight = new THREE.PointLight(0xffffff, 4.0, 12, 1.2);
trackingLight.position.set(0, 2, 4);
scene.add(trackingLight);

// Visual Glowing Indicator for the tracking light
const trackerOrb = new THREE.Mesh(
  new THREE.SphereGeometry(0.1, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
trackingLight.add(trackerOrb);

const trackingLightHelper = new THREE.PointLightHelper(trackingLight, 0.35, 0xffffff);
scene.add(trackingLightHelper);

// Mouse state with smooth interpolation (lerping)
const mouse = {
  currentX: 0,
  currentY: 2,
  targetX: 0,
  targetY: 2
};

// Update mouse target on cursor move
window.addEventListener('pointermove', (event) => {
  // Normalize screen coordinates (-1 to 1)
  const normX = (event.clientX / window.innerWidth) * 2 - 1;
  const normY = -(event.clientY / window.innerHeight) * 2 + 1;

  // Map to 3D world space coordinate boundaries
  mouse.targetX = normX * 8.5;
  mouse.targetY = normY * 3.5 + 1.2;
});

// ============================================================================
// 6. STUDIO GROUND WITH REFLECTION & GRID
// ============================================================================
const groundGeo = new THREE.PlaneGeometry(30, 30);
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x0f1422,
  roughness: 0.25,
  metalness: 0.6
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI * 0.5;
ground.position.y = -1.2;
scene.add(ground);

const gridHelper = new THREE.GridHelper(30, 30, 0x38bdf8, 0x1e293b);
gridHelper.position.y = -1.19;
scene.add(gridHelper);

// ============================================================================
// 7. HELPER: CREATE PEDESTAL
// ============================================================================
const createPedestal = (x, z, labelColor) => {
  const group = new THREE.Group();

  // Cylinder Base
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.2, 0.4, 32),
    new THREE.MeshStandardMaterial({ color: 0x182032, roughness: 0.4, metalness: 0.5 })
  );
  base.position.y = -1.0;

  // Glowing Accent Ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.12, 0.025, 16, 48),
    new THREE.MeshStandardMaterial({
      color: labelColor,
      emissive: labelColor,
      emissiveIntensity: 3.0
    })
  );
  ring.rotation.x = Math.PI * 0.5;
  ring.position.y = -0.8;

  group.add(base, ring);
  group.position.set(x, 0, z);
  scene.add(group);
};

// ============================================================================
// 8. THE 5 PHYSICAL MATERIAL MASTERPIECES
// ============================================================================
const showcaseObjects = [];

// ----------------------------------------------------------------------------
// A. PURE REFRACTIVE GLASS & DIAMOND (Transmission + IOR + Dispersion)
// ----------------------------------------------------------------------------
createPedestal(-5.0, 0, 0x38bdf8);

const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  transmission: 1.0,           // 100% light transmission
  opacity: 1.0,                // Kept at 1.0 for physical transmission
  transparent: true,
  roughness: 0.04,             // Mirror-smooth clarity
  ior: 1.54,                   // Crown Glass Refraction Index
  thickness: 1.8,              // Volume depth for refraction
  specularIntensity: 1.0,
  specularColor: new THREE.Color(0xffffff),
  dispersion: 0.04             // Chromatic dispersion (Three.js 0.160+)
});

// Outer Glass Gem (Icosahedron)
const glassMesh = new THREE.Mesh(
  new THREE.IcosahedronGeometry(0.85, 0),
  glassMaterial
);
glassMesh.position.set(-5.0, 0.3, 0);

// Inner Glowing Core (Proves true physical refraction through glass!)
const innerCore = new THREE.Mesh(
  new THREE.OctahedronGeometry(0.35),
  new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x38bdf8,
    emissiveIntensity: 2.5
  })
);
glassMesh.add(innerCore);
scene.add(glassMesh);
showcaseObjects.push({ mesh: glassMesh, inner: innerCore, speedY: 0.8, speedX: 0.4 });

// ----------------------------------------------------------------------------
// B. AUTOMOTIVE HIGH-GLOSS CLEARCOAT (Clearcoat + ClearcoatRoughness)
// ----------------------------------------------------------------------------
createPedestal(-2.5, 0, 0xef4444);

const carPaintMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xdc2626,             // Deep Crimson Base Paint
  metalness: 0.85,             // Metallic flecks
  roughness: 0.3,              // Slightly scattered base
  clearcoat: 1.0,              // 100% Glossy Lacquer layer
  clearcoatRoughness: 0.03,    // Mirror-like top finish
  reflectivity: 0.9
});

const carPaintMesh = new THREE.Mesh(
  new THREE.TorusKnotGeometry(0.55, 0.18, 128, 32),
  carPaintMaterial
);
carPaintMesh.position.set(-2.5, 0.3, 0);
scene.add(carPaintMesh);
showcaseObjects.push({ mesh: carPaintMesh, speedY: 0.6, speedX: 0.3 });

// ----------------------------------------------------------------------------
// C. THIN-FILM IRIDESCENCE (Soap Bubble / Beetle Shell)
// ----------------------------------------------------------------------------
createPedestal(0, 0, 0xa855f7);

const iridescenceMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  transmission: 0.75,          // Semi-translucent
  transparent: true,
  opacity: 0.9,
  roughness: 0.05,
  ior: 1.33,                   // Water/Soap index
  thickness: 0.5,
  iridescence: 1.0,            // Full rainbow thin-film effect
  iridescenceIOR: 1.3,
  iridescenceThicknessRange: [100, 450] // Thin film nanometer thickness range
});

const iridMesh = new THREE.Mesh(
  new THREE.SphereGeometry(0.8, 64, 64),
  iridescenceMaterial
);
iridMesh.position.set(0, 0.3, 0);
scene.add(iridMesh);
showcaseObjects.push({ mesh: iridMesh, speedY: 0.5, speedX: 0.2 });

// ----------------------------------------------------------------------------
// D. ROYAL VELVET & SATIN (Sheen + SheenColor + SheenRoughness)
// ----------------------------------------------------------------------------
createPedestal(2.5, 0, 0xf43f5e);

const velvetMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x4c0519,             // Deep Burgundy
  roughness: 0.85,             // High base roughness (Cloth)
  metalness: 0.0,
  sheen: 1.0,                  // 100% Fabric Sheen
  sheenColor: new THREE.Color(0xf43f5e), // Vibrant Pink grazing backscatter
  sheenRoughness: 0.4
});

const velvetMesh = new THREE.Mesh(
  new THREE.TorusGeometry(0.65, 0.25, 32, 64),
  velvetMaterial
);
velvetMesh.position.set(2.5, 0.3, 0);
scene.add(velvetMesh);
showcaseObjects.push({ mesh: velvetMesh, speedY: 0.7, speedX: 0.5 });

// ----------------------------------------------------------------------------
// E. VOLUMETRIC FROSTED AMBER / JADE (Attenuation Color & Distance)
// ----------------------------------------------------------------------------
createPedestal(5.0, 0, 0xf59e0b);

const amberMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  transmission: 0.95,          // Light enters interior volume
  transparent: true,
  opacity: 1.0,
  roughness: 0.25,             // Frosted / Wax finish
  ior: 1.55,
  thickness: 2.2,              // Light travels deep inside
  attenuationColor: new THREE.Color(0xd97706), // Warm Honey/Amber interior absorption
  attenuationDistance: 0.75    // Density of internal color tint
});

const amberMesh = new THREE.Mesh(
  new THREE.DodecahedronGeometry(0.8, 0),
  amberMaterial
);
amberMesh.position.set(5.0, 0.3, 0);
scene.add(amberMesh);
showcaseObjects.push({ mesh: amberMesh, speedY: 0.6, speedX: 0.3 });

// ============================================================================
// 9. WINDOW RESIZE HANDLING
// ============================================================================
window.addEventListener('resize', () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// ============================================================================
// 10. ANIMATION & RENDER LOOP
// ============================================================================
const clock = new THREE.Clock();

const animate = () => {
  const time = clock.getElapsedTime();

  // Floating levitation and rotation for each showcase item
  showcaseObjects.forEach((item, index) => {
    // Gentle rotation
    item.mesh.rotation.y = time * item.speedY;
    item.mesh.rotation.x = time * item.speedX;

    // Smooth floating hovering motion
    item.mesh.position.y = 0.3 + Math.sin(time * 2 + index * 1.2) * 0.08;

    // Counter-rotate inner core if present
    if (item.inner) {
      item.inner.rotation.y = -time * 2;
      item.inner.rotation.z = time * 1.5;
    }
  });

  // Animate dynamic floating lights
  glowLight1.position.x = Math.sin(time * 0.8) * 6;
  glowLight1.position.z = Math.cos(time * 0.8) * 4;
  glowLight1.position.y = 2 + Math.sin(time * 1.2) * 1;

  glowLight2.position.x = -Math.sin(time * 0.7) * 6;
  glowLight2.position.z = -Math.cos(time * 0.7) * 4;
  glowLight2.position.y = 2 + Math.cos(time * 1.1) * 1;

  // Smooth Light Tracking (Lerp towards cursor position)
  mouse.currentX += (mouse.targetX - mouse.currentX) * 0.08;
  mouse.currentY += (mouse.targetY - mouse.currentY) * 0.08;
  trackingLight.position.x = mouse.currentX;
  trackingLight.position.y = mouse.currentY;
  trackingLight.position.z = 3.5;

  // Update helpers for moving lights
  pointHelper1.update();
  pointHelper2.update();
  trackingLightHelper.update();

  controls.update();
  renderer.render(scene, camera);
  window.requestAnimationFrame(animate);
};

animate();
