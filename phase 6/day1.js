// =============================================================================
// DAY 1: Web Audio API Fundamentals (Simplest Starter Code)
// =============================================================================

// HTML UI Elements
const playBtn = document.getElementById('playBtn');
const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');
const contextState = document.getElementById('contextState');
const playerStatus = document.getElementById('playerStatus');

// -----------------------------------------------------------------------------
// Web Audio API Variables
// -----------------------------------------------------------------------------
let audioContext = null;       // The central audio engine
let gainNode = null;       // Controls volume
let audioBuffer = null;    // Decoded audio data in memory
let sourceNode = null;     // Node that plays the AudioBuffer
let isPlaying = false;     // Playback state tracker

// -----------------------------------------------------------------------------
// STEP 1: Initialize AudioContext & GainNode
// -----------------------------------------------------------------------------
function setupAudioGraph() {
  if (audioContext) return; // Only create once

  // 1. Create the AudioContext (the audio pipeline manager)
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  audioContext = new AudioContextClass();

  // 2. Create a GainNode (used to control volume)
  gainNode = audioContext.createGain();
  gainNode.gain.value = Number.parseFloat(volumeSlider.value); // Initial volume (0.8 = 80%)

  // 3. Connect: [GainNode] ──► [Destination (Speakers)]
  gainNode.connect(audioContext.destination);

  updateUI();
}

// -----------------------------------------------------------------------------
// STEP 2: Load the Static Audio File (The Rare Occasions - Notion.mp3)
// -----------------------------------------------------------------------------
async function loadAudioFile() {
  playerStatus.innerText = 'Loading audio file...';

  // 1. Fetch the static audio file from the public folder
  const response = await fetch('/The Rare Occasions - Notion.mp3');

  // 2. Get the raw binary data (ArrayBuffer)
  const arrayBuffer = await response.arrayBuffer();

  // 3. Decode the raw data into an AudioBuffer (uncompressed audio in memory)
  audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  playerStatus.innerText = 'Audio loaded! Ready to play.';
}

// -----------------------------------------------------------------------------
// STEP 3: Play Audio
// -----------------------------------------------------------------------------
function startPlayback() {
  // IMPORTANT RULE: AudioBufferSourceNode is single-use.
  // Every time we want to play, we create a new source node.
  sourceNode = audioContext.createBufferSource();
  sourceNode.buffer = audioBuffer;
  sourceNode.loop = true; // Loop the audio continuously

  // Connect: [Source] ──► [GainNode (Volume)] ──► [Speakers]
  sourceNode.connect(gainNode);

  // Start playing immediately (time = 0)
  sourceNode.start(0);

  isPlaying = true;
  playBtn.innerText = '⏸ Pause';
  playerStatus.innerText = 'Playing...';
  updateUI();
}

// -----------------------------------------------------------------------------
// STEP 4: Pause / Stop Audio
// -----------------------------------------------------------------------------
function stopPlayback() {
  if (sourceNode) {
    sourceNode.stop();       // Stop playing
    sourceNode.disconnect(); // Clean up connection
    sourceNode = null;
  }

  isPlaying = false;
  playBtn.innerText = '▶ Play';
  playerStatus.innerText = 'Paused';
  updateUI();
}

// -----------------------------------------------------------------------------
// USER INTERACTION: Play / Pause Button Click
// -----------------------------------------------------------------------------
playBtn.addEventListener('click', async () => {
  // Browsers require a user click to start the AudioContext
  setupAudioGraph();

  // Resume AudioContext if browser suspended it
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  // Load the file on the first click if not loaded yet
  if (!audioBuffer) {
    await loadAudioFile();
  }

  // Toggle play/pause
  if (!isPlaying) {
    startPlayback();
  } else {
    stopPlayback();
  }
});

// -----------------------------------------------------------------------------
// USER INTERACTION: Volume Slider Change
// -----------------------------------------------------------------------------
volumeSlider.addEventListener('input', (event) => {
  const volume = Number.parseFloat(event.target.value);
  volumeValue.innerText = `${Math.round(volume * 100)}%`;

  // If gainNode exists, adjust its gain value directly
  if (gainNode) {
    gainNode.gain.value = volume;
  }
});

// Helper function to update status display
function updateUI() {
  if (audioContext) {
    contextState.innerText = audioContext.state;
  }
}
