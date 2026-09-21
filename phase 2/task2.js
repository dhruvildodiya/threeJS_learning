import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ============================================================================
// 1. SCENE, CAMERA, RENDERER SETUP
// ============================================================================
const canvas = document.querySelector('#webgl-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f19);
scene.fog = new THREE.FogExp2(0x0b0f19, 0.04);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 3.8);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 1.0, 0);
controls.maxPolarAngle = Math.PI / 2 - 0.02; // Don't go below ground
controls.minDistance = 1.0;
controls.maxDistance = 12.0;
controls.update();

// Prevent browser context menu on right-click for smooth controls
window.addEventListener('contextmenu', (e) => e.preventDefault());

// ============================================================================
// 2. LIGHTING & ENVIRONMENT
// ============================================================================
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x334155, 1.4);
hemiLight.position.set(0, 20, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
dirLight.position.set(4, 8, 4);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 25;
dirLight.shadow.camera.left = -3;
dirLight.shadow.camera.right = 3;
dirLight.shadow.camera.top = 3;
dirLight.shadow.camera.bottom = -3;
dirLight.shadow.bias = -0.0005;
scene.add(dirLight);

// Subtle blue rim light for dramatic character edge illumination
const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
rimLight.position.set(-4, 3, -4);
scene.add(rimLight);

// Studio Grid Floor
const gridHelper = new THREE.GridHelper(30, 30, 0x38bdf8, 0x1e293b);
gridHelper.position.y = 0.001;
scene.add(gridHelper);

const floorGeo = new THREE.PlaneGeometry(60, 60);
const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.85,
    metalness: 0.1
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// ============================================================================
// 3. ANIMATION MIXER & SKELETAL RIG VARIABLES
// ============================================================================
let mixer = null;
let currentAction = null;
let animationClip = null;
let skeletonHelper = null;
let isScrubbing = false;

// Loop modes cycling: LoopRepeat -> LoopOnce -> LoopPingPong
const loopModes = [
    { mode: THREE.LoopRepeat, label: "🔁 Loop: Repeat" },
    { mode: THREE.LoopOnce, label: "⏹ Loop: Once" },
    { mode: THREE.LoopPingPong, label: "🏓 Loop: PingPong" }
];
let currentLoopIndex = 0;

// UI Elements
const btnPlay = document.getElementById("btn-play");
const btnPause = document.getElementById("btn-pause");
const btnStop = document.getElementById("btn-stop");
const btnToggleSkeleton = document.getElementById("btn-toggle-skeleton");
const btnLoopMode = document.getElementById("btn-loop-mode");
const btnResetCam = document.getElementById("btn-reset-cam");
const timelineSlider = document.getElementById("timeline-scrubber");
const timeDisplay = document.getElementById("time-display");
const speedSlider = document.getElementById("speed-slider");
const speedDisplay = document.getElementById("speed-display");
const badgeState = document.getElementById("badge-playback-state");
const badgeClipName = document.getElementById("badge-clip-name");

// ============================================================================
// 4. LOAD SKELETAL MODEL & INITIALIZE ANIMATION ACTION
// ============================================================================
const loader = new GLTFLoader();
const modelPath = './models/Standing Run Forward/Standing Run Forward.gltf';

console.log('⏳ Loading Skeletal Model from:', modelPath);

loader.load(
    modelPath,
    (gltf) => {
        const character = gltf.scene;
        console.log("gltf" , gltf)
        // Mixamo models are exported in centimeters (height ~180 units = 180 meters!).
        // Scale down to human scale in Three.js meters (height ~1.8m)
        character.scale.setScalar(0.01);
        scene.add(character);

        // Center and cast shadows on skinned meshes
        character.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // Create SkeletonHelper to visualize bone hierarchy
        skeletonHelper = new THREE.SkeletonHelper(character);
        skeletonHelper.material.linewidth = 2;
        skeletonHelper.visible = false;
        scene.add(skeletonHelper);

        // 1. Instantiate AnimationMixer bound to the character hierarchy root
        mixer = new THREE.AnimationMixer(character);

        // 2. Extract AnimationClip tracks
        if (gltf.animations && gltf.animations.length > 0) {
            animationClip = gltf.animations[0];
            console.log("Animation clip" , animationClip)
            console.log(`🎬 Clip Loaded: "${animationClip.name}", Duration: ${animationClip.duration.toFixed(2)}s`);

            if (badgeClipName) {
                badgeClipName.textContent = `Clip: ${animationClip.name}`;
            }

            // 3. Create AnimationAction controller from the clip
            currentAction = mixer.clipAction(animationClip);
            currentAction.setLoop(loopModes[currentLoopIndex].mode);
            currentAction.clampWhenFinished = true; // Stay in last frame if LoopOnce
            currentAction.play();

            updatePlaybackUIState("PLAYING");
        } else {
            console.warn('⚠️ No animation clips found inside the model.');
        }
    },
    (progress) => {
        if (progress.total > 0) {
            console.log(`Loading Model: ${Math.round((progress.loaded / progress.total) * 100)}%`);
        }
    },
    (error) => {
        console.error('❌ Failed to load model:', error);
    }
);

// ============================================================================
// 5. INTERACTIVE PLAYBACK CONTROLS (Play, Pause, Stop, Scrub, Speed, Loop)
// ============================================================================
function updatePlaybackUIState(state) {
    if (badgeState) badgeState.textContent = `STATE: ${state}`;
    btnPlay.classList.toggle("active", state === "PLAYING");
    btnPause.classList.toggle("active", state === "PAUSED");
    btnStop.classList.toggle("active", state === "STOPPED");
}

// Play
btnPlay?.addEventListener("click", () => {
    if (!currentAction) return;
    if (currentAction.paused) {
        currentAction.paused = false;
    } else {
        currentAction.reset();
        currentAction.play();
    }
    updatePlaybackUIState("PLAYING");
});

// Pause
btnPause?.addEventListener("click", () => {
    if (!currentAction) return;
    currentAction.paused = true;
    updatePlaybackUIState("PAUSED");
});

// Stop
btnStop?.addEventListener("click", () => {
    if (!currentAction) return;
    currentAction.stop();
    if (timelineSlider) timelineSlider.value = 0;
    if (timeDisplay && animationClip) {
        timeDisplay.textContent = `0.00s / ${animationClip.duration.toFixed(2)}s`;
    }
    updatePlaybackUIState("STOPPED");
});

// Toggle Skeleton Bones Overlay
btnToggleSkeleton?.addEventListener("click", () => {
    if (!skeletonHelper) return;
    skeletonHelper.visible = !skeletonHelper.visible;
    btnToggleSkeleton.classList.toggle("active", skeletonHelper.visible);
});

// Cycle Loop Modes (Repeat -> Once -> PingPong)
btnLoopMode?.addEventListener("click", () => {
    if (!currentAction) return;
    currentLoopIndex = (currentLoopIndex + 1) % loopModes.length;
    const nextLoop = loopModes[currentLoopIndex];
    currentAction.setLoop(nextLoop.mode);
    btnLoopMode.textContent = nextLoop.label;
    currentAction.reset().play();
    updatePlaybackUIState("PLAYING");
});

// Speed Multiplier
speedSlider?.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    if (speedDisplay) speedDisplay.textContent = `${val.toFixed(2)}x`;
    if (currentAction) {
        currentAction.timeScale = val;
    }
});

