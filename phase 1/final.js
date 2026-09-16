import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ============================================================================
// MERIDIAN — Precision Automatic Horology
// Procedural Luxury Mechanical Watch Configurator & Showcase
//
// Features:
// - Procedurally constructed watch geometry (case, bezel, fluted crown,
//   domed sapphire crystal, dial face with dynamic date, and articulated strap)
// - Realistic PBR & MeshPhysicalMaterial with procedural PMREM studio reflections
// - Real-time synchronized mechanical clock hands (hour, minute, sweep second)
// - Direct drag watch rotation with turntable rotation and exploded assembly view
// ============================================================================

// ============================================================================
// 1. RENDERER, SCENE, CAMERA
// ============================================================================
const canvas = document.querySelector('#webgl-canvas');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x18181c);
scene.fog = new THREE.FogExp2(0x18181c, 0.02);

const camera = new THREE.PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);
camera.position.set(0, 0.4, 7);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enableRotate = false; // Disable camera orbiting so the stage and lights stay fixed in space!
controls.enableZoom = true;
controls.enablePan = false;
controls.minDistance = 1.8;
controls.maxDistance = 10;
controls.target.set(0, 0, 0);

// Direct watch rotation via drag (keeps stage and lighting completely static)
let isDragging = false;
let previousPointerPosition = { x: 0, y: 0 };
let targetRotationY = 0;
let targetRotationX = 0.05;

window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('#configurator-ui') || e.target.closest('.bottom-bar')) return;
    isDragging = true;
    previousPointerPosition = { x: e.clientX, y: e.clientY };
});

window.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - previousPointerPosition.x;
    const deltaY = e.clientY - previousPointerPosition.y;

    targetRotationY += deltaX * 0.008;
    targetRotationX += deltaY * 0.008;

    // Clamp vertical tilt to prevent awkward flipping
    targetRotationX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, targetRotationX));

    previousPointerPosition = { x: e.clientX, y: e.clientY };
});

window.addEventListener('pointerup', () => {
    isDragging = false;
});

// ============================================================================
// 2. STUDIO LIGHTING + STAGE
// ============================================================================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
keyLight.position.set(2.5, 3.5, 3);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 25;
keyLight.shadow.camera.left = -3;
keyLight.shadow.camera.right = 3;
keyLight.shadow.camera.top = 3;
keyLight.shadow.camera.bottom = -3;
keyLight.shadow.bias = -0.0002;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xdfe8ff, 0.7);
fillLight.position.set(-3, 1.5, 1.5);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 1.1);
rimLight.position.set(0, 2.5, -3);
scene.add(rimLight);

// Overhead Studio Spotlight shining directly onto the watch
const topSpotLight = new THREE.SpotLight(0xffffff, 0.5);
topSpotLight.position.set(0, 4.5, 0.8);
topSpotLight.target.position.set(0, 0, 0);
topSpotLight.angle = Math.PI / 5;
topSpotLight.penumbra = 0.6;
topSpotLight.decay = 1.0;
topSpotLight.distance = 25;
topSpotLight.castShadow = true;
topSpotLight.shadow.mapSize.set(2048, 2048);
topSpotLight.shadow.bias = -0.0001;
scene.add(topSpotLight);
scene.add(topSpotLight.target);

// Base light values to dynamically compensate as camera pulls back to distance 20
const BASE_LIGHTS = {
    ambient: 0.5,
    key: 2.4,
    fill: 0.7,
    rim: 1.1,
    spot: 0.5,
};

// ============================================================================
// STUDIO ROOM ENVIRONMENT (Ground floor plane + Background wall plane)
// ============================================================================
const textureLoader = new THREE.TextureLoader();

// Load the wavy wall texture set (using the deep vibrant orange color map)
const wallColorTex = textureLoader.load('./textures/wall/others_0031_color_dark_orange.jpg');
wallColorTex.colorSpace = THREE.SRGBColorSpace;
wallColorTex.wrapS = wallColorTex.wrapT = THREE.RepeatWrapping;
wallColorTex.repeat.set(6, 2.4);

