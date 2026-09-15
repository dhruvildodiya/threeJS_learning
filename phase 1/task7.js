import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * ============================================================================
 * THREE.JS TASK 7: PERSPECTIVE CAMERA & OPTICAL PRINCIPLES MASTERCLASS
 * ============================================================================
 * 
 * Core Topics Covered:
 * 1. PerspectiveCamera Architecture (FOV, Aspect Ratio, Near & Far Clipping Planes)
 * 2. Field of View (FOV) vs Focal Length (Telephoto Compression vs Wide-Angle Distortion)
 * 3. Near & Far Clipping Boundaries (Geometry Slicing & Culling)
 * 4. Camera Position, Rotation, and LookAt Targeting
 * 5. Perspective Distortion across 3D Space
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
scene.background = new THREE.Color(0x07090e);
scene.fog = new THREE.FogExp2(0x07090e, 0.015);

// ============================================================================
// 2. PERSPECTIVE CAMERA & CAMERA HELPER (Visualizing Frustum & Volume)
// ============================================================================
/**
 * PerspectiveCamera Parameters:
 * 1. fov (Field of View)       : Vertical viewing angle in degrees (e.g. 20° telephoto, 45° normal, 90° wide angle).
 * 2. aspect (Aspect Ratio)     : Width / Height of the frustum.
 * 3. near (Near Clipping Plane): Near boundary of visible volume (geometry closer is clipped).
 * 4. far (Far Clipping Plane)  : Far boundary of visible volume (geometry farther is culled).
 */

// A. The Target Perspective Camera (demonstrating the optical frustum)
const perspectiveCamera = new THREE.PerspectiveCamera(
    45,                         // FOV: Vertical angle in degrees
    sizes.width / sizes.height, // Aspect ratio
    2.0,                        // Near clipping plane: shows near slicing in the frustum
    22                          // Far clipping plane: shows far limit of visible volume
);
perspectiveCamera.position.set(0, 2.0, 7.5);
const lookTarget = new THREE.Vector3(0, 1.2, 0);
perspectiveCamera.lookAt(lookTarget);
scene.add(perspectiveCamera);

// B. Camera Helper: Renders the 3D viewing frustum pyramid, near plane, and far plane
const cameraHelper = new THREE.CameraHelper(perspectiveCamera);
scene.add(cameraHelper);

// C. Main Viewing Camera & OrbitControls (to orbit and inspect the frustum volume from any angle)
const camera = new THREE.PerspectiveCamera(
    50,
    sizes.width / sizes.height,
    0.1,
    200
);
camera.position.set(11, 8, 14);
camera.lookAt(0, 1, 0);
scene.add(camera);

// Active Camera Pointer
let activeCamera = camera;
let isFirstPerson = false;
let vertigoEnabled = true; // Vertigo / Dolly Zoom camera effect
const targetFrameHeight = 2.2; // Fixed on-screen subject height in units

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 1, 0);

// D. Top Control Panel Buttons & Keyboard Shortcuts
const buttonContainer = document.createElement('div');
Object.assign(buttonContainer.style, {
    position: 'fixed',
    top: '20px',
    left: '20px',
    zIndex: '1000',
    display: 'flex',
    gap: '10px'
});

const toggleBtn = document.createElement('button');
toggleBtn.id = 'camera-toggle-btn';
toggleBtn.innerHTML = '<strong>Main Overview Camera</strong> <span style="opacity: 0.6; font-size: 11px; margin-left: 4px;">[C]</span>';
Object.assign(toggleBtn.style, {
    padding: '10px 16px',
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '10px',
    color: '#f8fafc',
    fontFamily: "'Outfit', sans-serif",
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
    transition: 'all 0.2s ease',
    outline: 'none'
});

