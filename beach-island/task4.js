import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * ============================================================================
 * PHASE 3 - TASK 4: ADVANCED SHADER EFFECTS
 * ============================================================================
 * Combines 4 Advanced Shader Techniques into a Cyberpunk Teleportation Sphere:
 *  1. Multi-band Dual Fresnel (Sharp Electric Edge + Soft Neon Atmospheric Rim)
 *  2. Procedural Noise Dissolve with Multi-layer Burning/Molten Emissive Edge
 *  3. Procedural Hexagonal Nanotech Shield Grid (Analytic Hex Coordinates)
 *  4. Holographic Glitch Scanlines, Sine Distortion & Interior Energy Core
 * ============================================================================
 */

// 1. Scene, Camera, Renderer Setup
const canvas = document.getElementById('canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04050a);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 1.8, 6.2);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 2.5;
controls.maxDistance = 20;

// 2. Ambient & Accent Lighting
const ambientLight = new THREE.AmbientLight(0x0e1828, 1.2);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0x4dc9ff, 1.5);
dirLight.position.set(5, 8, 4);
scene.add(dirLight);

const purpleLight = new THREE.DirectionalLight(0xb83bff, 1.8);
purpleLight.position.set(-6, -4, -4);
scene.add(purpleLight);

// 3. GLSL Procedural Math (Simplex Noise + Hexagonal Grid)
const advancedNoiseGLSL = /* glsl */ `
  vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187,
                        0.366025403784439,
                       -0.577350269189626,
                        0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 4; i++) {
      v += a * snoise(p);
      p = rot * p * 2.05 + vec2(1.3, 1.7);
      a *= 0.5;
    }
    return v;
  }

  // Analytic Hexagonal Grid Distance Function
  // Returns vec4(distToHexEdge, distToHexCenter, hexCellId.x, hexCellId.y)
  vec4 hexGrid(vec2 p, float scale) {
    vec2 q = p * scale;
    const vec2 s = vec2(1.0, 1.7320508);
    vec4 hC = floor(vec4(q, q - vec2(0.5, 1.0)) / vec4(s, s)) + 0.5;
    vec4 h = vec4(q - hC.xy * s, q - (hC.zw + 0.5) * s);
    vec4 o = dot(h.xy, h.xy) < dot(h.zw, h.zw) ? vec4(h.xy, hC.xy) : vec4(h.zw, hC.zw + 0.5);
    
    // Hexagon distance
    vec2 p_hex = abs(o.xy);
    float d = max(dot(p_hex, s * 0.5), p_hex.x);
    return vec4(0.5 - d, length(o.xy), o.zw);
  }
`;

// 4. Main Teleportation Sphere Shader
const sphereGeo = new THREE.IcosahedronGeometry(1.6, 64);

const sphereUniforms = {
  uTime: { value: 0 },
  uDissolveProgress: { value: 0.35 },
  uDissolveEdgeWidth: { value: 0.065 },
  uPrimaryColor: { value: new THREE.Color(0x00f0ff) },   // Electric Cyan
  uSecondaryColor: { value: new THREE.Color(0xbf00ff) }, // Neon Purple
  uEdgeColor: { value: new THREE.Color(0xff0055) },      // Hot Burning Magenta
  uCoreColor: { value: new THREE.Color(0xffffff) },      // Incandescent white core
  uFresnelPower: { value: 2.8 },
  uHexScale: { value: 16.0 },
  uNoiseScale: { value: 3.5 }
};

