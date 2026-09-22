import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

// ============================================================================
// 0. LENIS SMOOTH SCROLL + GSAP SCROLLTRIGGER INTEGRATION
// ============================================================================
gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  orientation: 'vertical',
  gestureOrientation: 'vertical',
  smoothWheel: true,
  touchMultiplier: 2,
});

// Connect Lenis scroll updates → ScrollTrigger
lenis.on('scroll', ScrollTrigger.update);

// Drive Lenis from GSAP's unified ticker (keeps everything in sync)
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// ============================================================================
// 1. RESPONSIVE CAMERA CONFIG & SCENE SETUP
// ============================================================================
export function getResponsiveCameraConfig() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspect = width / height;

  if (aspect < 0.75) {
    // Mobile portrait (smartphones): elevate watch into upper 55% of viewport
    return {
      fov: 44,
      pos: { x: 0, y: 0.78, z: 2.45 },
      target: { x: 0, y: 0.12, z: 0 },
      hero: { x: 0, y: 0.78, z: 2.45 },
      dial: { x: 0, y: 0.75, z: 0.75 },
      clasp: { x: -0.35, y: 0.35, z: -1.2 },
    };
  } else if (aspect < 1.05) {
    // Tablet / square screen
    return {
      fov: 42,
      pos: { x: 0, y: 0.6, z: 1.85 },
      target: { x: 0, y: 0.04, z: 0 },
      hero: { x: 0, y: 0.6, z: 1.85 },
      dial: { x: 0, y: 0.6, z: 0.5 },
      clasp: { x: -0.4, y: 0.2, z: -0.9 },
    };
  } else {
    // Desktop landscape
    return {
      fov: 38,
      pos: { x: 0, y: 0.55, z: 1.4 },
      target: { x: 0, y: 0.04, z: 0 },
      hero: { x: 0, y: 0.55, z: 1.4 },
      dial: { x: 0, y: 0.6, z: 0.35 },
      clasp: { x: -0.4, y: 0.15, z: -0.7 },
    };
  }
}

const canvas = document.querySelector('#webgl-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0d14);
scene.fog = new THREE.FogExp2(0x0a0d14, 0.035);

const initCam = getResponsiveCameraConfig();
const camera = new THREE.PerspectiveCamera(initCam.fov, window.innerWidth / window.innerHeight, 0.05, 50);
camera.position.set(initCam.pos.x, initCam.pos.y, initCam.pos.z);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.set(0, 0.04, 0);
controls.minDistance = 0.45;
controls.maxDistance = 3.5;
controls.maxPolarAngle = Math.PI / 2 + 0.05;

// Touch configuration: enable 2-finger rotate/pan on touch devices so 1-finger scrolls smoothly
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
if (isTouchDevice) {
  controls.touches = {
    ONE: THREE.TOUCH.NONE,
    TWO: THREE.TOUCH.DOLLY_ROTATE,
  };
}
controls.update();

window.addEventListener('contextmenu', (e) => e.preventDefault());

// ============================================================================
// 2. STUDIO STAGE & LIGHTING
// ============================================================================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const isMobile = window.innerWidth < 768;
const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
keyLight.position.set(2.5, 3.5, 2.5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
keyLight.shadow.bias = -0.0001;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x7dd3fc, 0.9);
fillLight.position.set(-3, 1.5, 1.5);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 1.4);
rimLight.position.set(0, 2.5, -2.5);
scene.add(rimLight);

// Pedestal Stage
const pedestal = new THREE.Mesh(
  new THREE.CylinderGeometry(0.7, 0.74, 0.04, 64),
  new THREE.MeshStandardMaterial({
    color: 0x12161f,
    roughness: 0.35,
    metalness: 0.25,
  })
);
pedestal.position.y = -0.15;
pedestal.receiveShadow = true;
scene.add(pedestal);

const groundPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.MeshStandardMaterial({
    color: 0x07090e,
    roughness: 0.9,
    metalness: 0.1,
  })
);
groundPlane.rotation.x = -Math.PI / 2;
groundPlane.position.y = -0.171;
groundPlane.receiveShadow = true;
scene.add(groundPlane);

// ============================================================================
// 3. HDRI ENVIRONMENT LIGHTING (PMREM)
// ============================================================================
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

new RGBELoader().load(
  './HDRI/sunset_meadow_path_2k.hdr',
  (hdrTexture) => {
    const envMap = pmremGenerator.fromEquirectangular(hdrTexture).texture;
    scene.environment = envMap;
    hdrTexture.dispose();
    pmremGenerator.dispose();
    const statusText = document.getElementById('status-model-state');
    if (statusText) statusText.textContent = 'STUDIO READY • HDRI';
  },
  undefined,
  (err) => console.warn('Could not load HDRI, using standard lights.', err)
);

