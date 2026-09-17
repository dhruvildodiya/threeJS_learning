# Three.js Mastery & WebGL Engineering

A curated repository exploring **Three.js**, **WebGL**, physically based rendering (PBR), mathematical transformations, interactive raycasting, and modern 3D graphics on the web powered by **Vite**.

---

## Table of Contents

- [Repository Architecture](#repository-architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Running Phase 1](#running-phase-1)
  - [Running Phase 2](#running-phase-2)
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
  - [Capstone Project: MERIDIAN Luxury Automatic Horology](#capstone-project-meridian-luxury-automatic-horology-finaljs)
- [Phase 2: Advanced Topics Workspace](#phase-2-advanced-topics-workspace)
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
    ├── index.html                      # Phase 2 entry HTML
    ├── main.js                         # Phase 2 starter with scene, camera, lights & controls
    ├── style.css                       # Phase 2 glassmorphism layout & theme
    ├── package.json                    # Phase 2 dependencies (Three.js, Vite)
    ├── vite.config.js                  # Phase 2 Vite dev server config (port 5174)
    └── .gitignore                      # Local ignore rules
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

## Phase 2: Advanced Topics Workspace

The [`phase 2`](file:///Users/ztlab82/Dhruvil/ThreeJS/phase%202) directory is a clean, modern development environment prepared for the next level of 3D web graphics:
- Built with **Vite** and the latest **Three.js**.
- Configured with a responsive full-screen canvas, dark mode styling, and glassmorphism HUD overlay.
- Pre-configured `OrbitControls`, directional and point lighting, shadows, and animation loop template.
- Ready for advanced topics such as custom GLSL shaders, post-processing pipelines, particle systems, GLTF model loading, and physics integration.

To run Phase 2:
```bash
cd "phase 2"
npm run dev
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

---

## License

This project is created for educational and practice purposes. Feel free to explore, learn, and build upon it!