const wallRoughnessTex = textureLoader.load('./textures/wall/others_0031_roughness_2k.jpg');
wallRoughnessTex.wrapS = wallRoughnessTex.wrapT = THREE.RepeatWrapping;
wallRoughnessTex.repeat.set(6, 2.4);

const wallNormalTex = textureLoader.load('./textures/wall/others_0031_normal_opengl_2k.png');
wallNormalTex.wrapS = wallNormalTex.wrapT = THREE.RepeatWrapping;
wallNormalTex.repeat.set(6, 2.4);

const wallAoTex = textureLoader.load('./textures/wall/others_0031_ao_2k.jpg');
wallAoTex.wrapS = wallAoTex.wrapT = THREE.RepeatWrapping;
wallAoTex.repeat.set(6, 2.4);

const studioWallMat = new THREE.MeshStandardMaterial({
    map: wallColorTex,
    normalMap: wallNormalTex,
    normalScale: new THREE.Vector2(1.2, 1.2),
    roughnessMap: wallRoughnessTex,
    aoMap: wallAoTex,
    aoMapIntensity: 1.0,
    roughness: 0.85,
    metalness: 0.05,
});

const studioFloorMat = new THREE.MeshPhysicalMaterial({
    color: "#fc5a03", // refined light warm orange
    roughness: 0, // mirror-sleek polished surface
    metalness: 0.15,
    clearcoat: 1.0, // high-gloss polished lacquer coat
    clearcoatRoughness: 0.08,
    envMapIntensity: 0, // vivid specular reflections of the studio environment
    reflectivity: 0.9,
});

// 1. Ground Plane (Floor)
const FLOOR_SIZE = 40;
const FLOOR_Y = -2.1;
const WALL_Z = -8.0;

const groundFloorGeo = new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE);
groundFloorGeo.attributes.uv2 = groundFloorGeo.attributes.uv;

const groundFloor = new THREE.Mesh(groundFloorGeo, studioFloorMat);
groundFloor.rotation.x = -Math.PI / 2;
// Floor center placed so its back edge meets WALL_Z precisely:
// back edge = position.z - FLOOR_SIZE / 2 = WALL_Z  => position.z = WALL_Z + FLOOR_SIZE / 2
groundFloor.position.set(0, FLOOR_Y, WALL_Z + FLOOR_SIZE / 2);
groundFloor.receiveShadow = true;
scene.add(groundFloor);

// 2. Background Wall Plane (Back Wall)
const WALL_HEIGHT = 22;
const backWallGeo = new THREE.PlaneGeometry(FLOOR_SIZE, WALL_HEIGHT);
backWallGeo.attributes.uv2 = backWallGeo.attributes.uv;

const backWall = new THREE.Mesh(backWallGeo, studioWallMat);
// Back wall bottom edge starts exactly at FLOOR_Y (-2.1) and extends up:
backWall.position.set(0, FLOOR_Y + WALL_HEIGHT / 2, WALL_Z);
backWall.receiveShadow = true;
scene.add(backWall);

// 3. Wall-Floor Crease Ambient Occlusion Strip (Ground-Contact Shadow)
// In real architecture, the 90-degree intersection between floor and wall
// always has a soft ambient occlusion contact shadow, which grounds them together.
function createCornerShadowTexture() {
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 256;
    const ctx = c.getContext('2d');
    const grad = ctx.createLinearGradient(0, 256, 0, 0);
    grad.addColorStop(0, 'rgba(10, 10, 14, 0.7)');
    grad.addColorStop(0.3, 'rgba(10, 10, 14, 0.35)');
    grad.addColorStop(0.7, 'rgba(10, 10, 14, 0.08)');
    grad.addColorStop(1, 'rgba(10, 10, 14, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 256);
    const tex = new THREE.CanvasTexture(c);
    return tex;
}
const cornerShadowTex = createCornerShadowTexture();

// Shadow strip on wall base
const wallBaseShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(FLOOR_SIZE, 1.4),
    new THREE.MeshBasicMaterial({
        map: cornerShadowTex,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
    })
);
wallBaseShadow.position.set(0, FLOOR_Y + 0.7, WALL_Z + 0.01);
scene.add(wallBaseShadow);