// ============================================================================
// 4. WATCH PARTS & METADATA (Topic 3: Object Metadata & Part Detection)
// ============================================================================
export const watchParts = {
  root: null,
  body: null,
  clasp: null,
  strapA: null,
  strapB: null,
  glass: null,
};

// Part Metadata for Dynamic UI
const PART_METADATA = {
  body: {
    category: 'CHASSIS MODULE',
    title: 'KRONOS Digital Core',
    desc: 'Machined 316L stainless steel case housing the high-precision quartz movement and tactile micro-switch pushers.',
    spec: '316L Solid Steel Chassis',
  },
  glass: {
    category: 'OPTICAL ELEMENT',
    title: 'Domed Sapphire Crystal',
    desc: 'Scratch-resistant mineral sapphire crystal protecting the LCD display with anti-reflective optical clarity.',
    spec: 'Anti-Reflective Sapphire',
  },
  strapA: {
    category: 'ERGONOMIC BRACELET',
    title: 'Upper Articulated Bracelet',
    desc: 'Solid-link tapered steel bracelet engineered with precision pin friction tolerances for wrist contouring.',
    spec: 'Segmented Upper Link',
  },
  strapB: {
    category: 'ERGONOMIC BRACELET',
    title: 'Lower Articulated Bracelet',
    desc: 'Reinforced lower bracelet link segment balancing weight distribution and ergonomics.',
    spec: 'Segmented Lower Link',
  },
  clasp: {
    category: 'LOCKING MECHANISM',
    title: 'Deployant Security Clasp',
    desc: 'Dual-pusher folding clasp with micro-adjustment holes ensuring secure wrist locking under high activity.',
    spec: 'Folding Safety Clasp',
  },
};

// Original transform caches for explode & reset
const defaultTransforms = new Map();

// Interactive Raycasting & Selection State
const interactiveMeshes = [];
let hoveredMesh = null;
let selectedMesh = null;

// Temporary highlight overlay color
const highlightEmissive = new THREE.Color(0x38bdf8);

// ============================================================================
// 5. LOAD GLTF DIGITAL WATCH MODEL
// ============================================================================
const loader = new GLTFLoader();
const modelPath = './models/watch/digital_wrist_watch_2k.gltf';

loader.load(
  modelPath,
  (gltf) => {
    const model = gltf.scene;
    watchParts.root = model;

    // Center and auto-scale model to fit unit view nicely
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 0.85 / maxDim;
    model.scale.setScalar(scale);

    box.setFromObject(model);
    box.getCenter(center);
    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y -= box.min.y;

    // Traverse and categorize watch components
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        // Clone material instance so modifying colorway doesn't leak
        if (Array.isArray(child.material)) {
          child.material = child.material.map((m) => m.clone());
        } else {
          child.material = child.material.clone();
        }

        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat) => {
          if (mat.name && mat.name.toLowerCase().includes('glass')) {
            mat.transparent = true;
            mat.opacity = 0.25;
            mat.depthWrite = false;
            mat.roughness = 0.05;
            mat.metalness = 0.1;
            child.renderOrder = 1;
          } else if (mat.map) {
            mat.map.colorSpace = THREE.SRGBColorSpace;
          }
        });

        const name = child.name.toLowerCase();
        let partKey = 'body';

        if (name.includes('glass')) {
          watchParts.glass = child;
          partKey = 'glass';
        } else if (name.includes('clasp')) {
          watchParts.clasp = child;
          partKey = 'clasp';
        } else if (name.includes('strap_a')) {
          watchParts.strapA = child;
          partKey = 'strapA';
        } else if (name.includes('strap_b')) {
          watchParts.strapB = child;
          partKey = 'strapB';
        } else {
          watchParts.body = child;
          partKey = 'body';
        }

        child.userData = {
          partKey,
          metadata: PART_METADATA[partKey] || PART_METADATA.body,
          defaultColor: child.material.color ? child.material.color.clone() : new THREE.Color(0xffffff),
          defaultEmissive: child.material.emissive ? child.material.emissive.clone() : new THREE.Color(0x000000),
        };

        defaultTransforms.set(child, {
          position: child.position.clone(),
          rotation: child.rotation.clone(),
          scale: child.scale.clone(),
        });

        interactiveMeshes.push(child);
      }
    });

    scene.add(model);
  },
  undefined,
  (error) => console.error('Error loading watch model:', error)
);

// ============================================================================
// 6. ADVANCED RAYCASTING & INTERACTION SYSTEM (Topic 3)
// ============================================================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(-999, -999);

const screenTag = document.getElementById('screen-tag');
const tagTitle = document.getElementById('tag-title');
const partCategoryTag = document.getElementById('part-category-tag');
const partTitle = document.getElementById('part-title');
const partDesc = document.getElementById('part-desc');
const specSelectedPart = document.getElementById('spec-selected-part');

