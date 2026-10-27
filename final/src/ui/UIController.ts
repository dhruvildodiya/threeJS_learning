import type { Experience } from '../core/Experience';
import type { AudioState } from '../audio/types';

/**
 * UIController bridges the Experience engine (AudioEngine, FeatureBus, CameraRig, Quality)
 * with the HTML DOM interface.
 */
export class UIController {
  private experience: Experience;

  // DOM Elements
  private startModal: HTMLElement | null = null;
  private btnStartDemo: HTMLButtonElement | null = null;
  private btnStartUpload: HTMLButtonElement | null = null;
  private btnStartMic: HTMLButtonElement | null = null;
  private btnStartSilent: HTMLButtonElement | null = null;
  private fileInput: HTMLInputElement | null = null;

  // HUD Elements
  private btnPlayPause: HTMLButtonElement | null = null;
  private btnSourceDemo: HTMLButtonElement | null = null;
  private btnSourceUpload: HTMLButtonElement | null = null;
  private btnSourceMic: HTMLButtonElement | null = null;
  private timeDisplay: HTMLElement | null = null;
  private progressBar: HTMLInputElement | null = null;
  private volumeSlider: HTMLInputElement | null = null;
  private btnMute: HTMLButtonElement | null = null;
  private trackTitle: HTMLElement | null = null;

  // Visualizer Bars
  private meterBass: HTMLElement | null = null;
  private meterMid: HTMLElement | null = null;
  private meterHigh: HTMLElement | null = null;
  private meterVol: HTMLElement | null = null;
  private beatIndicator: HTMLElement | null = null;

  // Camera & Settings buttons
  private btnCamCinematic: HTMLButtonElement | null = null;
  private btnCamFree: HTMLButtonElement | null = null;
  private shotButtons: NodeListOf<HTMLButtonElement> | null = null;
  private qualitySelect: HTMLSelectElement | null = null;
  private toggleBloom: HTMLInputElement | null = null;
  private btnToggleDebug: HTMLButtonElement | null = null;

  private isDraggingProgress = false;

  constructor(experience: Experience) {
    this.experience = experience;
    this.queryElements();
    this.bindEvents();
    this.bindAudioListeners();
  }

  private queryElements(): void {
    // Modal
    this.startModal = document.querySelector('#start-modal');
    this.btnStartDemo = document.querySelector('#btn-start-demo');
    this.btnStartUpload = document.querySelector('#btn-start-upload');
    this.btnStartMic = document.querySelector('#btn-start-mic');
    this.btnStartSilent = document.querySelector('#btn-start-silent');
    this.fileInput = document.querySelector('#audio-file-input');

    // Player HUD
    this.btnPlayPause = document.querySelector('#btn-play-pause');
    this.btnSourceDemo = document.querySelector('#btn-source-demo');
    this.btnSourceUpload = document.querySelector('#btn-source-upload');
    this.btnSourceMic = document.querySelector('#btn-source-mic');
    this.timeDisplay = document.querySelector('#time-display');
    this.progressBar = document.querySelector('#audio-progress');
    this.volumeSlider = document.querySelector('#volume-slider');
    this.btnMute = document.querySelector('#btn-mute');
    this.trackTitle = document.querySelector('#track-title');

    // Frequency meters
    this.meterBass = document.querySelector('#meter-bass');
    this.meterMid = document.querySelector('#meter-mid');
    this.meterHigh = document.querySelector('#meter-high');
    this.meterVol = document.querySelector('#meter-vol');
    this.beatIndicator = document.querySelector('#beat-indicator');

    // Camera & Controls
    this.btnCamCinematic = document.querySelector('#btn-cam-cinematic');
    this.btnCamFree = document.querySelector('#btn-cam-free');
    this.shotButtons = document.querySelectorAll('.btn-shot');
    this.qualitySelect = document.querySelector('#quality-select');
    this.toggleBloom = document.querySelector('#toggle-bloom');
    this.btnToggleDebug = document.querySelector('#btn-toggle-debug');
  }

