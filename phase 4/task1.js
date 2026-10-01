import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// --- Scene Setup ---
const canvas = document.getElementById('canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0e15);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 3, 6);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// --- Controls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0x6366f1, 2.5);
dirLight.position.set(5, 10, 7);
dirLight.castShadow = true;
scene.add(dirLight);

const pointLight = new THREE.PointLight(0xec4899, 3, 10);
pointLight.position.set(-3, 2, -2);
scene.add(pointLight);

// --- Starter Mesh ---
const geometry = new THREE.IcosahedronGeometry(1.5, 32);
const material = new THREE.MeshStandardMaterial({
  color: 0x4f46e5,
  roughness: 0.2,
  metalness: 0.8,
  wireframe: false,
});
const mesh = new THREE.Mesh(geometry, material);
mesh.castShadow = true;
mesh.receiveShadow = true;
mesh.position.y = 1;
scene.add(mesh);

// --- Grid / Floor ---
const gridHelper = new THREE.GridHelper(20, 20, 0x4f46e5, 0x27273a);
scene.add(gridHelper);

// --- Resize Listener ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// --- Animation Loop ---
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const elapsedTime = clock.getElapsedTime();
  mesh.rotation.x = elapsedTime * 0.3;
  mesh.rotation.y = elapsedTime * 0.5;

  controls.update();
  renderer.render(scene, camera);
}

animate();
