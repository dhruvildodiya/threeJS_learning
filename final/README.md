# Audio Reactive Ocean World

A real-time 3D browser experience with a floating island surrounded by an infinite ocean, where visual elements react dynamically to music.

Built with **Three.js**, **Web Audio API**, custom **GLSL Shaders**, and custom **Blender 3D Models**.

---

## Features & Audio Reactivity Mapping

| Frequency Band | Visual Element | Behavior & Shader Reactivity |
|---|---|---|
| **Bass** (20–250 Hz) | **Ocean Waves & Spray** | Drives Gerstner wave displacement, amplitude, crest steepness, and wave crest spray particles. |
| **Mid** (250–2000 Hz) | **Island Elements** | Palm tree foliage and trunks sway dynamically to the rhythm; lighthouse beacon sweep speed accelerates. |
| **High / Treble** (2–14 kHz) | **Particles & Sparkles** | Fireflies around vegetation and magical crystals pulse their size and bioluminescent emissive glow. |
| **Volume / Energy** | **Atmosphere & Sun** | Shifts atmospheric sunset saturation, sun corona intensity, fog density, and camera presence. |
| **Beat Detector** | **Impulses & Shockwaves** | Expanding radial shockwave rings on the ocean surface, golden ember bursts, and subtle camera FOV kick. |

---

## 3D Asset Pipeline (Blender to Three.js)

The island world is composed of modular Blender 3D models instantiated via `public/models/island_layout.json`:

- **Floating Island Base (`Island.glb`)**: Custom modeled rock base with underside stalactites, grassy plateau, and cascading cliffs.
- **Waterfalls (`Waterfall_A`, `Waterfall_B`)**: Cascading streams embedded in `Island.glb` with translucent specular shimmer.
- **Lighthouse (`Lighthouse_Body.glb`)**: Red & white striped tower with a rotating lantern room, SpotLight, and volumetric light cone.
- **Coastal Hut (`Hut.glb`)**: Thatch roof cottage with warm illuminated windows (`OW_Window_Lit`) and door lantern.
- **Wooden Dock (`Dock.glb`)**: Planks and support pillars extending from the beach into the water.
- **Rowboat (`Rowboat.glb`)**: Wooden boat floating near the dock, bobbing realistically with the ocean waves.
- **Flora & Palms (`Palm_A.glb`, `Palm_B.glb`, `Plant_Bush.glb`, `Plant_Fern.glb`, `Plant_GrassTuft.glb`)**: Placed across the island hills with natural wind sway.
- **Rock Formations (`Rock_L.glb`, `Rock_M.glb`, `Rock_S.glb`, `Rock_Spire.glb`)**: Coastal shoreline boulders.
- **Crystal Cluster (`optional/Crystal_Cluster.glb`)**: Magical crystals on the cliffside pulsing to music beats.

---

## Project Architecture

```
src/
├── main.ts                    # Bootstrap entry point & UI hook
├── core/
│   ├── Experience.ts          # Central engine coordinating all subsystems
│   ├── Renderer.ts            # WebGLRenderer with tone mapping and soft shadows
│   ├── Camera.ts              # Core camera wrapper
│   ├── Scene.ts               # Three.js scene container
│   ├── Time.ts                # Animation frame loop & delta time provider
│   └── Postprocessing.ts      # EffectComposer with UnrealBloomPass & chromatic aberration
├── audio/
│   ├── AudioEngine.ts         # Web Audio AudioContext, AnalyserNode, audio file & mic inputs
│   ├── FeatureBus.ts          # Smooth attack/release frequency band computation & spectrum DataTexture
│   ├── BeatDetector.ts        # Transients detection with dynamic threshold and cooldown
│   └── types.ts               # Shared audio interfaces and uniform contracts
├── assets/
│   └── AssetManager.ts        # GLTFLoader manager for Blender models & island_layout.json
├── world/
│   ├── Island.ts              # Blender models scene assembler & audio-reactive animations
│   ├── Ocean.ts               # Custom GLSL ocean plane with camera grid snapping
│   ├── Sky.ts                 # Sunset atmospheric sky dome with sun disc and stars
│   ├── Clouds.ts              # Procedural floating sunset clouds
│   ├── Environment.ts         # Directional sunset sun, PCF soft shadows, and ambient light
│   └── Particles.ts           # Fireflies, wave spray, and beat embers
├── camera/
│   └── CameraRig.ts           # Cinematic orbiting camera, FOV kick, trauma shake, and preset shots
├── shaders/
│   ├── ocean/ (ocean.vert.glsl, ocean.frag.glsl)   # Gerstner waves, foam, Fresnel, specular
│   └── sky/ (sky.vert.glsl, sky.frag.glsl)         # Sunset gradient, corona, aurora, stars
├── ui/
│   └── UIController.ts        # Glassmorphic HUD, audio player, live visualizer meters, camera mode toggle
└── styles/
    └── main.css               # Modern glassmorphism, responsive HUD, and glowing animations
```

---

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm

### Installation & Run

```bash
# 1. Install dependencies
npm install

# 2. Start Vite development server
npm run dev

# 3. Open browser at http://localhost:5180/
```

### Controls & Navigation

- **Audio Sources**: Click **Demo Track**, **Upload** (select any local `.mp3` or `.wav`), or **Mic** (live microphone analysis).
- **Camera Modes**:
  - **Cinematic**: Automated sweeping orbit with subtle vertical drift and musical FOV punch.
  - **Free Orbit**: Click and drag to orbit, scroll to zoom, right-click to pan freely.
- **Preset Camera Shots**: Switch instantly between **Overview**, **Dock**, **Lighthouse**, and **Aerial**.
- **Visual Quality**: Select **High** (UnrealBloom + 2x DPR), **Medium**, or **Low** (Battery Saver).
- **Debug GUI**: Press <kbd>H</kbd> or click the gear icon in the bottom HUD to open the full `lil-gui` developer panel.
