// =============================================================================
// DAY 3: Audio + Three.js + GLSL
//
//   Audio -> AnalyserNode -> Bass / Mid / High / Volume (+ Kick)
//                                  |
//        ┌─────────────────────────┼─────────────────────────┐
//     Particles                 Objects                  GLSL shaders
//   (shockwave, swirl)   (scale, rotation, rings)   (noise displacement, fresnel)
//                                  |
//                         Camera (push, sway, shake)  +  Bloom
//
// Setup:  npm i three     |   put the mp3 in /public
// =============================================================================
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const TRACK_URL = encodeURI('/The Rare Occasions - Notion.mp3');

// -----------------------------------------------------------------------------
// DOM
// -----------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const playBtn = $('playBtn');
const fileInput = $('fileInput');
const volumeSlider = $('volumeSlider');
const volumeValue = $('volumeValue');
const statusEl = $('status');
const trackName = $('trackName');
const kickFlash = $('kickFlash');
const spectrumCanvas = $('spectrum');
const spectrumCtx = spectrumCanvas.getContext('2d');
const bars = {};
const vals = {};
['bass', 'mid', 'high', 'volume'].forEach((k) => {
  bars[k] = document.querySelector(`[data-bar="${k}"]`);
  vals[k] = document.querySelector(`[data-val="${k}"]`);
});

