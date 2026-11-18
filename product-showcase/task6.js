// Interactive instanced field
//
// Techniques used here:
//   • InstancedMesh (one draw call for ~2,300 objects)
//   • MeshStandardMaterial patched via onBeforeCompile for per-instance tint + glow
//   • Analytic O(1) picking instead of per-instance raycasting
//   • Damped spring integration for hover/selection response
//   • Click-driven radial wave propagation
//   • EffectComposer + bloom
//   • Screen-space HTML label projected from a 3D anchor


import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const CONFIG = {
  grid: 48,          // grid × grid instances
  spacing: 0.42,     // world units between instance centres
  pillarWidth: 0.26,
  influence: 2.4,    // pointer influence radius, world units
  liftMax: 1.6,      // peak lift under the pointer
  stiffness: 140,    // spring constant
  damping: 18,       // spring damping — near-critical for stiffness 140
  waveSpeed: 6.0,
  waveDecay: 1.6,
  waveAmplitude: 1.1,
};

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------
const canvas = document.querySelector('#webgl-canvas');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070a10);
scene.fog = new THREE.Fog(0x070a10, 14, 30);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 9, 13);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.48;
controls.minDistance = 6;
controls.maxDistance = 26;
controls.target.set(0, 0, 0);

scene.add(new THREE.AmbientLight(0x4a6a9a, 0.6));

const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(6, 10, 4);
scene.add(key);

const fill = new THREE.DirectionalLight(0x3b6ea5, 1.1);
fill.position.set(-7, 3, -6);
scene.add(fill);

// ---------------------------------------------------------------------------
// Instanced field
// ---------------------------------------------------------------------------
const COUNT = CONFIG.grid * CONFIG.grid;
const HALF = ((CONFIG.grid - 1) * CONFIG.spacing) / 2;

const geometry = new THREE.BoxGeometry(CONFIG.pillarWidth, 1, CONFIG.pillarWidth);
geometry.translate(0, 0.5, 0); // pivot at the base, so scale.y grows upward

// Per-instance attributes we drive ourselves
const tints = new Float32Array(COUNT * 3);
const glows = new Float32Array(COUNT);

const tintAttr = new THREE.InstancedBufferAttribute(tints, 3);
const glowAttr = new THREE.InstancedBufferAttribute(glows, 1);
glowAttr.setUsage(THREE.DynamicDrawUsage);

geometry.setAttribute('aTint', tintAttr);
geometry.setAttribute('aGlow', glowAttr);

const material = new THREE.MeshStandardMaterial({
  roughness: 0.35,
  metalness: 0.15,
});

