import * as THREE from 'three';
import { APP_CONFIG } from './config/config.js';
import { CameraManager } from './cameras/CameraManager.js';
import { StudioLighting } from './lights/StudioLighting.js';
import { Environment } from './scenes/Environment.js';
import { WatchModel } from './models/WatchModel.js';
import { InteractionManager } from './interactions/InteractionManager.js';
import { UIManager } from './interactions/UIManager.js';
import { AnimationManager } from './animations/AnimationManager.js';
import { ScrollStoryManager } from './animations/ScrollStoryManager.js';

class App {
  constructor() {
    this.canvas = document.querySelector('#webgl-canvas');

    // 1. Scene & Renderer Setup
    this.scene = new THREE.Scene();

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    window.addEventListener('contextmenu', (e) => e.preventDefault());

    // 2. Camera Manager (OrbitControls + Presets + Framing)
    this.cameraManager = new CameraManager(this.renderer, this.canvas);

    // 3. Lighting & Studio Stage Environment (HDRI: studio_kominka_02_2k.hdr)
    this.lighting = new StudioLighting(this.scene);
    this.environment = new Environment(this.scene, this.renderer, APP_CONFIG.hdriPath);

    // 4. Animation Manager
    this.animationManager = new AnimationManager();

    // 5. Watch Model (GLTF 2K + Parts traversal + Explode)
    this.watchModel = new WatchModel(this.scene, APP_CONFIG.modelPath, () => {
      // 6. Interaction & UI Managers (after model meshes are loaded)
      this.interactionManager = new InteractionManager(
        this.cameraManager.camera,
        this.watchModel,
        this.uiManager,
        this.cameraManager
      );
      this.animationManager.add(this.interactionManager);

      // 7. Scroll-Driven 3D Storytelling (Hero -> Showcase -> Exploded View -> Configurator)
      this.scrollStory = new ScrollStoryManager({
        watchModel: this.watchModel,
        cameraManager: this.cameraManager,
        onEnterConfigurator: () => {
          this.cameraManager.setControlsEnabled(true);
        },
        onLeaveConfigurator: () => {
          this.cameraManager.setControlsEnabled(false);
        },
        onSetInteractive: (enabled) => {
          if (this.interactionManager) {
            this.interactionManager.setInteractive(enabled);
          }
        },
        onScrollComplete: (isComplete) => {
          this.watchModel.setAutoRotate(isComplete);
        },
      });
    });

    // 7. UI Manager
    this.uiManager = new UIManager({
      onToggleTurntable: () => this.animationManager.toggleTurntable(),
      onToggleExplode: () => {
        const exploded = this.watchModel.toggleExplode();
        if (exploded && this.animationManager.turntableActive) {
          this.animationManager.toggleTurntable();
        }
        return exploded;
      },
      onSelectCamera: (presetName) => this.cameraManager.setPreset(presetName),
      onSelectFinish: (palette) => this.watchModel.setFinish(palette),
    });

    // Register camera controls update loop
    this.animationManager.add(this.cameraManager);

    this._animate = this._animate.bind(this);
    this._animate();
  }

  _animate() {
    requestAnimationFrame(this._animate);

    this.animationManager.update(this.watchModel);
    this.renderer.render(this.scene, this.cameraManager.camera);
  }
}

const app = new App();
export default app;
