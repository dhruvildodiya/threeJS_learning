import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * ============================================================================
 * THREE.JS TASK 9: VECTOR3 & EULER 3D MATHEMATICS MASTERCLASS
 * ============================================================================
 * 
 * Core Topics Covered:
 * 1. Vector3 Mathematics:
 *    - Vector Subtraction: Direction vector from A to B (d = B - A)
 *    - Vector Distance: Length of vector (d.length() or a.distanceTo(b))
 *    - Vector Normalization: Unit vector with length 1.0 (d.normalize())
 *    - Scaled Vector Addition: a.position.addScaledVector(d, speed * delta)
 *    - Cross Product: Perpendicular orthogonal vector (d.cross(up))
 *    - Dot Product: Angle & facing alignment measure (forward.dot(d))
 * 
 * 2. Euler Rotations:
 *    - Orienting Object A to face Object B using lookAt() and Euler angles
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
scene.background = new THREE.Color(0x0a0e1a);
scene.fog = new THREE.FogExp2(0x0a0e1a, 0.02);

// ============================================================================
// 2. CAMERA & ORBIT CONTROLS
// ============================================================================
const camera = new THREE.PerspectiveCamera(
    45,
    sizes.width / sizes.height,
    0.1,
    100
);
camera.position.set(0, 7, 11);
scene.add(camera);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0.5, 0);

// ============================================================================
// 3. RENDERER WITH TONE MAPPING & SHADOWS
// ============================================================================
const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance'
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// ============================================================================
// 4. LIGHTING SYSTEM
// ============================================================================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

// Key Directional Light
const dirLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
dirLight.position.set(6, 12, 6);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 30;
dirLight.shadow.camera.left = -10;
dirLight.shadow.camera.right = 10;
dirLight.shadow.camera.top = 10;
dirLight.shadow.camera.bottom = -10;
dirLight.shadow.bias = -0.0005;
scene.add(dirLight);

// Blue Rim Light
const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
rimLight.position.set(-6, 4, -6);
scene.add(rimLight);

// ============================================================================
// 5. ENVIRONMENT: FLOOR & GRID
// ============================================================================
const floorGeo = new THREE.PlaneGeometry(24, 24);
const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.35,
    metalness: 0.7
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
floor.receiveShadow = true;
scene.add(floor);

const gridHelper = new THREE.GridHelper(24, 24, 0x38bdf8, 0x1e293b);
gridHelper.position.y = 0.01;
scene.add(gridHelper);

// ============================================================================
// 6. 3D TEXT BADGE GENERATOR (For Clear Object Labels)
// ============================================================================
function create3DLabel(text, bgColor = '#ffffff', textColor = '#0f172a') {
    const badgeCanvas = document.createElement('canvas');
    badgeCanvas.width = 340;
    badgeCanvas.height = 90;
    const ctx = badgeCanvas.getContext('2d');

    ctx.fillStyle = bgColor;
    ctx.roundRect(8, 8, 324, 74, 18);
    ctx.fill();

    ctx.fillStyle = textColor;
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 170, 45);

    const texture = new THREE.CanvasTexture(badgeCanvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.9, 0.5, 1);
    return sprite;
}

// ============================================================================
// 7. PRACTICAL EXERCISE SETUP: OBJECT A (SEEKER) & OBJECT B (TARGET)
// ============================================================================

// ----------------------------------------------------------------------------
// A. OBJECT B: TARGET (Destination Sphere with Rings)
// ----------------------------------------------------------------------------
const objectB = new THREE.Group();
objectB.position.set(3.5, 0.6, -2.5);

const targetMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 32, 32),
    new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xef4444,
        emissiveIntensity: 0.8,
        roughness: 0.2,
        metalness: 0.8
    })
);
targetMesh.castShadow = true;
objectB.add(targetMesh);

// Glowing Orbit Rings
const targetRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.75, 0.02, 16, 48),
    new THREE.MeshBasicMaterial({ color: 0xf87171 })
);
objectB.add(targetRing);

// 3D Label above Object B
const labelB = create3DLabel('OBJECT B (Target)', '#ef4444', '#ffffff');
labelB.position.set(0, 1.1, 0);
objectB.add(labelB);

scene.add(objectB);

