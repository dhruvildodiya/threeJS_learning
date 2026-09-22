import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { gsap } from 'gsap';
import { PART_METADATA, FINISH_PALETTES } from '../config/config.js';

export class WatchModel {
  constructor(scene, modelPath, onLoadCallback, loadingManager = null) {
    this.scene = scene;
    this.modelPath = modelPath;
    this.onLoadCallback = onLoadCallback;
    this.loadingManager = loadingManager;

    // Spin Pivot container for decoupling global Y auto-rotation from GSAP scroll scrub
    this.spinPivot = new THREE.Group();
    this.spinPivot.name = 'watch_spin_pivot';
    this.scene.add(this.spinPivot);

    this.root = null;
    this.parts = {
      body: null,
      dial: null,
      glass: null,
      clasp: null,
      strapA: null,
      strapB: null,
    };
    this.interactiveMeshes = [];
    this.defaultTransforms = new Map();
    this.isExploded = false;
    this.autoRotate = false;
    this.autoRotateSpeed = 0.008;
    this.spinAngle = 0;

    this.load();
  }

  load() {
    const loader = this.loadingManager ? new GLTFLoader(this.loadingManager) : new GLTFLoader();
    loader.load(
      this.modelPath,
      (gltf) => {
        this.root = gltf.scene;

        // Auto-scale and center model on top of the pedestal
        const box = new THREE.Box3().setFromObject(this.root);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 1.8 / maxDim;
        this.root.scale.setScalar(scale);

        box.setFromObject(this.root);
        box.getCenter(center);
        this.root.position.x -= center.x;
        this.root.position.y -= center.y;
        this.root.position.z -= center.z;

        // Traverse and classify watch parts
        this.root.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            // Clone material instances so finish tweaking is isolated
            if (Array.isArray(child.material)) {
              child.material = child.material.map((m) => m.clone());
            } else {
              child.material = child.material.clone();
            }

            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((mat) => {
              if (mat.name && mat.name.toLowerCase().includes('glass')) {
                // Keep sapphire crystal completely translucent so watch dial/face is crisp
                mat.transparent = true;
                mat.opacity = 0.25;
                mat.depthWrite = false;
                mat.roughness = 0.05;
                mat.metalness = 0.1;
                child.renderOrder = 1;
              } else if (mat.map) {
                mat.map.colorSpace = THREE.SRGBColorSpace;
              }
            });

            const name = child.name.toLowerCase();
            const hasGlassMat = mats.some(
              (m) => m.name && m.name.toLowerCase().includes('glass')
            );

            let partKey = 'body';

            if (hasGlassMat || name.includes('glass')) {
              this.parts.glass = child;
              partKey = 'glass';
            } else if (name.includes('clasp')) {
              this.parts.clasp = child;
              partKey = 'clasp';
            } else if (name.includes('strap_a')) {
              this.parts.strapA = child;
              partKey = 'strapA';
            } else if (name.includes('strap_b')) {
              this.parts.strapB = child;
              partKey = 'strapB';
            } else {
              this.parts.body = child;
              partKey = 'body';

              // Extract and isolate Dial Face from Case Body
              const geom = child.geometry;
              if (geom && geom.index) {
                const pos = geom.attributes.position;
                const index = geom.index;
                const dialIndices = [];
                const caseIndices = [];

                for (let i = 0; i < index.count; i += 3) {
                  const a = index.getX(i);
                  const b = index.getX(i + 1);
                  const c = index.getX(i + 2);
                  const ya = pos.getY(a);
                  const yb = pos.getY(b);
                  const yc = pos.getY(c);

                  // Dial face plate vertices are flat on top at y > 0.005
                  if (ya > 0.005 && yb > 0.005 && yc > 0.005) {
                    dialIndices.push(a, b, c);
                  } else {
                    caseIndices.push(a, b, c);
                  }
                }

                if (dialIndices.length > 0) {
                  const dialGeom = geom.clone();
                  dialGeom.setIndex(dialIndices);
                  geom.setIndex(caseIndices);

                  const dialMesh = new THREE.Mesh(
                    dialGeom,
                    Array.isArray(child.material) ? child.material[0].clone() : child.material.clone()
                  );
                  dialMesh.name = 'digital_wrist_watch_dial_plate';
                  dialMesh.castShadow = true;
                  dialMesh.receiveShadow = true;
                  dialMesh.position.copy(child.position);
                  dialMesh.rotation.copy(child.rotation);
                  dialMesh.scale.copy(child.scale);

                  dialMesh.userData = {
                    partKey: 'dial',
                    metadata: PART_METADATA.dial,
                    defaultColor: dialMesh.material.color ? dialMesh.material.color.clone() : new THREE.Color(0xffffff),
                    defaultEmissive: dialMesh.material.emissive ? dialMesh.material.emissive.clone() : new THREE.Color(0x000000),
                  };

                  this.parts.dial = dialMesh;
                  child.parent.add(dialMesh);

                  this.defaultTransforms.set(dialMesh, {
                    position: dialMesh.position.clone(),
                    rotation: dialMesh.rotation.clone(),
                    scale: dialMesh.scale.clone(),
                  });
                  this.interactiveMeshes.push(dialMesh);
                }
              }
            }

            child.userData = {
              partKey,
              metadata: PART_METADATA[partKey] || PART_METADATA.body,
              defaultColor: child.material.color ? child.material.color.clone() : new THREE.Color(0xffffff),
              defaultEmissive: child.material.emissive ? child.material.emissive.clone() : new THREE.Color(0x000000),
            };

            this.defaultTransforms.set(child, {
              position: child.position.clone(),
              rotation: child.rotation.clone(),
              scale: child.scale.clone(),
            });

            this.interactiveMeshes.push(child);
          }
        });

