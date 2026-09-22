import * as THREE from 'three';
import { CameraManager } from './cameras/CameraManager.js';
import { StudioLighting } from './lights/StudioLighting.js';
import { MaterialFactory } from './materials/MaterialFactory.js';
import { WatchScene } from './scenes/WatchScene.js';
import { Environment } from './scenes/Environment.js';
import { WatchModel } from './models/WatchModel.js';
import { InteractionManager } from './interactions/InteractionManager.js';
import { UIManager } from './interactions/UIManager.js';
import { AnimationManager } from './animations/AnimationManager.js';

class App {
    constructor() {
        this.canvas = document.querySelector('#webgl-canvas');

        // 1. Renderer
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.05;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // 2. Scene & Camera
        this.watchScene = new WatchScene();
        this.cameraManager = new CameraManager(this.renderer);

        // 3. Materials
        this.materialFactory = new MaterialFactory();

        // 4. Lighting & Environment
        this.lighting = new StudioLighting(this.watchScene.scene);
        this.environment = new Environment(
            this.watchScene.scene,
            this.renderer,
            this.materialFactory.textures.cornerShadow
        );

        // 5. Watch Component Assembly
        this.watchModel = new WatchModel(this.materialFactory.materials);
        this.watchScene.add(this.watchModel.root);

        // 6. Interaction & UI
        this.interactionManager = new InteractionManager(this.watchModel.root);
        this.animationManager = new AnimationManager();

        this.uiManager = new UIManager({
            onToggleExplode: () => this.watchModel.toggleExploded(),
            onToggleTurntable: () => this.animationManager.toggleTurntable(),
        });

        // 7. Register Updatables
        this.animationManager.add(this.watchModel);
        this.animationManager.add({
            update: (_now, elapsed) => {
                this.environment.update(elapsed);
                this.lighting.update(this.cameraManager.camera, this.watchScene.scene.fog);
                this.interactionManager.update();
                this.cameraManager.update();
            },
        });

        this._animate = this._animate.bind(this);
        this._animate();
    }

    _animate() {
        requestAnimationFrame(this._animate);

        this.animationManager.update(this.interactionManager);
        this.renderer.render(this.watchScene.scene, this.cameraManager.camera);
    }
}
const app = new App();
export default app;
