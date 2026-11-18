import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export class ScrollStoryManager {
  constructor({
    watchModel,
    cameraManager,
    environment,
    onEnterConfigurator,
    onLeaveConfigurator,
    onSetInteractive,
    onScrollComplete,
  }) {
    this.watchModel = watchModel;
    this.cameraManager = cameraManager;
    this.environment = environment;
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
          const isAtStart = self.progress <= 0.005;
          const isAtEnd = self.progress >= 0.995;
          const isInteractive = isAtStart || isAtEnd;

          if (this.onSetInteractive) {
            this.onSetInteractive(isInteractive);
          }

          if (this.onScrollComplete) {
            this.onScrollComplete(isAtEnd);
          }
        },
      },
    });

    // ------------------------------------------------------------------------
    // Step 1: Section 1 (Hero) -> Section 2 (Showcase/Features)
    // Watch glides into frame, pivots to show dial face and profile
    // ------------------------------------------------------------------------
    const isMobile = window.innerWidth < 768;

    tl.to(
      this.watchModel.root.position,
      {
        x: isMobile ? 0 : 0.38,
        y: isMobile ? 0.24 : 0.05, // Elevated on mobile to sit above bottom card
        z: isMobile ? 0.05 : 0.1,
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
        y: isMobile ? 0.52 : 0.35,
        z: isMobile ? 2.3 : 1.55,
        ease: 'power1.inOut',
      },
      'stage-showcase'
    );

    // Depth of field (macro focus blur in showcase)
    if (this.environment && this.environment.scene) {
      tl.to(
        this.environment.scene,
        { backgroundBlurriness: 0.28, ease: 'power1.inOut' },
        'stage-showcase'
      );
    }

    // ------------------------------------------------------------------------
    // Step 2: Section 2 -> Section 3 (Exploded Assembly View)
    // Watch moves directly to center stage, faces forward, and parts expand!
    // ------------------------------------------------------------------------
    tl.to(
      this.watchModel.root.position,
      {
        x: 0,
        y: isMobile ? 0.20 : 0, // Keep exploded cluster in upper viewport
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
        y: isMobile ? 0.45 : 0.3,
        z: isMobile ? 2.55 : 1.75,
        ease: 'power2.inOut',
      },
      'stage-explode'
    );

    if (this.environment && this.environment.scene) {
      tl.to(
        this.environment.scene,
        { backgroundBlurriness: 0.12, ease: 'power2.inOut' },
        'stage-explode'
      );
    }

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
        y: isMobile ? 0.15 : 0.05,
        z: isMobile ? 2.2 : 1.4,
        ease: 'power2.inOut',
      },
      'stage-configurator'
    );

    if (this.environment && this.environment.scene) {
      tl.to(
        this.environment.scene,
        { backgroundBlurriness: 0.06, ease: 'power2.inOut' },
        'stage-configurator'
      );
    }

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

    // Final Section (Configurator): Enable OrbitControls when reaching the configurator view
    ScrollTrigger.create({
      trigger: '#section-configurator',
      start: 'bottom 95%',
      end: 'bottom bottom',
      onEnter: () => {
        if (this.onEnterConfigurator) this.onEnterConfigurator();
      },
      onLeaveBack: () => {
        if (this.onLeaveConfigurator) this.onLeaveConfigurator();
      },
    });

    // ------------------------------------------------------------------------
    // Mobile Only: Horizontal Sideways Slide-In (Right) & Slide-Out (Left)
    // Anchored in bottom 40% with zero vertical up/down movement
    // Desktop screens remain completely untouched with natural layout.
    // ------------------------------------------------------------------------
    const isMobileViewport = window.matchMedia('(max-width: 768px)').matches;

    if (isMobileViewport) {
      const storyCards = [
        { trigger: '#section-hero', card: '.hero-content' },
        { trigger: '#section-showcase', card: '#section-showcase .story-card' },
        { trigger: '#section-explode', card: '#section-explode .story-card' },
        { trigger: '#section-configurator', card: '#section-configurator .story-card' },
      ];

      const enterFromX = window.innerWidth * 0.95;
      const exitToX = -window.innerWidth * 0.95;

      storyCards.forEach(({ trigger, card }, idx) => {
        const el = document.querySelector(card);
        if (!el) return;

        if (idx === 0) {
          // Hero content starts in center and scrolls off to the left
          gsap.to(el, {
            opacity: 0,
            x: exitToX,
            y: 0,
            ease: 'power1.in',
            scrollTrigger: {
              trigger: trigger,
              start: 'center 40%',
              end: 'bottom 10%',
              scrub: 0.8,
            },
          });
        } else {
          // Subsequent cards enter strictly from the right side (+X) and exit to the left (-X)
          gsap.fromTo(
            el,
            { opacity: 0, x: enterFromX, y: 0 },
            {
              opacity: 1,
              x: 0,
              y: 0,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: trigger,
                start: 'top 85%',
                end: 'center center',
                scrub: 0.8,
              },
            }
          );

          // Exit off to the left side (-X) when scrolling past
          if (trigger !== '#section-configurator') {
            gsap.to(el, {
              opacity: 0,
              x: exitToX,
              y: 0,
              ease: 'power1.in',
              scrollTrigger: {
                trigger: trigger,
                start: 'center 30%',
                end: 'bottom 5%',
                scrub: 0.8,
              },
            });
          }
        }
      });
    }
  }
}