// -----------------------------------------------------------------------------
// STEP 1: Audio engine (AnalyserNode -> bands -> smoothing -> kick)
// -----------------------------------------------------------------------------
// Smoothing with separate attack/release: rises fast (feels punchy), falls slowly
// (feels fluid). Exponential form is frame-rate independent (uses dt).
function smooth(current, target, attack, release, dt) {
  const rate = target > current ? attack : release;
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.buffer = null;
    this.source = null;
    this.started = false;

    this.raw = { bass: 0, mid: 0, high: 0, volume: 0 };     // instantaneous 0..1
    this.bands = { bass: 0, mid: 0, high: 0, volume: 0 };   // smoothed 0..1 (use these)
    this.kick = 0;                                           // decaying 0..1 pulse on bass hits
    this.bassAvg = 0;
    this.lastKick = 0;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;                // 1024 bins: finer bass resolution than 1024
    this.analyser.smoothingTimeConstant = 0.6;   // light built-in smoothing; we smooth more ourselves
    this.freq = new Uint8Array(this.analyser.frequencyBinCount);

    this.gain = this.ctx.createGain();
    this.gain.gain.value = parseFloat(volumeSlider.value);

    // [Source] -> [Analyser] -> [Gain] -> [Speakers]
    this.analyser.connect(this.gain);
    this.gain.connect(this.ctx.destination);
  }

  async loadFromUrl(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not fetch ${url} (${res.status})`);
    this.buffer = await this.ctx.decodeAudioData(await res.arrayBuffer());
  }

  async loadFromFile(file) {
    this.buffer = await this.ctx.decodeAudioData(await file.arrayBuffer());
  }

  start() {
    if (this.source) { this.source.onended = null; this.source.stop(); this.source.disconnect(); }
    this.source = this.ctx.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.loop = true;
    this.source.connect(this.analyser);
    this.source.start(0);
    this.started = true;
  }

  get playing() { return this.ctx && this.ctx.state === 'running' && this.started; }

  // Average of bins between two frequencies. Bin ranges are derived from the real
  // sampleRate, so the bands stay correct on 44.1k and 48k devices alike.
  avg(f0, f1) {
    const binHz = this.ctx.sampleRate / this.analyser.fftSize;
    const a = Math.max(1, Math.round(f0 / binHz));
    const b = Math.min(this.freq.length, Math.round(f1 / binHz));
    let sum = 0;
    for (let i = a; i < b; i++) sum += this.freq[i];
    return sum / Math.max(1, b - a) / 255;
  }

  update(dt, now) {
    if (!this.ctx) return;
    this.analyser.getByteFrequencyData(this.freq);

    // Per-band gain: highs carry less energy, so we lift them to be visible.
    // pow(x, 1.6) pushes mid-level values down so only real peaks reach 1.0
    const shape = (v) => Math.pow(Math.min(1, v), 1.6);
    this.raw.bass = shape(this.avg(20, 250) * 0.95);
    this.raw.mid = shape(this.avg(250, 4000) * 1.1);
    this.raw.high = shape(this.avg(4000, 16000) * 2.0);
    this.raw.volume = shape(this.avg(20, 16000) * 1.5);

    const b = this.bands;
    b.bass = smooth(b.bass, this.raw.bass, 28, 6, dt);
    b.mid = smooth(b.mid, this.raw.mid, 14, 4, dt);
    b.high = smooth(b.high, this.raw.high, 22, 8, dt);
    b.volume = smooth(b.volume, this.raw.volume, 12, 3, dt);

    // Kick = bass jumping above its own slow-moving average.
    this.bassAvg += (this.raw.bass - this.bassAvg) * (1 - Math.exp(-2.5 * dt));
    const jump = this.raw.bass - this.bassAvg;
    if (jump > 0.08 && this.raw.bass > 0.3 && now - this.lastKick > 0.2) {
      this.kick = 1;
      this.lastKick = now;
    }
    this.kick *= Math.exp(-7 * dt);
  }
}

const audio = new AudioEngine();

// -----------------------------------------------------------------------------
// STEP 2: Three.js scene
// -----------------------------------------------------------------------------
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;   // stops hot colors clipping to white
renderer.toneMappingExposure = 0.9;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060b);
scene.fog = new THREE.FogExp2(0x05060b, 0.035);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);

// Shared uniforms: ONE object feeds every shader. Update it once per frame.
const U = {
  uTime: { value: 0 },
  uBass: { value: 0 },
  uMid: { value: 0 },
  uHigh: { value: 0 },
  uVolume: { value: 0 },
  uKick: { value: 0 },
};

// -----------------------------------------------------------------------------
// GLSL: simplex noise (Ashima / Ian McEwan, MIT)
// -----------------------------------------------------------------------------
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;

// -----------------------------------------------------------------------------
// OBJECT 1: Core blob (GLSL vertex displacement + fresnel rim)
// -----------------------------------------------------------------------------
const coreMaterial = new THREE.ShaderMaterial({
  uniforms: U,
  vertexShader: /* glsl */ `
    uniform float uTime, uBass, uMid, uHigh, uKick;
    varying vec3 vNormal; varying vec3 vViewDir; varying float vDisp;
    ${NOISE}

    // Bass = big slow lumps, Mid = how fast they flow, High = fine jitter, Kick = punch.
    float displace(vec3 p){
      float flow = uTime * (0.25 + uMid * 1.2);
      float big  = snoise(p * 1.1 + flow);
      float fine = snoise(p * 3.2 - uTime * 1.6);
      return big * (0.1 + uBass * 0.32) + fine * uHigh * 0.06 + uKick * 0.07;
    }

    void main(){
      vec3 n = normalize(normal);
      // Recompute the normal after displacement (sample two neighbours on the tangent plane)
      vec3 t = normalize(cross(n, abs(n.y) > 0.99 ? vec3(1.0,0.0,0.0) : vec3(0.0,1.0,0.0)));
      vec3 b = cross(n, t);
      float e = 0.02;
      vec3 p0 = position + n * displace(position);
      vec3 pt = (position + t*e); pt += normalize(pt) * displace(pt);
      vec3 pb = (position + b*e); pb += normalize(pb) * displace(pb);
      vec3 dn = normalize(cross(pt - p0, pb - p0));
      if (dot(dn, n) < 0.0) dn = -dn;

      vDisp = displace(position);
      vec4 mv = modelViewMatrix * vec4(p0, 1.0);
      vNormal = normalize(normalMatrix * dn);
      vViewDir = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime, uBass, uMid, uHigh, uVolume, uKick;
    varying vec3 vNormal; varying vec3 vViewDir; varying float vDisp;

    // Inigo Quilez cosine palette
    vec3 palette(float t){
      return 0.5 + 0.5 * cos(6.28318 * (vec3(1.0,1.0,1.0) * t + vec3(0.0,0.33,0.67)));
    }

    void main(){
      vec3 N = normalize(vNormal);
      vec3 V = normalize(vViewDir);
      float ndv = max(dot(N, V), 0.0);

      // Fresnel rim: narrower and brighter as highs come in
      float fres = pow(1.0 - ndv, mix(3.5, 1.6, uHigh));

      vec3 base = palette(vDisp * 1.6 + uTime * 0.05 + uVolume * 0.4);
      base = mix(vec3(0.05, 0.07, 0.16), base, 0.35 + uBass * 0.65);

      // Fake key light so shape reads even in silence
      float light = 0.35 + 0.65 * max(dot(N, normalize(vec3(0.5, 0.8, 0.6))), 0.0);

      vec3 rim = mix(vec3(0.2, 0.7, 1.0), vec3(1.0, 0.35, 0.75), uHigh);
      vec3 col = base * light * 0.8 + rim * fres * (0.3 + uHigh * 0.9);
      col += vec3(1.0, 0.4, 0.5) * uKick * 0.1;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
});
const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 48), coreMaterial);
scene.add(core);