  private bindEvents(): void {
    // Start Modal Handlers
    this.btnStartDemo?.addEventListener('click', async () => {
      this.hideModal();
      await this.experience.audioEngine.playDefaultTrack();
    });

    this.btnStartUpload?.addEventListener('click', () => {
      this.fileInput?.click();
    });

    this.btnStartMic?.addEventListener('click', async () => {
      this.hideModal();
      try {
        await this.experience.audioEngine.startMicrophone();
      } catch {
        alert('Could not access microphone. Switching to demo track.');
        await this.experience.audioEngine.playDefaultTrack();
      }
    });

    this.btnStartSilent?.addEventListener('click', () => {
      this.hideModal();
    });

    // File input handler
    this.fileInput?.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        this.hideModal();
        await this.experience.audioEngine.playUploadedFile(file);
      }
    });

    // Play/Pause
    this.btnPlayPause?.addEventListener('click', () => {
      this.experience.audioEngine.togglePlay();
    });

    // Source buttons in HUD
    this.btnSourceDemo?.addEventListener('click', () => {
      this.experience.audioEngine.playDefaultTrack();
    });

    this.btnSourceUpload?.addEventListener('click', () => {
      this.fileInput?.click();
    });

    this.btnSourceMic?.addEventListener('click', async () => {
      try {
        await this.experience.audioEngine.startMicrophone();
      } catch {
        alert('Microphone access denied or unavailable.');
      }
    });

    // Progress bar seeking
    this.progressBar?.addEventListener('mousedown', () => {
      this.isDraggingProgress = true;
    });
    this.progressBar?.addEventListener('input', () => {
      this.isDraggingProgress = true;
    });
    this.progressBar?.addEventListener('change', () => {
      if (this.progressBar) {
        const val = parseFloat(this.progressBar.value) / 100;
        this.experience.audioEngine.seek(val);
        this.isDraggingProgress = false;
      }
    });

    // Volume Slider
    this.volumeSlider?.addEventListener('input', () => {
      if (this.volumeSlider) {
        const val = parseFloat(this.volumeSlider.value) / 100;
        this.experience.audioEngine.setVolume(val);
      }
    });

    // Mute
    this.btnMute?.addEventListener('click', () => {
      this.experience.audioEngine.toggleMute();
    });

    // Camera Mode
    this.btnCamCinematic?.addEventListener('click', () => {
      this.experience.cameraRig.setMode('cinematic');
      this.btnCamCinematic?.classList.add('active');
      this.btnCamFree?.classList.remove('active');
    });

    this.btnCamFree?.addEventListener('click', () => {
      this.experience.cameraRig.setMode('free');
      this.btnCamFree?.classList.add('active');
      this.btnCamCinematic?.classList.remove('active');
    });

    // Preset shots
    this.shotButtons?.forEach((btn) => {
      btn.addEventListener('click', () => {
        const shotKey = btn.dataset.shot;
        if (shotKey) {
          this.experience.cameraRig.setShot(shotKey);
          this.shotButtons?.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this.btnCamCinematic?.classList.add('active');
          this.btnCamFree?.classList.remove('active');
        }
      });
    });

    // Quality Presets
    this.qualitySelect?.addEventListener('change', () => {
      if (this.qualitySelect) {
        this.experience.setQuality(this.qualitySelect.value as 'low' | 'medium' | 'high');
      }
    });

    // Bloom Toggle
    this.toggleBloom?.addEventListener('change', () => {
      if (this.toggleBloom) {
        this.experience.postprocessing.setBloom(this.toggleBloom.checked);
      }
    });

    // Debug Panel Toggle
    this.btnToggleDebug?.addEventListener('click', () => {
      if (this.experience.debug.gui) {
        this.experience.debug.gui.show(this.experience.debug.gui._hidden);
      }
    });
  }

  private hideModal(): void {
    if (this.startModal) {
      this.startModal.classList.add('hidden');
      setTimeout(() => {
        if (this.startModal) this.startModal.style.display = 'none';
      }, 500);
    }
  }

  private bindAudioListeners(): void {
    this.experience.audioEngine.onStateChange((state) => {
      this.updateStateUI(state);
    });

    // Beat trigger visual flash
    this.experience.featureBus.onBeat(() => {
      if (this.beatIndicator) {
        this.beatIndicator.classList.add('pulse');
        setTimeout(() => this.beatIndicator?.classList.remove('pulse'), 120);
      }
    });
  }

  private updateStateUI(state: AudioState): void {
    if (this.btnPlayPause) {
      this.btnPlayPause.innerHTML = state.isPlaying
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
    }

    if (this.trackTitle) {
      this.trackTitle.textContent = state.trackName;
    }

    if (this.timeDisplay && state.duration > 0) {
      const cur = this.formatTime(state.currentTime);
      const total = this.formatTime(state.duration);
      this.timeDisplay.textContent = `${cur} / ${total}`;
    }

    if (this.progressBar && !this.isDraggingProgress && state.duration > 0) {
      const pct = (state.currentTime / state.duration) * 100;
      this.progressBar.value = pct.toFixed(1);
    }

    // Active source pill
    this.btnSourceDemo?.classList.toggle('active', state.sourceType === 'demo');
    this.btnSourceUpload?.classList.toggle('active', state.sourceType === 'upload');
    this.btnSourceMic?.classList.toggle('active', state.sourceType === 'mic');
  }

  /**
   * Per-frame visualizer meters update.
   */
  public update(): void {
    const bands = this.experience.featureBus.bands;

    if (this.meterBass) {
      this.meterBass.style.width = `${Math.min(100, Math.round(bands.bass * 100))}%`;
    }
    if (this.meterMid) {
      this.meterMid.style.width = `${Math.min(100, Math.round(bands.mid * 100))}%`;
    }
    if (this.meterHigh) {
      this.meterHigh.style.width = `${Math.min(100, Math.round(bands.treble * 100))}%`;
    }
    if (this.meterVol) {
      this.meterVol.style.width = `${Math.min(100, Math.round(bands.energy * 100))}%`;
    }
  }

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
}