// Shadow strip on floor meeting wall
const floorBaseShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(FLOOR_SIZE, 1.4),
    new THREE.MeshBasicMaterial({
        map: cornerShadowTex,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
    })
);
floorBaseShadow.rotation.x = -Math.PI / 2;
floorBaseShadow.position.set(0, FLOOR_Y + 0.005, WALL_Z + 0.7);
scene.add(floorBaseShadow);

// Raised pedestal stand on the floor for the watch
const stage = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.7, 0.08, 64),
    new THREE.MeshStandardMaterial({ color: 0x222228, roughness: 0.3, metalness: 0.6 })
);
stage.position.y = -2.06;
stage.receiveShadow = true;
scene.add(stage);

// ============================================================================
// 3. PROCEDURAL TEXTURES (canvas-drawn — no image files)
// ============================================================================

// Watch dial face: index ring, minute ticks, brand mark, date window
function createDialTexture() {
    const size = 1024;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const cx = size / 2, cy = size / 2, r = size / 2;

    // Base
    ctx.fillStyle = '#0d1014';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Subtle radial sheen
    const sheen = ctx.createRadialGradient(cx, cy - r * 0.3, r * 0.1, cx, cy, r);
    sheen.addColorStop(0, 'rgba(255,255,255,0.08)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Minute ticks (60) and hour markers (12, thicker)
    for (let i = 0; i < 60; i++) {
        const angle = (i / 60) * Math.PI * 2;
        const isHour = i % 5 === 0;
        const inner = isHour ? r * 0.86 : r * 0.92;
        const outer = r * 0.97;
        ctx.strokeStyle = isHour ? '#e8e8ec' : '#4a4a52';
        ctx.lineWidth = isHour ? size * 0.006 : size * 0.0022;
        ctx.beginPath();
        ctx.moveTo(cx + Math.sin(angle) * inner, cy - Math.cos(angle) * inner);
        ctx.lineTo(cx + Math.sin(angle) * outer, cy - Math.cos(angle) * outer);
        ctx.stroke();
    }

    // Date window at 3 o'clock
    ctx.fillStyle = '#f4f4f5';
    ctx.fillRect(cx + r * 0.6 - 28, cy - 20, 56, 40);
    ctx.fillStyle = '#111';
    ctx.font = `600 ${size * 0.032}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(new Date().getDate()).padStart(2, '0'), cx + r * 0.6, cy + 1);

    // Brand mark + complication label
    ctx.fillStyle = '#e8e8ec';
    ctx.font = `500 ${size * 0.045}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillText('VALIO', cx, cy - r * 0.32);
    ctx.font = `300 ${size * 0.02}px monospace`;
    ctx.fillStyle = '#6b6b74';
    ctx.fillText('AUTOMATIC · 100M', cx, cy - r * 0.24);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}
const dialTexture = createDialTexture();

// Leather grain bump map for the strap
function createLeatherBump() {
    const size = 256;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
        const v = 118 + Math.random() * 20;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 6);
    return tex;
}
const leatherBump = createLeatherBump();

// Leather grain COLOR map — the previous version only had a grey bump map
// riding on a flat base color, which reads as plastic under light. This adds
// actual mottled tonal variation (the visible "feel" of tanned leather),
// multiplied by the colorway's tint color at render time.
function createLeatherColorTexture() {
    const size = 256;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#8a7355'; // mid tan base — colorway tint multiplies over this
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 5000; i++) {
        const v = -25 + Math.random() * 50;
        ctx.fillStyle = `rgba(${60 + v}, ${48 + v}, ${34 + v}, 0.35)`;
        ctx.beginPath();
        ctx.arc(Math.random() * size, Math.random() * size, 0.6 + Math.random() * 1.3, 0, Math.PI * 2);
        ctx.fill();
    }
    // A few longer creases, the kind leather picks up at the fold points
    for (let i = 0; i < 14; i++) {
        ctx.strokeStyle = 'rgba(30,22,14,0.25)';
        ctx.lineWidth = 1;
        const y = Math.random() * size;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(size * 0.3, y + (Math.random() - 0.5) * 12, size * 0.7, y + (Math.random() - 0.5) * 12, size, y);
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 6);
    return tex;
}
const leatherColorMap = createLeatherColorTexture();

