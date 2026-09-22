import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

// ============================================================================
// 1. SCENE, CAMERA, RENDERER SETUP
// ============================================================================
const canvas = document.querySelector('#webgl-canvas');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.2, 5.5);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

// Orbit Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 1.2, 0);
controls.minDistance = 1.5;
controls.maxDistance = 15.0;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.8;
controls.update();

window.addEventListener('contextmenu', (e) => e.preventDefault());

// ============================================================================
// 2. HDRI ENVIRONMENT (PMREM) SETUP
// ============================================================================
let currentEnvMap = null;
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

const rgbeLoader = new RGBELoader();
const hdriPath = './HDRI/sunset_meadow_path_2k.hdr';

console.log('⏳ Loading HDRI Environment:', hdriPath);

rgbeLoader.load(
    hdriPath,
    (hdrTexture) => {
        currentEnvMap = pmremGenerator.fromEquirectangular(hdrTexture).texture;

        scene.environment = currentEnvMap; // Realistic reflections & PBR ambient irradiance
        scene.background = currentEnvMap;  // Visible 360 panoramic backdrop
        scene.backgroundBlurriness = 0.0;

        hdrTexture.dispose();
        pmremGenerator.dispose();
        console.log('🌅 HDRI Environment Map loaded successfully.');
    },
    (progress) => {
        if (progress.total > 0) {
            console.log(`HDRI Loading: ${Math.round((progress.loaded / progress.total) * 100)}%`);
        }
    },
    (error) => {
        console.error('❌ Failed to load HDRI:', error);
    }
);

// Balanced Key Sun Light matching HDRI sunset
const sunLight = new THREE.DirectionalLight(0xffe2cc, 2.0);
sunLight.position.set(-6, 6, -8);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 30;
sunLight.shadow.camera.left = -4;
sunLight.shadow.camera.right = 4;
sunLight.shadow.camera.top = 4;
sunLight.shadow.camera.bottom = -4;
sunLight.shadow.bias = -0.0003;
scene.add(sunLight);

// No stage or ground planes: 100% Pure floating objects in HDRI space

// ============================================================================
// 3. PROCEDURAL TEXTURE GENERATORS (For Realistic Roughness & Bump detail)
// ============================================================================
function getSecureRandom() {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] / 4294967296;
}

function createNoiseTexture(size = 512, scale = 16) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(size, size);
    for (let i = 0; i < imgData.data.length; i += 4) {
        // High frequency micro-grain for brushed metals & stone roughness
        const val = Math.floor(getSecureRandom() * 255);
        imgData.data[i] = val;
        imgData.data[i + 1] = val;
        imgData.data[i + 2] = val;
        imgData.data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(scale, scale);
    return texture;
}

const microNoiseMap = createNoiseTexture(256, 8);

// ============================================================================
// 4. EXPERIMENT MATERIALS: Metal, Glass, Plastic, Rough Surfaces
// ============================================================================

// 1. METAL (Chrome / Platinum / Gold PBR)
// - metalness: 1.0 (pure conductor)
// - roughness: low (sharp specular reflection of HDRI)
const metalMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 1.0,
    roughness: 0.05,
    envMapIntensity: 1.5,
    roughnessMap: microNoiseMap
});

// 2. GLASS (Physical Transmission & Refraction)
// - MeshPhysicalMaterial with transmission: 0.98, ior: 1.52 (crown glass)
// - thickness: allows internal light absorption & caustics simulation
const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.0,
    roughness: 0.02,
    transmission: 0.98, // Glass transparency
    ior: 1.52,          // Index of refraction for realistic bending of HDRI
    thickness: 1.2,     // Refraction volume depth
    transparent: true,
    opacity: 1.0,
    envMapIntensity: 1.8
});

// 3. PLASTIC (Glossy High-End Dielectric with Clearcoat)
// - Dielectric (metalness = 0) with a vibrant pigment and distinct glossy clearcoat layer
const plasticMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xef4444, // Vibrant crimson red
    metalness: 0.0,
    roughness: 0.18,
    clearcoat: 1.0,          // Car paint / lacquer topcoat
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.2
});

// 4. ROUGH SURFACE (Weathered Concrete / Terracotta Stone)
// - High roughness: diffuse scattering of sunset light, zero specular mirror
const roughMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b5cf6, // Matte iris stone
    metalness: 0.05,
    roughness: 0.88,
    bumpMap: microNoiseMap,
    bumpScale: 0.04,
    envMapIntensity: 0.8
});

// Material Dictionary
const materials = {
    metal: { mat: metalMaterial, name: "CHROME METAL", roughness: 0.05, metalness: 1.0 },
    glass: { mat: glassMaterial, name: "PHYSICAL GLASS", roughness: 0.02, metalness: 0.0 },
    plastic: { mat: plasticMaterial, name: "GLOSSY PLASTIC", roughness: 0.18, metalness: 0.0 },
    rough: { mat: roughMaterial, name: "ROUGH STONE", roughness: 0.88, metalness: 0.05 }
};

let activeKey = "metal";

// ============================================================================
// 5. FLOATING PRODUCT DISPLAY (Wider spacing, suspended in air)
// ============================================================================
const showcaseGroup = new THREE.Group();
scene.add(showcaseGroup);

