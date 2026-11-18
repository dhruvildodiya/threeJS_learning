import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Post-Processing Imports
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// ============================================================================
// 1. SCENE, CAMERA, RENDERER SETUP
// ============================================================================
const canvas = document.querySelector('#webgl-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04060f);
scene.fog = new THREE.FogExp2(0x04060f, 0.025);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2.5, 6.5);

const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false, // Turn off when using EffectComposer for optimal performance
    powerPreference: "high-performance"
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

// Orbit Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 1.2, 0);
controls.minDistance = 2.0;
controls.maxDistance = 16.0;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.6;
controls.update();

window.addEventListener('contextmenu', (e) => e.preventDefault());

// ============================================================================
// 2. FUTURISTIC SCENE: SCI-FI QUANTUM REACTOR & ORBITING DRONES
// ============================================================================

// A. Futuristic Grid Platform
const gridHelper = new THREE.GridHelper(40, 40, 0x00f3ff, 0x0f172a);
gridHelper.position.y = 0;
scene.add(gridHelper);

// Cyberpunk Floor Ring
const floorRingGeo = new THREE.RingGeometry(2.8, 3.2, 64);
const floorRingMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, side: THREE.DoubleSide });
const floorRing = new THREE.Mesh(floorRingGeo, floorRingMat);
floorRing.rotation.x = -Math.PI / 2;
floorRing.position.y = 0.01;
scene.add(floorRing);

// Outer Runway Ring
const outerRingGeo = new THREE.RingGeometry(6.0, 6.1, 96);
const outerRingMat = new THREE.MeshBasicMaterial({ color: 0xff007f, side: THREE.DoubleSide });
const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
outerRing.rotation.x = -Math.PI / 2;
outerRing.position.y = 0.01;
scene.add(outerRing);

// B. Central Quantum Core (Intense Emissive Glow for Bloom)
const coreGroup = new THREE.Group();
coreGroup.position.set(0, 1.5, 0);
scene.add(coreGroup);

// Central Plasma Sphere
const plasmaGeo = new THREE.IcosahedronGeometry(0.65, 4);
const plasmaMat = new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: 0x00f3ff,
    emissiveIntensity: 2.8, // Triggers UnrealBloom
    roughness: 0.1,
    metalness: 0.9
});
const plasmaSphere = new THREE.Mesh(plasmaGeo, plasmaMat);
plasmaSphere.userData = { name: "Quantum Plasma Core" };
coreGroup.add(plasmaSphere);

// Internal Heart
const heartGeo = new THREE.OctahedronGeometry(0.35, 0);
const heartMat = new THREE.MeshStandardMaterial({
    color: 0xff0055,
    emissive: 0xff0055,
    emissiveIntensity: 4.5 // Super hot emissive
});
const innerHeart = new THREE.Mesh(heartGeo, heartMat);
coreGroup.add(innerHeart);

// Gyroscope Containment Rings
function createReactorRing(radius, tube, color, emissiveColor) {
    const geo = new THREE.TorusGeometry(radius, tube, 16, 100);
    const mat = new THREE.MeshStandardMaterial({
        color: 0x111827,
        metalness: 0.95,
        roughness: 0.15,
        emissive: emissiveColor,
        emissiveIntensity: 1.8
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.userData = { name: "Magnetic Containment Ring" };
    return ring;
}

const ring1 = createReactorRing(1.2, 0.045, 0x111827, 0x00f3ff);
const ring2 = createReactorRing(1.6, 0.045, 0x111827, 0xff007f);
const ring3 = createReactorRing(2.0, 0.05, 0x111827, 0xffaa00);
coreGroup.add(ring1);
coreGroup.add(ring2);
coreGroup.add(ring3);

// C. 4 Orbiting Sci-Fi Modules / Satellites (Interactive Outline Targets)
const interactiveModules = [plasmaSphere, ring1, ring2, ring3];
const droneGroup = new THREE.Group();
scene.add(droneGroup);

const droneColors = [0x00f3ff, 0xff007f, 0x10b981, 0xf59e0b];
const drones = [];

for (let i = 0; i < 4; i++) {
    const droneMesh = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.28, 0),
        new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            metalness: 0.9,
            roughness: 0.2,
            emissive: droneColors[i],
            emissiveIntensity: 2.2
        })
    );

    // Orbit trail anchor
    const droneWrapper = new THREE.Group();
    droneWrapper.position.y = 1.5;
    droneMesh.position.x = 2.8 + i * 0.4;
    droneMesh.userData = { name: `Drone Probe #${i + 1}` };
    droneWrapper.add(droneMesh);

    scene.add(droneWrapper);
    drones.push({ wrapper: droneWrapper, mesh: droneMesh, speed: (0.8 + i * 0.3) * (i % 2 === 0 ? 1 : -1) });
    interactiveModules.push(droneMesh);
}

