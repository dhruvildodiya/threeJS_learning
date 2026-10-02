// =============================================================================
// DAY 2: Audio Analysis (Topic-by-Topic Practice)
// =============================================================================

// DOM Elements
const playBtn = document.getElementById('playBtn');
const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');
const contextState = document.getElementById('contextState');
const playerStatus = document.getElementById('playerStatus');

// Visualizer UI Elements
const canvas = document.getElementById('waveformCanvas');
const canvasCtx = canvas.getContext('2d');
const bassBar = document.getElementById('bassBar');
const bassVal = document.getElementById('bassVal');
const midBar = document.getElementById('midBar');
const midVal = document.getElementById('midVal');
const highBar = document.getElementById('highBar');
const highVal = document.getElementById('highVal');
const volBar = document.getElementById('volBar');
const volVal = document.getElementById('volVal');

// -----------------------------------------------------------------------------
// Web Audio API State
// -----------------------------------------------------------------------------
let audioContext = null;
let gainNode = null;
let audioBuffer = null;
let sourceNode = null;
let isPlaying = false;

// -----------------------------------------------------------------------------
// TOPIC 1 & 2: AnalyserNode & FFT Configuration
// -----------------------------------------------------------------------------
let analyserNode = null;
let frequencyData = null;  // Uint8Array for frequency values (0 - 255)
let timeDomainData = null; // Uint8Array for waveform values (0 - 255, center 128)

function setupAudioGraph() {
  if (audioContext) return;

  // 1. Create AudioContext
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  audioContext = new AudioContextClass();

  // 2. Create AnalyserNode (TOPIC 1: AnalyserNode)
  analyserNode = audioContext.createAnalyser();

  // TOPIC 2: FFT (Fast Fourier Transform)
  // fftSize defines how many audio samples are analyzed at once.
  // Must be a power of 2 (e.g., 256, 512, 1024, 2048).
  analyserNode.fftSize = 1024;

  // smoothingTimeConstant: 0.0 (instant/jittery) to 1.0 (very slow/laggy).
  // 0.8 gives smooth, pleasing visual transitions.
  analyserNode.smoothingTimeConstant = 0.8;

  // frequencyBinCount is ALWAYS exactly half of fftSize (1024 / 2 = 512 bins).
  const bufferLength = analyserNode.frequencyBinCount;

  // TOPIC 3: Typed array for Frequency Data (Equalizer spectrum)
  frequencyData = new Uint8Array(bufferLength);

  // TOPIC 4: Typed array for Time-Domain Data (Oscilloscope waveform)
  timeDomainData = new Uint8Array(bufferLength);

  // 3. Create GainNode (Volume)
  gainNode = audioContext.createGain();
  gainNode.gain.value = Number.parseFloat(volumeSlider.value);

  // 4. Wire the Audio Routing Pipeline:
  // [AnalyserNode] ──► [GainNode] ──► [Destination (Speakers)]
  analyserNode.connect(gainNode);
  gainNode.connect(audioContext.destination);

  updateUI();
}

// -----------------------------------------------------------------------------
// LOAD AUDIO FILE
// -----------------------------------------------------------------------------
async function loadAudioFile() {
  playerStatus.innerText = 'Loading track...';

  const response = await fetch('/The Rare Occasions - Notion.mp3');
  const arrayBuffer = await response.arrayBuffer();
  audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  playerStatus.innerText = 'Track loaded! Ready to analyze.';
}

// -----------------------------------------------------------------------------
// START & STOP PLAYBACK
// -----------------------------------------------------------------------------
function startPlayback() {
  sourceNode = audioContext.createBufferSource();
  sourceNode.buffer = audioBuffer;
  sourceNode.loop = true;

  // Connect: [SourceNode] ──► [AnalyserNode] ──► [GainNode] ──► [Speakers]
  sourceNode.connect(analyserNode);

  sourceNode.start(0);

  isPlaying = true;
  playBtn.innerText = '⏸ Pause';
  playerStatus.innerText = 'Playing & Analyzing live audio...';
  updateUI();

  // Start the analysis animation loop
  requestAnimationFrame(analyzeAudioFrame);
}

function stopPlayback() {
  if (sourceNode) {
    sourceNode.stop();
    sourceNode.disconnect();
    sourceNode = null;
  }

  isPlaying = false;
  playBtn.innerText = '▶ Play';
  playerStatus.innerText = 'Paused';
  updateUI();
}

