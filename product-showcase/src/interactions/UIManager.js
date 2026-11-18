import { gsap } from 'gsap';
import { FINISH_PALETTES } from '../config/config.js';

export class UIManager {
  constructor({ onToggleTurntable, onToggleExplode, onSelectCamera, onSelectFinish }) {
    this.screenTag = document.getElementById('screen-tag');
    this.tagTitle = document.getElementById('tag-title');
    this.partCategoryTag = document.getElementById('part-category-tag');
    this.partTitle = document.getElementById('part-title');
    this.partDesc = document.getElementById('part-desc');
    this.specSelectedPart = document.getElementById('spec-selected-part');

    this.btnTurntable = document.getElementById('btn-turntable');
    this.btnExplode = document.getElementById('btn-explode');
    this.cameraButtons = document.querySelectorAll('[data-cam]');
    this.swatchButtons = document.querySelectorAll('.color-swatch');

    this.initListeners({ onToggleTurntable, onToggleExplode, onSelectCamera, onSelectFinish });
  }

  initListeners({ onToggleTurntable, onToggleExplode, onSelectCamera, onSelectFinish }) {
    if (this.btnTurntable) {
      this.btnTurntable.addEventListener('click', () => {
        const isActive = onToggleTurntable();
        this.btnTurntable.classList.toggle('active', isActive);
      });
    }

    if (this.btnExplode) {
      this.btnExplode.addEventListener('click', () => {
        const isExploded = onToggleExplode();
        this.btnExplode.classList.toggle('active', isExploded);
        if (isExploded && this.btnTurntable) {
          this.btnTurntable.classList.remove('active');
        }
      });
    }

    this.cameraButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.cameraButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        onSelectCamera(btn.dataset.cam);
      });
    });

    this.swatchButtons.forEach((swatch) => {
      swatch.addEventListener('click', () => {
        const key = swatch.dataset.colorway;
        this.setActiveSwatch(key);
        onSelectFinish(FINISH_PALETTES[key], key);
      });
    });
  }

  setActiveSwatch(key) {
    this.swatchButtons.forEach((s) => {
      s.classList.toggle('active', s.dataset.colorway === key);
    });
  }

  updateScreenTag(worldPos, camera, title) {
    if (!this.screenTag || !this.tagTitle) return;
    const screenPos = worldPos.clone().project(camera);

    if (screenPos.z > 1) {
      this.hideScreenTag();
      return;
    }

    const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;

    this.screenTag.style.left = `${x}px`;
    this.screenTag.style.top = `${y}px`;
    this.tagTitle.textContent = title;
    this.screenTag.classList.add('visible');
  }

  hideScreenTag() {
    if (this.screenTag) {
      this.screenTag.classList.remove('visible');
    }
  }

  updatePartInfo(meta) {
    if (!meta) return;
    if (this.partCategoryTag) this.partCategoryTag.textContent = meta.category;
    if (this.partTitle) this.partTitle.textContent = meta.title;
    if (this.partDesc) this.partDesc.textContent = meta.desc;
    if (this.specSelectedPart) this.specSelectedPart.textContent = meta.spec;

    // Subtle luxury GSAP text reveal
    const panel = document.getElementById('product-info-panel');
    if (panel) {
      gsap.fromTo(
        panel,
        { opacity: 0.8, x: -6 },
        { opacity: 1, x: 0, duration: 0.35, ease: 'power2.out' }
      );
    }
  }

  resetPartInfo() {
    if (this.partCategoryTag) this.partCategoryTag.textContent = 'CHRONOGRAPH COMPONENT';
    if (this.partTitle) this.partTitle.textContent = 'KRONOS CHRONO-2000';
    if (this.partDesc) {
      this.partDesc.textContent =
        'Engineered with aerospace-grade stainless steel, dual articulated bracelet links, and high-contrast electro-luminescent digital display.';
    }
    if (this.specSelectedPart) this.specSelectedPart.textContent = 'NONE (CLICK PART)';

    const panel = document.getElementById('product-info-panel');
    if (panel) {
      gsap.fromTo(
        panel,
        { opacity: 0.8, x: -6 },
        { opacity: 1, x: 0, duration: 0.35, ease: 'power2.out' }
      );
    }
  }
}
