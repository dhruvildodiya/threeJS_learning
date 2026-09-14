import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// -------------------------------------------------------------
// 1. CANVAS & SIZES
// -------------------------------------------------------------
const canvas = document.querySelector('#webgl-canvas');
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
};

// -------------------------------------------------------------
// 2. SCENE
// -------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f172a);

// -------------------------------------------------------------
// 3. GROUND PLANE
// -------------------------------------------------------------
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 , side : THREE.DoubleSide})
);
ground.rotation.x = -Math.PI * 0.5;
ground.position.y = -0.5;
scene.add(ground);

// -------------------------------------------------------------
// 4. CAR HIERARCHY (Groups and Parent-Child Meshes)
// -------------------------------------------------------------
// Master Group: Moving this group moves the entire car together
const car = new THREE.Group();

// Shared Materials
const bodyMaterial = new THREE.MeshStandardMaterial({
  color: 0xef4444, // Red Car Paint
  metalness: 0.6,
  roughness: 0.2
});

const cabinMaterial = new THREE.MeshStandardMaterial({
  color: 0xdc2626,
  metalness: 0.5,
  roughness: 0.3
});

const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x38bdf8,
  transparent: true,
  opacity: 0.6,
  roughness: 0.1,
  transmission: 0.6
});

const wheelMaterial = new THREE.MeshStandardMaterial({
  color: 0x18181b, // Rubber Black
  roughness: 0.8,
  metalness: 0.2
});

const rimMaterial = new THREE.MeshStandardMaterial({
  color: 0xe2e8f0, // Silver Rim
  metalness: 0.9,
  roughness: 0.1
});

const lightMaterial = new THREE.MeshStandardMaterial({
  color: 0xfef08a,
  emissive: 0xfef08a,
  emissiveIntensity: 2.0
});

// A. Car Chassis / Lower Body
const chassis = new THREE.Mesh(
  new THREE.BoxGeometry(3.2, 0.6, 1.6),
  bodyMaterial
);
chassis.position.y = 0.3; // Local Y offset
car.add(chassis);

// B. Car Cabin / Roof
const cabin = new THREE.Mesh(
  new THREE.BoxGeometry(1.8, 0.6, 1.4),
  cabinMaterial
);
cabin.position.set(-0.2, 0.85, 0); // Local position relative to car
car.add(cabin);

// C. Windshield & Windows
const frontWindshield = new THREE.Mesh(
  new THREE.BoxGeometry(0.1, 0.5, 1.3),
  glassMaterial
);
frontWindshield.position.set(0.72, 0.85, 0);
frontWindshield.rotation.z = -Math.PI * 0.15; // Slanted windshield
car.add(frontWindshield);

// D. Wheels (Helper function for wheel + rim assembly)
const createWheel = (x, z) => {
  const wheelGroup = new THREE.Group();

  // Tire (Cylinder oriented along Z axis)
  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.4, 0.3, 24),
    wheelMaterial
  );
  tire.rotation.x = Math.PI * 0.5;
  wheelGroup.add(tire);

  // Inner Rim
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 0.32, 16),
    rimMaterial
  );
  rim.rotation.x = Math.PI * 0.5;
  wheelGroup.add(rim);

  wheelGroup.position.set(x, 0.1, z);
  return wheelGroup;
};

// 4 Wheels attached to the car
const frontLeftWheel = createWheel(1.0, 0.85);
const frontRightWheel = createWheel(1.0, -0.85);
const rearLeftWheel = createWheel(-1.0, 0.85);
const rearRightWheel = createWheel(-1.0, -0.85);

car.add(frontLeftWheel, frontRightWheel, rearLeftWheel, rearRightWheel);

// E. Headlights
const leftHeadlight = new THREE.Mesh(
  new THREE.CylinderGeometry(0.12, 0.12, 0.1, 16),
  lightMaterial
);
leftHeadlight.rotation.z = Math.PI * 0.5;
leftHeadlight.position.set(1.6, 0.35, 0.5);

const rightHeadlight = leftHeadlight.clone();
rightHeadlight.position.z = -0.5;

car.add(leftHeadlight, rightHeadlight);


car.scale.set(1, 1, 1);

// Add the complete car to scene
scene.add(car);

// -------------------------------------------------------------
// 5. LIGHTING
// -------------------------------------------------------------
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8);
directionalLight.position.set(5, 8, 5);
scene.add(directionalLight);

// -------------------------------------------------------------
// 6. CAMERA & RENDERER
// -------------------------------------------------------------
const camera = new THREE.PerspectiveCamera(55, sizes.width / sizes.height, 0.1, 100);
camera.position.set(4, 3, 5);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// -------------------------------------------------------------
// 7. ORBIT CONTROLS & RESIZE
// -------------------------------------------------------------
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

window.addEventListener('resize', () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// -------------------------------------------------------------
// 8. ANIMATION LOOP (Demonstrating Group Transformations)
// -------------------------------------------------------------
const clock = new THREE.Clock();

const animate = () => {
  const elapsedTime = clock.getElapsedTime();

  // Rotate the entire car as one composite object around Y axis
  // car.rotation.y = elapsedTime * 0.5;

  // Spin the wheels around their local axis
  // frontLeftWheel.children[0].rotation.y = elapsedTime * 4;
  // frontRightWheel.children[0].rotation.y = elapsedTime * 4;
  // rearLeftWheel.children[0].rotation.y = elapsedTime * 4;
  // rearRightWheel.children[0].rotation.y = elapsedTime * 4;

  controls.update();
  renderer.render(scene, camera);
  window.requestAnimationFrame(animate);
};

animate();
