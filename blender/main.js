import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// --- 1. Canvas & Scene Setup ---
const canvas = document.getElementById('canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e1117);

// --- 2. Camera ---
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.05,
  100
);
camera.position.set(0, 1.5, 3.5);

// --- 3. Renderer ---
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// --- 4. Environment Map (Fixes Black Metallic Chrome without downloading heavy HDRIs) ---
const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

// --- 5. Controls ---
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// --- 6. Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xfff8ee, 2.0);
keyLight.position.set(3, 5, 3);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 1024;
keyLight.shadow.mapSize.height = 1024;
keyLight.shadow.bias = -0.0001;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x88c0d0, 1.0);
fillLight.position.set(-3, 2, -2);
scene.add(fillLight);

// --- 7. Info / Stats Overlay ---
const infoBadge = document.createElement('div');
infoBadge.id = 'info-badge';
infoBadge.innerHTML = `
  <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px; color: #60a5fa;">🧴 Perfume 3D (Draco + KTX2 Ready)</div>
  <div id="stats" style="color: #94a3b8; font-size: 12px; line-height: 1.6;">Initializing loaders...</div>
`;
Object.assign(infoBadge.style, {
  position: 'fixed',
  top: '20px',
  left: '20px',
  padding: '14px 18px',
  background: 'rgba(15, 23, 42, 0.85)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '12px',
  color: '#f8fafc',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  zIndex: '10',
  pointerEvents: 'none',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
});
document.body.appendChild(infoBadge);

// ============================================================================
// --- 8. STEP-BY-STEP: SIMPLEST DRACO & KTX2 SETUP ---
// ============================================================================

// STEP A: Setup Draco Loader for compressed geometry
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/'); // Points to /public/draco/ folder

// STEP B: Setup KTX2 Loader for compressed GPU textures
const ktx2Loader = new KTX2Loader();
ktx2Loader.setTranscoderPath('/basis/'); // Points to /public/basis/ folder
ktx2Loader.detectSupport(renderer);     // Detects whether your GPU supports ASTC, BC7, or ETC

// STEP C: Plug both into GLTFLoader
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);
gltfLoader.setKTX2Loader(ktx2Loader);

// STEP D: Load the model (Loads Draco-compressed perfume_draco.glb or perfume.glb)
const modelUrl = new URL('./perfume_draco.glb', import.meta.url).href;

let totalVertices = 0;
let totalTriangles = 0;
let meshCount = 0;

gltfLoader.load(
  modelUrl,
  (gltf) => {
    const model = gltf.scene;
    scene.add(model);

    // Read-only inspection for stats & shadow flags
    model.traverse((child) => {
      if (child.isMesh) {
        meshCount++;
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.geometry) {
          totalVertices += child.geometry.attributes.position ? child.geometry.attributes.position.count : 0;
          totalTriangles += child.geometry.index
            ? child.geometry.index.count / 3
            : (child.geometry.attributes.position ? child.geometry.attributes.position.count / 3 : 0);
        }
      }
    });

    // Auto-frame camera to look at the model center
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    const distance = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;

    camera.position.set(center.x, center.y + maxDim * 0.3, center.z + distance);
    camera.lookAt(center);
    controls.target.copy(center);
    controls.update();

    // Update Stats Badge
    const statsEl = document.getElementById('stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div>Model: <strong>perfume_draco.glb</strong></div>
        <div>Meshes: <strong>${meshCount}</strong></div>
        <div>Vertices: <strong>${totalVertices.toLocaleString()}</strong></div>
        <div>Triangles: <strong>${Math.round(totalTriangles).toLocaleString()}</strong></div>
        <div style="margin-top: 6px; color: #4ade80; font-size: 11px;">✓ Draco geometry decompressed via WebAssembly</div>
      `;
    }
  },
  (xhr) => {
    if (xhr.total > 0) {
      const percent = Math.round((xhr.loaded / xhr.total) * 100);
      const statsEl = document.getElementById('stats');
      if (statsEl) statsEl.textContent = `Downloading: ${percent}%`;
    }
  },
  (error) => {
    console.error('An error occurred loading model:', error);
    const statsEl = document.getElementById('stats');
    if (statsEl) {
      statsEl.innerHTML = `<span style="color: #ef4444;">Error loading model. Check console.</span>`;
    }
  }
);

// --- 9. Window Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// --- 10. Render Loop ---
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();
