import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

export class Environment {
  constructor(scene, renderer, hdriPath) {
    this.scene = scene;
    this.renderer = renderer;
    this.hdriPath = hdriPath;

    this.loadHDRI();
  }

  loadHDRI() {
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();

    new RGBELoader().load(
      this.hdriPath,
      (hdrTexture) => {
        const envMap = pmremGenerator.fromEquirectangular(hdrTexture).texture;
        this.scene.environment = envMap; // Realistic reflections & PBR ambient irradiance
        this.scene.background = envMap;  // Visible 360 panoramic studio environment
        this.scene.backgroundBlurriness = 0.08; // Subtle luxury studio depth blur
        hdrTexture.dispose();
        pmremGenerator.dispose();

        const statusText = document.getElementById('status-model-state');
        if (statusText) statusText.textContent = 'STUDIO READY • KOMINKA HDRI';
      },
      undefined,
      (err) => console.warn('Could not load HDRI, falling back to directional lights.', err)
    );
  }
}