// -----------------------------------------------------------------------------
// OBJECT 2: Wireframe shell + rings (plain Three.js objects driven by audio)
// -----------------------------------------------------------------------------
const shell = new THREE.Mesh(
  new THREE.IcosahedronGeometry(1.9, 2),
  new THREE.MeshBasicMaterial({ color: 0x4cc9ff, wireframe: true, transparent: true, opacity: 0.1, depthWrite: false })
);
scene.add(shell);

const ringMat = (color) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 });
const ringA = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.012, 8, 220), ringMat(0x3ddc97));
const ringB = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.01, 8, 220), ringMat(0xff3d6e));
ringA.rotation.x = Math.PI / 2.4;
ringB.rotation.set(Math.PI / 3, 0.6, 0);
scene.add(ringA, ringB);

// -----------------------------------------------------------------------------
// OBJECT 3: Particle galaxy (positions animated entirely on the GPU)
// -----------------------------------------------------------------------------
const COUNT = 9000;
const pPos = new Float32Array(COUNT * 3);
const pRand = new Float32Array(COUNT * 4);
for (let i = 0; i < COUNT; i++) {
  const arm = i % 3;
  const r = 2.2 + Math.pow(Math.random(), 1.6) * 9;
  const ang = (arm / 3) * Math.PI * 2 + r * 0.55 + (Math.random() - 0.5) * 0.7;
  pPos[i * 3] = Math.cos(ang) * r;
  pPos[i * 3 + 1] = (Math.random() - 0.5) * 1.4 * (1 + r * 0.12);
  pPos[i * 3 + 2] = Math.sin(ang) * r;
  for (let k = 0; k < 4; k++) pRand[i * 4 + k] = Math.random();
}
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('aRand', new THREE.BufferAttribute(pRand, 4));

const particleMaterial = new THREE.ShaderMaterial({
  uniforms: { ...U, uPixel: { value: renderer.getPixelRatio() } },
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */ `
    uniform float uTime, uBass, uMid, uHigh, uKick, uPixel;
    attribute vec4 aRand;
    varying vec3 vColor;

    void main(){
      vec3 p = position;
      float r = length(p.xz);

      // MID: galaxy swirl. Inner particles spin faster (differential rotation).
      float a = uTime * (0.04 + uMid * 0.35) * (1.5 / (0.6 + r * 0.25));
      float c = cos(a), s = sin(a);
      p.xz = mat2(c, -s, s, c) * p.xz;

      // BASS / KICK: outward shockwave that travels along the radius
      float wave = sin(r * 1.6 - uTime * 5.0) * 0.5 + 0.5;
      float push = uBass * 0.3 * wave + uKick * 1.0 * aRand.y;
      p.xz *= 1.0 + push / max(r, 1.0);

      // MID: vertical turbulence
      p.y += sin(uTime * 1.3 + aRand.x * 40.0) * (0.15 + uMid * 0.9) * aRand.z;

      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;

      // HIGH: random particles flash larger (glitter)
      float glitter = step(0.82, fract(aRand.w * 7.0 + uTime * 1.5)) * uHigh * 3.0;
      gl_PointSize = (1.2 + aRand.z * 1.6 + glitter) * uPixel * (10.0 / -mv.z);

      vColor = mix(vec3(0.3, 0.6, 1.0), vec3(1.0, 0.35, 0.65), aRand.x);
      vColor += glitter * 0.15;
    }
  `,
  fragmentShader: /* glsl */ `
    varying vec3 vColor;
    void main(){
      float d = length(gl_PointCoord - 0.5);
      float a = smoothstep(0.5, 0.0, d);
      gl_FragColor = vec4(vColor, a * a * 0.55);
    }
  `,
});
const particles = new THREE.Points(pGeo, particleMaterial);
scene.add(particles);

