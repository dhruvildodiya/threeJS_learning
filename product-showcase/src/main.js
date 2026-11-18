import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { APP_CONFIG } from './config/config.js';
import { CameraManager } from './cameras/CameraManager.js';
import { StudioLighting } from './lights/StudioLighting.js';
import { Environment } from './scenes/Environment.js';
import { WatchModel } from './models/WatchModel.js';
import { InteractionManager } from './interactions/InteractionManager.js';
import { UIManager } from './interactions/UIManager.js';
import { AnimationManager } from './animations/AnimationManager.js';
import { ScrollStoryManager } from './animations/ScrollStoryManager.js';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

class App {
  constructor() {
    this.canvas = document.querySelector('#webgl-canvas');

    // 0. Smart Loading Manager & Progressive Preloader UI
    this.loadingManager = this._initLoadingManager();

    // 0.5 Lenis Smooth Scroll
    this.lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      touchMultiplier: 2,
    });

    this.lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      this.lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    // 1. Scene & Renderer Setup
    this.scene = new THREE.Scene();

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    window.addEventListener('contextmenu', (e) => e.preventDefault());

    // 2. Camera Manager (OrbitControls + Presets + Framing)
    this.cameraManager = new CameraManager(this.renderer, this.canvas);

    // 3. Cinematic Post-Processing Pipeline (Selective Luxury Unreal Bloom)
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.cameraManager.camera);
    this.composer.addPass(renderPass);

    // Subtle specular bloom for metallic reflections and digital LCD clarity
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.03, // strength
      0.45, // radius
      0.32  // threshold (isolates bright highlights and emissive display)
    );
    this.composer.addPass(bloomPass);

    // 4. Lighting & Studio Stage Environment (HDRI: studio_kominka_02_2k.hdr)
    this.lighting = new StudioLighting(this.scene);
    this.environment = new Environment(
      this.scene,
      this.renderer,
      APP_CONFIG.hdriPath,
      this.loadingManager
    );

    // 5. Animation Manager
    this.animationManager = new AnimationManager();

    // 6. Watch Model (GLTF 2K + Parts traversal + Explode + Contact Shadow)
    this.watchModel = new WatchModel(
      this.scene,
      APP_CONFIG.modelPath,
      () => {
        // 7. Interaction & UI Managers (after model meshes are loaded)
        this.interactionManager = new InteractionManager(
          this.cameraManager.camera,
          this.watchModel,
          this.uiManager,
          this.cameraManager
        );
        this.animationManager.add(this.interactionManager);

        // 8. Scroll-Driven 3D Storytelling with Depth of Field Transitions
        this.scrollStory = new ScrollStoryManager({
          watchModel: this.watchModel,
          cameraManager: this.cameraManager,
          environment: this.environment,
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
      },
      this.loadingManager
    );

    // 9. UI Manager
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

    // Handle Window Resize for Composer
    window.addEventListener('resize', () => {
      this.composer.setSize(window.innerWidth, window.innerHeight);
    });

    this._animate = this._animate.bind(this);
    this._animate();
  }

  _initLoadingManager() {
    const manager = new THREE.LoadingManager();
    const preloader = document.getElementById('preloader');
    const bar = document.getElementById('preloader-bar');
    const percentText = document.getElementById('preloader-percent');
    const fileText = document.getElementById('preloader-file');

    manager.onProgress = (url, itemsLoaded, itemsTotal) => {
      const progress = Math.min(Math.round((itemsLoaded / itemsTotal) * 100), 100);
      if (bar) bar.style.width = `${progress}%`;
      if (percentText) percentText.textContent = `${progress}%`;
      if (fileText) {
        const filename = url.split('/').pop().split('?')[0];
        fileText.textContent = filename || 'LOADING ASSETS';
      }
    };

    manager.onLoad = () => {
      if (bar) bar.style.width = '100%';
      if (percentText) percentText.textContent = '100%';
      if (fileText) fileText.textContent = 'READY';

      setTimeout(() => {
        if (preloader) {
          preloader.classList.add('hidden');
        }
      }, 400);
    };

    return manager;
  }

  _animate() {
    requestAnimationFrame(this._animate);

    this.animationManager.update(this.watchModel);
    this.composer.render();
  }
}

const app = new App();
export default app;
