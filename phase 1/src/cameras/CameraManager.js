import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class CameraManager {
    constructor(renderer) {
        this.renderer = renderer;

        this.camera = new THREE.PerspectiveCamera(
            35,
            window.innerWidth / window.innerHeight,
            0.1,
            100
        );
        this.camera.position.set(0, 0.4, 7);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.06;
        this.controls.enableRotate = false; // direct watch rotation is used instead
        this.controls.enableZoom = true;
        this.controls.enablePan = false;
        this.controls.minDistance = 1.8;
        this.controls.maxDistance = 10;
        this.controls.target.set(0, 0, 0);

        window.addEventListener('resize', () => this.handleResize());
    }

    update() {
        this.controls.update();
    }

    handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }
}