// -----------------------------------------------------------------------------
// STEP 3: Post-processing (bloom strength follows volume)
// -----------------------------------------------------------------------------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.3, 0.5, 0.65);  // strength, radius, threshold
composer.addPass(bloom);
composer.addPass(new OutputPass());

// -----------------------------------------------------------------------------
// STEP 4: Camera rig (user orbit + audio-driven motion layered on top)
// -----------------------------------------------------------------------------
const rig = { yaw: 0.4, pitch: 0.25, dist: 9.5, tYaw: 0.4, tPitch: 0.25, tDist: 9.5 };
let dragging = false, lastX = 0, lastY = 0;

canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointerup', () => { dragging = false; });
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  rig.tYaw -= (e.clientX - lastX) * 0.005;
  rig.tPitch = THREE.MathUtils.clamp(rig.tPitch + (e.clientY - lastY) * 0.005, -1.2, 1.2);
  lastX = e.clientX; lastY = e.clientY;
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  rig.tDist = THREE.MathUtils.clamp(rig.tDist + e.deltaY * 0.01, 4, 20);
}, { passive: false });

function updateCamera(dt, t, a) {
  rig.yaw += (rig.tYaw - rig.yaw) * (1 - Math.exp(-6 * dt));
  rig.pitch += (rig.tPitch - rig.pitch) * (1 - Math.exp(-6 * dt));
  rig.dist += (rig.tDist - rig.dist) * (1 - Math.exp(-6 * dt));

  // Audio layers
  const autoYaw = t * 0.05 + Math.sin(t * 0.6) * a.mid * 0.35;   // MID: melodic sway
  const dist = rig.dist - a.bass * 0.4 - audio.kick * 0.5;       // BASS: push in
  const yaw = rig.yaw + autoYaw;
  const pitch = rig.pitch + Math.sin(t * 0.4) * 0.05 * (0.5 + a.mid);

  camera.position.set(
    Math.sin(yaw) * Math.cos(pitch) * dist,
    Math.sin(pitch) * dist,
    Math.cos(yaw) * Math.cos(pitch) * dist
  );
  // KICK: micro-shake
  const shake = audio.kick * 0.02;
  camera.position.x += (Math.random() - 0.5) * shake;
  camera.position.y += (Math.random() - 0.5) * shake;
  camera.lookAt(0, 0, 0);

  camera.fov = 60 - audio.kick * 2 - a.bass * 1;                 // FOV punch
  camera.updateProjectionMatrix();
}

// -----------------------------------------------------------------------------
// STEP 5: Main loop: audio -> uniforms -> objects -> camera -> render
// -----------------------------------------------------------------------------
let prev = performance.now() / 1000;
let spin = 0;

function frame() {
  requestAnimationFrame(frame);
  const now = performance.now() / 1000;
  const dt = Math.min(now - prev, 0.1);
  prev = now;

  audio.update(dt, now);
  const a = audio.bands;

  // Audio -> uniforms (shared by every shader)
  U.uTime.value = now;
  U.uBass.value = a.bass;
  U.uMid.value = a.mid;
  U.uHigh.value = a.high;
  U.uVolume.value = a.volume;
  U.uKick.value = audio.kick;

  // Audio -> object animation
  spin += dt * (0.1 + a.mid * 1.2);
  core.rotation.set(spin * 0.4, spin, 0);
  core.scale.setScalar(1 + a.bass * 0.1 + audio.kick * 0.05);

  shell.rotation.set(-spin * 0.3, spin * 0.5, 0);
  shell.scale.setScalar(1 + a.bass * 0.15);
  shell.material.opacity = 0.06 + a.high * 0.25;               // wireframe strobe

  ringA.rotation.z += dt * (0.2 + a.mid * 2.0);
  ringB.rotation.z -= dt * (0.15 + a.mid * 1.5);
  ringA.scale.setScalar(1 + audio.kick * 0.08);
  ringB.scale.setScalar(1 + a.bass * 0.06);

  particles.rotation.y += dt * 0.01;

  // Audio -> camera
  updateCamera(dt, now, a);

  // Audio -> post
  bloom.strength = 0.25 + a.volume * 0.3 + audio.kick * 0.15;

  composer.render();
  updateHUD();
}

