import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * ============================================================================
 * THREE.JS TASK 8: ANIMATION LOOP & FRAME-RATE INDEPENDENCE MASTERCLASS
 * ============================================================================
 * 
 * Core Topics Covered:
 * 1. requestAnimationFrame & The WebGL Render Loop Architecture
 * 2. THREE.Clock: Delta Time (clock.getDelta()) vs Elapsed Time (clock.getElapsedTime())
 * 3. Frame-Rate Independent Animation (60 FPS vs 120 FPS vs 144 FPS consistency)
 * 4. 3D Transformation Animations:
 *    - Rotation Animation (Multi-axis constant angular velocity)
 *    - Position Animation (Harmonic sine waves & vertical bouncing physics)
 *    - Scale Animation (Smooth pulsation & harmonic breathing)
 *    - Multi-Object Speed Hierarchies (Planetary orbits & phase-delayed wave fields)
 * ============================================================================
 */

// ============================================================================
// 1. CANVAS, SIZES & CORE SCENE SETUP
// ============================================================================
const canvas = document.querySelector('#webgl-canvas');
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080b13);
scene.fog = new THREE.FogExp2(0x080b13, 0.02);

// ============================================================================
// 2. CAMERA & ORBIT CONTROLS
// ============================================================================
const camera = new THREE.PerspectiveCamera(
    45,
    sizes.width / sizes.height,
    0.1,
    100
);
camera.position.set(0, 3.5, 12.5);
scene.add(camera);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0.5, 0);

// ============================================================================
// 3. RENDERER WITH POST-PROCESSING TONE MAPPING & SHADOWS
// ============================================================================
const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance'
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// ============================================================================
// 4. LIGHTING SYSTEM
// ============================================================================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

// Key Directional Light with crisp shadows
const dirLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
dirLight.position.set(5, 9, 6);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 30;
dirLight.shadow.camera.left = -8;
dirLight.shadow.camera.right = 8;
dirLight.shadow.camera.top = 8;
dirLight.shadow.camera.bottom = -8;
dirLight.shadow.bias = -0.0005;
scene.add(dirLight);

// Cool Cyan/Blue Rim Light from behind
const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
rimLight.position.set(-6, 4, -6);
scene.add(rimLight);

// ============================================================================
// 5. ENVIRONMENT: FLOOR & PEDESTALS
// ============================================================================
const floorGeo = new THREE.PlaneGeometry(30, 24);
const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0a0f1d,
    roughness: 0.35,
    metalness: 0.6
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.2;
floor.receiveShadow = true;
scene.add(floor);

const gridHelper = new THREE.GridHelper(30, 30, 0x38bdf8, 0x1e293b);
gridHelper.position.y = -1.19;
scene.add(gridHelper);

// Helper function to create stylish pedestals for each animation station
function createPedestal(x, ringColor = 0x38bdf8) {
    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 1.0, 0.2, 32),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.4 })
    );
    base.position.set(x, -1.1, 0);
    base.receiveShadow = true;
    scene.add(base);

    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.92, 0.02, 16, 48),
        new THREE.MeshBasicMaterial({ color: ringColor })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, -1.0, 0);
    scene.add(ring);
}

// ============================================================================
// 6. ANIMATED OBJECTS SHOWCASE
// ============================================================================

// ----------------------------------------------------------------------------
// A. STATION 1: ROTATING CUBE (Constant Angular Velocity with Delta Time)
// ----------------------------------------------------------------------------
createPedestal(-4.5, 0xf59e0b);

const cubeGeo = new THREE.BoxGeometry(1.3, 1.3, 1.3);
const cubeMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.2,
    metalness: 0.8
});
const rotatingCube = new THREE.Mesh(cubeGeo, cubeMat);
rotatingCube.position.set(-4.5, 0.3, 0);
rotatingCube.castShadow = true;
rotatingCube.receiveShadow = true;
scene.add(rotatingCube);

// Inner Wireframe Accent Cube
const wireGeo = new THREE.BoxGeometry(1.4, 1.4, 1.4);
const wireMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, wireframe: true });
const wireCube = new THREE.Mesh(wireGeo, wireMat);
rotatingCube.add(wireCube);

// ----------------------------------------------------------------------------
// B. STATION 2: MOVING SPHERE (Position Animation: Bouncing & Floating)
// ----------------------------------------------------------------------------
createPedestal(-1.5, 0x22c55e);