const vertigoBtn = document.createElement('button');
vertigoBtn.id = 'vertigo-toggle-btn';
vertigoBtn.innerHTML = '🌀 <strong>Vertigo Effect (Dolly Zoom): ON</strong> <span style="opacity: 0.6; font-size: 11px; margin-left: 4px;">[V]</span>';
Object.assign(vertigoBtn.style, {
    padding: '10px 16px',
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid #38bdf8',
    borderRadius: '10px',
    color: '#38bdf8',
    fontFamily: "'Outfit', sans-serif",
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 0 16px rgba(56, 189, 248, 0.35)',
    transition: 'all 0.2s ease',
    outline: 'none'
});

function toggleCamera() {
    isFirstPerson = !isFirstPerson;
    if (isFirstPerson) {
        activeCamera = perspectiveCamera;
        controls.object = perspectiveCamera;
        controls.target.copy(lookTarget);
        cameraHelper.visible = false;
        toggleBtn.innerHTML = '🎥 <strong>First-Person Camera</strong> <span style="opacity: 0.6; font-size: 11px; margin-left: 4px;">[C]</span>';
        toggleBtn.style.borderColor = '#38bdf8';
        toggleBtn.style.color = '#38bdf8';
        toggleBtn.style.boxShadow = '0 0 16px rgba(56, 189, 248, 0.35)';
    } else {
        activeCamera = camera;
        controls.object = camera;
        controls.target.set(0, 1, 0);
        cameraHelper.visible = true;
        toggleBtn.innerHTML = '📐 <strong>Main Overview Camera</strong> <span style="opacity: 0.6; font-size: 11px; margin-left: 4px;">[C]</span>';
        toggleBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        toggleBtn.style.color = '#f8fafc';
        toggleBtn.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.4)';
    }
}

function toggleVertigo() {
    vertigoEnabled = !vertigoEnabled;
    if (vertigoEnabled) {
        vertigoBtn.innerHTML = '🌀 <strong>Vertigo Effect (Dolly Zoom): ON</strong> <span style="opacity: 0.6; font-size: 11px; margin-left: 4px;">[V]</span>';
        vertigoBtn.style.borderColor = '#38bdf8';
        vertigoBtn.style.color = '#38bdf8';
        vertigoBtn.style.boxShadow = '0 0 16px rgba(56, 189, 248, 0.35)';
    } else {
        vertigoBtn.innerHTML = '🌀 <strong>Vertigo Effect: OFF</strong> <span style="opacity: 0.6; font-size: 11px; margin-left: 4px;">[V]</span>';
        vertigoBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        vertigoBtn.style.color = '#94a3b8';
        vertigoBtn.style.boxShadow = 'none';

        // Reset perspective camera to standard 45 FOV
        perspectiveCamera.fov = 45;
        perspectiveCamera.position.set(0, 2.0, 7.5);
        perspectiveCamera.updateProjectionMatrix();
        cameraHelper.update();
    }
}

toggleBtn.addEventListener('click', toggleCamera);
vertigoBtn.addEventListener('click', toggleVertigo);

window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyC' || e.code === 'Space') {
        e.preventDefault();
        toggleCamera();
    } else if (e.code === 'KeyV') {
        e.preventDefault();
        toggleVertigo();
    }
});

buttonContainer.appendChild(toggleBtn);
buttonContainer.appendChild(vertigoBtn);
document.body.appendChild(buttonContainer);

// ============================================================================
// 3. RENDERER WITH TONE MAPPING
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
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Key directional light casting shadows
const dirLight = new THREE.DirectionalLight(0xfff5ea, 2.2);
dirLight.position.set(6, 12, 8);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 40;
dirLight.shadow.camera.left = -15;
dirLight.shadow.camera.right = 15;
dirLight.shadow.camera.top = 15;
dirLight.shadow.camera.bottom = -15;
dirLight.shadow.bias = -0.0005;
scene.add(dirLight);

// Cool Cyan/Blue Rim Light along depth corridor
const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
rimLight.position.set(-8, 6, -15);
scene.add(rimLight);

