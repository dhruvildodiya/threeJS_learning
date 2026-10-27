---
description: 
---

You are building "Audio Reactive Ocean World": a real-time browser experience
with a floating island surrounded by an infinite ocean, where every visual
element reacts to music. Stack: Vite + vanilla JavaScript (ES modules) +
Three.js + Web Audio API + custom GLSL shaders. No React. No third-party 3D
models or texture files: everything is generated procedurally in code, except
optional GLB hero models I will add later in /public/models.

## Goals
- Beautiful, stylized, cohesive look; 60fps on a mid-range laptop.
- One audio analysis layer feeds all visuals.
- Clean modular code so each system can be developed and tested independently.

## Project setup
1. Scaffold a Vite project with `three` as the only major dependency
   (use `lil-gui` for a debug panel).
2. Folder structure:
   src/
     main.js                // bootstrap, render loop
     core/ (Renderer.js, Clock.js, Resize.js, Postprocessing.js)
     audio/ (AudioEngine.js, FeatureBus.js, BeatDetector.js)
     world/
       Ocean.js, Island.js, Vegetation.js, Particles.js, Sky.js, Clouds.js
     camera/ (CameraRig.js)
     shaders/ (*.vert.glsl, *.frag.glsl, shared chunks like noise.glsl)
     ui/ (StartScreen.js, Controls.js, DebugOverlay.js)
3. Configure Vite to import .glsl files as raw strings.

## Audio system (build first)
- AudioEngine: AudioContext + AnalyserNode (fftSize 2048). Sources: an
  uploaded audio file, a bundled default track in /public/audio, and optional
  microphone. Require a "Start" button click to resume the context.
- FeatureBus: each frame compute smoothed, normalized (0-1) values:
  bass, mid, treble, energy, beat (impulse that decays), plus the spectrum as
  a THREE.DataTexture (R channel = magnitude) for shaders.
  Use attack/release smoothing (fast rise, slow fall).
- BeatDetector: bass energy vs rolling average with threshold + cooldown.
- DebugOverlay: toggleable bars for the bands, beat flash, and a spectrum plot.
- Expose the bus as shared uniforms (uBass, uMid, uTreble, uEnergy, uBeat,
  uTime, uSpectrum) used by all materials.

## Visual systems (build in this order, each as its own module)
1. Ocean: large subdivided plane that follows the camera, snapped to a grid.
   Sum of Gerstner waves in the vertex shader. Bass -> amplitude/steepness,
   mid -> wavelength/direction, treble -> fine ripples. Fragment: Fresnel,
   sky reflection, depth color gradient, foam on crests, crest glow,
   distance fog into the horizon. Beat triggers a radial ripple from the island.
2. Sky: shader dome with gradient, sun, stars, optional aurora driven by mids.
   Energy slowly shifts the palette (calm = sunset, intense = vivid/saturated).
3. Island: fbm-displaced disc terrain with edge falloff, colored in the shader
   by height/slope (sand, grass, rock). Underside is an inverted displaced
   cone with hanging rock spikes. Slow bobbing and rotation.
4. Vegetation: instanced grass blades with wind in the vertex shader (bass =
   sway, treble = flutter, beat = pulse). Procedural trees via recursive
   branching merged into one geometry, foliage as instanced shapes that
   "breathe" with the music. Glowing flowers/crystals mapped to the spectrum
   by angle around the island (island acts as an equalizer).
5. Particles: GPU-driven points with shader-drawn soft sprites, additive
   blending. Fireflies near vegetation (treble), sea spray from wave crests
   (bass), petal/ember burst on beat.
6. Clouds: layered fbm in a shader first; keep an interface so volumetric
   clouds can replace it later.
7. CameraRig: slow orbit with sine drift, FOV punch and light shake on beats,
   3-4 scripted shots that cross-fade on a timer or musical sections, plus a
   free-orbit mode via OrbitControls toggle.
8. Postprocessing: bloom (key for emissives), vignette, subtle chromatic
   aberration on beats, ACES tone mapping. Make each pass toggleable.

## Quality and performance
- Use InstancedMesh and merged geometry; target < 1.5M triangles, few draw calls.
- Pixel ratio capped at 2, with a dynamic resolution scaler if FPS drops.
- A quality preset (Low/Med/High) in the lil-gui panel.
- No per-frame allocations in the render loop.

## UI
- Start screen with title, "Play demo track", "Upload audio", "Use microphone".
- Minimal HUD: play/pause, volume, quality, debug toggle, camera mode toggle.

## Process
1. First produce a short plan and the file tree, then implement milestone by
   milestone. After each milestone, run the dev server and verify it works
   before moving on:
   M1: setup + audio engine + debug overlay
   M2: ocean + sky
   M3: island
   M4: vegetation
   M5: particles + clouds
   M6: camera rig + postprocessing
   M7: UI polish + performance pass
2. Keep code commented where the math/shader logic is non-obvious.
3. Write a README with run instructions and an architecture overview.