// D. Background Effects: Hyperspace Warp Stars & Particle Matrix
function getSecureRandom() {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] / 4294967296;
}

const starCount = 1200;
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(starCount * 3);
const starVel = [];

for (let i = 0; i < starCount; i++) {
    starPos[i * 3] = (getSecureRandom() - 0.5) * 40;
    starPos[i * 3 + 1] = getSecureRandom() * 20;
    starPos[i * 3 + 2] = (getSecureRandom() - 0.5) * 40;
    starVel.push(getSecureRandom() * 0.08 + 0.02);
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));

const starMat = new THREE.PointsMaterial({
    color: 0x38bdf8,
    size: 0.12,
    transparent: true,
    opacity: 0.8
});
const starField = new THREE.Points(starGeo, starMat);
scene.add(starField);

// ============================================================================
// 3. LIGHTING (Cyberpunk High-Contrast Lights)
// ============================================================================
const ambientLight = new THREE.AmbientLight(0x060914, 2.0);
scene.add(ambientLight);

const cyanCoreLight = new THREE.PointLight(0x00f3ff, 5.0, 10);
cyanCoreLight.position.set(0, 1.5, 0);
scene.add(cyanCoreLight);

const magentaRimLight = new THREE.DirectionalLight(0xff007f, 2.0);
magentaRimLight.position.set(-6, 8, -6);
scene.add(magentaRimLight);

// ============================================================================
// 4. POST-PROCESSING COMPOSER PIPELINE
// ============================================================================
const composer = new EffectComposer(renderer);

// PASS 1: Base 3D Scene Render Pass
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// PASS 2: Unreal Bloom Pass (Screen-space Multi-frequency Glow)
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.6,  // Strength
    0.4,  // Radius
    0.65  // Threshold (only bloom bright emissive objects)
);
composer.addPass(bloomPass);

// PASS 3: Outline Pass (Screen-space Silhouette & Highlighting)
const outlinePass = new OutlinePass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    scene,
    camera
);
outlinePass.edgeStrength = 4.0;
outlinePass.edgeGlow = 1.2;
outlinePass.edgeThickness = 2.5;
outlinePass.visibleEdgeColor.set(0x00f3ff);
outlinePass.hiddenEdgeColor.set(0x0f172a);
outlinePass.selectedObjects = [plasmaSphere]; // Initial highlight
composer.addPass(outlinePass);

// PASS 4: Cinematic Vignette Pass (Screen-edge Falloff)
const vignettePass = new ShaderPass(VignetteShader);
vignettePass.uniforms['offset'].value = 0.95;
vignettePass.uniforms['darkness'].value = 1.5;
composer.addPass(vignettePass);

