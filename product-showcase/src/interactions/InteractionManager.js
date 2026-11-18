import * as THREE from 'three';
import { gsap } from 'gsap';

export class InteractionManager {
  constructor(camera, watchModel, uiManager, cameraManager) {
    this.camera = camera;
    this.watchModel = watchModel;
    this.uiManager = uiManager;
    this.cameraManager = cameraManager;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);
    this.hoveredMesh = null;
    this.selectedMesh = null;
    this.highlightEmissive = new THREE.Color(0xffffff);
    this.isInteractive = true; // Enabled at initial (Hero) and final (Configurator) scroll sections

    this.initEvents();
  }

  setInteractive(enabled) {
    this.isInteractive = enabled;
    if (!enabled && this.isHoveringWatch) {
      this.isHoveringWatch = false;
      this.setWholeWatchHighlight(false);
      document.body.style.cursor = 'default';
      this.uiManager.hideScreenTag();
    }
  }

  initEvents() {
    window.addEventListener('pointermove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // Click any part of the watch to cycle color
    window.addEventListener('pointerdown', (e) => {
      if (!this.isInteractive) return;

      if (
        e.target.closest('.site-header') ||
        e.target.closest('.story-card')
      ) {
        return;
      }

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.watchModel.interactiveMeshes, false);

      if (intersects.length > 0) {
        // Cycle alloy colorway on clicking anywhere on the watch
        const newKey = this.watchModel.cycleFinish();
        this.uiManager.setActiveSwatch(newKey);
      }
    });

    // Double-click to reset / frame camera
    window.addEventListener('dblclick', (e) => {
      if (e.target.closest('.site-header') || e.target.closest('.story-card')) return;
      this.cameraManager.focusOnObject(null);
    });
  }

  setWholeWatchHighlight(isHighlighted) {
    this.watchModel.interactiveMeshes.forEach((mesh) => {
      if (mesh === this.watchModel.parts.glass) return; // Don't add glow to the glass
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        if (mat.emissive) {
          if (isHighlighted) {
            mat.emissive.copy(this.highlightEmissive);
            gsap.to(mat, {
              emissiveIntensity: 0.2,
              duration: 0.35,
              ease: 'power2.out',
            });
          } else {
            gsap.to(mat, {
              emissiveIntensity: 0,
              duration: 0.35,
              ease: 'power2.in',
            });
          }
        }
      });
    });
  }

  update() {
    if (!this.isInteractive) {
      if (this.isHoveringWatch) {
        this.isHoveringWatch = false;
        this.setWholeWatchHighlight(false);
        document.body.style.cursor = 'default';
        this.uiManager.hideScreenTag();
      }
      return;
    }

    if (!this.watchModel.root || this.watchModel.interactiveMeshes.length === 0) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.watchModel.interactiveMeshes, false);

    if (intersects.length > 0) {
      if (!this.isHoveringWatch) {
        this.isHoveringWatch = true;
        this.setWholeWatchHighlight(true);
        document.body.style.cursor = 'pointer';
      }

      // Display unified tag for the watch
      this.uiManager.updateScreenTag(intersects[0].point, this.camera, 'KRONOS CHRONO-2000');
    } else {
      if (this.isHoveringWatch) {
        this.isHoveringWatch = false;
        this.setWholeWatchHighlight(false);
        document.body.style.cursor = 'default';
        this.uiManager.hideScreenTag();
      }
    }
  }
}