// -----------------------------------------------------------------------------
// HUD
// -----------------------------------------------------------------------------
function updateHUD() {
  const a = audio.bands;
  for (const k of ['bass', 'mid', 'high', 'volume']) {
    const pct = Math.round(a[k] * 100);
    bars[k].style.width = pct + '%';
    vals[k].textContent = pct;
  }
  kickFlash.style.opacity = (audio.kick * 0.35).toFixed(3);
  drawSpectrum();
}

function drawSpectrum() {
  const w = spectrumCanvas.width, h = spectrumCanvas.height;
  spectrumCtx.clearRect(0, 0, w, h);
  if (!audio.ctx) return;
  const BARS = 48;
  const minHz = 30, maxHz = 16000;
  const binHz = audio.ctx.sampleRate / audio.analyser.fftSize;
  const barW = w / BARS;
  for (let i = 0; i < BARS; i++) {
    // log-spaced so bass doesn't get squashed into 2 bars
    const f0 = minHz * Math.pow(maxHz / minHz, i / BARS);
    const f1 = minHz * Math.pow(maxHz / minHz, (i + 1) / BARS);
    const b0 = Math.floor(f0 / binHz), b1 = Math.max(b0 + 1, Math.floor(f1 / binHz));
    let m = 0;
    for (let b = b0; b < b1; b++) m = Math.max(m, audio.freq[b]);
    const v = m / 255;
    spectrumCtx.fillStyle = f1 < 250 ? '#ff3d6e' : f1 < 4000 ? '#3ddc97' : '#4cc9ff';
    spectrumCtx.fillRect(i * barW + 1, h - v * h, barW - 2, v * h);
  }
}

// -----------------------------------------------------------------------------
// Controls
// -----------------------------------------------------------------------------
async function ensureReady() {
  audio.init();
  if (audio.ctx.state === 'suspended') await audio.ctx.resume();
}

playBtn.addEventListener('click', async () => {
  try {
    await ensureReady();

    if (!audio.buffer) {
      statusEl.textContent = 'Loading track...';
      await audio.loadFromUrl(TRACK_URL);
    }
    if (!audio.started) {
      audio.start();
      playBtn.textContent = 'Pause';
      statusEl.textContent = 'Playing and visualizing live audio.';
      return;
    }
    // Toggle with suspend/resume so the track keeps its position
    if (audio.ctx.state === 'running') {
      await audio.ctx.suspend();
      playBtn.textContent = 'Play';
      statusEl.textContent = 'Paused.';
    } else {
      await audio.ctx.resume();
      playBtn.textContent = 'Pause';
      statusEl.textContent = 'Playing and visualizing live audio.';
    }
  } catch (err) {
    console.error(err);
    statusEl.textContent = `Error: ${err.message}. Check that the mp3 is in /public.`;
  }
});

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    await ensureReady();
    statusEl.textContent = 'Decoding track...';
    await audio.loadFromFile(file);
    audio.start();
    trackName.textContent = file.name;
    playBtn.textContent = 'Pause';
    statusEl.textContent = 'Playing and visualizing live audio.';
  } catch (err) {
    statusEl.textContent = `Error: could not decode ${file.name}.`;
  }
});

volumeSlider.addEventListener('input', (e) => {
  const v = parseFloat(e.target.value);
  volumeValue.textContent = `${Math.round(v * 100)}%`;
  if (audio.gain) audio.gain.gain.value = v;
});

window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
});

frame();