const sphereGeo = new THREE.SphereGeometry(0.7, 32, 32);
const sphereMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    roughness: 0.15,
    metalness: 0.7
});
const movingSphere = new THREE.Mesh(sphereGeo, sphereMat);
movingSphere.position.set(-1.5, 0.3, 0);
movingSphere.castShadow = true;
scene.add(movingSphere);

// ----------------------------------------------------------------------------
// C. STATION 3: PULSATING OBJECT (Scale Animation & Emissive Breathing)
// ----------------------------------------------------------------------------
createPedestal(1.5, 0xec4899);

const pulseGeo = new THREE.IcosahedronGeometry(0.75, 1);
const pulseMat = new THREE.MeshStandardMaterial({
    color: 0xec4899,
    emissive: 0xdb2777,
    emissiveIntensity: 0.5,
    roughness: 0.2,
    metalness: 0.85
});
const pulsatingMesh = new THREE.Mesh(pulseGeo, pulseMat);
pulsatingMesh.position.set(1.5, 0.3, 0);
pulsatingMesh.castShadow = true;
scene.add(pulsatingMesh);

// ----------------------------------------------------------------------------
// D. STATION 4: MULTI-SPEED ORBITAL CLUSTER (Hierarchical Speeds)
// ----------------------------------------------------------------------------
createPedestal(4.5, 0x38bdf8);

const clusterGroup = new THREE.Group();
clusterGroup.position.set(4.5, 0.3, 0);
scene.add(clusterGroup);

// Central Planet
const corePlanet = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3, metalness: 0.7 })
);
corePlanet.castShadow = true;
clusterGroup.add(corePlanet);

// Orbiting Satellite 1 (Fast Inner Orbit)
const satellite1 = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.2, metalness: 0.8 })
);
satellite1.castShadow = true;
clusterGroup.add(satellite1);

// Orbiting Satellite 2 (Slow Outer Tilted Orbit)
const satellite2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.25, 0.25),
    new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.2, metalness: 0.8 })
);
satellite2.castShadow = true;
clusterGroup.add(satellite2);

// Spinning Gyroscope Ring
const ringMesh = new THREE.Mesh(
    new THREE.TorusGeometry(1.15, 0.03, 16, 48),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
);
clusterGroup.add(ringMesh);

// ----------------------------------------------------------------------------
// E. BACKGROUND HARMONIC WAVE FIELD (Sine Wave Propagation)
// ----------------------------------------------------------------------------
const wavePillars = [];
const numPillars = 13;
const pillarGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.2, 16);
const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x6366f1,
    roughness: 0.3,
    metalness: 0.6
});

for (let i = 0; i < numPillars; i++) {
    const p = new THREE.Mesh(pillarGeo, pillarMat);
    const xPos = (i - (numPillars - 1) / 2) * 0.9;
    p.position.set(xPos, 0, -3.5);
    p.castShadow = true;
    scene.add(p);
    wavePillars.push(p);
}

// ============================================================================
// 7. THREE.CLOCK: THE ENGINE OF FRAME-RATE INDEPENDENCE
// ============================================================================
/**
 * THREE.Clock provides two vital methods:
 * 
 * 1. clock.getDelta():
 *    Returns the time in seconds since the LAST frame (e.g. ~0.0166s at 60 FPS, ~0.0069s at 144 FPS).
 *    Multiplying changes by delta ensures that motion happens at the exact same physical speed (e.g. units/sec)
 *    regardless of how fast or slow the user's screen or GPU is running.
 * 
 * 2. clock.getElapsedTime():
 *    Returns total running time in seconds since clock initialization.
 *    Perfect for periodic mathematical functions: Math.sin(elapsedTime * frequency).
 */
const clock = new THREE.Clock();

// Rotation speeds in radians per second (independent of FPS!)
const rotationSpeed = {
    cubeX: 1.0,  // 1.0 radian (~57.3°) per second
    cubeY: 1.5,
    cubeZ: 0.7
};

