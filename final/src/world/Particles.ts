import * as THREE from 'three';
import type { AudioUniforms } from '../audio/types';
import type { Debug } from '../utils/Debug';

/**
 * Particles manages three audio-reactive particle systems:
 * 1. Fireflies / Sparkles: Floating around vegetation and crystals, pulsing with HIGH / TREBLE frequencies.
 * 2. Sea Spray Mist: Billowing gently from ocean wave crests, amplified by BASS frequencies.
 * 3. Beat Embers: Golden floating spark embers emitted on BEAT hits.
 */
export class Particles {
  public readonly group: THREE.Group;

  // 1. Fireflies
  private firefliesMesh: THREE.Points | null = null;
  private firefliesPositions: Float32Array | null = null;
  private firefliesOriginalY: Float32Array | null = null;

  // 2. Sea Spray
  private sprayMesh: THREE.Points | null = null;
  private sprayPositions: Float32Array | null = null;
  private sprayVelocities: Float32Array | null = null;

  // 3. Beat Embers
  private embersMesh: THREE.Points | null = null;
  private embersPositions: Float32Array | null = null;
  private embersLifetimes: Float32Array | null = null;

  private readonly disposables: Array<{ dispose: () => void }> = [];

  constructor(
    private readonly scene: THREE.Scene,
    private readonly audioUniforms: AudioUniforms,
    debug?: Debug
  ) {
    this.group = new THREE.Group();
    this.group.name = 'ParticleEcosystem';

    this.createFireflies();
    this.createSeaSpray();
    this.createBeatEmbers();

    this.scene.add(this.group);

    if (debug?.active) {
      this.setupDebug(debug);
    }
  }

