# Three.js Mastery & WebGL Fundamentals

A curated repository exploring **Three.js**, **WebGL**, physically based rendering (PBR), and modern interactive 3D web graphics powered by **Vite**.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Modules & Learning Tasks](#modules--learning-tasks)
  - [Task 1: Core Setup & Fundamentals (`task1.js`)](#task-1-core-setup--fundamentals-task1js)
  - [Task 2: Ground Plane, Coordinates & Basic Lighting (`task2.js`)](#task-2-ground-plane-coordinates--basic-lighting-task2js)
  - [Task 3: Geometries & Materials Grid (`task3.js`)](#task-3-geometries--materials-grid-task3js)
  - [Task 4: Hierarchical Scene Graphs & Modular Car (`task4.js`)](#task-4-hierarchical-scene-graphs--modular-car-task4js)
  - [Advanced: Studio Photorealism & PBR Showcase (`physicalMaterial.js`)](#advanced-studio-photorealism--pbr-showcase-physicalmaterialjs)
- [Switching Active Scenes](#switching-active-scenes)
- [Styling & Aesthetics](#styling--aesthetics)
- [Scripts Reference](#scripts-reference)

---

## Overview

This repository demonstrates the step-by-step progression of mastering 3D graphics on the web with Three.js. It covers everything from initializing a WebGL viewport, building geometric primitives and lighting models, to composing complex parent-child mesh hierarchies and configuring studio-grade PBR (Physically Based Rendering) environments with WebGL tone mapping.

---

## Tech Stack

- **3D Graphics Engine:** [Three.js](https://threejs.org/) (`v0.174.0`)
- **Build Tool & Dev Server:** [Vite](https://vitejs.dev/) (`v6.2.0`)
- **Controls & Addons:** `OrbitControls`, `RoomEnvironment`
- **UI & Styling:** Vanilla CSS (Glassmorphism & Responsive Viewport)
- **Typography:** Google Fonts (`Outfit`, `JetBrains Mono`)

---

## Project Structure

```text
├── index.html              # Main HTML entry point containing #webgl-canvas
├── style.css               # Modern glassmorphic styles and fullscreen layout
├── package.json            # Project dependencies and npm scripts
├── .gitignore              # Ignored files (node_modules, build artifacts, OS files)
│
├── task1.js                # Task 1: Basic scene, sphere geometry, basic material & camera
├── task2.js                # Task 2: Ground plane, cube, ambient & directional lighting
├── task3.js                # Task 3: Multi-geometry showcase across varied materials
├── task4.js                # Task 4: Modular hierarchical vehicle with wheels, rims, cabin & glass
└── physicalMaterial.js     # Advanced: Photorealistic PBR studio, RoomEnvironment & mouse tracking
```

---

## Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### 1. Clone the repository
```bash
git clone <repository-url>
cd ThreeJS
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start the local development server
```bash
npm run dev
```
Open your browser and navigate to the local URL (usually `http://localhost:5173`).

---

## Modules & Learning Tasks

### Task 1: Core Setup & Fundamentals (`task1.js`)
* **Focus:** Establishing the WebGL pipeline.
* **Key Topics:**
  - Initializing `THREE.Scene`, `THREE.PerspectiveCamera`, and `THREE.WebGLRenderer`.
  - Creating a basic wireframe sphere (`THREE.SphereGeometry`, `THREE.MeshBasicMaterial`).
  - Handling viewport dimensions and window aspect ratio calculation.

### Task 2: Ground Plane, Coordinates & Basic Lighting (`task2.js`)
* **Focus:** Spatial orientation and illumination.
* **Key Topics:**
  - Creating a ground plane rotated along the X-axis (`-Math.PI / 2`).
  - Illuminating 3D meshes using `THREE.AmbientLight` and `THREE.DirectionalLight`.
  - Switching to `THREE.MeshStandardMaterial` for light-responsive surfaces.
  - Setting camera positions and aiming with `camera.lookAt()`.

### Task 3: Geometries & Materials Grid (`task3.js`)
* **Focus:** Comparing geometry types and material properties.
* **Geometries Demonstrated:** `BoxGeometry`, `SphereGeometry`, `PlaneGeometry`, `CylinderGeometry`, `ConeGeometry`, `TorusGeometry`, `RingGeometry`.
* **Materials Demonstrated:**
  - `MeshBasicMaterial` (unlit, wireframe mode)
  - `MeshPhongMaterial` (specular highlights, shininess, emissive tints)
  - `MeshStandardMaterial` (PBR roughness, metalness, transparency, double-sided rendering)
  - `MeshPhysicalMaterial` (clearcoat and transmission effects)
* Integrated with `OrbitControls` for full 360-degree inspection.

### Task 4: Hierarchical Scene Graphs & Modular Car (`task4.js`)
* **Focus:** Grouping, parent-child transformations, and composite objects.
* **Key Topics:**
  - Building an assembly using a top-level `THREE.Group`.
  - Constructing car chassis, cabin, tinted glass windshields, wheels, silver rims, and headlights.
  - Applying relative positioning: moving or rotating the root group moves all sub-parts cohesively.
  - Dynamic wheel rotation animation in `requestAnimationFrame`.

### Advanced: Studio Photorealism & PBR Showcase (`physicalMaterial.js`)
* **Focus:** Production-grade studio environment and physically based rendering.
* **Key Topics:**
  - **HDR Environment Lighting:** Utilizes `RoomEnvironment` pre-filtered with `PMREMGenerator` for reflections.
  - **Tone Mapping:** Employs `THREE.ACESFilmicToneMapping` with exposure balancing.
  - **Lighting Setup:** 3-point studio lighting (Key, Cool Cyan Fill, and Warm Violet Rim lights) with visual helpers (`DirectionalLightHelper`, `PointLightHelper`).
  - **Interactive Cursor Tracking:** Spotlight and glowing tracker orb following cursor movement across 3D space with smooth lerping.
  - **Showcase Models:** Includes frosted glass, metallic gold bar, carbon-fiber textured surfaces, clearcoat spheres, and animated orbiting light orbs.

---

## Switching Active Scenes

To view a specific task or scene, update the script tag in [`index.html`](file:///Users/ztlab82/Dhruvil/ThreeJS/index.html):

```html
<!-- Example: Run Task 3 (Geometries & Materials Grid) -->
<script type="module" src="./task3.js"></script>

<!-- Example: Run Task 4 (Hierarchical Modular Car) -->
<script type="module" src="./task4.js"></script>

<!-- Example: Run Advanced Studio Photorealism Showcase -->
<script type="module" src="./physicalMaterial.js"></script>
```

Save the file, and Vite will immediately hot-reload the changes in your browser.

---

## Styling & Aesthetics

The UI styling in [`style.css`](file:///Users/ztlab82/Dhruvil/ThreeJS/style.css) provides:
- Edge-to-edge canvas sizing (`#webgl-canvas`) with zero scrollbars.
- Frosted glassmorphism panels (`backdrop-filter: blur(16px)`).
- Premium typography using the `Outfit` and `JetBrains Mono` typefaces.
- Responsive layout handling high-DPI (Retina) screen pixel ratios.

---

## Scripts Reference

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite development server with instant HMR |
| `npm run build` | Bundles the application for production deployment |
| `npm run preview` | Locally previews the production build |

---

## License

This project is created for educational and practice purposes. Feel free to use, modify, and expand upon it!