// Click / Tap Detection: Select / Deselect part (safeguarded against scroll drags)
let pointerDownPos = { x: 0, y: 0 };
let isDragMove = false;

window.addEventListener('pointerdown', (e) => {
  pointerDownPos.x = e.clientX;
  pointerDownPos.y = e.clientY;
  isDragMove = false;
});

window.addEventListener('pointermove', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  if (Math.hypot(event.clientX - pointerDownPos.x, event.clientY - pointerDownPos.y) > 10) {
    isDragMove = true;
  }
});

function handleHover() {
  if (!watchParts.root) return;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(interactiveMeshes, false);

  if (intersects.length > 0) {
    const hit = intersects[0].object;
    if (hoveredMesh !== hit) {
      clearHover();
      hoveredMesh = hit;

      if (hoveredMesh !== selectedMesh) {
        setMeshHighlight(hoveredMesh, true);
      }

      document.body.style.cursor = 'pointer';
    }

    // Position 3D screen-space tag
    const point = intersects[0].point;
    updateScreenTag(point, hit.userData.metadata.title);
  } else {
    if (hoveredMesh) {
      clearHover();
    }
  }
}

function clearHover() {
  if (hoveredMesh && hoveredMesh !== selectedMesh) {
    setMeshHighlight(hoveredMesh, false);
  }
  hoveredMesh = null;
  document.body.style.cursor = 'default';
  if (screenTag) screenTag.classList.remove('visible');
}

function setMeshHighlight(mesh, isHighlighted) {
  if (!mesh || !mesh.material) return;
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  mats.forEach((mat) => {
    if (mat.emissive) {
      if (isHighlighted) {
        mat.emissive.copy(highlightEmissive);
        mat.emissiveIntensity = 0.35;
      } else {
        mat.emissive.copy(mesh.userData.defaultEmissive || new THREE.Color(0x000000));
        mat.emissiveIntensity = 0;
      }
    }
  });
}

function updateScreenTag(worldPos, title) {
  if (!screenTag || !tagTitle) return;
  const screenPos = worldPos.clone().project(camera);

  if (screenPos.z > 1) {
    screenTag.classList.remove('visible');
    return;
  }

  const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;

  screenTag.style.left = `${x}px`;
  screenTag.style.top = `${y}px`;
  tagTitle.textContent = title;
  screenTag.classList.add('visible');
}

window.addEventListener('pointerup', (e) => {
  // If the user was dragging or scrolling with touch, ignore selection
  if (isDragMove) return;

  if (e.target.closest('.studio-deck') || e.target.closest('.site-header') || e.target.closest('.product-info-panel')) {
    return;
  }

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(interactiveMeshes, false);

  if (intersects.length > 0) {
    const clicked = intersects[0].object;

    if (selectedMesh === clicked) {
      selectPart(null); // Deselect on second click
    } else {
      selectPart(clicked);
    }
  } else {
    selectPart(null); // Click empty space deselects
  }
});

function selectPart(mesh) {
  if (selectedMesh) {
    setMeshHighlight(selectedMesh, false);
  }

  selectedMesh = mesh;

  if (selectedMesh) {
    setMeshHighlight(selectedMesh, true);

    const meta = selectedMesh.userData.metadata;
    if (partCategoryTag) partCategoryTag.textContent = meta.category;
    if (partTitle) partTitle.textContent = meta.title;
    if (partDesc) partDesc.textContent = meta.desc;
    if (specSelectedPart) specSelectedPart.textContent = meta.spec;
  } else {
    if (partCategoryTag) partCategoryTag.textContent = 'CHRONOGRAPH COMPONENT';
    if (partTitle) partTitle.textContent = 'KRONOS CHRONO-2000';
    if (partDesc) {
      partDesc.textContent =
        'Engineered with aerospace-grade stainless steel, dual articulated bracelet links, and high-contrast electro-luminescent digital display.';
    }
    if (specSelectedPart) specSelectedPart.textContent = 'NONE (CLICK PART)';
  }
}

// Double-click to focus camera on selected part
window.addEventListener('dblclick', (e) => {
  if (e.target.closest('.studio-deck') || e.target.closest('.site-header')) return;

  if (selectedMesh) {
    const box = new THREE.Box3().setFromObject(selectedMesh);
    const center = new THREE.Vector3();
    box.getCenter(center);

    gsap.to(controls.target, {
      x: center.x,
      y: center.y,
      z: center.z,
      duration: 1.1,
      ease: 'power2.inOut',
    });
  } else if (watchParts.root) {
    gsap.to(controls.target, {
      x: 0,
      y: 0.04,
      z: 0,
      duration: 1.1,
      ease: 'power2.inOut',
    });
  }
});