const sphereMaterial = new THREE.ShaderMaterial({
  uniforms: sphereUniforms,
  side: THREE.DoubleSide,
  transparent: true,
  depthWrite: true,
  vertexShader: `
    ${advancedNoiseGLSL}

    uniform float uTime;
    uniform float uDissolveProgress;

    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    varying float vNoise;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);

      vec3 pos = position;

      // Organic subtle breathing pulse
      float pulse = sin(uTime * 2.0 + position.y * 3.0) * 0.02;

      // Burning edge disintegration vertex jitter
      float noiseVal = fbm(uv * 4.0 + vec2(uTime * 0.2, -uTime * 0.15)) * 0.5 + 0.5;
      vNoise = noiseVal;

      float dissolveThreshold = uDissolveProgress;
      float edgeProximity = 1.0 - smoothstep(0.0, 0.1, abs(noiseVal - dissolveThreshold));
      pos += normal * (pulse + edgeProximity * 0.06 * snoise(pos.xy * 8.0 + uTime * 4.0));

      vec4 worldPos = modelMatrix * vec4(pos, 1.0);
      vWorldPosition = worldPos.xyz;

      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    ${advancedNoiseGLSL}

    uniform float uTime;
    uniform float uDissolveProgress;
    uniform float uDissolveEdgeWidth;
    uniform vec3 uPrimaryColor;
    uniform vec3 uSecondaryColor;
    uniform vec3 uEdgeColor;
    uniform vec3 uCoreColor;
    uniform float uFresnelPower;
    uniform float uHexScale;
    uniform float uNoiseScale;

    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    varying float vNoise;

    void main() {
      vec3 N = normalize(vNormal);
      vec3 V = normalize(cameraPosition - vWorldPosition);

      // --- 1. MULTI-BAND FRESNEL RIM & GLOW ---
      // Facing ratio: 0.0 when looking straight-on, 1.0 at grazing silhouette angles
      float NdotV = clamp(dot(N, V), 0.0, 1.0);
      float fresnelSharp = pow(1.0 - NdotV, uFresnelPower);
      float fresnelSoft  = pow(1.0 - NdotV, 1.2) * 0.5;
      float totalFresnel = clamp(fresnelSharp + fresnelSoft, 0.0, 1.0);

      // --- 2. PROCEDURAL DISSOLVE NOISE FIELD ---
      // Combine spherical UV and 3D coordinate sampling for seamless dissolve
      vec2 noiseCoord = vUv * uNoiseScale + vec2(sin(uTime * 0.15), cos(uTime * 0.12)) * 0.25;
      float dissolveNoise = fbm(noiseCoord);
      // Map noise to [0.0, 1.0] range
      dissolveNoise = dissolveNoise * 0.5 + 0.5;

      // Add directional dissolve wipe along Y-axis
      float directionalWipe = (vWorldPosition.y + 1.8) / 3.6;
      float combinedDissolve = mix(dissolveNoise, directionalWipe, 0.35);

      // Dissolve cut threshold
      float threshold = uDissolveProgress;

      // Discard dissolved fragments (creates clean disintegrating holes)
      if (combinedDissolve < threshold) {
        discard;
      }

      // --- 3. MULTI-LAYER BURNING/INCANDESCENT EMISSIVE EDGE ---
      // Edge distance calculation
      float edgeDist = combinedDissolve - threshold;
      float edgeOuter = 1.0 - smoothstep(0.0, uDissolveEdgeWidth, edgeDist);
      float edgeInner = 1.0 - smoothstep(0.0, uDissolveEdgeWidth * 0.32, edgeDist);

      // Layered emissive flame color (Hot Magenta -> Burning Gold -> White Core)
      vec3 burnColor = mix(uEdgeColor * 2.2, vec3(1.0, 0.8, 0.2) * 3.5, edgeOuter);
      burnColor = mix(burnColor, uCoreColor * 5.0, edgeInner);

      // --- 4. PROCEDURAL HEXAGONAL NANOTECH SHIELD ---
      vec4 hex = hexGrid(vUv, uHexScale);
      float hexBorder = smoothstep(0.08, 0.02, hex.x); // Thin glowing wireframe
      float hexCenterPulse = sin(uTime * 3.0 + hex.z * 5.0 + hex.w * 3.0) * 0.5 + 0.5;
      float hexCoreGlow = (1.0 - smoothstep(0.0, 0.45, hex.y)) * hexCenterPulse * 0.35;

      // --- 5. HOLOGRAPHIC SCANLINES & CYBERPUNK COLOR BLEND ---
      // Fine scanline raster effect
      float scanline = sin(vWorldPosition.y * 70.0 - uTime * 6.0) * 0.5 + 0.5;
      scanline = smoothstep(0.3, 0.8, scanline) * 0.25;

      // Surface dual-gradient (Cyan to Neon Purple) modulated by Fresnel & Hex lines
      vec3 baseColor = mix(uPrimaryColor * 0.6, uSecondaryColor * 0.9, sin(vWorldPosition.y * 2.5 + uTime) * 0.5 + 0.5);
      baseColor += uPrimaryColor * (hexBorder * 1.8 + hexCoreGlow);
      baseColor += scanline * uPrimaryColor;

      // Add intense Fresnel rim glow (glows in bright cyan/magenta)
      vec3 fresnelGlow = mix(uPrimaryColor, uSecondaryColor, fresnelSharp) * totalFresnel * 2.8;
      vec3 finalColor = baseColor + fresnelGlow;

      // Composite the burning dissolve edge over the surface
      finalColor = mix(finalColor, burnColor, edgeOuter);

      // Translucency: interior is semi-transparent glass, rim & hex wires are solid
      float alpha = clamp(0.35 + totalFresnel * 0.65 + hexBorder * 0.7 + edgeOuter, 0.0, 1.0);

      gl_FragColor = vec4(finalColor, alpha);
    }
  `
});

