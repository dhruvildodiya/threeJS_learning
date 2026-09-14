import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// ============================================================================
// 1. SCENE, CANVAS & SIZES
// ============================================================================
const canvas = document.querySelector('#webgl-canvas');
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0d14);

// ============================================================================
// 2. CAMERA & ORBIT CONTROLS
// ============================================================================
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 100);
camera.position.set(0, 1.8, 12);
scene.add(camera);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// ============================================================================
// 3. RENDERER WITH TONE MAPPING & HDR ENVIRONMENT
// ============================================================================
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping; // Photorealistic contrast & color grading
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Photorealistic Studio HDRI Reflection Map (RoomEnvironment)
const environment = new RoomEnvironment();
const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(environment).texture;
pmremGenerator.dispose();

// ============================================================================
// 4. LIGHTING
// ============================================================================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

// Warm Key Light casting crisp shadows
const dirLight = new THREE.DirectionalLight(0xfff3e0, 2.0);
dirLight.position.set(5, 6, 4);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
scene.add(dirLight);

// Cool blue rim light from behind for edge separation
const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
rimLight.position.set(-5, 2, -4);
scene.add(rimLight);

// Dark ground floor to catch shadows
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(24, 24),
  new THREE.MeshStandardMaterial({
    color: 0x06080e,
    roughness: 0.85,
    metalness: 0.15
  })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.15;
floor.receiveShadow = true;
scene.add(floor);

// ============================================================================
// 5. TEXTURE OPTIMIZATION HELPER
// ============================================================================
const textureLoader = new THREE.TextureLoader();
const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

/**
 * Loads an image texture and applies essential GPU optimizations:
 * - SRGBColorSpace for accurate physical lighting
 * - Trilinear Mipmapping (LinearMipmapLinearFilter) to eliminate distance shimmering
 * - Max Anisotropic Filtering to keep textures ultra-crisp at grazing angles
 */
function loadOptimizedTexture(path, repeatX = 1, repeatY = 1) {
  const texture = textureLoader.load(path);

  // 1. Color Space (sRGB -> Linear conversion in shaders)
  texture.colorSpace = THREE.SRGBColorSpace;

  // 2. Mipmapping (pre-calculated levels of detail)
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;

  // 3. Anisotropic Filtering (maximum texture sharpness from sharp viewing angles)
  texture.anisotropy = maxAnisotropy;

  // 4. Wrapping & Tiling (if repeat is greater than 1)
  if (repeatX > 1 || repeatY > 1) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
  }

  return texture;
}

// Pedestal generator to display each object cleanly
function createPedestal(x, ringColor = 0x38bdf8) {
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.05, 0.15, 32),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6, metalness: 0.3 })
  );
  base.position.set(x, -1.08, 0);
  base.receiveShadow = true;
  scene.add(base);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.98, 0.018, 16, 48),
    new THREE.MeshBasicMaterial({ color: ringColor })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.set(x, -1.0, 0);
  scene.add(ring);
}

// 3D Objects


// A. REALISTIC WOODEN CRATE
createPedestal(-3.9, 0xf59e0b);
const crateTexture = loadOptimizedTexture('./textures/crate.jpg');
const box = new THREE.Mesh(
  new THREE.BoxGeometry(1.6, 1.6, 1.6),
  new THREE.MeshStandardMaterial({
    map: crateTexture,
    roughness: 0.65,
    metalness: 0.25
  })
);
box.position.set(-3.9, 0.3, 0);
box.castShadow = true;
box.receiveShadow = true;
scene.add(box);

// B. REALISTIC MASONRY BRICK WALL 
createPedestal(-1.3, 0xef4444);
const brickTexture = loadOptimizedTexture('./textures/brick.jpg', 2, 3);
const wall = new THREE.Mesh(
  new THREE.BoxGeometry(2.1, 1.7, 0.35),
  new THREE.MeshStandardMaterial({
    map: brickTexture,
    roughness: 0.9,
    metalness: 0.05
  })
);
wall.position.set(-1.3, 0.05, 0);
wall.castShadow = true;
wall.receiveShadow = true;
scene.add(wall);

// C. REALISTIC PLANET EARTH 
createPedestal(1.3, 0x38bdf8);
const earthTexture = loadOptimizedTexture('./textures/earth.jpg');
const planet = new THREE.Mesh(
  new THREE.SphereGeometry(1.05, 64, 32),
  new THREE.MeshStandardMaterial({
    map: earthTexture,
    roughness: 0.45,
    metalness: 0.1
  })
);
planet.position.set(1.3, 0.1, 0);
planet.castShadow = true;
scene.add(planet);

// D. REALISTIC LUXURY PRODUCT PACKAGE (Embossed Gold Foil Box)
createPedestal(3.9, 0xa855f7);
const packageTexture = loadOptimizedTexture('./textures/package.jpg');
const packageMat = new THREE.MeshStandardMaterial({
  map: packageTexture,
  roughness: 0.35, // Smooth finish so metallic foil catches light
  metalness: 0.3
});
const packageBox = new THREE.Mesh(
  new THREE.BoxGeometry(1.3, 1.9, 0.65),
  packageMat
);
packageBox.position.set(3.9, 0.15, 0);
packageBox.castShadow = true;
packageBox.receiveShadow = true;
scene.add(packageBox);

// ============================================================================
// 7. RESIZE & ANIMATION LOOP
// ============================================================================
window.addEventListener('resize', () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

const clock = new THREE.Clock();

const animate = () => {
  const delta = clock.getDelta();

  controls.update();

  // Smooth rotation for all 4 objects
  box.rotation.y += delta * 0.3;
  box.rotation.x += delta * 0.12;

  wall.rotation.y += delta * 0.2;

  planet.rotation.y += delta * 0.4;

  packageBox.rotation.y += delta * 0.3;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
};

animate();