// -----------------------------------------------------------------------------
// TOPIC 3, 4 & 5: Live Analysis Loop
// -----------------------------------------------------------------------------
function analyzeAudioFrame() {
  if (!isPlaying) return;

  // Keep the loop running at 60fps
  requestAnimationFrame(analyzeAudioFrame);

  // ---------------------------------------------------------------------------
  // TOPIC 4: Time-Domain Data (Oscilloscope Waveform)
  // ---------------------------------------------------------------------------
  // getByteTimeDomainData fills the array with wave displacement values (0 to 255).
  // 128 means no sound (flat line). <128 is negative wave, >128 is positive wave.
  analyserNode.getByteTimeDomainData(timeDomainData);
  drawOscilloscope(timeDomainData);

  // ---------------------------------------------------------------------------
  // TOPIC 3: Frequency Data (FFT Spectrum)
  // ---------------------------------------------------------------------------
  // getByteFrequencyData fills the array with loudness values (0 = silence, 255 = max loudness)
  // from lowest pitch (bin 0) to highest pitch (bin 511).
  analyserNode.getByteFrequencyData(frequencyData);

  // ---------------------------------------------------------------------------
  // TOPIC 5: Frequency Ranges (Bass, Mid, High, Volume)
  // ---------------------------------------------------------------------------
  // At sampleRate = 44,100 Hz and fftSize = 1024:
  // Each bin covers ~43 Hz (44100 / 1024).

  // 1. Bass: 20 Hz to 250 Hz (Bins 1 to 6)
  const bass = calculateAverage(frequencyData, 1, 6);

  // 2. Mid: 250 Hz to 4,000 Hz (Bins 6 to 92)
  const mid = calculateAverage(frequencyData, 6, 92);

  // 3. High: 4,000 Hz to 16,000 Hz (Bins 92 to 370)
  const high = calculateAverage(frequencyData, 92, 370);

  // 4. Overall Volume: Average of all frequency bins
  const volume = calculateAverage(frequencyData, 0, frequencyData.length);

  // Update UI meter bars
  updateMeters(bass, mid, high, volume);
}

// Helper: computes average value between startBin and endBin
function calculateAverage(dataArray, startBin, endBin) {
  let sum = 0;
  const count = endBin - startBin;
  for (let i = startBin; i < endBin; i++) {
    sum += dataArray[i];
  }
  return sum / count; // Returns average 0 to 255
}

// Helper: updates the visual UI meters
function updateMeters(bass, mid, high, volume) {
  // Convert 0-255 to percentage 0-100%
  const bassPct = Math.round((bass / 255) * 100);
  const midPct = Math.round((mid / 255) * 100);
  const highPct = Math.round((high / 255) * 100);
  const volPct = Math.round((volume / 255) * 100);

  bassBar.style.width = `${bassPct}%`;
  bassVal.innerText = bassPct;

  midBar.style.width = `${midPct}%`;
  midVal.innerText = midPct;

  highBar.style.width = `${highPct}%`;
  highVal.innerText = highPct;

  volBar.style.width = `${volPct}%`;
  volVal.innerText = volPct;
}

// -----------------------------------------------------------------------------
// DRAW OSCILLOSCOPE (Time-Domain Waveform on 2D Canvas)
// -----------------------------------------------------------------------------
function drawOscilloscope(data) {
  const width = canvas.width;
  const height = canvas.height;

  // Clear background
  canvasCtx.fillStyle = '#0a0f1d';
  canvasCtx.fillRect(0, 0, width, height);

  // Wave line styling
  canvasCtx.lineWidth = 2;
  canvasCtx.strokeStyle = '#38bdf8';
  canvasCtx.beginPath();

  const sliceWidth = width / data.length;
  let x = 0;

  for (let i = 0; i < data.length; i++) {
    // Value is 0 to 255. Normalize to 0.0 to 1.0
    const v = data[i] / 128.0;
    const y = (v * height) / 2;

    if (i === 0) {
      canvasCtx.moveTo(x, y);
    } else {
      canvasCtx.lineTo(x, y);
    }

    x += sliceWidth;
  }

  canvasCtx.stroke();
}

// -----------------------------------------------------------------------------
// USER CONTROLS: Play / Pause Button
// -----------------------------------------------------------------------------
playBtn.addEventListener('click', async () => {
  setupAudioGraph();

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  if (!audioBuffer) {
    await loadAudioFile();
  }

  if (!isPlaying) {
    startPlayback();
  } else {
    stopPlayback();
  }
});

// -----------------------------------------------------------------------------
// USER CONTROLS: Volume Slider
// -----------------------------------------------------------------------------
volumeSlider.addEventListener('input', (event) => {
  const volume = Number.parseFloat(event.target.value);
  volumeValue.innerText = `${Math.round(volume * 100)}%`;

  if (gainNode) {
    gainNode.gain.value = volume;
  }
});

function updateUI() {
  if (audioContext) {
    contextState.innerText = audioContext.state;
  }
}