// 4 Geometries suspended in air with wider spacing:
// Spaced across X: -2.55 (Metal), -0.85 (Glass), +0.85 (Plastic), +2.55 (Rough)
const items = [
    { key: 'metal', name: 'Metal', geo: new THREE.TorusKnotGeometry(0.42, 0.15, 128, 32), pos: [-2.55, 1.2, 0] },
    { key: 'glass', name: 'Glass', geo: new THREE.IcosahedronGeometry(0.52, 16), pos: [-0.85, 1.2, 0] },
    { key: 'plastic', name: 'Plastic', geo: new THREE.CapsuleGeometry(0.33, 0.55, 32, 64), pos: [0.85, 1.2, 0] },
    { key: 'rough', name: 'Rough', geo: new THREE.DodecahedronGeometry(0.52, 0), pos: [2.55, 1.2, 0] }
];

const productMeshes = [];

items.forEach((item) => {
    const mesh = new THREE.Mesh(item.geo, materials[item.key].mat);
    mesh.position.set(...item.pos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { key: item.key, initialY: item.pos[1] };
    showcaseGroup.add(mesh);
    productMeshes.push(mesh);
});

// Floating refractive inner core inside the glass object
const innerCore = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.2, 0),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.9, roughness: 0.1 })
);
innerCore.position.set(-0.85, 1.2, 0);
showcaseGroup.add(innerCore);

// ============================================================================
// 6. RAYCASTING & INTERACTION
// ============================================================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('pointerdown', (e) => {
    // Ignore clicks if clicking on dashboard or HUD
    if (e.target.closest('.pbr-dashboard') || e.target.closest('.hud-overlay')) return;

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(productMeshes);

    if (intersects.length > 0) {
        const selectedKey = intersects[0].object.userData.key;
        selectMaterial(selectedKey);
    }
});

// ============================================================================
// 7. UI CONTROLS & EVENT BINDINGS
// ============================================================================
const badgeMat = document.getElementById("active-mat-badge");
const sliderRoughness = document.getElementById("slider-roughness");
const valRoughness = document.getElementById("val-roughness");
const sliderMetalness = document.getElementById("slider-metalness");
const valMetalness = document.getElementById("val-metalness");
const sliderBlur = document.getElementById("slider-blur");
const valBlur = document.getElementById("val-blur");
const btnAutoRotate = document.getElementById("btn-auto-rotate");
const btnToggleBg = document.getElementById("btn-toggle-bg");
const cards = document.querySelectorAll(".pbr-card");

function selectMaterial(key) {
    activeKey = key;
    const config = materials[key];

    // Highlight card
    cards.forEach((card) => {
        card.classList.toggle("active", card.dataset.mat === key);
    });

    if (badgeMat) badgeMat.textContent = `ACTIVE: ${config.name}`;
    if (sliderRoughness) {
        sliderRoughness.value = config.mat.roughness;
        valRoughness.textContent = config.mat.roughness.toFixed(2);
    }
    if (sliderMetalness) {
        sliderMetalness.value = config.mat.metalness;
        valMetalness.textContent = config.mat.metalness.toFixed(2);
    }
}

// Card Click Selection
cards.forEach((card) => {
    card.addEventListener("click", () => {
        selectMaterial(card.dataset.mat);
    });
});

// Roughness Slider
sliderRoughness?.addEventListener("input", (e) => {
    const val = Number.parseFloat(e.target.value);
    valRoughness.textContent = val.toFixed(2);
    materials[activeKey].mat.roughness = val;
});

// Metalness Slider
sliderMetalness?.addEventListener("input", (e) => {
    const val = Number.parseFloat(e.target.value);
    valMetalness.textContent = val.toFixed(2);
    materials[activeKey].mat.metalness = val;
});

// HDRI Background Blur Slider
sliderBlur?.addEventListener("input", (e) => {
    const val = Number.parseFloat(e.target.value);
    valBlur.textContent = val.toFixed(2);
    scene.backgroundBlurriness = val;
});

// Toggle Auto-Rotate
btnAutoRotate?.addEventListener("click", () => {
    controls.autoRotate = !controls.autoRotate;
    btnAutoRotate.classList.toggle("active", controls.autoRotate);
});

// Toggle Background (HDRI Panorama vs Studio Dark Color)
let showHdriBg = true;
btnToggleBg?.addEventListener("click", () => {
    showHdriBg = !showHdriBg;
    scene.background = showHdriBg ? currentEnvMap : new THREE.Color(0x0a0f1d);
    btnToggleBg.classList.toggle("active", !showHdriBg);
});

// ============================================================================
// 8. ANIMATION LOOP
// ============================================================================
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const time = clock.getElapsedTime();

    // Gentle micro-rotation for products to catch dynamic HDRI highlights
    // Gentle micro-rotation and floating bobbing in air
    productMeshes.forEach((mesh, idx) => {
        mesh.rotation.y = time * 0.4 + idx * 0.5;
        mesh.rotation.x = Math.sin(time * 0.5 + idx) * 0.15;
        mesh.position.y = mesh.userData.initialY + Math.sin(time * 1.5 + idx * 1.2) * 0.08;
    });

    if (innerCore) {
        innerCore.rotation.x = -time * 0.8;
        innerCore.rotation.y = time * 0.6;
        innerCore.position.y = 1.2 + Math.sin(time * 1.5 + 1 * 1.2) * 0.08;
    }

    controls.update();
    renderer.render(scene, camera);
}
animate();

// Resize handling
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