// Patch the standard shader rather than writing one from scratch — this keeps
// three's lighting, fog and tone mapping while adding two per-instance inputs.
material.onBeforeCompile = (shader) => {
  shader.vertexShader = shader.vertexShader
    .replace(
      '#include <common>',
      `#include <common>
       attribute vec3 aTint;
       attribute float aGlow;
       varying vec3 vTint;
       varying float vGlow;`
    )
    .replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       vTint = aTint;
       vGlow = aGlow;`
    );

  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>
       varying vec3 vTint;
       varying float vGlow;`
    )
    .replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
       diffuseColor.rgb *= vTint;
       totalEmissiveRadiance += vTint * vGlow * 3.0;`
    );
};

const field = new THREE.InstancedMesh(geometry, material, COUNT);
field.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
field.frustumCulled = false;
scene.add(field);

// Per-instance CPU state. Structure-of-arrays keeps the hot loop cache-friendly.
const state = {
  x: new Float32Array(COUNT),
  z: new Float32Array(COUNT),
  height: new Float32Array(COUNT),     // current spring position
  velocity: new Float32Array(COUNT),   // current spring velocity
  glow: new Float32Array(COUNT),
  glowTarget: new Float32Array(COUNT),
  pinned: new Uint8Array(COUNT),
};

const scratchColor = new THREE.Color();
const pinnedColor = new THREE.Color(0xffd166);

function baseColorForIndex(i) {
  const radial = Math.min(Math.hypot(state.x[i], state.z[i]) / HALF, 1);
  return scratchColor.setHSL(0.52 + radial * 0.18, 0.62, 0.42 + radial * 0.08);
}

for (let i = 0; i < COUNT; i++) {
  const col = i % CONFIG.grid;
  const row = Math.floor(i / CONFIG.grid);

  state.x[i] = col * CONFIG.spacing - HALF;
  state.z[i] = row * CONFIG.spacing - HALF;
  state.height[i] = 0.25;

  baseColorForIndex(i).toArray(tints, i * 3);
}
tintAttr.needsUpdate = true;

// ---------------------------------------------------------------------------
// Pointer → world position via a single plane raycast
// ---------------------------------------------------------------------------
const pointer = new THREE.Vector2(0, 0);
const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const pointerWorld = new THREE.Vector3(0, 0, 0);
let pointerOverField = false;

window.addEventListener('pointermove', (event) => {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

function updatePointerWorld() {
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.ray.intersectPlane(groundPlane, pointerWorld);
  pointerOverField =
    hit !== null &&
    Math.abs(pointerWorld.x) <= HALF + CONFIG.spacing &&
    Math.abs(pointerWorld.z) <= HALF + CONFIG.spacing;
}

// Analytic picking. The grid is regular, so the instance under the pointer is
// arithmetic — no need to raycast 2,304 instance matrices every frame.
function pickIndex() {
  if (!pointerOverField) return -1;

  const col = Math.round((pointerWorld.x + HALF) / CONFIG.spacing);
  const row = Math.round((pointerWorld.z + HALF) / CONFIG.spacing);

  if (col < 0 || col >= CONFIG.grid || row < 0 || row >= CONFIG.grid) return -1;
  return row * CONFIG.grid + col;
}

// ---------------------------------------------------------------------------
// Click: pin an instance and emit a radial wave
// ---------------------------------------------------------------------------
const waves = []; // { x, z, age }
let hovered = -1;
let pinnedIndex = -1;

let downAt = null;
renderer.domElement.addEventListener('pointerdown', (e) => {
  downAt = { x: e.clientX, y: e.clientY };
});

renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downAt) return;
  const dragged = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 5;
  downAt = null;
  if (dragged) return; // orbit gesture, not a click

  const index = pickIndex();
  if (index < 0) return;

  if (pinnedIndex >= 0) {
    state.pinned[pinnedIndex] = 0;
    baseColorForIndex(pinnedIndex).toArray(tints, pinnedIndex * 3);
  }

  if (pinnedIndex === index) {
    pinnedIndex = -1;
  } else {
    pinnedIndex = index;
    state.pinned[index] = 1;
    pinnedColor.toArray(tints, index * 3);
  }

  tintAttr.needsUpdate = true;
  waves.push({ x: state.x[index], z: state.z[index], age: 0 });
  if (waves.length > 6) waves.shift(); // bound the per-frame cost
});

// ---------------------------------------------------------------------------
// Screen-space label
// ---------------------------------------------------------------------------
const label = document.createElement('div');
label.className = 'field-label';
document.body.appendChild(label);

const style = document.createElement('style');
style.textContent = `
  body { margin: 0; overflow: hidden; background: #070a10; }
  #webgl-canvas { display: block; }
  .field-label {
    position: fixed;
    top: 0; left: 0;
    padding: 7px 11px;
    border-radius: 6px;
    background: rgba(9, 13, 20, 0.86);
    border: 1px solid rgba(255, 209, 102, 0.35);
    color: #f2f5f9;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 11px;
    line-height: 1.55;
    white-space: pre;
    pointer-events: none;
    opacity: 0;
    transition: opacity 140ms ease;
  }
  .field-label.visible { opacity: 1; }
`;
document.head.appendChild(style);

const anchor = new THREE.Vector3();

function updateLabel() {
  const index = pinnedIndex >= 0 ? pinnedIndex : hovered;
  if (index < 0) {
    label.classList.remove('visible');
    return;
  }

  anchor.set(state.x[index], state.height[index] + 0.25, state.z[index]);
  anchor.project(camera);

  if (anchor.z > 1) {
    label.classList.remove('visible');
    return;
  }

  const sx = (anchor.x * 0.5 + 0.5) * window.innerWidth;
  const sy = (-anchor.y * 0.5 + 0.5) * window.innerHeight;

  label.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -120%)`;
  label.textContent =
    `instance ${index}\n` +
    `col ${index % CONFIG.grid}  row ${Math.floor(index / CONFIG.grid)}\n` +
    `height ${state.height[index].toFixed(3)}` +
    (state.pinned[index] ? '\npinned' : '');
  label.classList.add('visible');
}