const sphereMesh = new THREE.Mesh(sphereGeo, sphereMaterial);
scene.add(sphereMesh);

// 5. Concentric Inner Energy Core (Pulsing Voronoi Plasma Orb)
const coreGeo = new THREE.IcosahedronGeometry(0.85, 32);
const coreMaterial = new THREE.ShaderMaterial({
  side: THREE.BackSide, // Backside gives deep volumetric feel
  transparent: true,
  uniforms: {
    uTime: { value: 0 },
    uCoreColor: { value: new THREE.Color(0x00f0ff) },
    uSecondaryColor: { value: new THREE.Color(0xff0077) }
  },
  vertexShader: `
    ${advancedNoiseGLSL}
    uniform float uTime;
    varying vec3 vNormal;
    varying vec3 vPos;

    void main() {
      vNormal = normal;
      vec3 pos = position;
      float disp = snoise(pos.xy * 3.0 + uTime * 1.5) * 0.12;
      pos += normal * disp;
      vPos = pos;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uCoreColor;
    uniform vec3 uSecondaryColor;
    varying vec3 vNormal;
    varying vec3 vPos;

    void main() {
      float pulse = sin(uTime * 3.5) * 0.5 + 0.5;
      float fres = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
      vec3 col = mix(uCoreColor * 2.5, uSecondaryColor * 3.0, pulse * fres);
      gl_FragColor = vec4(col, 0.85);
    }
  `
});
const coreMesh = new THREE.Mesh(coreGeo, coreMaterial);
scene.add(coreMesh);

// 6. Orbital Cyberpunk Rings
function createCyberRing(radius, tubeRadius, rotX, rotZ, colorHex) {
  const ringGeo = new THREE.TorusGeometry(radius, tubeRadius, 16, 120);
  const ringMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(colorHex) }
    },
    transparent: true,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float dash = sin(vUv.x * 60.0 - uTime * 4.0) * 0.5 + 0.5;
        dash = smoothstep(0.4, 0.6, dash);
        gl_FragColor = vec4(uColor * (1.5 + dash * 2.0), dash * 0.8 + 0.2);
      }
    `
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = rotX;
  ring.rotation.z = rotZ;
  scene.add(ring);
  return ring;
}

const ring1 = createCyberRing(2.1, 0.015, Math.PI / 3, Math.PI / 6, 0x00f0ff);
const ring2 = createCyberRing(2.35, 0.012, -Math.PI / 4, -Math.PI / 5, 0xbf00ff);

// 7. Hologram Floor Pedestal Grid
const floorGeo = new THREE.PlaneGeometry(14, 14, 40, 40);
floorGeo.rotateX(-Math.PI / 2);
const floorMaterial = new THREE.ShaderMaterial({
  transparent: true,
  uniforms: {
    uTime: { value: 0 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vWorldPos;
    void main() {
      vUv = uv;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vWorldPos;
    void main() {
      vec2 grid = abs(fract(vWorldPos.xz * 1.5 - 0.5) - 0.5) / fwidth(vWorldPos.xz * 1.5);
      float line = 1.0 - min(min(grid.x, grid.y), 1.0);
      
      float dist = length(vWorldPos.xz);
      float circle = sin(dist * 4.0 - uTime * 2.0) * 0.5 + 0.5;
      circle = smoothstep(0.85, 0.98, circle) * 0.4;

      float fade = smoothstep(6.5, 0.5, dist);
      vec3 col = vec3(0.0, 0.8, 1.0) * (line * 0.6 + circle * 1.2);
      gl_FragColor = vec4(col, fade * (line * 0.5 + circle));
    }
  `
});
const floorMesh = new THREE.Mesh(floorGeo, floorMaterial);
floorMesh.position.y = -1.8;
scene.add(floorMesh);