// Deep Purple Accent Light from far end
const backGlow = new THREE.PointLight(0xa855f7, 25, 40);
backGlow.position.set(0, 3, -35);
scene.add(backGlow);

// ============================================================================
// 5. DEPTH TEST ENVIRONMENT: COLONNADE, DISTANCE MARKERS & FOCAL SUBJECT
// ============================================================================

// A. Reflective Studio Floor Grid
const floorGeo = new THREE.PlaneGeometry(30, 80);
const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0a0f1d,
    roughness: 0.25,
    metalness: 0.8
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.set(0, -0.01, -15);
floor.receiveShadow = true;
scene.add(floor);

// Grid Helper for distance appreciation
const gridHelper = new THREE.GridHelper(80, 40, 0x38bdf8, 0x1e293b);
gridHelper.position.set(0, 0, -15);
scene.add(gridHelper);

// B. FOCAL CENTERPIECE SUBJECT (At Origin Z = 0)
const subjectGroup = new THREE.Group();
subjectGroup.position.set(0, 0.8, 0);

// Base Pedestal
const pedestalGeo = new THREE.CylinderGeometry(1.0, 1.2, 0.4, 32);
const pedestalMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.6 });
const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
pedestal.position.y = -0.6;
pedestal.castShadow = true;
pedestal.receiveShadow = true;
subjectGroup.add(pedestal);

// Glowing Accent Ring
const ringGeo = new THREE.TorusGeometry(1.1, 0.02, 16, 48);
const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
const ring = new THREE.Mesh(ringGeo, ringMat);
ring.rotation.x = Math.PI / 2;
ring.position.y = -0.4;
subjectGroup.add(ring);

// Main Sculptural Torus Knot (Subject)
const knotGeo = new THREE.TorusKnotGeometry(0.55, 0.18, 128, 32);
const knotMat = new THREE.MeshPhysicalMaterial({
    color: 0xf59e0b,
    metalness: 0.7,
    roughness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1
});
const mainSubject = new THREE.Mesh(knotGeo, knotMat);
mainSubject.position.y = 0.5;
mainSubject.castShadow = true;
mainSubject.receiveShadow = true;
subjectGroup.add(mainSubject);

// Inner Core Sphere
const coreGeo = new THREE.IcosahedronGeometry(0.28, 2);
const coreMat = new THREE.MeshStandardMaterial({
    color: 0xec4899,
    emissive: 0xec4899,
    emissiveIntensity: 0.8,
    roughness: 0.2,
    metalness: 0.9
});
const coreMesh = new THREE.Mesh(coreGeo, coreMat);
coreMesh.position.y = 0.35;
subjectGroup.add(coreMesh);

scene.add(subjectGroup);

// C. DEPTH COLONNADE & DISTANCE MARKER SYSTEM
// Places arches, pillars and distance plaques along -Z from z = +3 to z = -40
const depthObjects = [];
const distances = [
    { z: 3, label: '+3m (Foreground Near)', color: 0xef4444, shape: 'cube' },
    { z: 0, label: '0m (Focal Subject)', color: 0xf59e0b, shape: 'center' },
    { z: -5, label: '-5m (Midground 1)', color: 0x10b981, shape: 'arch' },
    { z: -10, label: '-10m (Midground 2)', color: 0x06b6d4, shape: 'arch' },
    { z: -18, label: '-18m (Deep Midground)', color: 0x3b82f6, shape: 'arch' },
    { z: -28, label: '-28m (Distant Background)', color: 0x8b5cf6, shape: 'monolith' },
    { z: -40, label: '-40m (Vanishing Horizon)', color: 0xd946ef, shape: 'portal' }
];