// ---------------------------------------------------------------------------
// Post-processing
// ---------------------------------------------------------------------------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.65, // strength
  0.6,  // radius
  0.85  // threshold — only the emissive glow clears it
);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------------------------------------------------------------------------
// Simulation + render loop
// ---------------------------------------------------------------------------
const dummy = new THREE.Object3D();
const clock = new THREE.Clock();
const influenceSq = CONFIG.influence * CONFIG.influence;

function updateWaves(dt) {
  for (let w = waves.length - 1; w >= 0; w--) {
    waves[w].age += dt;
    if (waves[w].age > 3.5) waves.splice(w, 1);
  }
}

function calculateTargetHeight(x, z, t, px, pz) {
  let target = 0.25;
  if (!prefersReducedMotion) {
    target += Math.sin(t * 0.7 + x * 0.5 + z * 0.35) * 0.06;
  }

  if (pointerOverField) {
    const dx = x - px;
    const dz = z - pz;
    const distSq = dx * dx + dz * dz;

    if (distSq < influenceSq) {
      // Squared falloff — cheaper and smoother than a gaussian here
      const k = 1 - distSq / influenceSq;
      target += CONFIG.liftMax * k * k;
    }
  }

  for (const wave of waves) {
    const d = Math.hypot(x - wave.x, z - wave.z);
    const front = d - CONFIG.waveSpeed * wave.age;

    if (Math.abs(front) < 1.5) {
      const envelope = Math.exp(-wave.age * CONFIG.waveDecay) * Math.exp(-front * front * 2.0);
      target += CONFIG.waveAmplitude * Math.cos(front * 3.0) * envelope;
    }
  }

  return target;
}

function animate() {
  requestAnimationFrame(animate);

  // Clamp dt so a backgrounded tab doesn't blow up the integrator
  const dt = Math.min(clock.getDelta(), 1 / 30);
  const t = clock.getElapsedTime();

  controls.update();
  updatePointerWorld();
  hovered = pickIndex();

  updateWaves(dt);

  const px = pointerWorld.x;
  const pz = pointerWorld.z;

  for (let i = 0; i < COUNT; i++) {
    const x = state.x[i];
    const z = state.z[i];

    // --- target height -------------------------------------------------
    let target = calculateTargetHeight(x, z, t, px, pz);
    if (state.pinned[i]) target += 1.2;

    // --- spring integration (semi-implicit Euler) -----------------------
    const displacement = target - state.height[i];
    const accel = displacement * CONFIG.stiffness - state.velocity[i] * CONFIG.damping;
    state.velocity[i] += accel * dt;
    state.height[i] += state.velocity[i] * dt;

    // --- glow -----------------------------------------------------------
    const isHot = i === hovered || state.pinned[i] === 1;
    state.glowTarget[i] = isHot
      ? 1
      : Math.min(Math.max(state.height[i] - 0.4, 0) * 0.5, 0.6);
    state.glow[i] += (state.glowTarget[i] - state.glow[i]) * Math.min(dt * 12, 1);
    glows[i] = state.glow[i];

    // --- write the instance matrix ---------------------------------------
    dummy.position.set(x, 0, z);
    dummy.scale.set(1, Math.max(state.height[i], 0.02), 1);
    dummy.rotation.y = state.pinned[i] ? t * 0.8 : 0;
    dummy.updateMatrix();
    field.setMatrixAt(i, dummy.matrix);
  }

  field.instanceMatrix.needsUpdate = true;
  glowAttr.needsUpdate = true;

  updateLabel();
  renderer.domElement.style.cursor = hovered >= 0 ? 'pointer' : 'default';

  composer.render();
}

animate();

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  composer.setSize(w, h);
  bloom.setSize(w, h);
});

// ---------------------------------------------------------------------------
// Teardown — useful if this ever mounts inside a framework component
// ---------------------------------------------------------------------------
window.addEventListener('beforeunload', () => {
  geometry.dispose();
  material.dispose();
  composer.dispose();
  renderer.dispose();
  controls.dispose();
});
