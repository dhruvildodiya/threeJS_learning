# Three.js Mastery & WebGL Engineering

A curated repository exploring **Three.js**, **WebGL**, physically based rendering (PBR), mathematical transformations, interactive raycasting, and modern 3D graphics on the web powered by **Vite**.

---

## Table of Contents

- [Repository Architecture](#repository-architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Running Phase 1](#running-phase-1)
  - [Running Phase 2](#running-phase-2)
  - [Running Phase 6](#running-phase-6)
- [Phase 1: Deep Dive, Tasks & Mini Projects](#phase-1-deep-dive-tasks--mini-projects)
  - [Foundational Tasks (1 to 10)](#foundational-tasks-1-to-10)
    - [Task 1: Core WebGL Setup & Canvas Initialization](#task-1-core-webgl-setup--canvas-initialization-task1js)
    - [Task 2: Ground Plane, Coordinates & Basic Lighting](#task-2-ground-plane-coordinates--basic-lighting-task2js)
    - [Task 3: Geometries & Materials Grid](#task-3-geometries--materials-grid-task3js)
    - [Task 4: Hierarchical Scene Graphs & Modular Vehicle](#task-4-hierarchical-scene-graphs--modular-vehicle-task4js)
    - [Task 5: Studio 3-Point Lighting & Shadow Maps](#task-5-studio-3-point-lighting--shadow-maps-task5js)
    - [Task 6: PBR Materials & Environment Reflections](#task-6-pbr-materials--environment-reflections-task6js)
    - [Task 7: Perspective Camera & Optical Principles Masterclass](#task-7-perspective-camera--optical-principles-masterclass-task7js)
    - [Task 8: Animation Loop & Frame-Rate Independence](#task-8-animation-loop--frame-rate-independence-task8js)
    - [Task 9: Vector3 & Euler 3D Mathematics Masterclass](#task-9-vector3--euler-3d-mathematics-masterclass-task9js)
    - [Task 10: Raycasting & 3D User Interaction Masterclass](#task-10-raycasting--3d-user-interaction-masterclass-task10js)
  - [Advanced Studio & Material Showcase](#advanced-studio--material-showcase-physicalmaterialjs)
  - [Mini Projects](#mini-projects)
    - [Mini Project 1: Real-World Material Physics Showcase](#mini-project-1-real-world-material-physics-showcase-mini1js)
    - [Mini Project 2: Interactive 3D Orbit & Selection Scene](#mini-project-2-interactive-3d-orbit--selection-scene-mini2js)
    - [Mini Project 3: Optimized 60 FPS Night/Dusk Atmospheric Scene](#mini-project-3-optimized-60-fps-nightdusk-atmospheric-scene-mini3js)
  - [Capstone Project: MERIDIAN Luxury Automatic Horology](#capstone-project-watch-luxury-automatic-horology-finaljs)
- [Phase 2: Production-Oriented 3D Engineering Curriculum (Modules 1–13)](#phase-2-production-oriented-3d-engineering-curriculum-modules-113)
  - [1. GLTF / GLB 3D Model Loading](#1-gltf--glb-3d-model-loading)
  - [2. OrbitControls & Camera Controls](#2-orbitcontrols--camera-controls)
  - [3. Advanced Raycasting & Object Interaction](#3-advanced-raycasting--object-interaction)
  - [4. 3D Object Transformation & Manipulation (`task1.js`)](#4-3d-object-transformation--manipulation-task1js)
  - [5. Animation Systems & GSAP Timelines (`task1.js`)](#5-animation-systems--gsap-timelines-task1js)
  - [6. AnimationMixer & Skeletal Animation (`task2.js`)](#6-animationmixer--skeletal-animation-task2js)
  - [7. Environment & HDRI Lighting (`task3.js`)](#7-environment--hdri-lighting-task3js)
  - [8. Post-Processing Effects & Composer (`task4.js`)](#8-post-processing-effects--composer-task4js)
  - [9. Advanced Materials & Custom GLSL Shaders (`task5.js`)](#9-advanced-materials--custom-glsl-shaders-task5js)
  - [10. 3D Performance Optimization](#10-3d-performance-optimization)
  - [11. InstancedMesh & Large Object Rendering (`task6.js`)](#11-instancedmesh--large-object-rendering-task6js)
  - [12. Scene Management & Reusable Components (`phase 1/src/`)](#12-scene-management--reusable-components-phase-1src)
  - [13. Scroll-Based 3D Experiences](#13-scroll-based-3d-experiences)
- [Phase 6: Audio Reactivity & Web Audio API](#phase-6-audio-reactivity--web-audio-api)
  - [Architecture & The Audio Graph](#architecture--the-audio-graph)
  - [Day 1: Web Audio API Fundamentals (`day1.js`)](#day-1-web-audio-api-fundamentals-day1js)
  - [Day 2: Audio Analysis & FFT (`day2.js`)](#day-2-audio-analysis--fft-day2js)
  - [Frequency Ranges & 3D Mapping](#frequency-ranges--3d-mapping)
  - [Switching Days in Phase 6](#switching-days-in-phase-6)
- [Asset Pipeline & Automation](#asset-pipeline--automation)
- [Switching Active Scenes in Phase 1](#switching-active-scenes-in-phase-1)
- [UI & Styling Aesthetics](#ui--styling-aesthetics)
- [Scripts Reference](#scripts-reference)

---

## Repository Architecture

The repository is structured into distinct phases, each maintained as a standalone Vite-powered workspace:

```text
ThreeJS/
├── README.md                           # Master documentation
│
├── phase 1/                            # Phase 1: Fundamentals, Tasks & Projects
│   ├── index.html                      # Entry HTML with canvas and HUD controls
│   ├── style.css                       # Modern glassmorphism UI overlay
│   ├── package.json                    # Phase 1 dependencies (Three.js v0.174.0, Vite v6.2.0, Sharp)
│   ├── vite.config.js                  # Phase 1 Vite configuration
│   │
│   ├── task1.js                        # Task 1: Basic scene, wireframe sphere, camera setup
│   ├── task2.js                        # Task 2: Ground plane, cube, ambient & directional lighting
│   ├── task3.js                        # Task 3: Geometries & materials comparative grid
│   ├── task4.js                        # Task 4: Modular hierarchical vehicle assembly
│   ├── task5.js                        # Task 5: 3-point studio lighting & shadow mapping
│   ├── task6.js                        # Task 6: PBR materials & RoomEnvironment reflections
│   ├── task7.js                        # Task 7: PerspectiveCamera optics, FOV & clipping
│   ├── task8.js                        # Task 8: requestAnimationFrame, clock delta & animation loops
│   ├── task9.js                        # Task 9: Vector3 math (dot, cross, lerp, normalize) & Euler
│   ├── task10.js                       # Task 10: Raycasting, pointer coordinates & 3D picking
│   │
│   ├── physicalMaterial.js             # Advanced: Photorealistic PBR studio & interactive cursor tracker
│   ├── mini1.js                        # Mini Project 1: Real-world physical materials showcase
│   ├── mini2.js                        # Mini Project 2: Interactive selection, hover & camera dolly
│   ├── mini3.js                        # Mini Project 3: Performance-tuned 60 FPS atmospheric dusk scene
│   ├── final.js                        # Capstone: MERIDIAN precision luxury watch configurator
│   │
│   ├── generate_pbr_maps.js            # Node/Sharp pipeline for roughness, normal & bump maps
│   ├── optimize_textures.js            # Automated image optimization script
│   └── textures/                       # PBR texture maps (color, normal, roughness, metallic)
│
└── phase 2/                            # Phase 2: Advanced 3D WebGL Workspace
    ├── index.html                      # Phase 2 entry HTML with interactive HUD
    ├── style.css                       # Modern dark glassmorphism styling & dashboards
    ├── package.json                    # Phase 2 dependencies (Three.js, Vite, GSAP)
    ├── vite.config.js                  # Phase 2 Vite dev server config (port 5174)
    ├── HDRI/                           # High Dynamic Range equirectangular environments
    ├── models/                         # GLTF / GLB assets & Mixamo animated rigs
    │
    ├── task1.js                        # Task 1: 3D Object manipulation, GSAP animations & shooting range
    ├── task2.js                        # Task 2: Skeletal rigging & THREE.AnimationMixer studio
    ├── task3.js                        # Task 3: PBR materials & HDRI showroom (PMREM)
    ├── task4.js                        # Task 4: Post-processing pipeline (Bloom, Outline, Vignette)
    ├── task5.js                        # Task 5: Custom GLSL ShaderMaterials (Waves, Dissolve, Shield, Gradient)
    └── task6.js                        # Task 6: InstancedMesh (~2,300 pillars), Spring physics & OnBeforeCompile
│
├── phase 6/                            # Phase 6: Audio Reactivity & Web Audio API
│   ├── index.html                      # Entry HTML with live oscilloscope & meter HUD
│   ├── style.css                       # Modern dark glassmorphism visualizer UI
│   ├── package.json                    # Phase 6 dependencies (Three.js v0.174.0, Vite)
│   ├── vite.config.js                  # Phase 6 Vite dev server config (port 5177)
│   ├── public/                         # Static audio assets
│   │   └── The Rare Occasions - Notion.mp3
│   ├── day1.js                         # Day 1: AudioContext, GainNode, AudioBuffer, volume & playback
│   └── day2.js                         # Day 2: AnalyserNode, FFT, frequency bands & oscilloscope
│
└── final/                              # Final Project: Production-grade Three.js Application
    ├── index.html                      # Entry HTML with canvas & interactive HUD
    ├── style.css                       # Sleek dark glassmorphism design system
    ├── package.json                    # Three.js (v0.186.0), GSAP (v3.15.0), Lenis (v1.3.26)
    ├── vite.config.js                  # Vite dev server config (port 5180)
    ├── public/                         # Public asset directory
    └── src/                            # Modular ES6 architecture (scenes, cameras, lights, models, etc.)
```

---

## Tech Stack

- **3D Graphics Engine:** [Three.js](https://threejs.org/) (`v0.174.0` in Phase 1, `v0.186.0+` in Phase 2)
- **Build Tool & Bundler:** [Vite](https://vitejs.dev/) with Instant HMR
- **Controls & Addons:** `OrbitControls`, `RoomEnvironment`, `PMREMGenerator`
- **Asset Processing:** [Sharp](https://sharp.pixelplumbing.com/) for automated texture compression and PBR map synthesis
- **UI Design System:** Glassmorphism with modern typography (`Inter`, `Outfit`, `JetBrains Mono`)

---

## Getting Started

Make sure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### Running Phase 1

```bash
cd "phase 1"
npm install
npm run dev
```
Phase 1 will start at `http://localhost:5173` (or the URL printed in the terminal).

### Running Phase 2

```bash
cd "phase 2"
npm install
npm run dev
```
Phase 2 will start at `http://localhost:5174` with hot module replacement (HMR) ready for development.

### Running Phase 6

```bash
cd "phase 6"
npm install
npm run dev
```
Phase 6 will start at `http://localhost:5177` (or the URL printed in the terminal).

---

## Phase 1: Deep Dive, Tasks & Mini Projects

Phase 1 covers the progression from foundational WebGL concepts to advanced procedural engineering and physical material simulation.

### Foundational Tasks (1 to 10)

#### Task 1: Core WebGL Setup & Canvas Initialization (`task1.js`)
- **Key Concepts:** Initializing `THREE.Scene`, `THREE.PerspectiveCamera`, and `THREE.WebGLRenderer`.
- **Key Highlights:** Wireframe sphere geometry, canvas sizing, aspect ratio handling, and initial render loop.

#### Task 2: Ground Plane, Coordinates & Basic Lighting (`task2.js`)
- **Key Concepts:** Spatial orientation and light-responsive surfaces.
- **Key Highlights:** Flat ground plane transformed along the X-axis (`-Math.PI / 2`), mesh cubes, `THREE.AmbientLight`, and `THREE.DirectionalLight`.

#### Task 3: Geometries & Materials Grid (`task3.js`)
- **Key Concepts:** Comprehensive comparison of Three.js primitive geometries and standard materials.
- **Geometries:** `BoxGeometry`, `SphereGeometry`, `PlaneGeometry`, `CylinderGeometry`, `ConeGeometry`, `TorusGeometry`, `RingGeometry`.
- **Materials:** `MeshBasicMaterial` (wireframe), `MeshPhongMaterial` (specular highlights, shininess, emissive), `MeshStandardMaterial` (PBR roughness/metalness), and `MeshPhysicalMaterial`.

#### Task 4: Hierarchical Scene Graphs & Modular Vehicle (`task4.js`)
- **Key Concepts:** Object grouping and parent-child matrix transformations.
- **Key Highlights:** Modular car model constructed from `THREE.Group` containing chassis, cabin, tinted glass windshields, wheels, rims, and headlights with rotational animation.

#### Task 5: Studio 3-Point Lighting & Shadow Maps (`task5.js`)
- **Key Concepts:** Professional studio lighting design and shadow calculation.
- **Key Highlights:**
  - Key Light (primary directional light casting sharp/soft shadows).
  - Fill Light (cooler ambient balance to soften harsh contrast).
  - Rim/Back Light (silhouette separation from the background).
  - Shadow map configuration with `renderer.shadowMap.enabled = true` and `PCFSoftShadowMap`.

#### Task 6: PBR Materials & Environment Reflections (`task6.js`)
- **Key Concepts:** Physically Based Rendering principles and image-based lighting (IBL).
- **Key Highlights:** `RoomEnvironment` with `PMREMGenerator`, metalness-roughness workflow, and environmental reflection mapping.

#### Task 7: Perspective Camera & Optical Principles Masterclass (`task7.js`)
- **Key Concepts:** Camera frustum optics and lens properties.
- **Key Highlights:**
  - Field of view (FOV) dynamics: wide-angle perspective distortion vs telephoto focal compression.
  - Near and Far clipping plane boundaries and z-fighting prevention.
  - Target tracking with `camera.lookAt()` and responsive projection matrix updates (`updateProjectionMatrix()`).

#### Task 8: Animation Loop & Frame-Rate Independence (`task8.js`)
- **Key Concepts:** The WebGL render pipeline and timing precision.
- **Key Highlights:**
  - `requestAnimationFrame` lifecycle.
  - `THREE.Clock` delta time (`clock.getDelta()`) vs elapsed time (`clock.getElapsedTime()`).
  - Guaranteeing uniform animation speed across 60 Hz, 120 Hz, and 144 Hz displays.
  - Harmonic wave oscillations (`Math.sin()`), pulsing scale, and multi-axis planetary orbital velocity.

#### Task 9: Vector3 & Euler 3D Mathematics Masterclass (`task9.js`)
- **Key Concepts:** Linear algebra and 3D vector operations for game/graphics engines.
- **Key Highlights:**
  - Vector Subtraction: Direction vectors ($\vec{d} = \vec{B} - \vec{A}$).
  - Vector Distance & Normalization: Unit vectors via `.normalize()`.
  - Scaled Vector Addition: Smooth pursuit physics (`addScaledVector()`).
  - Dot Product: Angle calculation and facing direction evaluation.
  - Cross Product: Orthogonal vectors for surface orientation and camera alignment.

#### Task 10: Raycasting & 3D User Interaction Masterclass (`task10.js`)
- **Key Concepts:** Mouse-to-world projection and collision detection.
- **Key Highlights:**
  - Normalized Device Coordinates (NDC) conversion from screen space $(x, y) \in [-1, 1]$.
  - `THREE.Raycaster` ray projection through the camera frustum.
  - Intersection payloads: `.object`, `.point` (hit coordinates in world space), `.distance`, and `.face`.
  - Interactive hover state detection and click-selection highlights.

---

### Advanced Studio & Material Showcase (`physicalMaterial.js`)

- **Focus:** Studio-grade photorealism and interactive lighting.
- **Key Highlights:**
  - **HDR Environment Lighting:** Pre-filtered environment mapping using `RoomEnvironment` and `PMREMGenerator`.
  - **Tone Mapping:** `THREE.ACESFilmicToneMapping` with precision exposure compensation.
  - **3-Point Studio Rig:** Key, cyan fill, and warm rim lights paired with debug helpers.
  - **Interactive Cursor Spotlight:** Spotlight and luminous orb that tracks the user's mouse position with smooth lerp interpolation across 3D space.
  - **Showcase Materials:** Frosted refractive glass, metallic gold bar, clearcoat spheres, and carbon-fiber textures.

---

### Mini Projects

#### Mini Project 1: Real-World Material Physics Showcase (`mini1.js`)
- Dedicated gallery pedestals displaying real-world material simulations:
  - Architectural blueprint wireframe (`MeshBasicMaterial`).
  - Surface normal geometry vectors (`MeshNormalMaterial`).
  - Matte terracotta clay (`MeshLambertMaterial`).
  - Glossy molded acrylic with specular highlights (`MeshPhongMaterial`).
  - Stylized cel resin shading (`MeshToonMaterial`).
  - 24K polished gold with accurate dielectric albedo (`MeshStandardMaterial`).
  - Automotive metallic lacquer with clearcoat (`MeshPhysicalMaterial`).
  - Refractive crown glass with transmission and index of refraction ($IOR = 1.52$).
  - Custom crystal geometry with raw `Float32Array` vertex buffers and computed normals.

#### Mini Project 2: Interactive 3D Orbit & Selection Scene (`mini2.js`)
- Complete interactive 3D scene implementing:
  - Raycaster-driven hover detection and mouse click selection.
  - Dynamic visual highlight rings and object elevation on active selection.
  - Smooth camera dolly and focus lerping towards clicked meshes.
  - Deselect logic and animated restoration of camera position.

#### Mini Project 3: Optimized 60 FPS Night/Dusk Atmospheric Scene (`mini3.js`)
- High-performance atmospheric night/dusk scene tuned for consistent 60 FPS:
  - Optimized geometry and shadow configuration with `PCFShadowMap`.
  - Exponential fog (`THREE.FogExp2`) creating cinematic depth.
  - Custom lighting balance and smooth OrbitControls damping.

---

### Capstone Project: MERIDIAN Luxury Automatic Horology (`final.js`)

An interactive, procedurally constructed luxury mechanical watch configurator and showcase:
- **Procedural 3D Construction:** Watch case, knurled bezel, fluted crown, domed sapphire crystal, dial markers, sub-dials, date aperture, and articulated multi-link strap.
- **Precision Mechanical Animation:** Real-time synchronized clock hands (hour hand, minute hand, and continuous sweeping mechanical seconds hand).
- **Interactive Exploded View:** Smoothly animates internal watch components along their Z-axes to inspect engineered internal layers.
- **Turntable & Direct Manipulation:** Smooth continuous 360° turntable rotation with direct user drag interaction and camera zoom controls.
- **Lighting & Post-Processing:** ACES Filmic tone mapping, PCF soft shadows, and procedural studio reflections.

---

## Phase 2: Production-Oriented 3D Engineering Curriculum (Modules 1–13)

The goal of Phase 2 is to move developers from basic scene creation into production-oriented, high-performance 3D engineering. Below is the comprehensive 13-topic curriculum and how each topic is implemented in this repository.

---

### 1. GLTF / GLB 3D Model Loading
*Work with real-world 3D assets instead of creating everything from primitive Three.js geometries.*
- **Key Concepts:**
  - Differences between `.gltf` (JSON + external bin/textures) and `.glb` (binary self-contained container).
  - Asynchronous loading with `GLTFLoader` and progress/error callbacks.
  - Traversing scene graphs (`scene.traverse`) to access child meshes, compute bounding boxes, and configure shadows (`castShadow`, `receiveShadow`).
  - Hierarchical transforms, normalization, and scaling imported models into standard Three.js metric units.
- **Implementations in Repository:**
  - [`phase 2/task1.js`](file:///Users/ztlab82/Dhruvil/ThreeJS/phase%202/task1.js): Complex modular firearm model loaded and traversed into separate functional components (scope, barrel, bolt, trigger, magazine).
  - [`phase 2/task2.js`](file:///Users/ztlab82/Dhruvil/ThreeJS/phase%202/task2.js): Rigged humanoid character model (`Standing Run Forward.gltf`) with scale normalization ($0.01\times$).

---

### 2. OrbitControls & Camera Controls
*Provide users with intuitive, restricted, and physics-damped control over a 3D perspective camera.*
- **Key Concepts:**
  - Orbiting, panning, and zooming with inertial damping (`enableDamping: true`, `dampingFactor`).
  - Constraining camera bounds with `minDistance`, `maxDistance`, `minPolarAngle`, and `maxPolarAngle` (preventing camera clipping through ground planes).
  - Setting and animating `controls.target` to shift focal points between objects.
  - Coordinating between `OrbitControls` and direct manipulation gizmos without mouse-event collisions.
- **Implementations in Repository:**
  - [`phase 2/task2.js`](file:///Users/ztlab82/Dhruvil/ThreeJS/phase%202/task2.js), [`task3.js`](file:///Users/ztlab82/Dhruvil/ThreeJS/phase%202/task3.js), [`task4.js`](file:///Users/ztlab82/Dhruvil/ThreeJS/phase%202/task4.js): Damped orbit controls with auto-rotation and polar boundaries.
  - [`phase 1/src/cameras/CameraManager.js`](file:///Users/ztlab82/Dhruvil/ThreeJS/phase%201/src/cameras/CameraManager.js): Decoupled camera manager keeping studio stage lighting fixed while zooming and tracking.

---

### 3. Advanced Raycasting & Object Interaction
*Build rich 3D interaction pipelines beyond simple single-click detection.*
- **Key Concepts:**
  - Normalized Device Coordinates (NDC) conversion from pointer events.
  - Raycaster intersection against complex hierarchical groups and recursive children.
  - Multi-state interaction handling: `hover` (highlight/glow), `select` (dolly/focus), and `deselect`.
  - Storing and retrieving custom application metadata (`mesh.userData`).
- **Implementations in Repository:**
  - [`phase 2/task1.js`](file:///Users/ztlab82/Dhruvil/ThreeJS/phase%202/task1.js): 3D raycast ballistics with surface normal detection, decal projections, and interactive part selection.
  - [`phase 1/mini2.js`](file:///Users/ztlab82/Dhruvil/ThreeJS/phase%201/mini2.js): Hover detection, selection rings, and smooth camera dolly lerping.

---

### 4. 3D Object Transformation & Manipulation (`task1.js`)
*Enable direct manipulation of objects inside 3D space for configurators and scene editors.*
- **Key Concepts:**
  - Direct 3D gizmos with `TransformControls` (Translate, Rotate, Scale modes).
  - Local coordinate systems vs. World coordinate systems.
  - Grid and angular snapping increments for CAD-like precision.
  - Setting position boundaries and transformation clamps.
- **Implementations in Repository:**
  - [`phase 2/task1.js`](file:///Users/ztlab82/Dhruvil/ThreeJS/phase%202/task1.js): Full interactive 3D gizmo (`T` to toggle, `1/2/3` for modes, `G` for snapping, `W/A/S/D/Q/E` keyboard controls, and `R` to reset).

---

### 5. Animation Systems & GSAP Timelines (`task1.js`)
*Move from simple rotation animations to structured, multi-stage coordinated animation sequences.*
- **Key Concepts:**
  - Timeline-based choreography using **GSAP (GreenSock)** integrated with Three.js objects.
  - Multi-state animation machines (`IDLE`, `INSPECTING`, `RELOADING`, `EXPLODED`, `TURNTABLE`).
  - Storing default local transforms in a `Map` to enable reversible transitions and scrubbing.
  - Bidirectional timeline scrubbing via interactive HTML range sliders.
- **Implementations in Repository:**
  - [`phase 2/task1.js`](file:///Users/ztlab82/Dhruvil/ThreeJS/phase%202/task1.js): Multi-part GSAP timeline orchestrating inspection dollies, realistic reload mechanical cycles, and exploded assembly.

---

### 6. AnimationMixer & Skeletal Animation (`task2.js`)
*Work with skinned meshes and skeletal bone hierarchies included in GLTF/GLB models.*
- **Key Concepts:**
  - `THREE.AnimationMixer`, `AnimationClip`, and `AnimationAction`.
  - Play, pause, stop, and cross-fading between distinct animation states.
  - Playback rate manipulation (slow-motion to double speed) and loop modes (`LoopRepeat`, `LoopOnce`, `LoopPingPong`).
  - Visualizing skeletal bone structures using `THREE.SkeletonHelper`.
  - Manual timeline scrubbing synchronized with animation clip duration.
- **Implementations in Repository:**
  - [`phase 2/task2.js`](file:///Users/ztlab82/Dhruvil/ThreeJS/phase%202/task2.js): Full `AnimationMixer` studio controlling Mixamo skeletal runs, timeline scrubbing, speed control, and bone visualization.

---

### 7. Environment & HDRI Lighting (`task3.js`)
*Create photorealistic lighting using High Dynamic Range equirectangular environment maps.*
- **Key Concepts:**
  - Image-Based Lighting (IBL) with 32-bit `.hdr` files via `RGBELoader`.
  - Pre-filtered Environment Maps via `THREE.PMREMGenerator` for radiance and specular highlights.
  - Direct scene environment binding (`scene.environment`) and background blurriness (`scene.backgroundBlurriness`).
  - PBR response comparison across metals, crown glass, glossy plastic, and rough surfaces.
- **Implementations in Repository:**
  - [`phase 2/task3.js`](file:///Users/ztlab82/Dhruvil/ThreeJS/phase%202/task3.js): Interactive HDRI showroom with live shader controls for roughness, metalness, transmission, IOR, and background blur.

---

### 8. Post-Processing Effects & Composer (`task4.js`)
*Enhance rendered scenes with screen-space visual effects using `EffectComposer`.*
- **Key Concepts:**
  - Multi-pass post-processing pipeline replacing standard canvas rendering.
  - `RenderPass` (base scene), `UnrealBloomPass` (HDR bloom), `OutlinePass` (silhouette selection), `ShaderPass` with `VignetteShader`, and `OutputPass` (sRGB + tone mapping).
  - Balancing visual impact against performance overhead and GPU fill-rate.
- **Implementations in Repository:**
  - [`phase 2/task4.js`](file:///Users/ztlab82/Dhruvil/ThreeJS/phase%202/task4.js): Sci-fi cyber reactor showcase featuring dynamic bloom, hover outlines, cinematic vignette, and live FPS telemetry.

---

### 9. Advanced Materials & Custom GLSL Shaders (`task5.js`)
*Write custom GPU vertex and fragment shaders using GLSL to create effects beyond built-in materials.*
- **Key Concepts:**
  - Structure of a GLSL shader program: Vertex shader (positions) and Fragment shader (pixels).
  - Working with `Uniforms` (dynamic CPU-to-GPU data), `Attributes` (per-vertex data), and `Varyings` (interpolated vertex-to-fragment data).
  - Procedural trigonometric distortion, pixel discard (`discard`), and optical Fresnel rim glows.
- **Implementations in Repository:**
  - [`phase 2/task5.js`](file:///Users/ztlab82/Dhruvil/ThreeJS/phase%202/task5.js): 4 custom GLSL shaders (🌊 Water Waves, 🔥 Perlin Noise Dissolve, 🛡️ Holographic Forcefield, 🌈 Liquid Plasma Gradient) + procedural canvas noise generator.

---

### 10. 3D Performance Optimization
*Maintain solid 60 FPS performance as scenes increase in geometric and shader complexity.*
- **Key Concepts:**
  - Minimizing Draw Calls via geometry merging and instancing.
  - Texture optimization: Power-of-two resolutions, mipmapping, and Sharp automated compression.
  - Memory management: Explicitly disposing geometries, materials, textures, and composer passes (`dispose()`).
  - Clamping Device Pixel Ratio (`Math.min(window.devicePixelRatio, 2)`) to avoid mobile fill-rate bottlenecks.
  - Delta time clamping in render loops to prevent integration blowups.
- **Implementations in Repository:**
  - Used across all Phase 1 and Phase 2 scenes (`dispose` event handlers, DPR clamping, `DynamicDrawUsage` buffers).

---

### 11. InstancedMesh & Large Object Rendering (`task6.js`)
*Render thousands of identical or similar objects efficiently in a single draw call.*
- **Key Concepts:**
  - `THREE.InstancedMesh` rendering thousands of objects in 1 draw call instead of thousands.
  - Structure-of-Arrays (typed `Float32Array`) data layout for CPU cache optimization.
  - Patching standard PBR shaders via `material.onBeforeCompile` to inject custom per-instance vertex attributes (`aTint`, `aGlow`).
  - Analytic $O(1)$ picking: Computing grid cell indices mathematically without raycasting thousands of meshes.
  - Physics integration: Semi-implicit Euler damped harmonic oscillator spring model.
- **Implementations in Repository:**
  - [`phase 2/task6.js`](file:///Users/ztlab82/Dhruvil/ThreeJS/phase%202/task6.js): 2,304 animated pillars responding to cursor proximity and click shockwaves with bloom and screen-space projected HTML tooltips.

---

### 12. Scene Management & Reusable Components (`phase 1/src/`)
*Architect large-scale Three.js applications using modular ES6 classes, object factories, and configuration objects.*
- **Key Concepts:**
  - Separation of Concerns: Decoupling rendering, scene graph, materials, cameras, and DOM events.
  - Reusable 3D Components: Encapsulating complex hierarchies (e.g. `WatchCase`, `WatchDial`, `WatchStrap`) into standalone classes.
  - Centralized Configuration: Moving dimensions, color palettes, and lighting presets into configuration objects.
- **Implementations in Repository:**
  - [`phase 1/src/`](file:///Users/ztlab82/Dhruvil/ThreeJS/phase%201/src/): Complete refactor of the 860-line watch configurator into `config/`, `cameras/`, `lights/`, `materials/`, `scenes/`, `models/`, `interactions/`, `animations/`, and `main.js`.

---

### 13. Scroll-Based 3D Experiences
*Connect 3D scenes with traditional web interactions and landing page storytelling.*
- **Key Concepts:**
  - Fixed background canvas (`position: fixed`) paired with relative scroll sections (`100vh`).
  - Normalizing scroll progress ($0.0 \to 1.0$) across the document height or per section.
  - Inertial damping and linear interpolation (`lerp`) to ensure fluid, stutter-free camera dollies.
  - Section-based choreography and keyframe triggers using GSAP ScrollTrigger.
- **Implementations in Repository:**
  - Conceptual architecture, CSS layout guidelines, and code examples documented in master reference.

---

### Running Phase 2
```bash
cd "phase 2"
npm install
npm run dev
```

---

## Phase 6: Audio Reactivity & Web Audio API

Phase 6 introduces the browser's native **Web Audio API** and bridges audio frequency and waveform data into Three.js visual systems, particle engines, cameras, and GLSL shaders.

### Architecture & The Audio Graph

Audio processing in the Web Audio API operates as a directed routing graph:

```text
[ AudioBufferSourceNode ] ──► [ AnalyserNode (FFT) ] ──► [ GainNode (Volume) ] ──► [ Destination (Speakers) ]
  (Decoded Track in RAM)          (Pass-through FFT)           (gain.value)             (audioContext.destination)
```

---

### Day 1: Web Audio API Fundamentals (`day1.js`)
*Foundations of Web Audio nodes, audio buffer decoding, volume control, and playback lifecycle.*
- **Key Concepts:**
  - **`AudioContext`**: Master controller for clock timing, sample rate (44.1 kHz / 48 kHz), and node creation. Adheres to browser autoplay policies requiring user gestures (`click`) to resume from `'suspended'` state.
  - **`AudioBuffer`**: Uncompressed Float32 PCM audio data held in memory, decoded via `audioContext.decodeAudioData(arrayBuffer)`.
  - **`AudioBufferSourceNode`**: Lightweight, single-use player node that reads an `AudioBuffer` and streams sound into the graph (`.start(0)`, `.stop()`, `.loop = true`).
  - **`GainNode`**: Amplitude multiplier controlling volume (`gain.value = 0.0` to `1.0+`).
  - **Basic Audio Routing**: Constructing the linear pipeline `sourceNode.connect(gainNode); gainNode.connect(audioContext.destination);`.
- **Implementation:** [`phase 6/day1.js`](file:///Users/ztlab82/Dhruvil/ThreeJS/phase%206/day1.js)

---

### Day 2: Audio Analysis & FFT (`day2.js`)
*Extracting real-time spectral frequency data and time-domain waveforms.*
- **Key Concepts:**
  - **`AnalyserNode`**: Pass-through diagnostic node that takes real-time mathematical snapshots of audio without modifying what is heard.
  - **FFT (Fast Fourier Transform)**: Algorithm that splits complex sound waves into discrete frequency pitch buckets.
    - `analyser.fftSize = 1024` $\rightarrow$ yields `frequencyBinCount = 512` frequency bins.
    - `analyser.smoothingTimeConstant = 0.8` $\rightarrow$ provides smooth, organic visual interpolation without frame jitter.
  - **Time-Domain Waveform (`getByteTimeDomainData`)**: Physical air-pressure waveform values centered at `128` (ranging from `0` to `255`), rendered via 2D Canvas oscilloscope.
  - **Frequency Spectrum Data (`getByteFrequencyData`)**: Loudness levels per pitch bucket (ranging from `0` silent to `255` peak loudness).
- **Implementation:** [`phase 6/day2.js`](file:///Users/ztlab82/Dhruvil/ThreeJS/phase%206/day2.js)

---

### Frequency Ranges & 3D Mapping

At a $44,100\text{ Hz}$ sample rate and $\text{fftSize} = 1024$, each bin represents $\approx 43.06\text{ Hz}$ ($\frac{\text{sampleRate}}{\text{fftSize}}$):

| Frequency Range | FFT Bins | Musical Elements | Three.js Visual Mapping |
| :--- | :--- | :--- | :--- |
| **Bass** ($20 - 250\text{ Hz}$) | Bins $1 - 6$ | Kick drums, 808 sub-bass, bass guitars | Object scale, geometry displacement, shockwaves |
| **Mid** ($250 - 4000\text{ Hz}$) | Bins $6 - 92$ | Vocals, guitars, piano, synth leads | Object rotation, fluid vortices, camera sway |
| **High** ($4000 - 16000\text{ Hz}$) | Bins $92 - 370$ | Hi-hats, cymbals, snare snap, sibilance | Particle shimmers, glowing wireframes, neon strobes |
| **Overall Volume** | Full Spectrum | Total instantaneous track energy | Global bloom intensity, camera shake, ambient light |

---

### Switching Days in Phase 6

To switch the active script in Phase 6, open [`phase 6/index.html`](file:///Users/ztlab82/Dhruvil/ThreeJS/phase%206/index.html) and toggle the module script tag at the bottom of the body:

```html
<!-- Example: Run Day 1 (Web Audio API Fundamentals) -->
<!-- <script type="module" src="./day1.js"></script> -->

<!-- Example: Run Day 2 (Audio Analysis & FFT - Default) -->
<script type="module" src="./day2.js"></script>
```

---

## Asset Pipeline & Automation

Phase 1 includes automated Node.js scripts for processing 3D asset textures:
- **`generate_pbr_maps.js`**: Analyzes source images using Sharp and programmatically generates full PBR sets (diffuse/color, normal map, roughness map, and bump map).
- **`optimize_textures.js`**: Traverses texture directories, resizes oversized 4K/2K assets, and compresses them for optimal WebGL GPU memory and loading speeds.

---

## Switching Active Scenes in Phase 1

To switch the active script in Phase 1, open [`phase 1/index.html`](file:///Users/ztlab82/Dhruvil/ThreeJS/phase%201/index.html) and update the script import at the bottom of the body:

```html
<!-- Example: Run Task 10 (Raycasting Masterclass) -->
<script type="module" src="./task10.js"></script>

<!-- Example: Run Mini Project 1 (Material Physics Showcase) -->
<script type="module" src="./mini1.js"></script>

<!-- Example: Run Capstone Watch Project (Default) -->
<script type="module" src="./final.js"></script>
```

Save the file, and Vite will immediately hot-reload the scene in your browser.

---

## UI & Styling Aesthetics

Both Phase 1 and Phase 2 adhere to modern UI/UX design standards:
- Edge-to-edge canvas viewport (`#webgl-canvas`) with zero unwanted scrollbars.
- Frosted glassmorphism panels (`backdrop-filter: blur(16px)`).
- Curated typography from Google Fonts (`Inter`, `Outfit`, `JetBrains Mono`).
- Retina high-DPI scaling (`Math.min(window.devicePixelRatio, 2)`).

---

## Scripts Reference

### Phase 1 (`cd "phase 1"`)
| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts Phase 1 Vite development server |
| `npm run build` | Bundles Phase 1 for production |
| `npm run preview` | Previews Phase 1 production build |

### Phase 2 (`cd "phase 2"`)
| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts Phase 2 Vite dev server on port 5174 |
| `npm run build` | Bundles Phase 2 for production |
| `npm run preview` | Previews Phase 2 production build |

### Phase 6 (`cd "phase 6"`)
| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts Phase 6 Vite dev server on port 5177 |
| `npm run build` | Bundles Phase 6 for production |
| `npm run preview` | Previews Phase 6 production build |

### Final Project (`cd "final"`)
| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts Final Project Vite dev server on port 5180 |
| `npm run build` | Bundles Final Project for production |
| `npm run preview` | Previews Final Project production build |

---

## License

This project is created for educational and practice purposes. Feel free to explore, learn, and build upon it!