// Canvas-based Texture Generator for 3D Distance Text Plaques
function createDistanceBadge(text, colorHex) {
    const badgeCanvas = document.createElement('canvas');
    badgeCanvas.width = 300;
    badgeCanvas.height = 128;
    const ctx = badgeCanvas.getContext('2d');

    // White badge background
    ctx.fillStyle = '#ffffff';
    ctx.roundRect(10, 10, 250, 108, 24);
    ctx.fill();

    // Colored border accent
    ctx.lineWidth = 6;
    ctx.strokeStyle = colorHex;
    ctx.roundRect(10, 10, 250, 108, 24);
    ctx.stroke();

    // Dark text for crisp contrast against white background
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 36px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 134, 64, 230);

    const texture = new THREE.CanvasTexture(badgeCanvas);
    texture.minFilter = THREE.LinearFilter;
    const badgeMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
    const badgeMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), badgeMat);
    return badgeMesh;
}

// Build the Depth Corridors
distances.forEach((d) => {
    if (d.shape === 'cube') {
        const fgBox = new THREE.Mesh(
            new THREE.BoxGeometry(0.7, 0.7, 0.7),
            new THREE.MeshStandardMaterial({ color: d.color, roughness: 0.3, metalness: 0.7 })
        );
        fgBox.position.set(-2.2, 0.35, d.z);
        fgBox.castShadow = true;
        scene.add(fgBox);
        depthObjects.push(fgBox);

        const badge = createDistanceBadge(d.label, '#ef4444');
        badge.position.set(-2.2, 0.9, d.z);
        scene.add(badge);
    } else if (d.shape === 'arch') {
        const archGroup = new THREE.Group();
        archGroup.position.set(0, 0, d.z);

        // Left Pillar
        const leftPillar = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 4.0, 0.5),
            new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.5 })
        );
        leftPillar.position.set(-3.5, 2.0, 0);
        leftPillar.castShadow = true;
        archGroup.add(leftPillar);

        // Right Pillar
        const rightPillar = leftPillar.clone();
        rightPillar.position.x = 3.5;
        archGroup.add(rightPillar);

        // Top Crossbeam
        const beam = new THREE.Mesh(
            new THREE.BoxGeometry(7.5, 0.4, 0.5),
            new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.6 })
        );
        beam.position.set(0, 4.0, 0);
        beam.castShadow = true;
        archGroup.add(beam);

        // Glowing Neon Accent Strips
        const neonMat = new THREE.MeshBasicMaterial({ color: d.color });
        const neonLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.8, 0.08), neonMat);
        neonLeft.position.set(-3.2, 2.0, 0.26);
        const neonRight = neonLeft.clone();
        neonRight.position.x = 3.2;
        const neonTop = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.08, 0.08), neonMat);
        neonTop.position.set(0, 3.75, 0.26);
        archGroup.add(neonLeft, neonRight, neonTop);

        // Side Spheres on Pedestals
        const sideSphereGeo = new THREE.SphereGeometry(0.45, 32, 32);
        const sideSphereMat = new THREE.MeshStandardMaterial({ color: d.color, roughness: 0.2, metalness: 0.8 });
        const sLeft = new THREE.Mesh(sideSphereGeo, sideSphereMat);
        sLeft.position.set(-2.2, 0.45, 0);
        sLeft.castShadow = true;
        const sRight = sLeft.clone();
        sRight.position.x = 2.2;
        archGroup.add(sLeft, sRight);

        // Distance Label Badge on beam
        const badge = createDistanceBadge(d.label, `#${d.color.toString(16).padStart(6, '0')}`);
        badge.position.set(0, 3.2, 0);
        archGroup.add(badge);

        scene.add(archGroup);
        depthObjects.push(archGroup);
    } else if (d.shape === 'monolith') {
        const monolithGroup = new THREE.Group();
        monolithGroup.position.set(0, 0, d.z);

        const centerPillar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.8, 1.2, 7.0, 6),
            new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.2, metalness: 0.9 })
        );
        centerPillar.position.set(0, 3.5, 0);
        centerPillar.castShadow = true;
        monolithGroup.add(centerPillar);

        const glowTorus = new THREE.Mesh(
            new THREE.TorusGeometry(2.0, 0.1, 16, 48),
            new THREE.MeshBasicMaterial({ color: d.color })
        );
        glowTorus.position.set(0, 4.0, 0);
        monolithGroup.add(glowTorus);

        const badge = createDistanceBadge(d.label, `#${d.color.toString(16).padStart(6, '0')}`);
        badge.position.set(0, 1.0, 1.2);
        monolithGroup.add(badge);

        scene.add(monolithGroup);
        depthObjects.push(monolithGroup);
    } else if (d.shape === 'portal') {
        const portalGroup = new THREE.Group();
        portalGroup.position.set(0, 0, d.z);

        const portalRing = new THREE.Mesh(
            new THREE.TorusGeometry(5.0, 0.35, 24, 64),
            new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.9 })
        );
        portalRing.position.set(0, 5.0, 0);
        portalGroup.add(portalRing);

        const neonRing = new THREE.Mesh(
            new THREE.TorusGeometry(4.6, 0.1, 16, 64),
            new THREE.MeshBasicMaterial({ color: d.color })
        );
        neonRing.position.set(0, 5.0, 0.1);
        portalGroup.add(neonRing);

        const badge = createDistanceBadge(d.label, `#${d.color.toString(16).padStart(6, '0')}`);
        badge.position.set(0, 2.0, 0);
        portalGroup.add(badge);

        scene.add(portalGroup);
        depthObjects.push(portalGroup);
    }
});