// Timeline Scrubbing via AnimationMixer
timelineSlider?.addEventListener("mousedown", () => { isScrubbing = true; });
timelineSlider?.addEventListener("touchstart", () => { isScrubbing = true; });

timelineSlider?.addEventListener("input", (e) => {
    if (!currentAction || !animationClip) return;
    const progress = parseFloat(e.target.value);
    const targetTime = progress * animationClip.duration;
    
    currentAction.paused = true;
    currentAction.time = targetTime;
    mixer.update(0); // Force immediate skeletal deformation update to scrubbed frame

    if (timeDisplay) {
        timeDisplay.textContent = `${targetTime.toFixed(2)}s / ${animationClip.duration.toFixed(2)}s`;
    }
    updatePlaybackUIState("PAUSED");
});

timelineSlider?.addEventListener("mouseup", () => { isScrubbing = false; });
timelineSlider?.addEventListener("touchend", () => { isScrubbing = false; });

// Reset Camera
btnResetCam?.addEventListener("click", () => {
    camera.position.set(0, 1.6, 3.8);
    controls.target.set(0, 1.0, 0);
    controls.update();
});

// Keyboard shortcuts
window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
        e.preventDefault();
        if (!currentAction) return;
        if (currentAction.paused || !currentAction.isRunning()) {
            btnPlay.click();
        } else {
            btnPause.click();
        }
    } else if (e.code === "KeyB") {
        btnToggleSkeleton.click();
    }
});

// ============================================================================
// 6. ANIMATION RENDER LOOP (THREE.Clock delta drives mixer)
// ============================================================================
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    // Delta time in seconds between current and previous frame
    const delta = clock.getDelta();

    // Advance AnimationMixer playback
    if (mixer && !isScrubbing) {
        mixer.update(delta);

        // Keep timeline slider synced with current clip playback time
        if (currentAction && animationClip && currentAction.isRunning()) {
            const currentTime = currentAction.time % animationClip.duration;
            const progress = currentTime / animationClip.duration;

            if (timelineSlider) timelineSlider.value = progress;
            if (timeDisplay) {
                timeDisplay.textContent = `${currentTime.toFixed(2)}s / ${animationClip.duration.toFixed(2)}s`;
            }
        }
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
