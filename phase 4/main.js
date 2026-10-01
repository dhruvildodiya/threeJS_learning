import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// --- Scene Setup ---
const canvas = document.getElementById('canvas') || (() => {
  const c = document.createElement('canvas');
  c.id = 'canvas';
  document.body.appendChild(c);
  return c;
})();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f111a);
scene.fog = new THREE.Fog(0x0f111a, 10, 30);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 1.6, 3.5);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// --- Controls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 1, 0);
controls.maxPolarAngle = Math.PI / 2 + 0.05; // Prevent camera going below ground
controls.minDistance = 1;
controls.maxDistance = 10;
controls.update();

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
dirLight.position.set(4, 8, 5);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 25;
dirLight.shadow.bias = -0.0005;
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0x88aaff, 1.0);
fillLight.position.set(-4, 4, -3);
scene.add(fillLight);

// --- Ground Plane & Grid ---
const floorGeo = new THREE.PlaneGeometry(30, 30);
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x181a24,
  roughness: 0.85,
  metalness: 0.1,
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const gridHelper = new THREE.GridHelper(30, 30, 0x4f46e5, 0x27273a);
gridHelper.position.y = 0.001;
scene.add(gridHelper);

// --- Animation State ---
let mixer = null;
const actions = {};
let activeAction = null;

// --- Model & Animation Loader ---
const gltfLoader = new GLTFLoader();

async function loadModelAndAnimations() {
  try {
    console.log('Loading avatar and animations...');

    // Load both files in parallel
    const [avatarGltf, animsGltf] = await Promise.all([
      gltfLoader.loadAsync('./avatar.glb'),
      gltfLoader.loadAsync('./animations.glb'),
    ]);

    const avatar = avatarGltf.scene;

    // Enable shadows on all meshes
    avatar.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material.envMapIntensity = 1;
        }
      }
    });

    scene.add(avatar);

    // Create AnimationMixer attached to the avatar root
    mixer = new THREE.AnimationMixer(avatar);

    // Combine animations from avatar.glb and animations.glb
    const allAnimations = [
      ...(avatarGltf.animations || []),
      ...(animsGltf.animations || []),
    ];

    console.log(`Loaded ${allAnimations.length} animation clips:`, allAnimations.map((a) => a.name));

    if (allAnimations.length > 0) {
      allAnimations.forEach((clip, index) => {
        const clipName = clip.name || `Animation_${index + 1}`;
        const action = mixer.clipAction(clip);
        actions[clipName] = action;
      });

      // Play the first animation by default
      const defaultClipName = Object.keys(actions)[0];
      activeAction = actions[defaultClipName];
      activeAction.play();
      console.log(`Playing default animation: "${defaultClipName}"`);
    } else {
      console.warn('No animation clips found in the provided files.');
    }

    // Helper function to fade between animations
    window.playAnimation = (name, duration = 0.3) => {
      const nextAction = actions[name];
      if (!nextAction || nextAction === activeAction) return;

      nextAction.reset();
      nextAction.fadeIn(duration);
      nextAction.play();

      if (activeAction) {
        activeAction.fadeOut(duration);
      }
      activeAction = nextAction;
      console.log(`Switched animation to: "${name}"`);

      // Update UI active state if present
      document.querySelectorAll('.anim-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.anim === name);
      });
    };

    // Expose actions to window for easy debugging/switching
    window.avatarActions = actions;

    // Create a floating UI panel for animation selection
    createAnimationUI(Object.keys(actions), defaultClipName);

  } catch (error) {
    console.error('Error loading GLTF models:', error);
  }
}

function createAnimationUI(animationNames, defaultClip) {
  if (document.getElementById('anim-controls-ui')) return;

  const container = document.createElement('div');
  container.id = 'anim-controls-ui';
  Object.assign(container.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '14px',
    padding: '16px',
    color: '#f8fafc',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '13px',
    zIndex: '1000',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
    maxWidth: '280px',
    width: '100%',
  });

  const title = document.createElement('div');
  title.innerHTML = `<strong>🎬 Animations (${animationNames.length})</strong>`;
  title.style.marginBottom = '12px';
  title.style.color = '#a5b4fc';
  title.style.letterSpacing = '0.02em';
  container.appendChild(title);

  const list = document.createElement('div');
  Object.assign(list.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    maxHeight: '340px',
    overflowY: 'auto',
  });

  animationNames.forEach((name) => {
    const btn = document.createElement('button');
    btn.className = 'anim-btn';
    btn.dataset.anim = name;
    btn.textContent = name;
    Object.assign(btn.style, {
      display: 'block',
      width: '100%',
      padding: '8px 12px',
      borderRadius: '8px',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      background: name === defaultClip ? '#6366f1' : 'rgba(255, 255, 255, 0.05)',
      color: '#fff',
      cursor: 'pointer',
      textAlign: 'left',
      fontSize: '12px',
      fontWeight: '500',
      transition: 'all 0.2s ease',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    });

    btn.onmouseenter = () => {
      if (btn.dataset.anim !== activeAction?.getClip().name) {
        btn.style.background = 'rgba(99, 102, 241, 0.3)';
      }
    };
    btn.onmouseleave = () => {
      if (btn.dataset.anim !== activeAction?.getClip().name) {
        btn.style.background = 'rgba(255, 255, 255, 0.05)';
      }
    };

    btn.onclick = () => {
      window.playAnimation(name);
      document.querySelectorAll('.anim-btn').forEach((b) => {
        b.style.background = b.dataset.anim === name ? '#6366f1' : 'rgba(255, 255, 255, 0.05)';
      });
    };

    list.appendChild(btn);
  });

  container.appendChild(list);
  document.body.appendChild(container);
}

loadModelAndAnimations();

// --- Window Resize Handling ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// --- Render Loop ---
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  if (mixer) {
    mixer.update(delta);
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();