// Brushed-metal roughness map — horizontal micro-streaks of varying
// brightness. Applied as a roughnessMap so the specular highlight breaks up
// into a directional sheen instead of one flat mirror gleam, which is what
// actually reads as "metal" rather than "plastic painted silver."
function createBrushedMetalTexture() {
    const size = 256;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#9a9a9a';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y++) {
        const v = 130 + Math.random() * 90;
        ctx.strokeStyle = `rgb(${v},${v},${v})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y);
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 1);
    return tex;
}
const metalRoughnessMap = createBrushedMetalTexture();

// Procedural Studio HDRI Environment Map (Gives realistic metallic specular reflections!)
function createStudioEnvMap(renderer) {
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x1a1a1f);

    // Studio softbox light panels
    const softboxGeo = new THREE.PlaneGeometry(6, 6);
    const softboxMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

    // Key softbox
    const sb1 = new THREE.Mesh(softboxGeo, softboxMat);
    sb1.position.set(4, 5, 4);
    sb1.lookAt(0, 0, 0);
    envScene.add(sb1);

    // Fill softbox
    const sb2 = new THREE.Mesh(softboxGeo, softboxMat);
    sb2.position.set(-4, 3, 2);
    sb2.lookAt(0, 0, 0);
    envScene.add(sb2);

    // Rim strip softbox
    const stripGeo = new THREE.PlaneGeometry(2, 8);
    const sb3 = new THREE.Mesh(stripGeo, softboxMat);
    sb3.position.set(0, 3, -5);
    sb3.lookAt(0, 0, 0);
    envScene.add(sb3);

    // Warm bounce panel from bottom
    const floorBounce = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({ color: 0xe8c8a8, side: THREE.DoubleSide }));
    floorBounce.rotation.x = Math.PI / 2;
    floorBounce.position.y = -3;
    envScene.add(floorBounce);

    const renderTarget = pmremGenerator.fromScene(envScene, 0.04);
    pmremGenerator.dispose();
    return renderTarget.texture;
}

const studioEnvMap = createStudioEnvMap(renderer);
scene.environment = studioEnvMap; // Apply to all PBR/Metallic materials in scene!

// ============================================================================
// 4. MATERIALS + COLORWAYS
// ============================================================================
const colorways = {
    steel: { case: 0xd8dce4, bezel: 0xe8ecf4, crown: 0xdce0e8, strap: 0x1c1c1f },
    onyx: { case: 0x222228, bezel: 0x33333d, crown: 0x33333d, strap: 0x0c0c0e },
    gold: { case: 0xe0b870, bezel: 0xf5d088, crown: 0xebd084, strap: 0x3a2418 },
};

const materials = {
    case: new THREE.MeshPhysicalMaterial({
        color: colorways.steel.case,
        metalness: 0.98,
        roughness: 0.18,
        roughnessMap: metalRoughnessMap,
        clearcoat: 0.4,
        clearcoatRoughness: 0.15,
        envMapIntensity: 1.8,
    }),
    bezel: new THREE.MeshPhysicalMaterial({
        color: colorways.steel.bezel,
        metalness: 1,
        roughness: 0,
        roughnessMap: metalRoughnessMap,
        clearcoat: 0.6,
        clearcoatRoughness: 0.08,
        envMapIntensity: 2.0,
    }),
    crown: new THREE.MeshPhysicalMaterial({
        color: colorways.steel.crown,
        metalness: 0.98,
        roughness: 0.15,
        roughnessMap: metalRoughnessMap,
        envMapIntensity: 1.8,
    }),
    // Crystal sapphire material: transparent with depthWrite: false so it never occludes the dial behind it
    crystal: new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.02,
        metalness: 0,
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        envMapIntensity: 1.2,
    }),
    dial: new THREE.MeshStandardMaterial({ map: dialTexture, roughness: 0.4, metalness: 0.2, side: THREE.DoubleSide }),
    hand: new THREE.MeshStandardMaterial({ color: 0xf8f8fc, roughness: 0.2, metalness: 0.85 }),
    secondHand: new THREE.MeshStandardMaterial({ color: 0xe0564f, roughness: 0.3, metalness: 0.3 }),
    strap: new THREE.MeshStandardMaterial({
        color: colorways.steel.strap, roughness: 0.85, metalness: 0.05,
        map: leatherColorMap,
        bumpMap: leatherBump, bumpScale: 0.01,
    }),
    stitching: new THREE.MeshStandardMaterial({ color: 0xd8c49a, roughness: 0.8 }),
    movement: new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.25, metalness: 0.95, envMapIntensity: 1.5 }),
};

// ============================================================================
// 5. WATCH HIERARCHY
// ============================================================================
// watchRoot
//   caseBody         (cylinder — the case, flat faces toward camera)
//   caseBackGroup     (rear cap — separates in exploded view)
//   bezelGroup        (bezel ring + crystal dome)
//   dialGroup         (dial disc + hands, sits between crystal and case)
//   crownGroup        (winding crown, protrudes on the side)
//   movementGroup     (visible internals, revealed on explode)
//   strapTopGroup / strapBottomGroup (link segments)
const watchRoot = new THREE.Group();
watchRoot.rotation.x = 0.05;
scene.add(watchRoot);

const CASE_RADIUS = 0.62;
const CASE_DEPTH = 0.24;

// --- Case body -------------------------------------------------------------
// Note: openEnded = true so the flat cylinder caps don't cover the dial or back!
const caseBody = new THREE.Mesh(
    new THREE.CylinderGeometry(CASE_RADIUS, CASE_RADIUS * 0.96, CASE_DEPTH, 64, 1, true),
    materials.case
);
caseBody.rotation.x = Math.PI / 2; // stand the cylinder up so its hollow axis points along Z
caseBody.castShadow = true;
caseBody.receiveShadow = true;
watchRoot.add(caseBody);

// --- Case back (separate mesh so it can move away in exploded view) --------
const caseBackGroup = new THREE.Group();
const caseBack = new THREE.Mesh(
    new THREE.CylinderGeometry(CASE_RADIUS * 0.96, CASE_RADIUS * 0.94, 0.03, 64),
    materials.case
);
caseBack.rotation.x = Math.PI / 2;
caseBack.position.z = -CASE_DEPTH / 2 - 0.015;
caseBack.castShadow = true;
caseBackGroup.add(caseBack);
watchRoot.add(caseBackGroup);

// --- Bezel + crystal ---------------------------------------------------------
const bezelGroup = new THREE.Group();

const bezel = new THREE.Mesh(
    new THREE.TorusGeometry(CASE_RADIUS * 0.98, CASE_RADIUS * 0.08, 24, 64),
    materials.bezel
);
bezel.position.z = CASE_DEPTH / 2;
bezel.castShadow = true;
bezelGroup.add(bezel);

// Domed crystal curving forward toward the viewer (+Z), sitting slightly in front of the dial & hands
const crystal = new THREE.Mesh(
    new THREE.SphereGeometry(CASE_RADIUS * 1.92, 48, 24, 0, Math.PI * 2, 0, Math.PI / 6),
    materials.crystal
);
crystal.rotation.x = Math.PI / 2
crystal.position.z = -0.90;
crystal.castShadow = false; // Do not cast opaque shadow over the dial beneath
bezelGroup.add(crystal);

watchRoot.add(bezelGroup);

// --- Dial + hands ------------------------------------------------------------
const dialGroup = new THREE.Group();
dialGroup.position.z = CASE_DEPTH / 2 - 0.03;

const dial = new THREE.Mesh(new THREE.CircleGeometry(CASE_RADIUS * 0.92, 64), materials.dial);

dial.receiveShadow = true;
dialGroup.add(dial);

// Each hand is a pivot Group at the dial center holding an offset mesh, the
// same "rotate the pivot, not the mesh" pattern used for hinges and swinging
// lights — the pivot's rotation IS the hand's reading.
function makeHand(length, width, thickness, material, tailFraction = 0.15) {
    const pivot = new THREE.Group();
    const geometry = new THREE.BoxGeometry(width, length, thickness);
    geometry.translate(0, length / 2 - length * tailFraction, 0); // offset so it extends from the pivot with a small counterweight tail
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    pivot.add(mesh);
    pivot.position.z = thickness; // stack hands slightly above the dial, closest last
    return pivot;
}

const hourHand = makeHand(CASE_RADIUS * 0.5, 0.045, 0.012, materials.hand);
const minuteHand = makeHand(CASE_RADIUS * 0.72, 0.032, 0.01, materials.hand);
const secondHand = makeHand(CASE_RADIUS * 0.78, 0.012, 0.008, materials.secondHand, 0.22);
hourHand.position.z = 0.012;
minuteHand.position.z = 0.02;
secondHand.position.z = 0.028;
dialGroup.add(hourHand, minuteHand, secondHand);

// Center cap
const centerCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.03, 24),
    materials.hand
);
centerCap.rotation.x = Math.PI / 2;
centerCap.position.z = 0.032;
dialGroup.add(centerCap);

watchRoot.add(dialGroup);

// --- Crown -------------------------------------------------------------------
const crownGroup = new THREE.Group();
const crown = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.1, 20, 1, false),
    materials.crown
);
crown.rotation.z = Math.PI / 2;
crown.position.set(CASE_RADIUS + 0.03, -0.02, 0);
crown.castShadow = true;
crownGroup.add(crown);

// Fluted grip rings on the crown, purely decorative but sells the detail
for (let i = -1; i <= 1; i++) {
    const groove = new THREE.Mesh(
        new THREE.TorusGeometry(0.061, 0.004, 8, 20),
        materials.bezel
    );
    groove.rotation.y = Math.PI / 2;
    groove.position.set(CASE_RADIUS + 0.03 + i * 0.025, -0.02, 0);
    crownGroup.add(groove);
}
watchRoot.add(crownGroup);

// --- Movement (visible mainly once exploded) ---------------------------------
const movementGroup = new THREE.Group();
movementGroup.position.z = -0.02;

const movementPlate = new THREE.Mesh(
    new THREE.CylinderGeometry(CASE_RADIUS * 0.8, CASE_RADIUS * 0.8, 0.04, 48),
    materials.movement
);
movementPlate.rotation.x = Math.PI / 2;
movementPlate.castShadow = true;
movementGroup.add(movementPlate);

// A handful of decorative gear discs — same geometry reused via cloning,
// which is the cheap way to add mechanical detail without new draw calls
// worth worrying about at this object count.
const gearGeometry = new THREE.CylinderGeometry(0.09, 0.09, 0.02, 24);
[[0.18, 0.12], [-0.15, 0.05], [0.05, -0.18]].forEach(([x, y]) => {
    const gear = new THREE.Mesh(gearGeometry, materials.bezel);
    gear.rotation.x = Math.PI / 2;
    gear.position.set(x, y, 0.025);
    movementGroup.add(gear);
});

watchRoot.add(movementGroup);

// --- Case Lugs (The 4 horns that connect the watch case to the strap) --------
const lugGeo = new THREE.BoxGeometry(0.08, 0.29, CASE_DEPTH * 0.6);
const lugPositions = [
    [-CASE_RADIUS * 0.58, CASE_RADIUS, 0],   // Top left
    [CASE_RADIUS * 0.58, CASE_RADIUS, 0],   // Top right
    [-CASE_RADIUS * 0.58, -(CASE_RADIUS), 0], // Bottom left
    [CASE_RADIUS * 0.58, -(CASE_RADIUS), 0], // Bottom right
];

lugPositions.forEach(([x, y, z]) => {
    const lug = new THREE.Mesh(lugGeo, materials.case);
    lug.position.set(x, y, z);
    // Angle lugs slightly downward toward the wrist curve
    lug.rotation.z = (x > 0 ? -1 : 1) * (y > 0 ? 0.12 : -0.12);
    lug.rotation.x = y > 0 ? -0.1 : 0.1;
    lug.castShadow = true;
    lug.receiveShadow = true;
    watchRoot.add(lug);
});

// Spring bars (metal pins between lugs)
const barGeo = new THREE.CylinderGeometry(0.02, 0.02, CASE_RADIUS * 1.16, 16);
const topBar = new THREE.Mesh(barGeo, materials.crown);
topBar.rotation.z = Math.PI / 2;
topBar.position.set(0, CASE_RADIUS + 0.1, -0.01);
watchRoot.add(topBar);

const bottomBar = new THREE.Mesh(barGeo, materials.crown);
bottomBar.rotation.z = Math.PI / 2;
bottomBar.position.set(0, -(CASE_RADIUS + 0.1), -0.01);
watchRoot.add(bottomBar);

// --- Strap (two hierarchies of link segments) ---------------------------------
function buildStrapSegment(index, total, isTop) {
    const t = index / (total - 1);
    // Fit snug between the lugs (width: ~CASE_RADIUS * 1.05) and taper down to 0.85
    const width = THREE.MathUtils.lerp(CASE_RADIUS * 1.05, CASE_RADIUS * 0.85, t);
    const segmentGeo = new THREE.BoxGeometry(width, 0.15, 0.045);
    const mesh = new THREE.Mesh(segmentGeo, materials.strap);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // A thin stitched edge line along each segment
    const stitchGeo = new THREE.BoxGeometry(width * 0.90, 0.01, 0.002);
    const stitch = new THREE.Mesh(stitchGeo, materials.stitching);
    stitch.position.z = 0.024;
    mesh.add(stitch);

    return mesh;
}

const STRAP_LINKS = 6;
const strapTopGroup = new THREE.Group();
const strapBottomGroup = new THREE.Group();

for (let i = 0; i < STRAP_LINKS; i++) {
    const top = buildStrapSegment(i, STRAP_LINKS, true);
    // Start right between the lugs at the case edge (CASE_RADIUS + 0.08)
    top.position.y = CASE_RADIUS + 0.08 + i * 0.145;
    top.position.z = -0.01 - i * 0.035; // gentle natural wrist curve
    top.rotation.x = -0.08 * (i + 1);
    strapTopGroup.add(top);

    const bottom = buildStrapSegment(i, STRAP_LINKS, false);
    bottom.position.y = -(CASE_RADIUS + 0.08 + i * 0.145);
    bottom.position.z = -0.01 - i * 0.035;
    bottom.rotation.x = 0.08 * (i + 1);
    strapBottomGroup.add(bottom);
}
watchRoot.add(strapTopGroup, strapBottomGroup);

// ============================================================================
// 6. EXPLODED-VIEW TARGETS (per-group offset, applied by lerp in the loop)
// ============================================================================
const REST = {
    caseBack: new THREE.Vector3(0, 0, 0),
    bezel: new THREE.Vector3(0, 0, 0),
    dial: new THREE.Vector3(0, 0, CASE_DEPTH / 2 - 0.03),
    movement: new THREE.Vector3(0, 0, -0.02),
    crown: new THREE.Vector3(0, 0, 0),
    strapTop: new THREE.Vector3(0, 0, 0),
    strapBottom: new THREE.Vector3(0, 0, 0),
};
const EXPLODED = {
    caseBack: new THREE.Vector3(0, 0, -0.5),
    bezel: new THREE.Vector3(0, 0, 0.55),
    dial: new THREE.Vector3(0, 0, 0.18),
    movement: new THREE.Vector3(0, 0, -0.22),
    crown: new THREE.Vector3(0.35, 0, 0),
    strapTop: new THREE.Vector3(0, 0.35, 0),
    strapBottom: new THREE.Vector3(0, -0.35, 0),
};

let exploded = false;
let explodeProgress = 0;

// ============================================================================
// 7. UI CONTROLS (wired to phase 1/index.html)
// ============================================================================
const explodeBtn = document.querySelector('#btn-explode');
if (explodeBtn) {
    explodeBtn.addEventListener('click', () => {
        exploded = !exploded;
        explodeBtn.classList.toggle('active', exploded);
    });
}

let turntableActive = true;
const turntableBtn = document.querySelector('#btn-turntable');
if (turntableBtn) {
    turntableBtn.addEventListener('click', () => {
        turntableActive = !turntableActive;
        turntableBtn.classList.toggle('active', turntableActive);
    });
}

// ============================================================================
// 8. ANIMATION LOOP
// ============================================================================
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();

    // --- Real-time clock hands ------------------------------------------------
    const now = new Date();
    const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
    const minutes = now.getMinutes() + seconds / 60;
    const hours = (now.getHours() % 12) + minutes / 60;

    secondHand.rotation.z = -(seconds / 60) * Math.PI * 2;
    minuteHand.rotation.z = -(minutes / 60) * Math.PI * 2;
    hourHand.rotation.z = -(hours / 12) * Math.PI * 2;

    // --- Exploded view lerp ----------------------------------------------------
    const target = exploded ? 1 : 0;
    explodeProgress += (target - explodeProgress) * 0.08;

    caseBackGroup.position.lerpVectors(REST.caseBack, EXPLODED.caseBack, explodeProgress);
    bezelGroup.position.lerpVectors(REST.bezel, EXPLODED.bezel, explodeProgress);
    dialGroup.position.lerpVectors(REST.dial, EXPLODED.dial, explodeProgress);
    movementGroup.position.lerpVectors(REST.movement, EXPLODED.movement, explodeProgress);
    crownGroup.position.lerpVectors(REST.crown, EXPLODED.crown, explodeProgress);
    strapTopGroup.position.lerpVectors(REST.strapTop, EXPLODED.strapTop, explodeProgress);
    strapBottomGroup.position.lerpVectors(REST.strapBottom, EXPLODED.strapBottom, explodeProgress);

    // --- Watch model rotation (drag + turntable) -------------------------------
    if (turntableActive) {
        targetRotationY += 0.005;
    }
    // Smoothly damp watch rotation toward target angles
    watchRoot.rotation.y += (targetRotationY - watchRoot.rotation.y) * 0.1;
    watchRoot.rotation.x += (targetRotationX - watchRoot.rotation.x) * 0.1;

    // --- Background Wall Texture Offset Animation ----------------------------
    const wallSpeed = 0.2; // smooth subtle drift
    const wallOffset = (elapsed * wallSpeed) % 1;
    wallColorTex.offset.x = wallOffset;
    wallRoughnessTex.offset.x = wallOffset;
    wallNormalTex.offset.x = wallOffset;
    wallAoTex.offset.x = wallOffset;

    // --- Constant Lighting Compensation across Camera Distance (up to z = 20)
    // Fog attenuation normally dims objects as the camera zooms out.
    // We compute the camera distance, thin the fog, and proportionally boost
    // light intensities so the watch and room retain identical brightness all the way to z = 20.
    const camDist = camera.position.length();
    const distFactor = THREE.MathUtils.clamp((camDist - 4.0) / 16.0, 0, 1);
    const lightMultiplier = 1.0 + distFactor * 1.8;

    ambientLight.intensity = BASE_LIGHTS.ambient * lightMultiplier;
    keyLight.intensity = BASE_LIGHTS.key * lightMultiplier;
    fillLight.intensity = BASE_LIGHTS.fill * lightMultiplier;
    rimLight.intensity = BASE_LIGHTS.rim * lightMultiplier;
    topSpotLight.intensity = BASE_LIGHTS.spot * (1.0 + distFactor * 2.2);

    // Gently reduce fog density so distance doesn't wash out or darken the model
    scene.fog.density = THREE.MathUtils.lerp(0.02, 0.005, distFactor);

    controls.update();
    renderer.render(scene, camera);
}
animate();

// ============================================================================
// 11. RESPONSIVE CANVAS
// ============================================================================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});