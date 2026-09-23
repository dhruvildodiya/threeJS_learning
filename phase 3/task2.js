import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * ============================================================================
 * PROCEDURAL TROPICAL BEACH & OCEAN (True Diagonal Shoreline Perspective)
 * ============================================================================
 * v2 — Visual pass:
 *  - Multi-octave foam edge (soft clumps + fine detail, no more hard "lightning bolt" lines)
 *  - Normal-mapped sand lighting (grain now actually reacts to light)
 *  - Wider horizon dissolve + exponential fog to kill the visible water/sky seam
 *  - Directional "sun" light with shadows so rocks feel grounded, not pasted on
 *  - Per-rock wet/dry roughness so submerged rocks pick up a sheen
 * ============================================================================
 */

// 1. Scene, Camera, Renderer Setup
const canvas = document.getElementById('canvas');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 1.15, 4.8);
camera.lookAt(0, 0.55, -12.0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Fog to soften the ocean/sky seam and add atmospheric depth toward the horizon
scene.fog = new THREE.FogExp2(0x9bbad6, 0.018);

// Load HDR Environment (Aristea Wreck Pure Sky)
const rgbeLoader = new RGBELoader();
rgbeLoader.load('./environment/aristea_wreck_puresky_2k.hdr', (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = texture;
  scene.environment = texture;
});

// 1b. Sun — directional light so rocks get real shading + soft contact shadows
const sunLight = new THREE.DirectionalLight(0xfff3e0, 1.1);
sunLight.position.set(6, 10, 4);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 40;
sunLight.shadow.camera.left = -20;
sunLight.shadow.camera.right = 20;
sunLight.shadow.camera.top = 20;
sunLight.shadow.camera.bottom = -20;
sunLight.shadow.bias = -0.0015;
sunLight.shadow.radius = 4; // soft shadow edges
scene.add(sunLight);
// Explicitly add the target so the light's aim is unambiguous (and helper-visualizable)
sunLight.target.position.set(0, 0, -6);
scene.add(sunLight.target);

const ambient = new THREE.AmbientLight(0xffffff, 0.22);
scene.add(ambient);

// Debug helper for the shadow camera frustum — press 'h' to toggle.
// If rocks sit outside this box in the viewport, that's why they cast no shadow.
const shadowCameraHelper = new THREE.CameraHelper(sunLight.shadow.camera);
shadowCameraHelper.visible = false;
scene.add(shadowCameraHelper);

const lightHelper = new THREE.DirectionalLightHelper(sunLight, 2);
lightHelper.visible = false;
scene.add(lightHelper);

// 2. GLSL 2D Simplex Noise & Multi-octave fBm
const noiseShaderChunk = /* glsl */ `
  vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
             -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0));
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
    float total = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    for (int i = 0; i < 4; i++) {
      total += amp * snoise(p * freq);
      freq *= 2.05;
      amp *= 0.5;
    }
    return total;
  }

  // Cheaper 2-octave version for the fine foam detail pass
  float fbm2(vec2 p) {
    float total = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    for (int i = 0; i < 2; i++) {
      total += amp * snoise(p * freq);
      freq *= 2.3;
      amp *= 0.5;
    }
    return total;
  }
`;

// 2. Load Beach Sand Textures
const textureLoader = new THREE.TextureLoader();
const sandDiffTexture = textureLoader.load('./textures/beach/textures/aerial_beach_01_diff_2k.jpg');
sandDiffTexture.wrapS = THREE.RepeatWrapping;
sandDiffTexture.wrapT = THREE.RepeatWrapping;
sandDiffTexture.colorSpace = THREE.SRGBColorSpace;

const sandNormalTexture = textureLoader.load('./textures/beach/textures/aerial_beach_01_nor_gl_2k.jpg');
sandNormalTexture.wrapS = THREE.RepeatWrapping;
sandNormalTexture.wrapT = THREE.RepeatWrapping;

// 3. Shader Material Uniforms (Calibrated for Aristea Wreck Pure Sky HDR)
const uniforms = {
  uTime: { value: 0 },
  uMouse: { value: new THREE.Vector2(0.5, 0.5) },
  uSandTexture: { value: sandDiffTexture },
  uSandNormal: { value: sandNormalTexture },
  uShallowTurquoise: { value: new THREE.Color('#3ad1cb') },
  uMidOceanColor: { value: new THREE.Color('#1f7b9c') },
  uDeepOceanColor: { value: new THREE.Color('#124660') },
  uFoamColor: { value: new THREE.Color('#ffffff') },
  uSunColor: { value: new THREE.Color('#fff7e8') },
  uHorizonColor: { value: new THREE.Color('#9bbad6') },
  uLightDir: { value: new THREE.Vector3(0.45, 0.75, 0.35).normalize() }
};

// 4. Custom Shader Material
const beachMaterial = new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  uniforms: uniforms,

  // --- VERTEX SHADER ---
  vertexShader: `
    ${noiseShaderChunk}

    uniform float uTime;
    uniform vec2 uMouse;

    varying vec2 vUv;
    varying float vElevation;
    varying vec3 vNormal;
    varying float vShoreCoord;

    void main() {
      vUv = uv;
      vec3 newPosition = position;

      float shoreCoord = (uv.x * 0.45) + (uv.y * 0.55);
      vShoreCoord = shoreCoord;

      float waterMask = smoothstep(0.48, 0.75, shoreCoord);

      float waveAngle = (uv.x * 0.5 + uv.y * 0.5) * 36.0 - uTime * 2.2;
      float swell = sin(waveAngle + sin(uv.x * 12.0) * 0.5) * 0.14;

      float ripples = snoise(uv * 50.0 + vec2(uTime * 0.6, uTime * 0.8)) * 0.04;

      float distToMouse = distance(uv, uMouse);
      float mouseImpact = sin(distToMouse * 30.0 - uTime * 4.0) * smoothstep(0.25, 0.0, distToMouse) * 0.08;

      float elevation = (swell + ripples + mouseImpact) * waterMask;
      newPosition.z += elevation;

      vElevation = elevation;
      vNormal = normal;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
  `,

  // --- FRAGMENT SHADER ---
  fragmentShader: `
    ${noiseShaderChunk}

    uniform float uTime;
    uniform vec2 uMouse;
    uniform sampler2D uSandTexture;
    uniform sampler2D uSandNormal;
    uniform vec3 uShallowTurquoise;
    uniform vec3 uMidOceanColor;
    uniform vec3 uDeepOceanColor;
    uniform vec3 uFoamColor;
    uniform vec3 uSunColor;
    uniform vec3 uHorizonColor;
    uniform vec3 uLightDir;

    varying vec2 vUv;
    varying float vElevation;
    varying vec3 vNormal;
    varying float vShoreCoord;

    void main() {
      float coord = vShoreCoord;

      // 1. TIDE CYCLE & SHORELINE WASH
      float tideCycle = sin(uTime * 0.8) * 0.04 + 0.52;

      // Large, soft organic wobble (low frequency) for the overall shoreline shape
      float edgeWobbleCoarse = fbm(vec2(vUv.x * 6.0 - vUv.y * 4.0, uTime * 0.15)) * 0.045;
      // Small, fine wobble layered on top for detail without hard jagged spikes
      float edgeWobbleFine = fbm2(vec2(vUv.x * 22.0 - vUv.y * 16.0, uTime * 0.35)) * 0.012;
      float waterBorder = tideCycle + edgeWobbleCoarse + edgeWobbleFine;

      // 2. SAND TEXTURE SAMPLING (Aerial Beach 2K Diffuse & Normal)
      vec2 sandUv = vUv * 8.0;
      vec3 sandSample = texture2D(uSandTexture, sandUv).rgb;
      // Lighter gamma lift & lower flat multiplier than before — a real light is now
      // doing the brightening, so the baked-in boost only needs to warm the tone, not blow it out.
      vec3 sunnySand = pow(sandSample, vec3(0.85)) * vec3(1.28, 1.18, 1.02);

      // Perturb shading using the sand normal map so grain reacts to light
      vec3 sandNormalSample = texture2D(uSandNormal, sandUv).rgb * 2.0 - 1.0;
      vec3 sandNormal = normalize(vec3(sandNormalSample.xy * 0.6, 1.0));
      float sandDiffuse = clamp(dot(sandNormal, normalize(vec3(uLightDir.x, uLightDir.z, uLightDir.y))), 0.0, 1.0);
      sunnySand *= mix(0.75, 1.08, sandDiffuse);

      float wetReach = waterBorder + 0.05;
      float wetMix = smoothstep(wetReach, waterBorder - 0.02, coord);

      vec3 drySand = sunnySand;
      vec3 wetSand = sunnySand * vec3(0.78, 0.74, 0.68);
      vec3 sand = mix(drySand, wetSand, wetMix);

      // 3. COASTAL WATER COLOR GRADIENTS
      float waterDepth = smoothstep(waterBorder, 0.95, coord);
      vec3 water = mix(uShallowTurquoise, uMidOceanColor, smoothstep(0.0, 0.45, waterDepth));
      water = mix(water, uDeepOceanColor, smoothstep(0.40, 1.0, waterDepth));

      // 4. SUNLIT CAUSTICS in the clear shallows
      vec2 causticUv = vUv * 45.0 + vec2(sin(uTime * 0.9), cos(uTime * 0.7)) * 0.4;
      float caustics = fbm(causticUv);
      float causticShimmer = smoothstep(0.12, 0.38, caustics) * (1.0 - smoothstep(0.1, 0.6, waterDepth));
      water += uFoamColor * causticShimmer * 0.3;

      // 5. BREAKING SURF & FOAM — softened, multi-scale, no hard spikes
      // Wider transition bands than before so foam clumps instead of forming thin lightning-bolt lines
      float shoreFoamCore = smoothstep(waterBorder + 0.02, waterBorder - 0.015, coord) *
                             smoothstep(waterBorder - 0.09, waterBorder - 0.01, coord);

      // Fine detail breaks up the foam edge into soft clumps rather than a clean stripe
      float foamDetail = fbm2(vUv * vec2(40.0, 40.0) + vec2(uTime * 0.25, -uTime * 0.15));
      float foamMask = smoothstep(-0.15, 0.35, foamDetail);
      float shoreFoam = shoreFoamCore * mix(0.55, 1.0, foamMask);

      float waveCaps = smoothstep(0.045, 0.10, vElevation) * smoothstep(0.4, 0.85, coord);
      waveCaps *= mix(0.5, 1.0, smoothstep(-0.1, 0.4, foamDetail));

      vec2 laceUv = vUv * vec2(60.0, 60.0) - vec2(uTime * 0.3, uTime * 0.2);
      float lacePattern = smoothstep(0.55, 0.8, snoise(laceUv)) * smoothstep(waterBorder, waterBorder + 0.2, coord) * 0.3;

      // 6. BLEND SAND AND WATER (wider transition = softer waterline, not a hard cut)
      float isWater = smoothstep(waterBorder - 0.025, waterBorder + 0.03, coord);
      vec3 sceneColor = mix(sand, water, isWater);

      float totalFoam = clamp(shoreFoam * 1.15 + waveCaps * 0.75 + lacePattern, 0.0, 1.0);
      sceneColor = mix(sceneColor, uFoamColor, totalFoam * (isWater + shoreFoam));

      // 7. CRISP DAYLIGHT SPECULAR HIGHLIGHTS
      vec3 lightDir = normalize(vec3(0.2, 0.8, 0.5));
      vec3 viewDir = normalize(vec3(0.0, 0.4, 1.0));
      vec3 halfDir = normalize(lightDir + viewDir);

      float specular = pow(max(dot(vNormal, halfDir), 0.0), 32.0);
      sceneColor += uSunColor * specular * (isWater * 0.45 + wetMix * 0.28);

      // 8. SEAMLESS HORIZON ATMOSPHERIC BLEND — widened so there's no visible seam
      float backEdgeFade = smoothstep(0.65, 0.98, vUv.y);
      float oceanDistance = smoothstep(0.55, 0.98, coord);
      float horizonDissolve = max(backEdgeFade, oceanDistance);
      sceneColor = mix(sceneColor, uHorizonColor, horizonDissolve * 0.9);

      gl_FragColor = vec4(sceneColor, 1.0);
    }
  `
});