// ----------------------------------------------------------------------------
// B. OBJECT A: SEEKER (Craft with Directional Nose Cone)
// ----------------------------------------------------------------------------
const objectA = new THREE.Group();
objectA.position.set(-3.5, 0.6, 2.5);

// Main Seeker Body
const seekerBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.2, 1.1),
    new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.2,
        metalness: 0.8
    })
);
seekerBody.rotation.x= -Math.PI/2
seekerBody.castShadow = true;
objectA.add(seekerBody);

// Front Nose Cone (Points along local +Z axis)
const noseGeo = new THREE.ConeGeometry(0.18, 0.85, 16);
noseGeo.rotateX(Math.PI / 2);
const noseMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.2,
    metalness: 0.9
});
const nose = new THREE.Mesh(noseGeo, noseMat);
nose.position.set(0, 0, 0.45);
nose.castShadow = true;
objectA.add(nose);

// Thruster Core
const thruster = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.12, 0.3, 16),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
);
thruster.rotation.x = Math.PI / 2;
thruster.position.set(0, 0, -0.6);
objectA.add(thruster);

// 3D Label above Object A
const labelA = create3DLabel('OBJECT A (Seeker)', '#38bdf8', '#0f172a');
labelA.position.set(0, 1.1, 0);
objectA.add(labelA);

scene.add(objectA);

// ----------------------------------------------------------------------------
// C. TRAJECTORY LINE (Connecting Object A to Object B)
// ----------------------------------------------------------------------------

// 2. Trajectory Line (Dashed line connecting A to B)
const lineGeo = new THREE.BufferGeometry().setFromPoints([
    objectA.position,
    objectB.position
]);
const lineMat = new THREE.LineDashedMaterial({
    color: 0x94a3b8,
    dashSize: 0.3,
    gapSize: 0.15
});
const trajectoryLine = new THREE.Line(lineGeo, lineMat);
trajectoryLine.computeLineDistances();
scene.add(trajectoryLine);

// ============================================================================
// 8. PATROL WAYPOINTS
// ============================================================================
const targetWaypoints = [
    new THREE.Vector3(3.5, 0.6, -2.5),
    new THREE.Vector3(-3.5, 0.6, -3.0),
    new THREE.Vector3(-3.0, 0.6, 2.5),
    new THREE.Vector3(3.0, 0.6, 3.0),
    new THREE.Vector3(0, 0.6, 0)
];
let targetWaypointIdx = 0;

// ============================================================================
// 9. ANIMATION & RENDER LOOP
// ============================================================================
const clock = new THREE.Clock();

const animate = () => {
    const delta = Math.min(clock.getDelta(), 0.05);
    const elapsedTime = clock.getElapsedTime();

    // Rotate Target Rings
    targetRing.rotation.x = elapsedTime * 2.0;
    targetRing.rotation.y = elapsedTime * 1.5;

    // ------------------------------------------------------------------------
    // SMOOTH MOVEMENT WITH VECTOR3.LERP
    // ------------------------------------------------------------------------
    // Smoothly interpolate Object A's position toward Object B
    objectA.position.lerp(objectB.position, delta * 1.5);

    // Orient Object A to face Object B
    objectA.lookAt(objectB.position);

    // When Object A reaches Object B, cycle Target B to the next waypoint
    if (objectA.position.distanceTo(objectB.position) < 0.4) {
        targetWaypointIdx = (targetWaypointIdx + 1) % targetWaypoints.length;
        objectB.position.copy(targetWaypoints[targetWaypointIdx]);
    }

    // ------------------------------------------------------------------------
    // UPDATE TRAJECTORY LINE
    // ------------------------------------------------------------------------
    const linePositions = trajectoryLine.geometry.attributes.position.array;
    linePositions[0] = objectA.position.x;
    linePositions[1] = objectA.position.y;
    linePositions[2] = objectA.position.z;
    linePositions[3] = objectB.position.x;
    linePositions[4] = objectB.position.y;
    linePositions[5] = objectB.position.z;
    trajectoryLine.geometry.attributes.position.needsUpdate = true;
    trajectoryLine.computeLineDistances();

    // Render scene
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
};

animate();

// ============================================================================
// 10. RESIZE LISTENER
// ============================================================================
window.addEventListener('resize', () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