// ============================================================================
// 7. PRESENTATION: TURNTABLE & EXPLODED VIEW ANIMATIONS
// ============================================================================
let turntableActive = true;
const btnTurntable = document.getElementById('btn-turntable');
if (btnTurntable) {
  btnTurntable.addEventListener('click', () => {
    turntableActive = !turntableActive;
    btnTurntable.classList.toggle('active', turntableActive);
  });
}

let isExploded = false;
const btnExplode = document.getElementById('btn-explode');
if (btnExplode) {
  btnExplode.addEventListener('click', () => {
    isExploded = !isExploded;
    btnExplode.classList.toggle('active', isExploded);

    const tl = gsap.timeline({ defaults: { duration: 1.0, ease: 'power3.out' } });

    if (isExploded) {
      turntableActive = false;
      if (btnTurntable) btnTurntable.classList.remove('active');

      if (watchParts.glass) tl.to(watchParts.glass.position, { y: 0.12 }, 0);
      if (watchParts.strapA) tl.to(watchParts.strapA.position, { z: -0.15 }, 0);
      if (watchParts.strapB) tl.to(watchParts.strapB.position, { z: 0.15 }, 0);
      if (watchParts.clasp) tl.to(watchParts.clasp.position, { z: -0.28 }, 0);
    } else {
      interactiveMeshes.forEach((mesh) => {
        const def = defaultTransforms.get(mesh);
        if (def) tl.to(mesh.position, { x: def.position.x, y: def.position.y, z: def.position.z }, 0);
      });
    }
  });
}

// Camera Framing Presets
const cameraButtons = document.querySelectorAll('[data-cam]');
cameraButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    cameraButtons.forEach((b) => b.classList.remove('active'));
    const cfg = getResponsiveCameraConfig();
    const mode = btn.dataset.cam;
    if (mode === 'hero') {
      gsap.to(camera.position, { ...cfg.hero, duration: 1.2, ease: 'power2.inOut' });
      gsap.to(controls.target, { ...cfg.target, duration: 1.2, ease: 'power2.inOut' });
    } else if (mode === 'dial') {
      gsap.to(camera.position, { ...cfg.dial, duration: 1.2, ease: 'power2.inOut' });
      gsap.to(controls.target, { ...cfg.target, duration: 1.2, ease: 'power2.inOut' });
    } else if (mode === 'clasp') {
      gsap.to(camera.position, { ...cfg.clasp, duration: 1.2, ease: 'power2.inOut' });
      gsap.to(controls.target, { x: 0, y: -0.02, z: -0.3, duration: 1.2, ease: 'power2.inOut' });
    }
  });
});

// ============================================================================
// 8. MATERIAL & ALLOY FINISH PALETTE (Topic 1 & 7)
// ============================================================================
const FINISH_PALETTES = {
  silver: {
    metalColor: 0xd8dce4,
    metalness: 0.98,
    roughness: 0.22,
  },
  onyx: {
    metalColor: 0x242830,
    metalness: 0.85,
    roughness: 0.38,
  },
  gold: {
    metalColor: 0xdfb470,
    metalness: 0.95,
    roughness: 0.24,
  },
};

const swatchButtons = document.querySelectorAll('.color-swatch');
swatchButtons.forEach((swatch) => {
  swatch.addEventListener('click', () => {
    swatchButtons.forEach((s) => s.classList.remove('active'));
    swatch.classList.add('active');

    const palette = FINISH_PALETTES[swatch.dataset.colorway];
    if (!palette) return;

    interactiveMeshes.forEach((mesh) => {
      if (mesh === watchParts.glass) return;

      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        if (mat.color) {
          gsap.to(mat.color, {
            r: new THREE.Color(palette.metalColor).r,
            g: new THREE.Color(palette.metalColor).g,
            b: new THREE.Color(palette.metalColor).b,
            duration: 0.8,
            ease: 'power2.out',
          });
        }
        if (mat.metalness !== undefined) mat.metalness = palette.metalness;
        if (mat.roughness !== undefined) mat.roughness = palette.roughness;
      });
    });
  });
});

// ============================================================================
// 9. ANIMATION LOOP
// ============================================================================
function animate() {
  requestAnimationFrame(animate);

  controls.update();

  // Turntable smooth presentation rotation
  if (turntableActive && watchParts.root) {
    watchParts.root.rotation.y += 0.003;
  }

  handleHover();

  renderer.render(scene, camera);
}

animate();

// ============================================================================
// 10. RESPONSIVE RESIZE
// ============================================================================
window.addEventListener('resize', () => {
  const cfg = getResponsiveCameraConfig();
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = cfg.fov;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