// ============================================================================
// 8. ANIMATION LOOP (requestAnimationFrame)
// ============================================================================
const animate = () => {
    // A. DELTA TIME & ELAPSED TIME
    const delta = clock.getDelta();          // Time passed since last frame (in seconds)
    const elapsedTime = clock.getElapsedTime(); // Total elapsed running time (in seconds)

    // ------------------------------------------------------------------------
    // 1. ROTATION ANIMATION (Constant speed scaled by delta time)
    // ------------------------------------------------------------------------
    rotatingCube.rotation.x += rotationSpeed.cubeX * delta;
    rotatingCube.rotation.y += rotationSpeed.cubeY * delta;
    rotatingCube.rotation.z += rotationSpeed.cubeZ * delta;

    // ------------------------------------------------------------------------
    // 2. POSITION ANIMATION (Smooth Vertical Bounce)
    // ------------------------------------------------------------------------
    const bounceFrequency = 3.0;
    const bounceHeight = 1.2;
    const bounceY = Math.abs(Math.sin(elapsedTime * bounceFrequency)) * bounceHeight;
    movingSphere.position.y = -0.3 + bounceY;

    // ------------------------------------------------------------------------
    // 3. SCALE ANIMATION (Using THREE.MathUtils.lerp for Linear Interpolation)
    // ------------------------------------------------------------------------
    const pulseFrequency = 3.0;
    // Normalize sine wave from [-1.0, 1.0] to an alpha range of [0.0, 1.0]
    const alpha = (Math.sin(elapsedTime * pulseFrequency) + 1.0) * 0.5;

    // Linear Interpolation (Lerp): Formula = start + (end - start) * alpha
    const minScale = 0.65;
    const maxScale = 1.35;
    const currentScale = THREE.MathUtils.lerp(minScale, maxScale, alpha);
    pulsatingMesh.scale.set(currentScale, currentScale, currentScale);

    // Lerp emissive glow intensity smoothly between 0.3 and 1.1
    pulseMat.emissiveIntensity = THREE.MathUtils.lerp(0.3, 1.1, alpha);
    pulsatingMesh.rotation.y += 0.6 * delta;

    // ------------------------------------------------------------------------
    // 4. MULTIPLE OBJECTS WITH DIFFERENT ANIMATION SPEEDS (Cluster)
    // ------------------------------------------------------------------------
    // Core spin
    corePlanet.rotation.y += 1.8 * delta;

    // Satellite 1: Fast inner orbit (speed multiplier: 4.0, radius: 0.95)
    const orbit1Speed = 4.0;
    const orbit1Radius = 0.95;
    satellite1.position.x = Math.cos(elapsedTime * orbit1Speed) * orbit1Radius;
    satellite1.position.z = Math.sin(elapsedTime * orbit1Speed) * orbit1Radius;
    satellite1.position.y = Math.sin(elapsedTime * orbit1Speed * 2.0) * 0.25;

    // Satellite 2: Slower outer tilted orbit (speed multiplier: 1.8, radius: 1.55)
    const orbit2Speed = 1.8;
    const orbit2Radius = 1.55;
    satellite2.position.x = Math.cos(-elapsedTime * orbit2Speed) * orbit2Radius;
    satellite2.position.z = Math.sin(-elapsedTime * orbit2Speed) * orbit2Radius;
    satellite2.position.y = Math.cos(elapsedTime * orbit2Speed) * 0.6;
    satellite2.rotation.x += 2.0 * delta;
    satellite2.rotation.y += 2.0 * delta;

    // Gyroscope ring multi-axis precession
    ringMesh.rotation.x = elapsedTime * 1.2;
    ringMesh.rotation.y = elapsedTime * 0.8;

    // ------------------------------------------------------------------------
    // 5. HARMONIC SINE WAVE FIELD (Phase Offset Propagation)
    // ------------------------------------------------------------------------
    wavePillars.forEach((pillar, index) => {
        const phaseOffset = index * 0.4;
        const waveY = Math.sin(elapsedTime * 3.0 + phaseOffset) * 0.7;
        pillar.position.y = waveY;
        pillar.rotation.y = elapsedTime * 1.5 + phaseOffset;
    });

    // ------------------------------------------------------------------------
    // 6. UPDATE CONTROLS & RENDER SCENE
    // ------------------------------------------------------------------------
    controls.update();
    renderer.render(scene, camera);

    // Schedule next frame in sync with display refresh rate (60Hz, 120Hz, etc.)
    requestAnimationFrame(animate);
};

// Start the animation loop
animate();

// ============================================================================
// 9. RESIZE LISTENER
// ============================================================================
window.addEventListener('resize', () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
