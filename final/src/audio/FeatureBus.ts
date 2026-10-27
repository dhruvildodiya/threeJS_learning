import * as THREE from 'three';
import { AudioEngine } from './AudioEngine';
import { BeatDetector, type BeatCallback } from './BeatDetector';
import type { AudioBands, AudioUniforms } from './types';

/**
 * FeatureBus computes smoothed, normalized audio frequency bands (bass, mid, treble, energy, beat),
 * manages dual-rate attack/release smoothing, and updates a 1D DataTexture spectrum for GLSL shaders.
 */
export class FeatureBus {
  public readonly engine: AudioEngine;
  public readonly beatDetector: BeatDetector;

  // Bands data
  public bands: AudioBands = {
    bass: 0,
    mid: 0,
    treble: 0,
    energy: 0,
    beat: 0,
    beatConfidence: 0,
    rawBass: 0,
    rawMid: 0,
    rawTreble: 0,
    rawEnergy: 0,
  };

  // Smoothing rates
  public attackSpeed = 18.0;   // rapid response to incoming peaks
  public releaseSpeed = 4.0;   // gentle decay for visual continuity

  // 1D Spectrum Texture for GLSL Shaders (256x1 Red channel)
  public readonly spectrumWidth = 256;
  public readonly spectrumData: Uint8Array;
  public readonly spectrumTexture: THREE.DataTexture;

  // Shared uniforms used across ocean, sky, island, vegetation shaders
  public readonly uniforms: AudioUniforms;

  // Bin ranges (calculated from 44.1kHz or 48kHz audio context)
  private binBassEnd = 12;      // ~250 Hz
  private binMidEnd = 96;       // ~2000 Hz
  private binTrebleEnd = 650;   // ~14000 Hz

  constructor(engine: AudioEngine) {
    this.engine = engine;
    this.beatDetector = new BeatDetector();

    // Setup 1D Spectrum DataTexture
    this.spectrumData = new Uint8Array(this.spectrumWidth);
    this.spectrumTexture = new THREE.DataTexture(
      this.spectrumData,
      this.spectrumWidth,
      1,
      THREE.RedFormat,
      THREE.UnsignedByteType
    );
    this.spectrumTexture.magFilter = THREE.LinearFilter;
    this.spectrumTexture.minFilter = THREE.LinearFilter;
    this.spectrumTexture.generateMipmaps = false;
    this.spectrumTexture.needsUpdate = true;

    // Shared GLSL uniforms
    this.uniforms = {
      uBass: { value: 0.0 },
      uMid: { value: 0.0 },
      uTreble: { value: 0.0 },
      uEnergy: { value: 0.0 },
      uBeat: { value: 0.0 },
      uTime: { value: 0.0 },
      uSpectrum: { value: this.spectrumTexture },
    };
  }

  public onBeat(callback: BeatCallback): () => void {
    return this.beatDetector.onBeat(callback);
  }

  /**
   * Update audio features each frame.
   */
  public update(delta: number, elapsed: number): void {
    this.engine.update();

    const freq = this.engine.frequencyData;
    const binCount = freq.length;

    // If context isn't running or data is empty, decay all bands gently to 0
    if (!this.engine.getState().isPlaying && this.engine.getState().sourceType !== 'mic') {
      this.decayBands(delta);
      this.updateUniforms(elapsed);
      return;
    }

    // 1. Calculate raw band energies
    let sumBass = 0;
    let countBass = 0;
    for (let i = 1; i <= Math.min(this.binBassEnd, binCount - 1); i++) {
      sumBass += freq[i];
      countBass++;
    }
    const rawBass = countBass > 0 ? (sumBass / countBass) / 255 : 0;

    let sumMid = 0;
    let countMid = 0;
    for (let i = this.binBassEnd + 1; i <= Math.min(this.binMidEnd, binCount - 1); i++) {
      sumMid += freq[i];
      countMid++;
    }
    const rawMid = countMid > 0 ? (sumMid / countMid) / 255 : 0;

    let sumTreble = 0;
    let countTreble = 0;
    for (let i = this.binMidEnd + 1; i <= Math.min(this.binTrebleEnd, binCount - 1); i++) {
      sumTreble += freq[i];
      countTreble++;
    }
    const rawTreble = countTreble > 0 ? (sumTreble / countTreble) / 255 : 0;

    // Overall energy (RMS)
    let sumSq = 0;
    for (let i = 0; i < binCount; i++) {
      const norm = freq[i] / 255;
      sumSq += norm * norm;
    }
    const rawEnergy = Math.sqrt(sumSq / binCount);

    this.bands.rawBass = rawBass;
    this.bands.rawMid = rawMid;
    this.bands.rawTreble = rawTreble;
    this.bands.rawEnergy = rawEnergy;

    // 2. Dual-rate Attack/Release Smoothing (fast rise, smooth decay)
    this.bands.bass = this.smooth(this.bands.bass, rawBass, delta);
    this.bands.mid = this.smooth(this.bands.mid, rawMid, delta);
    this.bands.treble = this.smooth(this.bands.treble, rawTreble, delta);
    this.bands.energy = this.smooth(this.bands.energy, rawEnergy, delta);

    // 3. Beat Detection on rawBass
    this.beatDetector.update(rawBass, delta);
    this.bands.beat = this.beatDetector.beatImpulse;
    this.bands.beatConfidence = this.beatDetector.beatConfidence;

    // 4. Update 1D Spectrum Texture
    const step = binCount / this.spectrumWidth;
    for (let i = 0; i < this.spectrumWidth; i++) {
      const srcIndex = Math.min(binCount - 1, Math.floor(i * step));
      // Lightly smooth with current value for visual shimmer
      const targetVal = freq[srcIndex];
      const curVal = this.spectrumData[i];
      const rate = targetVal > curVal ? 0.6 : 0.2;
      this.spectrumData[i] = Math.round(curVal + (targetVal - curVal) * rate);
    }
    this.spectrumTexture.needsUpdate = true;

    // 5. Update Uniforms
    this.updateUniforms(elapsed);
  }

  private smooth(current: number, target: number, delta: number): number {
    const rate = target > current ? this.attackSpeed : this.releaseSpeed;
    return THREE.MathUtils.clamp(current + (target - current) * Math.min(1.0, delta * rate), 0, 1);
  }

  private decayBands(delta: number): void {
    const rate = delta * this.releaseSpeed;
    this.bands.bass = Math.max(0, this.bands.bass - rate);
    this.bands.mid = Math.max(0, this.bands.mid - rate);
    this.bands.treble = Math.max(0, this.bands.treble - rate);
    this.bands.energy = Math.max(0, this.bands.energy - rate);
    this.bands.beat = Math.max(0, this.bands.beat - delta * 4.0);

    for (let i = 0; i < this.spectrumWidth; i++) {
      this.spectrumData[i] = Math.max(0, Math.floor(this.spectrumData[i] * 0.9));
    }
    this.spectrumTexture.needsUpdate = true;
  }

  private updateUniforms(elapsed: number): void {
    this.uniforms.uBass.value = this.bands.bass;
    this.uniforms.uMid.value = this.bands.mid;
    this.uniforms.uTreble.value = this.bands.treble;
    this.uniforms.uEnergy.value = this.bands.energy;
    this.uniforms.uBeat.value = this.bands.beat;
    this.uniforms.uTime.value = elapsed;
  }

  public destroy(): void {
    this.spectrumTexture.dispose();
  }
}
