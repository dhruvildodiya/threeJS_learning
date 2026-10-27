import type { AudioSourceType, AudioState } from './types';

export type AudioStateChangeCallback = (state: AudioState) => void;

/**
 * AudioEngine manages Web Audio Context, AnalyserNode, audio sources
 * (Default audio file, custom uploaded files, and live microphone input).
 */
export class AudioEngine {
  public context: AudioContext | null = null;
  public analyser: AnalyserNode | null = null;
  public gainNode: GainNode | null = null;

  // Source nodes
  private mediaElementSource: MediaElementAudioSourceNode | null = null;
  private micStreamSource: MediaStreamAudioSourceNode | null = null;
  private micStream: MediaStream | null = null;

  // Audio element for file playback
  private audioElement: HTMLAudioElement;

  // Analysis data buffers (fftSize 2048 => 1024 bins)
  public readonly frequencyData: Uint8Array<ArrayBuffer>;
  public readonly timeDomainData: Uint8Array<ArrayBuffer>;

  // State
  private currentSource: AudioSourceType = 'none';
  private trackName = 'Default Track (Ocean Ambience)';
  private volume = 0.8;
  private isMuted = false;
  private stateChangeListeners: Set<AudioStateChangeCallback> = new Set();

  constructor() {
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.loop = true;
    this.audioElement.preload = 'auto';

    // 1024 frequency bins (fftSize = 2048)
    this.frequencyData = new Uint8Array(new ArrayBuffer(1024));
    this.timeDomainData = new Uint8Array(new ArrayBuffer(1024));

    this.bindAudioElementEvents();
  }

  private bindAudioElementEvents(): void {
    this.audioElement.addEventListener('play', () => this.notifyState());
    this.audioElement.addEventListener('pause', () => this.notifyState());
    this.audioElement.addEventListener('timeupdate', () => this.notifyState());
    this.audioElement.addEventListener('ended', () => this.notifyState());
    this.audioElement.addEventListener('error', (e) => {
      console.warn('Audio playback error:', e);
      this.notifyState();
    });
  }

  /**
   * Initializes or resumes the AudioContext on user interaction.
   */
  public async ensureContext(): Promise<AudioContext> {
    if (!this.context) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.context = new AudioCtx();

      // Master Gain
      this.gainNode = this.context.createGain();
      this.gainNode.gain.setValueAtTime(this.volume, this.context.currentTime);

      // Analyser Node
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.minDecibels = -90;
      this.analyser.maxDecibels = -10;
      this.analyser.smoothingTimeConstant = 0.8;

      // Pipeline: Gain -> Analyser -> Speakers
      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.context.destination);
    }

    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    return this.context;
  }

  /**
   * Play the default demo track.
   */
  public async playDefaultTrack(url = '/audio/default_track.wav'): Promise<void> {
    await this.ensureContext();
    this.disconnectCurrentSource();

    this.currentSource = 'demo';
    this.trackName = 'Ocean Melodies (Demo Track)';

    this.audioElement.src = url;
    this.connectAudioElement();

    try {
      await this.audioElement.play();
    } catch (err) {
      console.warn('Playback failed (needs user gesture):', err);
    }

    this.notifyState();
  }

  /**
   * Load and play an uploaded audio file.
   */
  public async playUploadedFile(file: File): Promise<void> {
    await this.ensureContext();
    this.disconnectCurrentSource();

    this.currentSource = 'upload';
    this.trackName = file.name;

    const url = URL.createObjectURL(file);
    this.audioElement.src = url;
    this.connectAudioElement();

    try {
      await this.audioElement.play();
    } catch (err) {
      console.warn('File playback failed:', err);
    }

    this.notifyState();
  }

  /**
   * Switch to live microphone input.
   */
  public async startMicrophone(): Promise<void> {
    await this.ensureContext();
    if (!this.context || !this.gainNode) return;

    this.disconnectCurrentSource();

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      this.currentSource = 'mic';
      this.trackName = 'Live Microphone Input';

      this.micStreamSource = this.context.createMediaStreamSource(this.micStream);
      // Connect to analyser via gain, but DO NOT route to destination to prevent feedback howling!
      if (this.analyser) {
        this.micStreamSource.connect(this.analyser);
      }

      this.notifyState();
    } catch (err) {
      console.error('Microphone access denied or unavailable:', err);
      throw err;
    }
  }

  private connectAudioElement(): void {
    if (!this.context || !this.gainNode) return;

    if (!this.mediaElementSource) {
      this.mediaElementSource = this.context.createMediaElementSource(this.audioElement);
    }

    this.mediaElementSource.disconnect();
    this.mediaElementSource.connect(this.gainNode);
  }

  private disconnectCurrentSource(): void {
    if (this.audioElement) {
      this.audioElement.pause();
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }

    if (this.micStreamSource) {
      this.micStreamSource.disconnect();
      this.micStreamSource = null;
    }
  }

  /**
   * Play / Pause toggle for file-based tracks.
   */
  public async togglePlay(): Promise<void> {
    await this.ensureContext();

    if (this.currentSource === 'none') {
      await this.playDefaultTrack();
      return;
    }

    if (this.currentSource === 'mic') {
      return; // Mic is continuous
    }

    if (this.audioElement.paused) {
      await this.audioElement.play();
    } else {
      this.audioElement.pause();
    }

    this.notifyState();
  }

  /**
   * Pause playback.
   */
  public pause(): void {
    if (this.audioElement && !this.audioElement.paused) {
      this.audioElement.pause();
      this.notifyState();
    }
  }

  /**
   * Set playback position (0 to 1).
   */
  public seek(normalized: number): void {
    if (this.audioElement.duration && isFinite(this.audioElement.duration)) {
      this.audioElement.currentTime = normalized * this.audioElement.duration;
      this.notifyState();
    }
  }

  /**
   * Set master volume (0 to 1).
   */
  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode && this.context) {
      this.gainNode.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.context.currentTime);
    }
    this.notifyState();
  }

  public getVolume(): number {
    return this.volume;
  }

  /**
   * Toggle mute.
   */
  public toggleMute(): void {
    this.isMuted = !this.isMuted;
    if (this.gainNode && this.context) {
      this.gainNode.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.context.currentTime);
    }
    this.notifyState();
  }

  /**
   * Update internal frequency data from AnalyserNode. Call per-frame in RAF.
   */
  public update(): void {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.frequencyData);
      this.analyser.getByteTimeDomainData(this.timeDomainData);
    }
  }

  public getState(): AudioState {
    const isPlaying = this.currentSource === 'mic' 
      ? true 
      : (!this.audioElement.paused && !this.audioElement.ended && this.audioElement.currentTime > 0);

    return {
      isPlaying,
      sourceType: this.currentSource,
      volume: this.volume,
      currentTime: this.audioElement.currentTime || 0,
      duration: isFinite(this.audioElement.duration) ? this.audioElement.duration : 0,
      trackName: this.trackName,
    };
  }

  public onStateChange(callback: AudioStateChangeCallback): () => void {
    this.stateChangeListeners.add(callback);
    return () => this.stateChangeListeners.delete(callback);
  }

  private notifyState(): void {
    const state = this.getState();
    for (const listener of this.stateChangeListeners) {
      listener(state);
    }
  }

  public destroy(): void {
    this.disconnectCurrentSource();
    if (this.context && this.context.state !== 'closed') {
      this.context.close();
    }
    this.stateChangeListeners.clear();
  }
}
