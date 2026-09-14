import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// 1. Canvas & Sizes
const canvas = document.querySelector('#webgl-canvas');
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
};

// 2. Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0c14);

// 3. Materials Showcase
// A. Wireframe Basic Material
const wireframeMat = new THREE.MeshBasicMaterial({
  color: 0x38bdf8,
  wireframe: true
});

// B. Shiny Phong Material (Glossy / Specular)
const phongMat = new THREE.MeshPhongMaterial({
  color: 0x22c55e,              // Base diffuse color
  specular: 0xffffff,           // Color of specular highlight reflection
  shininess: 150,               // Sharpness of reflection (0 to ~1000)
  emissive: 0x052e16,           // Self-illuminated glow color
  emissiveIntensity: 0.6,       // Intensity of the emissive glow
  flatShading: false,           // Smooth vertex normals vs faceted look
  wireframe: false,             // Wireframe rendering
  transparent: false,           // Enable opacity/alpha
  opacity: 1.0                  // Opacity level (0.0 to 1.0)
});

// C. Metallic Standard Material (PBR - Polished Metal)
const metallicMat = new THREE.MeshStandardMaterial({
  color: 0xf59e0b,              // Base albedo color
  metalness: 0.4,               // 0.0 (non-metal) to 1.0 (pure metallic)
  roughness: 0.15,              // 0.0 (mirror-smooth) to 1.0 (rough/diffuse)
  emissive: 0x451a03,           // Base self-illumination tint
  emissiveIntensity: 0.3,       // Emissive brightness multiplier
  flatShading: false,           // Faceted geometry look
  wireframe: false,             // Show wireframe
  transparent: false,           // Transparency flag
  opacity: 1.0                  // Alpha opacity
});

// D. Rough Matte Standard Material (PBR - Clay / Rubber)
const roughMat = new THREE.MeshStandardMaterial({
  color: 0xef4444,              // Base albedo color
  metalness: 0.0,               // Non-metallic
  roughness: 0.95,              // Maximum diffuse roughness (no sharp highlights)
  emissive: 0x000000,           // No self-illumination
  emissiveIntensity: 0.0,       // Zero glow
  flatShading: false,           // Smooth shading
  wireframe: false,             // Solid faces
  transparent: false,           // Fully opaque
  opacity: 1.0                  // 100% opacity
});

// E. Transparent Standard Material (PBR - Translucent Plastic)
const glassMat = new THREE.MeshStandardMaterial({
  color: 0xa855f7,              // Base color
  metalness: 0.1,               // Low metalness
  roughness: 0.1,               // Smooth shiny surface
  emissive: 0x2e1065,           // Subtle purple inner glow
  emissiveIntensity: 0.4,       // Glow brightness
  flatShading: false,           // Smooth surface
  wireframe: false,             // Solid surface
  transparent: true,            // MUST be true for opacity < 1.0
  opacity: 0.45                 // 45% visible, 55% transparent
});

// F. Advanced Physical Material (Glass/Coat)
const physicalMat = new THREE.MeshPhysicalMaterial({
  color: 0x06b6d4,
  metalness: 0.1,
  roughness: 0.2,
  clearcoat: 1.0,
  clearcoatRoughness: 0.1
});

// 4. Geometries & Meshes Grid (All 7 Geometries)

// 1. BoxGeometry (Width, Height, Depth)
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const box = new THREE.Mesh(boxGeo, wireframeMat);
box.position.set(-4.5, 1.2, 0);

// 2. SphereGeometry (Radius, WidthSegments, HeightSegments)
const sphereGeo = new THREE.SphereGeometry(0.7, 32, 32);
const sphere = new THREE.Mesh(sphereGeo, metallicMat);
sphere.position.set(-1.5, 1.2, 0);

// 3. PlaneGeometry (Width, Height)
const planeGeo = new THREE.PlaneGeometry(1.2, 1.2);
// Make material double-sided so backface is visible when orbiting
physicalMat.side = THREE.DoubleSide;
const plane = new THREE.Mesh(planeGeo, physicalMat);
plane.position.set(1.5, 1.2, 0);

// 4. TorusGeometry (Radius, Tube, RadialSegments, TubularSegments)
const torusGeo = new THREE.TorusGeometry(0.6, 0.2, 16, 48);
const torus = new THREE.Mesh(torusGeo, glassMat);
torus.position.set(4.5, 1.2, 0);

// 5. CylinderGeometry (RadiusTop, RadiusBottom, Height, RadialSegments)
const cylinderGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.2, 32);
const cylinder = new THREE.Mesh(cylinderGeo, phongMat);
cylinder.position.set(-3, -1.2, 0);

// 6. ConeGeometry (Radius, Height, RadialSegments)
const coneGeo = new THREE.ConeGeometry(0.6, 1.2, 32);
const cone = new THREE.Mesh(coneGeo, roughMat);
cone.position.set(0, -1.2, 0);

// 7. BufferGeometry (Custom 3D Pyramid built from raw vertex coordinates)
const bufferGeo = new THREE.BufferGeometry();
// 4 triangular faces defining a 3D pyramid (12 vertices total, 3 floats per vertex [x, y, z])
const vertices = new Float32Array([
  // Front Face
   0.0,  0.8,  0.0,   // apex
  -0.6, -0.6,  0.6,   // front-left
   0.6, -0.6,  0.6,   // front-right

  // Right Face
   0.0,  0.8,  0.0,   // apex
   0.6, -0.6,  0.6,   // front-right
   0.6, -0.6, -0.6,   // back-right

  // Back Face
   0.0,  0.8,  0.0,   // apex
   0.6, -0.6, -0.6,   // back-right
  -0.6, -0.6, -0.6,   // back-left

  // Left Face
   0.0,  0.8,  0.0,   // apex
  -0.6, -0.6, -0.6,   // back-left
  -0.6, -0.6,  0.6    // front-left
]);
bufferGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
bufferGeo.computeVertexNormals(); // Computes normals so lighting works correctly on faces

const bufferMaterial = new THREE.MeshStandardMaterial({
  color: 0x38bdf8,
  metalness: 0.5,
  roughness: 0.2,
  side: THREE.DoubleSide
});
const customPyramid = new THREE.Mesh(bufferGeo, bufferMaterial);
customPyramid.position.set(3, -1.2, 0);

// Add all 7 shapes to the scene
scene.add(box, sphere, plane, torus, cylinder, cone, customPyramid);

// 5. Lighting (Essential for Phong, Standard & Physical materials)
// A. Ambient Light: Soft baseline illumination for all objects
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

// B. Key Directional Light: Strong light from top-right to create highlights and depth
const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
keyLight.position.set(5, 5, 4);
scene.add(keyLight);

// C. Fill Directional Light: Softer light from left side to illuminate left-positioned meshes
const fillLight = new THREE.DirectionalLight(0xffffff, 1.0);
fillLight.position.set(-5, 2, 3);
scene.add(fillLight);

// 6. Camera
const camera = new THREE.PerspectiveCamera(60, sizes.width / sizes.height, 0.1, 100);
camera.position.set(0, 0, 7.5);
scene.add(camera);

// 7. Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// 8. OrbitControls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; // Smooth inertia effect

// Resize handling
window.addEventListener('resize', () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// 9. Animation Loop
const animate = () => {
  controls.update(); // Required when enableDamping is true
  renderer.render(scene, camera);
  window.requestAnimationFrame(animate);
};

animate();