// 8. Post-Processing (Selective HDR Glow / Bloom)
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.1,   // Bloom strength
  0.5,   // Bloom radius
  0.75   // Bloom threshold (only glowing edges and neon lines bloom)
);
composer.addPass(bloomPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

// 9. Interactive UI Overlay Controls (Custom Modern Floating Cyberpunk Panel)
function createInteractiveUI() {
  const panel = document.createElement('div');
  panel.id = 'cyber-panel';
  panel.innerHTML = `
    <div class="panel-header">
      <span class="panel-title">TELEPORT DISSOLVE ENGINE</span>
      <span class="panel-status">SYS.ONLINE</span>
    </div>
    <div class="panel-control">
      <div class="control-label">
        <span>Dissolve Threshold</span>
        <span id="dissolve-val">35%</span>
      </div>
      <input type="range" id="dissolve-slider" min="0" max="100" value="35" step="1">
    </div>
    <div class="panel-control">
      <div class="control-label">
        <span>Burning Edge Width</span>
        <span id="edge-val">0.065</span>
      </div>
      <input type="range" id="edge-slider" min="10" max="150" value="65" step="1">
    </div>
    <div class="panel-control">
      <div class="control-label">
        <span>Fresnel Rim Power</span>
        <span id="fresnel-val">2.8</span>
      </div>
      <input type="range" id="fresnel-slider" min="10" max="60" value="28" step="1">
    </div>
    <div class="panel-buttons">
      <button id="btn-pulse" class="cyber-btn">AUTO PULSE</button>
      <button id="btn-theme" class="cyber-btn">SWITCH THEME</button>
    </div>
  `;

  document.body.appendChild(panel);

  // Style the floating holographic UI
  const style = document.createElement('style');
  style.textContent = `
    #cyber-panel {
      position: absolute;
      bottom: 24px;
      right: 24px;
      width: 320px;
      background: rgba(8, 14, 28, 0.78);
      border: 1px solid rgba(0, 240, 255, 0.45);
      border-radius: 12px;
      padding: 18px 20px;
      backdrop-filter: blur(14px);
      box-shadow: 0 0 25px rgba(0, 240, 255, 0.15), inset 0 0 15px rgba(0, 240, 255, 0.05);
      color: #e2f1ff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      z-index: 100;
      user-select: none;
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      border-bottom: 1px solid rgba(0, 240, 255, 0.2);
      padding-bottom: 8px;
    }
    .panel-title {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 1.2px;
      color: #00f0ff;
    }
    .panel-status {
      font-size: 10px;
      color: #00ffaa;
      font-weight: 600;
      letter-spacing: 1px;
    }
    .panel-control {
      margin-bottom: 14px;
    }
    .control-label {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      margin-bottom: 6px;
      color: #92b4d6;
    }
    input[type=range] {
      -webkit-appearance: none;
      width: 100%;
      height: 5px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.12);
      outline: none;
    }
    input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 15px;
      height: 15px;
      border-radius: 50%;
      background: #00f0ff;
      cursor: pointer;
      box-shadow: 0 0 8px #00f0ff;
    }
    .panel-buttons {
      display: flex;
      gap: 10px;
      margin-top: 16px;
    }
    .cyber-btn {
      flex: 1;
      padding: 8px 12px;
      background: rgba(0, 240, 255, 0.12);
      border: 1px solid rgba(0, 240, 255, 0.4);
      color: #00f0ff;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.8px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .cyber-btn:hover {
      background: rgba(0, 240, 255, 0.3);
      box-shadow: 0 0 12px rgba(0, 240, 255, 0.4);
      transform: translateY(-1px);
    }
  `;
  document.head.appendChild(style);

  // Wire interactive controls
  const dissolveSlider = document.getElementById('dissolve-slider');
  const dissolveVal = document.getElementById('dissolve-val');
  dissolveSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) / 100;
    sphereUniforms.uDissolveProgress.value = val;
    dissolveVal.textContent = Math.round(val * 100) + '%';
  });

  const edgeSlider = document.getElementById('edge-slider');
  const edgeVal = document.getElementById('edge-val');
  edgeSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) / 1000;
    sphereUniforms.uDissolveEdgeWidth.value = val;
    edgeVal.textContent = val.toFixed(3);
  });

  const fresnelSlider = document.getElementById('fresnel-slider');
  const fresnelVal = document.getElementById('fresnel-val');
  fresnelSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) / 10;
    sphereUniforms.uFresnelPower.value = val;
    fresnelVal.textContent = val.toFixed(1);
  });

  let autoPulse = false;
  const pulseBtn = document.getElementById('btn-pulse');
  pulseBtn.addEventListener('click', () => {
    autoPulse = !autoPulse;
    pulseBtn.textContent = autoPulse ? 'STOP PULSE' : 'AUTO PULSE';
    pulseBtn.style.background = autoPulse ? 'rgba(255, 0, 85, 0.25)' : 'rgba(0, 240, 255, 0.12)';
  });

  let currentTheme = 0;
  const themeBtn = document.getElementById('btn-theme');
  const themes = [
    { prim: 0x00f0ff, sec: 0xbf00ff, edge: 0xff0055 }, // Cyberpunk Neon
    { prim: 0x00ff88, sec: 0x0088ff, edge: 0xffea00 }, // Matrix Emerald
    { prim: 0xff3b30, sec: 0xff9500, edge: 0xffffff }  // Solar Flare
  ];
  themeBtn.addEventListener('click', () => {
    currentTheme = (currentTheme + 1) % themes.length;
    const t = themes[currentTheme];
    sphereUniforms.uPrimaryColor.value.setHex(t.prim);
    sphereUniforms.uSecondaryColor.value.setHex(t.sec);
    sphereUniforms.uEdgeColor.value.setHex(t.edge);
  });

  return () => {
    if (autoPulse) {
      const p = (Math.sin(clock.getElapsedTime() * 1.5) * 0.5 + 0.5) * 0.85 + 0.05;
      sphereUniforms.uDissolveProgress.value = p;
      dissolveSlider.value = Math.round(p * 100);
      dissolveVal.textContent = Math.round(p * 100) + '%';
    }
  };
}

const updateUI = createInteractiveUI();

// 10. Responsive Window Resizing
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  composer.setSize(window.innerWidth, window.innerHeight);
});

// 11. Animation Loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const elapsedTime = clock.getElapsedTime();

  // Update uniforms
  sphereUniforms.uTime.value = elapsedTime;
  coreMaterial.uniforms.uTime.value = elapsedTime;
  ring1.material.uniforms.uTime.value = elapsedTime;
  ring2.material.uniforms.uTime.value = elapsedTime;
  floorMaterial.uniforms.uTime.value = elapsedTime;

  // Gentle idle rotations
  sphereMesh.rotation.y = elapsedTime * 0.15;
  coreMesh.rotation.y = -elapsedTime * 0.35;
  ring1.rotation.y = elapsedTime * 0.4;
  ring2.rotation.y = -elapsedTime * 0.25;

  updateUI();
  controls.update();
  composer.render();
}

animate();
