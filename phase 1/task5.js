import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ============================================================================
// 1. CANVAS & SIZES
// ============================================================================
const canvas = document.querySelector('#webgl-canvas');
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
};

// ============================================================================
// 2. SCENE
// ============================================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f172a);

// ============================================================================
// 3. FLOOR PLANE (Receives Shadows)
// ============================================================================
const floorGeometry = new THREE.PlaneGeometry(20, 20);
const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0x1e293b,
  roughness: 0.8
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI * 0.5; // Lie flat on the ground
floor.position.y = -1;
floor.receiveShadow = true;        // Enable receiving shadows
scene.add(floor);

// ============================================================================
// 4. SIMPLE SHAPE (Sphere - Perfect for observing light, shadow & specular highlights)
// ============================================================================
const sphereGeometry = new THREE.SphereGeometry(1, 64, 64);
const sphereMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.3,
  metalness: 0.1
});
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
sphere.position.set(0, 0, 0);
sphere.castShadow = true;          // Casts shadows onto the floor
sphere.receiveShadow = true;       // Receives shadows
scene.add(sphere);

// ============================================================================
// 5. 3-POINT LIGHTING SETUP (Tweak intensities, positions & colors here!)
// ============================================================================

// A. KEY LIGHT (Primary light, casts main shadow)
// Placed at ~45 degrees to the front-right
const keyLight = new THREE.DirectionalLight(0xffedd5, 2.0); // Warm tint
keyLight.position.set(4, 5, 4);
keyLight.castShadow = true;

// Shadow settings for Key Light
keyLight.shadow.mapSize.width = 1024;
keyLight.shadow.mapSize.height = 1024;
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 20;
keyLight.shadow.camera.left = -3;
keyLight.shadow.camera.right = 3;
keyLight.shadow.camera.top = 3;
keyLight.shadow.camera.bottom = -3;
keyLight.shadow.bias = -0.001;        // Prevents shadow acne
keyLight.shadow.normalBias = 0.03;   // Fixes shadow artifacts on curved surfaces
scene.add(keyLight);

// B. FILL LIGHT (Softens shadows on the dark side)
// Placed opposite to Key Light (-45 degrees) with lower intensity and cool tint
const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.6); // Cool blue tint
fillLight.position.set(-4, 3, 2);
fillLight.castShadow = false; // Fill lights usually do NOT cast shadows
scene.add(fillLight);

// C. RIM / BACK LIGHT (Highlights edge silhouette, creates separation from background)
// Placed behind the object, pointing towards the camera
const rimLight = new THREE.DirectionalLight(0xa855f7, 1.5); // Purple / white rim tint
rimLight.position.set(0, 4, -4);
rimLight.castShadow = false;
scene.add(rimLight);

// ============================================================================
// 6. OTHER LIGHT TYPES (Uncomment to experiment!)
// ============================================================================

// Ambient Light: Uniform flat light everywhere (no direction, no shadows)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

// Hemisphere Light: Sky color from above + Ground bounce color from below
const hemisphereLight = new THREE.HemisphereLight(0x38bdf8, 0x1e293b, 0.2);
scene.add(hemisphereLight);

// Point Light: Light radiating in all directions from a point
const pointLight = new THREE.PointLight("red", 20 , 20, 1);
pointLight.position.set(4, 1.5, 1);
scene.add(pointLight);

// Spot Light: Conical beam with angle and penumbra
const spotLight = new THREE.SpotLight(0xffffff, 1, 15, Math.PI / 6, 0.3);
spotLight.position.set(0, 6, 2);
spotLight.castShadow = true;
scene.add(spotLight);

// ============================================================================
// 7. VISUAL HELPERS (Uncomment to see light directions & shadow camera box)
// ============================================================================
// DirectionalLight Helpers (Shows plane square & line pointing to target)
const keyLightHelper = new THREE.DirectionalLightHelper(keyLight, 0.5);
const fillLightHelper = new THREE.DirectionalLightHelper(fillLight, 0.5);
const rimLightHelper = new THREE.DirectionalLightHelper(rimLight, 0.5);

// HemisphereLight Helper (Shows a wireframe sphere split into sky & ground colors)
const hemisphereLightHelper = new THREE.HemisphereLightHelper(hemisphereLight, 0.8);

// PointLight Helper (Shows a wireframe diamond/sphere at the point light source)
const pointLightHelper = new THREE.PointLightHelper(pointLight, 0.3);

// SpotLight Helper (Shows the cone boundary and direction line)
const spotLightHelper = new THREE.SpotLightHelper(spotLight);

// Shadow Camera Helper (Visualizes the exact Orthographic box used to bake Key Light's shadows)
const shadowCameraHelper = new THREE.CameraHelper(keyLight.shadow.camera);

// Note: THREE.AmbientLight does NOT have a helper because ambient light has NO position or direction.

scene.add(keyLightHelper);
scene.add(fillLightHelper);
scene.add(rimLightHelper);
scene.add(hemisphereLightHelper);
scene.add(pointLightHelper);
scene.add(spotLightHelper);
scene.add(shadowCameraHelper);

// ============================================================================
// 8. CAMERA & ORBIT CONTROLS
// ============================================================================
const camera = new THREE.PerspectiveCamera(
  45,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.set(0, 6.5, 20);
scene.add(camera);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent camera going below floor

// ============================================================================
// 9. RENDERER (Shadows Enabled)
// ============================================================================
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Enable shadow maps
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // PCFSoftShadowMap, PCFShadowMap, BasicShadowMap


// ============================================================================
// 10. RESIZE & ANIMATION LOOP
// ============================================================================
window.addEventListener('resize', () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

const animate = () => {
  controls.update();

  // If you use spotLightHelper, it needs an update call:
  // spotLightHelper.update();

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
};

animate();
