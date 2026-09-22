import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { gsap } from 'gsap';

export class CameraManager {
  constructor(renderer, canvas) {
    this.camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.05, 50);
    this.camera.position.set(0, 0.35, 1.6);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.target.set(0, 0, 0);
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 5.0;
    this.controls.enabled = false; // Disabled during storytelling scroll, enabled in Configurator section
    this.controls.update();

    this.cameraPresets = {
      hero: { pos: { x: 0, y: 0.35, z: 1.6 }, target: { x: 0, y: 0, z: 0 } },
      dial: { pos: { x: 0, y: 0.5, z: 0.65 }, target: { x: 0, y: 0, z: 0 } },
      clasp: { pos: { x: -0.6, y: -0.2, z: -1.0 }, target: { x: 0, y: 0, z: -0.1 } },
    };

    window.addEventListener('resize', this.onResize.bind(this));
    this.renderer = renderer;
  }

  setControlsEnabled(enabled) {
    this.controls.enabled = enabled;
  }

  setPreset(name) {
    const preset = this.cameraPresets[name];
    if (!preset) return;

    gsap.to(this.camera.position, {
      x: preset.pos.x,
      y: preset.pos.y,
      z: preset.pos.z,
      duration: 1.2,
      ease: 'power2.inOut',
    });

    gsap.to(this.controls.target, {
      x: preset.target.x,
      y: preset.target.y,
      z: preset.target.z,
      duration: 1.2,
      ease: 'power2.inOut',
    });
  }

  focusOnObject(object) {
    if (!object) {
      gsap.to(this.controls.target, { x: 0, y: 0.04, z: 0, duration: 1.1, ease: 'power2.inOut' });
      return;
    }

    const box = new THREE.Box3().setFromObject(object);
    const center = new THREE.Vector3();
    box.getCenter(center);

    gsap.to(this.controls.target, {
      x: center.x,
      y: center.y,
      z: center.z,
      duration: 1.1,
      ease: 'power2.inOut',
    });
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  update() {
    this.controls.update();
  }
}