// ============================================================================
// 6. RESIZE LISTENER (Updating Aspect Ratio & Projection Matrix)
// ============================================================================
// 6. RESIZE LISTENER (Updating Aspect Ratio & Projection Matrix)
// ============================================================================
window.addEventListener('resize', () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    // 1. Update main viewing camera
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    // 2. Update target perspective camera & its frustum helper
    perspectiveCamera.aspect = sizes.width / sizes.height;
    perspectiveCamera.updateProjectionMatrix();
    cameraHelper.update();

    // 3. Update renderer size & pixel ratio
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// ============================================================================
// 7. ANIMATION & RENDER LOOP
// ============================================================================
const clock = new THREE.Clock();

const animate = () => {
    const elapsedTime = clock.getElapsedTime();

    // Subtle rotation of center subject components
    mainSubject.rotation.y = elapsedTime * 0.4;
    mainSubject.rotation.x = elapsedTime * 0.2;
    coreMesh.rotation.y = -elapsedTime * 0.6;
    ring.rotation.z = elapsedTime * 0.3;

    // ------------------------------------------------------------------------
    // VERTIGO EFFECT (DOLLY ZOOM) MATHEMATICS
    // ------------------------------------------------------------------------
    if (vertigoEnabled) {
        // 1. Oscillate FOV smoothly between 18° (Telephoto) and 95° (Wide Angle)
        const sinWave = (Math.sin(elapsedTime * 0.8) + 1) / 2; // 0.0 to 1.0
        const currentFov = THREE.MathUtils.lerp(18, 95, sinWave);
        perspectiveCamera.fov = currentFov;

        /**
         * 2. DOLLY ZOOM FORMULA:
         * To keep the subject at a constant on-screen frame height (H):
         * distance = (H / 2) / tan(FOV_radians / 2)
         */
        const fovRad = THREE.MathUtils.degToRad(currentFov);
        const targetDistance = (targetFrameHeight / 2) / Math.tan(fovRad / 2);

        // Reposition perspective camera along Z to trade off FOV with distance
        perspectiveCamera.position.z = lookTarget.z + targetDistance;
        perspectiveCamera.position.y = lookTarget.y + 0.4 * Math.sin(fovRad);
        perspectiveCamera.lookAt(lookTarget);

        perspectiveCamera.updateProjectionMatrix();
        cameraHelper.update();
    } else {
        cameraHelper.update();
    }

    // Update orbit controls damping
    controls.update();

    // Render the scene from the active camera (First-Person or Main Overview)
    renderer.render(scene, activeCamera);
    requestAnimationFrame(animate);
};

animate();