        // Contact Shadow underneath the watch model
        this.contactShadow = this._createContactShadow();
        if (this.contactShadow) {
          this.spinPivot.add(this.contactShadow);
        }

        this.spinPivot.add(this.root);

        // Initial Hero state: watch angled in foreground ready for scroll entry
        this.root.position.set(0.65, -0.1, 0.4);
        this.root.rotation.set(0.2, Math.PI * 0.35, -0.15);

        if (this.onLoadCallback) this.onLoadCallback(this);
      },
      undefined,
      (err) => console.error('Error loading watch model:', err)
    );
  }

  setFinish(palette, key = null) {
    if (!palette) return;
    if (key) this.currentFinishKey = key;

    this.interactiveMeshes.forEach((mesh) => {
      // Preserve crystal glass and inner dial display face
      if (mesh === this.parts.glass || mesh === this.parts.dial) return;

      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        if (mat.color) {
          gsap.to(mat.color, {
            r: new THREE.Color(palette.metalColor).r,
            g: new THREE.Color(palette.metalColor).g,
            b: new THREE.Color(palette.metalColor).b,
            duration: 0.8,
            ease: 'power2.out',
          });
        }
        if (mat.metalness !== undefined) mat.metalness = palette.metalness;
        if (mat.roughness !== undefined) mat.roughness = palette.roughness;
      });
    });
  }

  cycleFinish() {
    const keys = Object.keys(FINISH_PALETTES);
    const currentIndex = keys.indexOf(this.currentFinishKey || 'silver');
    const nextIndex = (currentIndex + 1) % keys.length;
    const nextKey = keys[nextIndex];
    this.setFinish(FINISH_PALETTES[nextKey], nextKey);
    return nextKey;
  }

  toggleExplode() {
    this.isExploded = !this.isExploded;

    // Kill any running transform tweens to prevent conflict
    if (this.explodeTimeline) {
      this.explodeTimeline.kill();
    }

    this.explodeTimeline = gsap.timeline({
      defaults: { duration: 1.2, ease: 'power3.inOut' },
    });

    if (this.isExploded) {
      // Step 1: Sapphire crystal floats upwards with subtle, tight spacing
      if (this.parts.glass) {
        const defGlass = this.defaultTransforms.get(this.parts.glass);
        this.explodeTimeline.to(
          this.parts.glass.position,
          { y: (defGlass ? defGlass.position.y : 0) + 0.035, ease: 'back.out(1.1)' },
          0
        );
      }

      // Step 2: Dial plate hovers gently above the chassis
      if (this.parts.dial) {
        const defDial = this.defaultTransforms.get(this.parts.dial);
        this.explodeTimeline.to(
          this.parts.dial.position,
          { y: (defDial ? defDial.position.y : 0) + 0.018, ease: 'power2.out' },
          0.04
        );
      }

      // Step 3: Chassis body eases slightly downwards
      if (this.parts.body) {
        const defBody = this.defaultTransforms.get(this.parts.body);
        this.explodeTimeline.to(
          this.parts.body.position,
          { y: (defBody ? defBody.position.y : 0) - 0.01, ease: 'power2.out' },
          0.04
        );
      }

      // Step 2: Upper bracelet disengages slightly along Z
      if (this.parts.strapA) {
        const defA = this.defaultTransforms.get(this.parts.strapA);
        this.explodeTimeline.to(
          this.parts.strapA.position,
          {
            z: (defA ? defA.position.z : 0) - 0.08,
            y: (defA ? defA.position.y : 0) + 0.015,
            ease: 'power3.out',
          },
          0.08
        );
        this.explodeTimeline.to(
          this.parts.strapA.rotation,
          { x: (defA ? defA.rotation.x : 0) - 0.08, ease: 'power2.out' },
          0.08
        );
      }

      // Step 3: Lower bracelet disengages opposite Z direction
      if (this.parts.strapB) {
        const defB = this.defaultTransforms.get(this.parts.strapB);
        this.explodeTimeline.to(
          this.parts.strapB.position,
          {
            z: (defB ? defB.position.z : 0) + 0.08,
            y: (defB ? defB.position.y : 0) - 0.015,
            ease: 'power3.out',
          },
          0.12
        );
        this.explodeTimeline.to(
          this.parts.strapB.rotation,
          { x: (defB ? defB.rotation.x : 0) + 0.08, ease: 'power2.out' },
          0.12
        );
      }

      // Step 4: Security clasp detaches with tight offset
      if (this.parts.clasp) {
        const defClasp = this.defaultTransforms.get(this.parts.clasp);
        this.explodeTimeline.to(
          this.parts.clasp.position,
          {
            z: (defClasp ? defClasp.position.z : 0) - 0.12,
            y: (defClasp ? defClasp.position.y : 0) + 0.025,
            ease: 'power3.out',
          },
          0.16
        );
        this.explodeTimeline.to(
          this.parts.clasp.rotation,
          { x: (defClasp ? defClasp.rotation.x : 0) - 0.1, ease: 'power2.out' },
          0.16
        );
      }
    } else {
      // Coordinated re-assembly snapping smoothly back to defaultTransforms
      this.interactiveMeshes.forEach((mesh, index) => {
        const def = this.defaultTransforms.get(mesh);
        if (def) {
          const delay = index * 0.04;
          this.explodeTimeline.to(
            mesh.position,
            { x: def.position.x, y: def.position.y, z: def.position.z, ease: 'power3.inOut' },
            delay
          );
          this.explodeTimeline.to(
            mesh.rotation,
            { x: def.rotation.x, y: def.rotation.y, z: def.rotation.z, ease: 'power3.inOut' },
            delay
          );
        }
      });
    }

    return this.isExploded;
  }

  setAutoRotate(enabled) {
    this.autoRotate = enabled;
  }

  update() {
    if (this.autoRotate) {
      // Auto rotate watch smoothly around global Y axis
      this.spinAngle += this.autoRotateSpeed;
      this.spinPivot.rotation.y = this.spinAngle;
    } else if (this.spinAngle !== 0) {
      // Smoothly lerp back to neutral position on scroll up (nearest 2*PI multiple)
      const target = Math.round(this.spinAngle / (Math.PI * 2)) * (Math.PI * 2);
      this.spinAngle = THREE.MathUtils.lerp(this.spinAngle, target, 0.08);

      if (Math.abs(this.spinAngle - target) < 0.0005) {
        this.spinAngle = 0;
        this.spinPivot.rotation.y = 0;
      } else {
        this.spinPivot.rotation.y = this.spinAngle;
      }
    }
  }

  _createContactShadow() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 118);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
    grad.addColorStop(0.35, 'rgba(0, 0, 0, 0.4)');
    grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.12)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    const geo = new THREE.PlaneGeometry(0.75, 0.75);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      opacity: 0.85,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -0.145; // Just above pedestal top
    mesh.renderOrder = 0;
    return mesh;
  }
}
