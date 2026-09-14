import * as THREE from 'three';

// 1. Canvas & Sizes
const canvas = document.querySelector('#webgl-canvas');
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
};

// 2. Scene
const scene = new THREE.Scene();

// 3. Ground Plane
const planeGeometry = new THREE.PlaneGeometry(10, 10);
const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI * 0.5; // Rotate to lie flat
plane.position.y = -1;
scene.add(plane);

// 4. Cube
const cubeGeometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0x6366f1 });
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
cube.position.set(0, 0, 0);
scene.add(cube);

// 5. Basic Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// 6. Camera
const camera = new THREE.PerspectiveCamera(
  60,
  sizes.width / sizes.height,
  0.1,
  100
);
// Position & LookAt
camera.position.set(3, 3, 5);
camera.lookAt(cube.position);
scene.add(camera);

// 7. Renderer
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// 8. Render
renderer.render(scene, camera);
