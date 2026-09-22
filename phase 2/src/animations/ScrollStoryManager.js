import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export class ScrollStoryManager {
  constructor({
    watchModel,
    cameraManager,
    onEnterConfigurator,
    onLeaveConfigurator,
    onSetInteractive,
    onScrollComplete,
  }) {
    this.watchModel = watchModel;
    this.cameraManager = cameraManager;
    this.onEnterConfigurator = onEnterConfigurator;
    this.onLeaveConfigurator = onLeaveConfigurator;
    this.onSetInteractive = onSetInteractive;
    this.onScrollComplete = onScrollComplete;

    this.initScrollTimeline();
  }

  initScrollTimeline() {
    if (!this.watchModel.root) return;

    // Master Scroll Scrub Timeline
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#scroll-container',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.4,
        onUpdate: (self) => {
          const isComplete = self.progress >= 0.999;
          if (this.onScrollComplete) {
            this.onScrollComplete(isComplete);
          }
        },
      },
    });

    // ------------------------------------------------------------------------
    // Step 1: Section 1 (Hero) -> Section 2 (Showcase/Features)
    // Watch glides into frame, pivots to show dial face and profile
    // ------------------------------------------------------------------------
    tl.to(
      this.watchModel.root.position,
      {
        x: 0.38,
        y: 0.05,
        z: 0.1,
        ease: 'power1.inOut',
      },
      'stage-showcase'
    );

    tl.to(
      this.watchModel.root.rotation,
      {
        x: 0.15,
        y: Math.PI * 0.9,
        z: -0.05,
        ease: 'power1.inOut',
      },
      'stage-showcase'
    );

    tl.to(
      this.cameraManager.camera.position,
      {
        x: 0,
        y: 0.35,
        z: 1.55,
        ease: 'power1.inOut',
      },
      'stage-showcase'
    );

    // ------------------------------------------------------------------------
    // Step 2: Section 2 -> Section 3 (Exploded Assembly View)
    // Watch moves directly to center stage, faces forward, and parts expand!
    // ------------------------------------------------------------------------
    tl.to(
      this.watchModel.root.position,
      {
        x: 0,
        y: 0,
        z: 0,
        ease: 'power2.inOut',
      },
      'stage-explode'
    );

    tl.to(
      this.watchModel.root.rotation,
      {
        x: 0.05,
        y: Math.PI * 1.5,
        z: 0.0,
        ease: 'power2.inOut',
      },
      'stage-explode'
    );

    tl.to(
      this.cameraManager.camera.position,
      {
        x: 0,
        y: 0.3,
        z: 1.75,
        ease: 'power2.inOut',
      },
      'stage-explode'
    );

    // Explode components along scrub timeline (tight, calibrated explosion)
    // 1. Sapphire crystal rises with subtle, refined spacing
    if (this.watchModel.parts.glass) {
      const defGlass = this.watchModel.defaultTransforms.get(this.watchModel.parts.glass);
      if (defGlass) {
        tl.to(
          this.watchModel.parts.glass.position,
          { y: defGlass.position.y + 0.035, ease: 'power2.out' },
          'stage-explode'
        );
      }
    }
    // 2. Dial face plate hovers gently above the chassis
    if (this.watchModel.parts.dial) {
      const defDial = this.watchModel.defaultTransforms.get(this.watchModel.parts.dial);
      if (defDial) {
        tl.to(
          this.watchModel.parts.dial.position,
          { y: defDial.position.y + 0.018, ease: 'power2.out' },
          'stage-explode'
        );
      }
    }
    // 3. Chassis body drops ever so slightly
    if (this.watchModel.parts.body) {
      const defBody = this.watchModel.defaultTransforms.get(this.watchModel.parts.body);
      if (defBody) {
        tl.to(
          this.watchModel.parts.body.position,
          { y: defBody.position.y - 0.01, ease: 'power2.out' },
          'stage-explode'
        );
      }
    }
    if (this.watchModel.parts.strapA) {
      const defA = this.watchModel.defaultTransforms.get(this.watchModel.parts.strapA);
      if (defA) {
        tl.to(
          this.watchModel.parts.strapA.position,
          { z: defA.position.z - 0.08, y: defA.position.y + 0.015, ease: 'power2.out' },
          'stage-explode'
        );
        tl.to(
          this.watchModel.parts.strapA.rotation,
          { x: defA.rotation.x - 0.08, ease: 'power2.out' },
          'stage-explode'
        );
      }
    }
    if (this.watchModel.parts.strapB) {
      const defB = this.watchModel.defaultTransforms.get(this.watchModel.parts.strapB);
      if (defB) {
        tl.to(
          this.watchModel.parts.strapB.position,
          { z: defB.position.z + 0.08, y: defB.position.y - 0.015, ease: 'power2.out' },
          'stage-explode'
        );
        tl.to(
          this.watchModel.parts.strapB.rotation,
          { x: defB.rotation.x + 0.08, ease: 'power2.out' },
          'stage-explode'
        );
      }
    }
    if (this.watchModel.parts.clasp) {
      const defClasp = this.watchModel.defaultTransforms.get(this.watchModel.parts.clasp);
      if (defClasp) {
        tl.to(
          this.watchModel.parts.clasp.position,
          { z: defClasp.position.z - 0.12, y: defClasp.position.y + 0.025, ease: 'power2.out' },
          'stage-explode'
        );
        tl.to(
          this.watchModel.parts.clasp.rotation,
          { x: defClasp.rotation.x - 0.1, ease: 'power2.out' },
          'stage-explode'
        );
      }
    }

    // ------------------------------------------------------------------------
    // Step 3: Section 3 -> Section 4 (Interactive Configurator Showroom)
    // Parts seamlessly reassemble and watch is centered for 360 inspection & clicking
    // ------------------------------------------------------------------------
    tl.to(
      this.watchModel.root.position,
      {
        x: 0,
        y: 0,
        z: 0,
        ease: 'power2.inOut',
      },
      'stage-configurator'
    );

    tl.to(
      this.watchModel.root.rotation,
      {
        x: Math.PI / 2, // Tilt face upward towards front
        y: 0,
        z: 0,
        ease: 'power2.inOut',
      },
      'stage-configurator'
    );

    tl.to(
      this.cameraManager.camera.position,
      {
        x: 0,
        y: 0.05,
        z: 1.4,
        ease: 'power2.inOut',
      },
      'stage-configurator'
    );

    // Re-assembly tweens
    this.watchModel.interactiveMeshes.forEach((mesh) => {
      const def = this.watchModel.defaultTransforms.get(mesh);
      if (def) {
        tl.to(
          mesh.position,
          { x: def.position.x, y: def.position.y, z: def.position.z, ease: 'power2.inOut' },
          'stage-configurator'
        );
        tl.to(
          mesh.rotation,
          { x: def.rotation.x, y: def.rotation.y, z: def.rotation.z, ease: 'power2.inOut' },
          'stage-configurator'
        );
      }
    });

    // Initial Section (Hero): Enable hover and click interactions
    ScrollTrigger.create({
      trigger: '#section-hero',
      start: 'top top',
      end: 'bottom 40%',
      onEnter: () => {
        if (this.onSetInteractive) this.onSetInteractive(true);
      },
      onEnterBack: () => {
        if (this.onSetInteractive) this.onSetInteractive(true);
      },
      onLeave: () => {
        if (this.onSetInteractive) this.onSetInteractive(false);
      },
    });

    // Final Section (Configurator): Enable hover, click, and OrbitControls
    ScrollTrigger.create({
      trigger: '#section-configurator',
      start: 'top center',
      end: 'bottom bottom',
      onEnter: () => {
        if (this.onEnterConfigurator) this.onEnterConfigurator();
        if (this.onSetInteractive) this.onSetInteractive(true);
      },
      onLeaveBack: () => {
        if (this.onLeaveConfigurator) this.onLeaveConfigurator();
        if (this.onSetInteractive) this.onSetInteractive(false);
      },
    });
  }
}