  /**
   * Helper to generate a soft circular glow sprite texture programmatically (no external image needed).
   */
  private createGlowTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.2, 'rgba(255, 240, 200, 0.8)');
    grad.addColorStop(0.5, 'rgba(255, 180, 100, 0.3)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.premultiplyAlpha = true;
    this.disposables.push(texture);
    return texture;
  }

  /**
   * 1. Fireflies dancing around trees & crystals (driven by Treble).
   */
  private createFireflies(): void {
    const count = 350;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const originalY = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const sprite = this.createGlowTexture();

    for (let i = 0; i < count; i++) {
      // Clustered around the island perimeter (radius 3 to 18, height 3 to 15)
      const angle = Math.random() * Math.PI * 2;
      const radius = 3.0 + Math.random() * 15.0;
      const x = Math.cos(angle) * radius;
      const y = 3.5 + Math.random() * 11.5;
      const z = Math.sin(angle) * radius;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      originalY[i] = y;

      // Color tint: mix between warm golden firefly and magical bioluminescent teal
      if (Math.random() > 0.4) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.85;
        colors[i * 3 + 2] = 0.35;
      } else {
        colors[i * 3] = 0.25;
        colors[i * 3 + 1] = 0.95;
        colors[i * 3 + 2] = 0.85;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.disposables.push(geometry);

    const material = new THREE.PointsMaterial({
      size: 0.65,
      map: sprite,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.85,
    });
    this.disposables.push(material);

    this.firefliesMesh = new THREE.Points(geometry, material);
    this.firefliesPositions = positions;
    this.firefliesOriginalY = originalY;
    this.group.add(this.firefliesMesh);
  }

  /**
   * 2. Sea Spray Mist around wave crests (driven by Bass).
   */
  private createSeaSpray(): void {
    const count = 500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    const sprite = this.createGlowTexture();

    for (let i = 0; i < count; i++) {
      // Distributed on ocean surface around island
      const angle = Math.random() * Math.PI * 2;
      const radius = 16.0 + Math.random() * 26.0;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = 0.1 + Math.random() * 1.5;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      velocities[i * 3] = (Math.random() - 0.5) * 0.4;
      velocities[i * 3 + 1] = 0.3 + Math.random() * 0.8;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.disposables.push(geometry);

    const material = new THREE.PointsMaterial({
      color: 0xd4f6ff,
      size: 0.85,
      map: sprite,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.45,
    });
    this.disposables.push(material);

    this.sprayMesh = new THREE.Points(geometry, material);
    this.sprayPositions = positions;
    this.sprayVelocities = velocities;
    this.group.add(this.sprayMesh);
  }

  /**
   * 3. Beat Embers that burst upward into the sky on beats.
   */
  private createBeatEmbers(): void {
    const count = 250;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);

    const sprite = this.createGlowTexture();

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 12.0;
      positions[i * 3 + 1] = -10.0; // parked below
      positions[i * 3 + 2] = (Math.random() - 0.5) * 12.0;
      lifetimes[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.disposables.push(geometry);

    const material = new THREE.PointsMaterial({
      color: 0xffaa33,
      size: 0.75,
      map: sprite,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.8,
    });
    this.disposables.push(material);

    this.embersMesh = new THREE.Points(geometry, material);
    this.embersPositions = positions;
    this.embersLifetimes = lifetimes;
    this.group.add(this.embersMesh);
  }

  /**
   * Per-frame particle simulation reacting to audio frequencies.
   */
  public update(delta: number, elapsed: number): void {
    const bass = this.audioUniforms.uBass.value;
    const treble = this.audioUniforms.uTreble.value;
    const beat = this.audioUniforms.uBeat.value;

    // 1. Fireflies Update: Swirling hover, size & opacity modulated by Treble
    if (this.firefliesMesh && this.firefliesPositions && this.firefliesOriginalY) {
      const pos = this.firefliesPositions;
      const count = pos.length / 3;
      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        // Circular orbit drift
        const x = pos[idx];
        const z = pos[idx + 2];
        const angle = 0.25 * delta;
        pos[idx] = x * Math.cos(angle) - z * Math.sin(angle);
        pos[idx + 2] = x * Math.sin(angle) + z * Math.cos(angle);

        // Vertical bobbing
        pos[idx + 1] = this.firefliesOriginalY[i] + Math.sin(elapsed * 2.0 + i) * 0.45;
      }
      this.firefliesMesh.geometry.attributes.position.needsUpdate = true;

      // Highs modulate firefly sparkle size & intensity
      const mat = this.firefliesMesh.material as THREE.PointsMaterial;
      mat.size = 0.55 + treble * 0.65;
      mat.opacity = 0.6 + treble * 0.4;
    }

    // 2. Sea Spray Update: Spray rises off wave crests, height & speed boosted by Bass
    if (this.sprayMesh && this.sprayPositions && this.sprayVelocities) {
      const pos = this.sprayPositions;
      const vel = this.sprayVelocities;
      const count = pos.length / 3;
      const bassBoost = 1.0 + bass * 2.0;

      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        pos[idx] += vel[idx] * delta;
        pos[idx + 1] += vel[idx + 1] * delta * bassBoost;
        pos[idx + 2] += vel[idx + 2] * delta;

        // Reset if too high
        if (pos[idx + 1] > 4.5 + bass * 3.0) {
          const angle = Math.random() * Math.PI * 2;
          const radius = 16.0 + Math.random() * 26.0;
          pos[idx] = Math.cos(angle) * radius;
          pos[idx + 1] = 0.1;
          pos[idx + 2] = Math.sin(angle) * radius;
        }
      }
      this.sprayMesh.geometry.attributes.position.needsUpdate = true;

      const sprayMat = this.sprayMesh.material as THREE.PointsMaterial;
      sprayMat.opacity = 0.3 + bass * 0.45;
    }

    // 3. Beat Embers Update: Shoot up into the air on beats
    if (this.embersMesh && this.embersPositions && this.embersLifetimes) {
      const pos = this.embersPositions;
      const life = this.embersLifetimes;
      const count = pos.length / 3;

      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        life[i] += delta * (0.8 + beat * 1.5);

        if (life[i] > 1.0) {
          life[i] = 0.0;
          if (beat > 0.3) {
            // Spawn new ember near island center
            const rad = Math.random() * 12.0;
            const ang = Math.random() * Math.PI * 2;
            pos[idx] = Math.cos(ang) * rad;
            pos[idx + 1] = 8.5 + Math.random() * 2.5;
            pos[idx + 2] = Math.sin(ang) * rad;
          } else {
            pos[idx + 1] = -10.0; // keep dormant
          }
        } else if (pos[idx + 1] > -5.0) {
          pos[idx + 1] += delta * 4.5;
          pos[idx] += Math.sin(elapsed * 3.0 + i) * delta * 0.8;
          pos[idx + 2] += Math.cos(elapsed * 3.0 + i) * delta * 0.8;
        }
      }
      this.embersMesh.geometry.attributes.position.needsUpdate = true;
    }
  }

  private setupDebug(debug: Debug): void {
    const folder = debug.addFolder('Particles');
    if (!folder) return;
    folder.add(this.group, 'visible').name('Particles Visible');
  }

  public destroy(): void {
    this.scene.remove(this.group);
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