// 5. Expansive Ground Plane seamlessly meeting the sky dome horizon
const geometry = new THREE.PlaneGeometry(45.0, 45.0, 220, 220);
const mesh = new THREE.Mesh(geometry, beachMaterial);
mesh.rotation.x = -Math.PI / 2;
mesh.position.set(0, -0.05, -6.0);
mesh.receiveShadow = true;
scene.add(mesh);

// 6. Load Coastal 3D Rock Models (Properly embedded into sand & water)
const gltfLoader = new GLTFLoader();

// isWet: rocks partly submerged/near the waterline get a lower roughness (sheen),
// dry beach rocks keep a higher, chalkier roughness.
function setupRock(rock, scale, pos, rotY, isWet = false) {
  rock.scale.set(scale, scale, scale);
  rock.position.set(pos.x, pos.y, pos.z);
  rock.rotation.y = rotY;

  rock.traverse((child) => {
    if (child.isMesh && child.material) {
      child.material.roughness = isWet
        ? Math.min(Math.max(child.material.roughness, 0.35), 0.55)
        : Math.max(child.material.roughness, 0.85);
      child.material.envMapIntensity = isWet ? 1.1 : 0.7;
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  scene.add(rock);
}

// Model 1: distant sea stack — fully submerged skirt, wet look
gltfLoader.load('./models/coast_rocks_05/coast_rocks_05_1k.gltf', (gltf) => {
  setupRock(gltf.scene, 0.80, { x: 5.2, y: -0.45, z: -5.5 }, -Math.PI * 0.3, true);
});

// Model 2: right shoreline cluster — right at the tide line, wet
gltfLoader.load('./models/coast_land_rocks_03/coast_land_rocks_03_1k.gltf', (gltf) => {
  setupRock(gltf.scene, 0.40, { x: 3.5, y: -0.32, z: -1.8 }, Math.PI * 0.2, true);
});

// Model 3: low rocks on left shoreline — dry sand side
gltfLoader.load('./models/coast_land_rocks_02/coast_land_rocks_02_1k.gltf', (gltf) => {
  setupRock(gltf.scene, 0.38, { x: -3.2, y: -0.28, z: 0.2 }, Math.PI * 0.35, false);
});

// Model 4: distant headland ridge — sunk into waterline, wet
gltfLoader.load('./models/coast_land_rocks_04/coast_land_rocks_04_1k.gltf', (gltf) => {
  setupRock(gltf.scene, 0.55, { x: -4.8, y: -0.42, z: -3.5 }, Math.PI * 0.7, true);
});

// Model 5: foreground pebbles — dry sand
gltfLoader.load('./models/sand_rocks_small_01/sand_rocks_small_01_1k.gltf', (gltf) => {
  setupRock(gltf.scene, 0.26, { x: -0.6, y: -0.25, z: 1.6 }, Math.PI * 0.15, false);
});

// 6. Interactive Mouse Tracking
const targetMouse = new THREE.Vector2(0.5, 0.5);

window.addEventListener('mousemove', (event) => {
  targetMouse.x = event.clientX / window.innerWidth;
  targetMouse.y = 1.0 - (event.clientY / window.innerHeight);
});

// Press 'w' to toggle wireframe
window.addEventListener('keydown', (e) => {
  if (e.key === 'w' || e.key === 'W') {
    beachMaterial.wireframe = !beachMaterial.wireframe;
  }
});

// 7. Post-processing — subtle bloom on water/sun highlights + SMAA for the
// foam/wave-edge aliasing, finished off with an OutputPass for correct color/tone mapping.
const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.18,  // strength — much lower; foam/sand were tipping into bloom before
  0.45,  // radius
  0.94   // threshold — raised so only true specular sun-glints bloom, not broad white sand/foam
);
composer.addPass(bloomPass);

const smaaPass = new SMAAPass(
  window.innerWidth * renderer.getPixelRatio(),
  window.innerHeight * renderer.getPixelRatio()
);
composer.addPass(smaaPass);

// Must be last: applies correct color space + tone mapping after the other passes
const outputPass = new OutputPass();
composer.addPass(outputPass);

// 7b. Responsive Resizing
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  composer.setSize(window.innerWidth, window.innerHeight);
  smaaPass.setSize(
    window.innerWidth * renderer.getPixelRatio(),
    window.innerHeight * renderer.getPixelRatio()
  );
});

// Press 'h' to toggle shadow-camera + light debug helpers (see if rocks fall inside the frustum)
window.addEventListener('keydown', (e) => {
  if (e.key === 'h' || e.key === 'H') {
    shadowCameraHelper.visible = !shadowCameraHelper.visible;
    lightHelper.visible = !lightHelper.visible;
  }
});

// 8. Animation Loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const elapsedTime = clock.getElapsedTime();

  uniforms.uTime.value = elapsedTime;
  uniforms.uMouse.value.lerp(targetMouse, 0.05);

  composer.render();
}

animate();