// PASS 5: Custom Color Grading Shader Pass (Cyberpunk Split-Toning & Contrast)
const ColorGradingShader = {
    uniforms: {
        tDiffuse: { value: null },
        uContrast: { value: 1.12 },
        uBrightness: { value: 0.02 },
        uTintR: { value: 0.95 },
        uTintG: { value: 1.05 },
        uTintB: { value: 1.2 }  // Boost futuristic blue/cyan tint in shadows
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uContrast;
        uniform float uBrightness;
        uniform float uTintR;
        uniform float uTintG;
        uniform float uTintB;
        varying vec2 vUv;

        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            
            // Contrast adjustment
            vec3 c = (color.rgb - 0.5) * uContrast + 0.5 + uBrightness;
            
            // Cyberpunk color grading matrix
            c.r *= uTintR;
            c.g *= uTintG;
            c.b *= uTintB;

            gl_FragColor = vec4(clamp(c, 0.0, 1.0), color.a);
        }
    `
};
const colorGradePass = new ShaderPass(ColorGradingShader);
composer.addPass(colorGradePass);

// PASS 6: OutputPass (sRGB & ACES Filmic Tone Mapping encoding)
const outputPass = new OutputPass();
composer.addPass(outputPass);

// ============================================================================
// 5. INTERACTION & RAYCASTING (Interactive Outline Highlighting)
// ============================================================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function checkHover(e) {
    if (e.target.closest('.postfx-dashboard') || e.target.closest('.hud-overlay')) return;

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactiveModules, true);

    if (intersects.length > 0) {
        let hitObject = intersects[0].object;
        while (hitObject.parent && !interactiveModules.includes(hitObject) && hitObject !== scene) {
            hitObject = hitObject.parent;
        }
        outlinePass.selectedObjects = [hitObject];
        document.body.style.cursor = 'pointer';
    } else {
        document.body.style.cursor = 'default';
    }
}

window.addEventListener('pointermove', checkHover);
window.addEventListener('pointerdown', checkHover);

// ============================================================================
// 6. UI CONTROLS & EVENT BINDINGS
// ============================================================================

// 1. Bloom Controls
const toggleBloom = document.getElementById("toggle-bloom");
const sliderBloomStr = document.getElementById("slider-bloom-str");
const valBloomStr = document.getElementById("val-bloom-str");
const sliderBloomRad = document.getElementById("slider-bloom-rad");
const valBloomRad = document.getElementById("val-bloom-rad");

toggleBloom?.addEventListener("click", () => {
    bloomPass.enabled = !bloomPass.enabled;
    toggleBloom.textContent = bloomPass.enabled ? "ON" : "OFF";
    toggleBloom.classList.toggle("active", bloomPass.enabled);
    document.getElementById("card-bloom")?.classList.toggle("active", bloomPass.enabled);
});

sliderBloomStr?.addEventListener("input", (e) => {
    const val = Number.parseFloat(e.target.value);
    bloomPass.strength = val;
    valBloomStr.textContent = val.toFixed(1);
});

sliderBloomRad?.addEventListener("input", (e) => {
    const val = Number.parseFloat(e.target.value);
    bloomPass.radius = val;
    valBloomRad.textContent = val.toFixed(2);
});

// 2. Outline Controls
const toggleOutline = document.getElementById("toggle-outline");
const sliderOutlineStr = document.getElementById("slider-outline-str");
const valOutlineStr = document.getElementById("val-outline-str");
const sliderOutlineThick = document.getElementById("slider-outline-thick");
const valOutlineThick = document.getElementById("val-outline-thick");

toggleOutline?.addEventListener("click", () => {
    outlinePass.enabled = !outlinePass.enabled;
    toggleOutline.textContent = outlinePass.enabled ? "ON" : "OFF";
    toggleOutline.classList.toggle("active", outlinePass.enabled);
    document.getElementById("card-outline")?.classList.toggle("active", outlinePass.enabled);
});

sliderOutlineStr?.addEventListener("input", (e) => {
    const val = Number.parseFloat(e.target.value);
    outlinePass.edgeStrength = val;
    valOutlineStr.textContent = val.toFixed(1);
});

sliderOutlineThick?.addEventListener("input", (e) => {
    const val = Number.parseFloat(e.target.value);
    outlinePass.edgeThickness = val;
    valOutlineThick.textContent = val.toFixed(1);
});

// 3. Vignette Controls
const toggleVignette = document.getElementById("toggle-vignette");
const sliderVignetteDark = document.getElementById("slider-vignette-dark");
const valVignetteDark = document.getElementById("val-vignette-dark");
const sliderVignetteOffset = document.getElementById("slider-vignette-offset");
const valVignetteOffset = document.getElementById("val-vignette-offset");

toggleVignette?.addEventListener("click", () => {
    vignettePass.enabled = !vignettePass.enabled;
    toggleVignette.textContent = vignettePass.enabled ? "ON" : "OFF";
    toggleVignette.classList.toggle("active", vignettePass.enabled);
    document.getElementById("card-vignette")?.classList.toggle("active", vignettePass.enabled);
});

sliderVignetteDark?.addEventListener("input", (e) => {
    const val = Number.parseFloat(e.target.value);
    vignettePass.uniforms['darkness'].value = val;
    valVignetteDark.textContent = val.toFixed(1);
});

sliderVignetteOffset?.addEventListener("input", (e) => {
    const val = Number.parseFloat(e.target.value);
    vignettePass.uniforms['offset'].value = val;
    valVignetteOffset.textContent = val.toFixed(2);
});

// 4. Color Grading Controls
const toggleColorGrade = document.getElementById("toggle-colorgrade");
const sliderExposure = document.getElementById("slider-exposure");
const valExposure = document.getElementById("val-exposure");
const btnThemeLUT = document.getElementById("btn-theme-lut");

toggleColorGrade?.addEventListener("click", () => {
    colorGradePass.enabled = !colorGradePass.enabled;
    toggleColorGrade.textContent = colorGradePass.enabled ? "ON" : "OFF";
    toggleColorGrade.classList.toggle("active", colorGradePass.enabled);
    document.getElementById("card-colorgrade")?.classList.toggle("active", colorGradePass.enabled);
});

sliderExposure?.addEventListener("input", (e) => {
    const val = Number.parseFloat(e.target.value);
    renderer.toneMappingExposure = val;
    valExposure.textContent = val.toFixed(2);
});

const themes = [
    { name: "CYBERPUNK", r: 0.95, g: 1.05, b: 1.25, contrast: 1.15, outline: 0x00f3ff },
    { name: "NEON MATRIX", r: 0.8, g: 1.3, b: 0.9, contrast: 1.25, outline: 0x10b981 },
    { name: "SOLAR FLARE", r: 1.35, g: 0.9, b: 0.8, contrast: 1.2, outline: 0xffa500 }
];
let themeIdx = 0;

btnThemeLUT?.addEventListener("click", () => {
    themeIdx = (themeIdx + 1) % themes.length;
    const t = themes[themeIdx];
    btnThemeLUT.textContent = t.name;
    colorGradePass.uniforms.uTintR.value = t.r;
    colorGradePass.uniforms.uTintG.value = t.g;
    colorGradePass.uniforms.uTintB.value = t.b;
    colorGradePass.uniforms.uContrast.value = t.contrast;
    outlinePass.visibleEdgeColor.set(t.outline);
});

// Quick Action Buttons
const btnAutoOrbit = document.getElementById("btn-auto-orbit");
btnAutoOrbit?.addEventListener("click", () => {
    controls.autoRotate = !controls.autoRotate;
    btnAutoOrbit.classList.toggle("active", controls.autoRotate);
});

let warpActive = true;
const btnWarpStars = document.getElementById("btn-warp-stars");
btnWarpStars?.addEventListener("click", () => {
    warpActive = !warpActive;
    starField.visible = warpActive;
    btnWarpStars.classList.toggle("active", warpActive);
});

const btnPulseReactor = document.getElementById("btn-pulse-reactor");
let pulseOverload = false;
btnPulseReactor?.addEventListener("click", () => {
    pulseOverload = !pulseOverload;
    btnPulseReactor.classList.toggle("active", pulseOverload);
    bloomPass.strength = pulseOverload ? 2.8 : 1.6;
    sliderBloomStr.value = bloomPass.strength;
    valBloomStr.textContent = bloomPass.strength.toFixed(1);
});

// ============================================================================
// 7. ANIMATION RENDER LOOP (Driven by composer.render)
// ============================================================================
const clock = new THREE.Clock();
let frameCount = 0;
let lastFpsTime = performance.now();
const fpsBadge = document.getElementById("fps-badge");

function animate() {
    requestAnimationFrame(animate);

    const time = clock.getElapsedTime();

    // 1. Quantum Reactor Core Rotations
    plasmaSphere.rotation.y = time * 0.8;
    plasmaSphere.rotation.z = time * 0.5;
    innerHeart.rotation.x = -time * 1.5;
    innerHeart.rotation.y = time * 2.0;

    // Emissive pulsing
    const pulse = Math.sin(time * 3.0) * 0.5 + 0.5;
    plasmaMat.emissiveIntensity = pulseOverload ? 4.5 + pulse * 2.0 : 2.2 + pulse * 0.8;
    innerHeart.material.emissiveIntensity = pulseOverload ? 6.0 + pulse * 3.0 : 3.5 + pulse * 1.5;

    // Containment Ring counter-rotations
    ring1.rotation.x = time * 0.6;
    ring1.rotation.y = time * 0.3;
    ring2.rotation.y = -time * 0.5;
    ring2.rotation.z = time * 0.4;
    ring3.rotation.z = time * 0.4;
    ring3.rotation.x = -time * 0.3;

    // 2. Drone Probes orbiting the reactor
    drones.forEach((drone) => {
        drone.wrapper.rotation.y += drone.speed * 0.015;
        drone.mesh.rotation.x += 0.03;
        drone.mesh.rotation.y += 0.02;
    });

    // 3. Hyperspace Particle Streaming (Screen-space depth motion)
    if (warpActive) {
        const positions = starGeo.attributes.position.array;
        for (let i = 0; i < starCount; i++) {
            positions[i * 3 + 1] -= starVel[i];
            if (positions[i * 3 + 1] < 0) {
                positions[i * 3 + 1] = 20;
            }
        }
        starGeo.attributes.position.needsUpdate = true;
    }

    // 4. Update Orbit Controls
    controls.update();

    // 5. Post-Processing Multi-Pass Render (CRITICAL: composer.render() instead of renderer.render())
    composer.render();

    // Performance FPS Counter
    frameCount++;
    const now = performance.now();
    if (now - lastFpsTime >= 1000) {
        if (fpsBadge) fpsBadge.textContent = `FPS: ${frameCount}`;
        frameCount = 0;
        lastFpsTime = now;
    }
}
animate();

// Window Resize Handling
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    composer.setSize(width, height); // REQUIRED: Keeps render targets in sync with viewport
});
