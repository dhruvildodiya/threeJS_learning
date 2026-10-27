import type * as THREE from 'three';

export interface AudioBands {
  bass: number;     // 20 - 250 Hz (0 to 1)
  mid: number;      // 250 - 2000 Hz (0 to 1)
  treble: number;   // 2000 - 14000 Hz (0 to 1)
  energy: number;   // Overall RMS/spectral volume (0 to 1)
  beat: number;     // Decaying beat impulse (0 to 1)
  beatConfidence: number; // Quality of detected beat (0 to 1)
  rawBass: number;
  rawMid: number;
  rawTreble: number;
  rawEnergy: number;
}

export interface AudioUniforms {
  uBass: { value: number };
  uMid: { value: number };
  uTreble: { value: number };
  uEnergy: { value: number };
  uBeat: { value: number };
  uTime: { value: number };
  uSpectrum: { value: THREE.DataTexture | null };
}

export type AudioSourceType = 'demo' | 'upload' | 'mic' | 'none';

export interface AudioState {
  isPlaying: boolean;
  sourceType: AudioSourceType;
  volume: number;
  currentTime: number;
  duration: number;
  trackName: string;
}
