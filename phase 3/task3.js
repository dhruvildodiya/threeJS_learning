import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * ============================================================================
 * PHASE 3 - TASK 3: GLSL + THREE.JS PRODUCTION INTEGRATION
 * ============================================================================
 * Practicing all Core Curriculum Topics inside the Volcano Experience:
 *  1. ShaderMaterial: Custom GLSL with vertex displacement, domain-warping,
 *     cellular fracturing, and analytical normal reconstruction.
 *  2. Uniform Updates: Real-time clock syncing, interactive UI uniforms, and
 *     dynamic point light pulsation synced with shaders.
 *  3. GLSL + Three.js Animation: Convective magma churn, smoke billboard curl,
 *     spark flutter, and terrain seismic breathing.
 *  4. Applying Shaders to 3D Models: GLTF coastal rock clusters embedded around
 *     the volcano, shaded with a customized volcanic rock ShaderMaterial that
 *     blends model textures with procedural molten lava veins.
 *  5. Mouse Interaction: 3D Raycasting with pointer-projected thermal ripple field
 *     (moving the cursor over the volcano ignites and fractures the terrain).
 *  6. Performance Basics: Shared noise chunks, InstancedBufferGeometry,
 *     lightweight 2-octave FBM, pixel ratio clamping, and frustum culling control.
 * ============================================================================
 */

// 1. Scene, Camera, Renderer Setup
const canvas = document.getElementById('canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x140d12);
scene.fog = new THREE.FogExp2(0x140d12, 0.018);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(0, 11, 24);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Performance: avoid 3x+ retina overhead
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.02;
controls.minDistance = 6;
controls.maxDistance = 55;
controls.target.set(0, 4.5, 0);

// 2. Lighting Setup
const ambientLight = new THREE.AmbientLight(0x281e2b, 0.9);
scene.add(ambientLight);

const moonLight = new THREE.DirectionalLight(0x607a9e, 1.4);
moonLight.position.set(-16, 26, -14);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(2048, 2048);
moonLight.shadow.camera.near = 1;
moonLight.shadow.camera.far = 60;
moonLight.shadow.camera.left = -20;
moonLight.shadow.camera.right = 20;
moonLight.shadow.camera.top = 20;
moonLight.shadow.camera.bottom = -20;
moonLight.shadow.bias = -0.001;
scene.add(moonLight);

// Intense Caldera/Lava Light (Flickers dynamically)
const craterLight = new THREE.PointLight(0xff4500, 18.0, 36, 1.4);
craterLight.position.set(0, 7.8, 0);
scene.add(craterLight);

const rimLight = new THREE.PointLight(0xff7b00, 6.0, 24, 1.8);
rimLight.position.set(0, 9.2, 0);
scene.add(rimLight);

// 3. GLSL Procedural Math Chunk (Shared across materials)
const proceduralNoiseGLSL = /* glsl */ `
  vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

  // 2D Simplex Noise
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

  // Multi-octave FBM for organic terrain ridges
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 5; i++) {
      v += a * snoise(p);
      p = rot * p * 2.02 + vec2(1.3, 1.7);
      a *= 0.5;
    }
    return v;
  }

  // Fast 2-octave FBM for real-time performance (prevents overdraw stall)
  float fbmFast(vec2 p) {
    return 0.65 * snoise(p) + 0.35 * snoise(p * 2.3 + vec2(1.3, 1.7));
  }

  // Ridged multifractal noise (jagged basalt foothills)
  float ridgedMF(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    float prev = 1.0;
    for (int i = 0; i < 4; i++) {
      float n = 1.0 - abs(snoise(p));
      n = n * n;
      v += n * a * prev;
      prev = n;
      p *= 2.15;
      a *= 0.45;
    }
    return v;
  }

  // Worley / Cellular noise for cracked basalt crust
  float cellular(vec2 P) {
    vec2 Pi = floor(P);
    vec2 Pf = fract(P);
    float d = 1.0;
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 g = vec2(float(x), float(y));
        vec2 p = Pi + g;
        vec2 h = fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
        vec2 r = g - Pf + h;
        d = min(d, dot(r, r));
      }
    }
    return sqrt(d);
  }

  // Procedural Volcano Heightfield Equation
  float getVolcanoHeight(vec2 xz) {
    float r = length(xz);
    float cone = 8.5 * exp(-0.065 * r * r);
    float crater = 3.6 * exp(-0.6 * r * r);
    float baseVolcano = max(cone - crater, 0.0);

    float angle = atan(xz.y, xz.x);
    float radialRidges = sin(angle * 7.0 + fbm(xz * 0.4) * 2.5) * 0.65;
    radialRidges *= smoothstep(11.0, 2.5, r) * smoothstep(0.8, 2.5, r);

    float foothills = ridgedMF(xz * 0.22) * 1.6;
    float microTerrain = fbm(xz * 0.9) * 0.45;

    return baseVolcano + radialRidges + foothills + microTerrain;
  }
`;

// 4. Central Procedural Volcano Terrain ShaderMaterial
const terrainGeo = new THREE.PlaneGeometry(36, 36, 256, 256);
terrainGeo.rotateX(-Math.PI / 2);

const terrainUniforms = {
  uTime: { value: 0 },
  uLightDir: { value: moonLight.position.clone().normalize() },
  uMouseWorld: { value: new THREE.Vector3(0, 0, 0) },
  uMouseActive: { value: 0.0 },
  uLavaSpeed: { value: 1.0 },
  uLavaGlowColor: { value: new THREE.Color(0xff4500) },
  uLavaCoreColor: { value: new THREE.Color(0xffea75) },
  uRockDarkColor: { value: new THREE.Color(0x110c10) },
  uRockMidColor: { value: new THREE.Color(0x271f22) },
  uAshColor: { value: new THREE.Color(0x40373d) }
};

const terrainMaterial = new THREE.ShaderMaterial({
  uniforms: terrainUniforms,
  vertexShader: `
    ${proceduralNoiseGLSL}

    uniform float uTime;
    uniform vec3 uMouseWorld;
    uniform float uMouseActive;

    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying vec2 vUv;
    varying float vHeight;
    varying float vMouseThermal;

    void main() {
      vUv = uv;
      vec3 pos = position;

      float h = getVolcanoHeight(pos.xz);

      // Interactive mouse thermal displacement wave
      vec4 worldPosInitial = modelMatrix * vec4(pos, 1.0);
      float distToMouse = distance(worldPosInitial.xz, uMouseWorld.xz);
      float mouseImpact = smoothstep(3.2, 0.0, distToMouse) * uMouseActive;
      vMouseThermal = mouseImpact;

      float thermalSwell = sin(distToMouse * 5.0 - uTime * 6.0) * mouseImpact * 0.18;
      pos.y = h + thermalSwell;
      vHeight = pos.y;

      // Analytical normal reconstruction with finite differences
      float eps = 0.08;
      float hL = getVolcanoHeight(pos.xz - vec2(eps, 0.0));
      float hR = getVolcanoHeight(pos.xz + vec2(eps, 0.0));
      float hD = getVolcanoHeight(pos.xz - vec2(0.0, eps));
      float hU = getVolcanoHeight(pos.xz + vec2(0.0, eps));

      vec3 normalCalculated = normalize(vec3(hL - hR, 2.0 * eps, hD - hU));
      vNormal = normalMatrix * normalCalculated;

      vec4 worldPos = modelMatrix * vec4(pos, 1.0);
      vWorldPos = worldPos.xyz;

      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    ${proceduralNoiseGLSL}

    uniform float uTime;
    uniform float uLavaSpeed;
    uniform vec3 uLightDir;
    uniform vec3 uLavaGlowColor;
    uniform vec3 uLavaCoreColor;
    uniform vec3 uRockDarkColor;
    uniform vec3 uRockMidColor;
    uniform vec3 uAshColor;

    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying vec2 vUv;
    varying float vHeight;
    varying float vMouseThermal;

    void main() {
      vec3 N = normalize(vNormal);
      vec3 L = normalize(uLightDir);
      vec3 V = normalize(cameraPosition - vWorldPos);

      vec2 xz = vWorldPos.xz;
      float r = length(xz);
      vec2 dir = r > 0.001 ? xz / r : vec2(0.0, 1.0); // Outward downhill flow vector

      // --- 1. PROCEDURAL BASALT TERRAIN SHADING ---
      float rockNoise = fbm(xz * 1.8);
      float slope = 1.0 - N.y;
      vec3 rockColor = mix(uRockDarkColor, uRockMidColor, smoothstep(0.2, 0.7, rockNoise));
      rockColor = mix(rockColor, uAshColor, smoothstep(0.4, 0.1, slope) * 0.7);

      float diff = max(dot(N, L), 0.0);
      vec3 lighting = rockColor * (diff * 0.85 + 0.15);

      // --- 2. DYNAMIC CONTINUOUS DOWNHILL LAVA FLOW (RADIAL ADVECTION) ---
      float timeFlow = uTime * uLavaSpeed;

      // Advect coordinates outward along mountain slope to simulate viscous flow
      float flowSpeed = 1.6;
      vec2 flowUv = xz - dir * (timeFlow * flowSpeed);

      // Dual-octave domain warping moving with the flow
      vec2 warp = vec2(
        fbmFast(flowUv * 0.8 + vec2(timeFlow * 0.2, -timeFlow * 0.15)),
        fbmFast(flowUv * 0.8 + vec2(-timeFlow * 0.18, timeFlow * 0.22))
      );
      vec2 warpedFlow = flowUv * 1.2 + warp * 1.5;

      // 6 main volcanic lava channels carved down the cone
      float angle = atan(xz.y, xz.x);
      float riverBranches = sin(angle * 5.0 + fbm(xz * 0.4) * 3.2);
      float riverChannel = smoothstep(0.42, 0.92, riverBranches) * smoothstep(15.0, 1.8, r);

      // Summit caldera magma pool glow
      float craterPool = smoothstep(2.5, 0.6, r) * smoothstep(4.6, 6.8, vHeight);

      // Interactive mouse thermal glow along surface
      float interactiveLava = vMouseThermal * 0.8;

      // Clean lava mask strictly confined to the main streams, caldera pool, and mouse cursor
      float lavaMask = clamp(craterPool + riverChannel + interactiveLava, 0.0, 1.0);

      // Solidifying crust streaks ONLY inside the molten streams
      float crustPlates = cellular(warpedFlow * 2.2);

      // Fast-moving boiling hotspots inside the channel
      float hotCurrents = snoise(warpedFlow * 3.0 - dir * (timeFlow * 2.8)) * 0.5 + 0.5;
      float heatPulse = sin(timeFlow * 3.5 + snoise(xz * 2.5)) * 0.15 + 0.85;

      // Layered thermal gradients (Charred Crust -> Burning Red -> Intense Molten Gold -> White Core)
      vec3 moltenColor = mix(uLavaGlowColor * 1.1, uLavaCoreColor * 1.6, hotCurrents * heatPulse);
      moltenColor = mix(moltenColor, vec3(1.0, 0.96, 0.85) * 2.6, smoothstep(0.68, 0.96, hotCurrents * lavaMask));

      // Dark obsidian crust cooling on the stream margins
      vec3 coolingCrust = mix(uRockDarkColor * 0.9, moltenColor, smoothstep(0.12, 0.5, crustPlates));
      vec3 finalLava = mix(coolingCrust, moltenColor, smoothstep(0.2, 0.8, lavaMask));

      // Crisp, clean blend between dark basalt rock and flowing lava streams
      vec3 finalColor = mix(lighting, finalLava, smoothstep(0.01, 0.25, lavaMask));

      // Obsidian specular highlight on dry rock
      vec3 H = normalize(L + V);
      float spec = pow(max(dot(N, H), 0.0), 32.0);
      finalColor += vec3(0.3, 0.35, 0.4) * spec * (1.0 - lavaMask);

      // Atmospheric fog dissolve
      float dist = length(vWorldPos - cameraPosition);
      float fogFactor = 1.0 - exp(-dist * 0.018);
      finalColor = mix(finalColor, vec3(0.08, 0.05, 0.07), fogFactor);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
});

const terrainMesh = new THREE.Mesh(terrainGeo, terrainMaterial);
terrainMesh.receiveShadow = true;
scene.add(terrainMesh);

// 5. Applying Custom ShaderMaterial to 3D GLTF Models (Volcanic Coastal Rocks)
const gltfLoader = new GLTFLoader();

const rockModelMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uLightDir: { value: moonLight.position.clone().normalize() },
    uBaseDiffuse: { value: null },
    uLavaColor: { value: new THREE.Color(0xff4900) },
    uLavaCore: { value: new THREE.Color(0xfff088) }
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying vec2 vUv;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    ${proceduralNoiseGLSL}

    uniform float uTime;
    uniform vec3 uLightDir;
    uniform sampler2D uBaseDiffuse;
    uniform vec3 uLavaColor;
    uniform vec3 uLavaCore;

    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying vec2 vUv;

    void main() {
      vec3 N = normalize(vNormal);
      vec3 L = normalize(uLightDir);
      vec3 V = normalize(cameraPosition - vWorldPos);

      vec3 texColor = texture2D(uBaseDiffuse, vUv).rgb;
      float diff = max(dot(N, L), 0.0);
      vec3 lighting = texColor * (diff * 0.85 + 0.18);

      float veins = cellular(vWorldPos.xz * 3.0 + vec2(uTime * 0.2, -uTime * 0.15));
      float veinMask = smoothstep(0.08, 0.01, veins);

      vec3 lavaVein = mix(uLavaColor * 1.5, uLavaCore * 2.5, veinMask);
      vec3 finalColor = mix(lighting, lavaVein, veinMask * 0.85);

      float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
      finalColor += vec3(0.8, 0.25, 0.1) * fresnel * 0.45;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
});

function loadVolcanicRockModel(path, scale, position, rotationY) {
  gltfLoader.load(path, (gltf) => {
    const model = gltf.scene;
    model.scale.set(scale, scale, scale);
    model.position.set(position.x, position.y, position.z);
    model.rotation.y = rotationY;

    model.traverse((child) => {
      if (child.isMesh) {
        const customMat = rockModelMaterial.clone();
        if (child.material && child.material.map) {
          customMat.uniforms.uBaseDiffuse.value = child.material.map;
        }
        child.material = customMat;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    scene.add(model);
  });
}

loadVolcanicRockModel('./models/coast_land_rocks_02/coast_land_rocks_02_1k.gltf', 0.65, { x: -6.5, y: 0.2, z: 5.5 }, Math.PI * 0.3);
loadVolcanicRockModel('./models/coast_land_rocks_03/coast_land_rocks_03_1k.gltf', 0.75, { x: 7.0, y: 0.3, z: 4.8 }, -Math.PI * 0.4);
loadVolcanicRockModel('./models/sand_rocks_small_01/sand_rocks_small_01_1k.gltf', 0.45, { x: 1.5, y: 0.15, z: 8.5 }, Math.PI * 0.1);

// 6. Caldera Boiling Magma Surface (Convective Liquid Disc)
const magmaGeo = new THREE.CircleGeometry(2.1, 96);
magmaGeo.rotateX(-Math.PI / 2);

const magmaUniforms = {
  uTime: { value: 0 },
  uLavaCore: { value: new THREE.Color(0xfff199) },
  uLavaHot: { value: new THREE.Color(0xff4c00) },
  uLavaDark: { value: new THREE.Color(0x380905) }
};

const magmaMaterial = new THREE.ShaderMaterial({
  uniforms: magmaUniforms,
  vertexShader: `
    ${proceduralNoiseGLSL}

    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vWorldPos;

    void main() {
      vUv = uv;
      vec3 pos = position;

      float boil = snoise(pos.xz * 3.5 + vec2(uTime * 1.2, -uTime * 0.9)) * 0.22;
      float churn = sin(length(pos.xz) * 6.0 - uTime * 3.0) * 0.10;
      pos.y += boil + churn;

      vec4 worldPos = modelMatrix * vec4(pos, 1.0);
      vWorldPos = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    ${proceduralNoiseGLSL}

    uniform float uTime;
    uniform vec3 uLavaCore;
    uniform vec3 uLavaHot;
    uniform vec3 uLavaDark;

    varying vec2 vUv;
    varying vec3 vWorldPos;

    void main() {
      vec2 p = vWorldPos.xz;

      vec2 q = vec2(fbm(p * 1.5 + vec2(uTime * 0.25, -uTime * 0.18)),
                    fbm(p * 1.5 + vec2(-uTime * 0.20, uTime * 0.28)));

      vec2 r = vec2(fbm(p * 2.2 + 3.0 * q + vec2(uTime * 0.35, 0.0)),
                    fbm(p * 2.2 + 3.0 * q + vec2(0.0, -uTime * 0.3)));

      float flow = fbm(p + 3.5 * r);

      float crust = cellular(p * 4.0 + q * 2.0);
      float plateMask = smoothstep(0.18, 0.45, crust);

      vec3 fluidColor = mix(uLavaCore, uLavaHot, smoothstep(0.2, 0.7, flow));
      vec3 finalMagma = mix(fluidColor * 2.6, uLavaDark * 0.8, plateMask);

      float rad = length(p);
      float edgeAlpha = smoothstep(2.1, 1.8, rad);

      gl_FragColor = vec4(finalMagma, edgeAlpha);
    }
  `,
  transparent: true,
  side: THREE.DoubleSide
});

const magmaMesh = new THREE.Mesh(magmaGeo, magmaMaterial);
magmaMesh.position.set(0, 6.05, 0);
scene.add(magmaMesh);

// 7. Optimized Billowing Volcanic Ash Plume
const smokeCount = 42;
const smokeGeo = new THREE.PlaneGeometry(6.5, 6.5);

const smokeUniforms = {
  uTime: { value: 0 },
  uAshDark: { value: new THREE.Color(0x181115) },
  uAshHighlight: { value: new THREE.Color(0x483a42) },
  uFireGlow: { value: new THREE.Color(0xff4500) }
};

const smokeMaterial = new THREE.ShaderMaterial({
  uniforms: smokeUniforms,
  vertexShader: `
    ${proceduralNoiseGLSL}

    uniform float uTime;
    varying vec2 vUv;
    varying float vLife;

    attribute float aPhase;
    attribute vec3 aOffset;

    void main() {
      vUv = uv;

      float life = fract(uTime * 0.15 + aPhase);
      vLife = life;

      vec3 pos = position;
      float scale = mix(1.2, 5.0, life);
      pos *= scale;

      vec3 worldOrigin = aOffset;
      worldOrigin.y += life * 22.0;
      
      float curlX = snoise(vec2(life * 2.2, aPhase * 8.0)) * 3.5 * life;
      float curlZ = snoise(vec2(aPhase * 8.0, life * 2.2)) * 3.5 * life;
      worldOrigin.x += curlX + life * 3.5;
      worldOrigin.z += curlZ;

      vec4 mvPosition = modelViewMatrix * vec4(worldOrigin, 1.0);
      mvPosition.xy += pos.xy;

      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    ${proceduralNoiseGLSL}

    uniform float uTime;
    uniform vec3 uAshDark;
    uniform vec3 uAshHighlight;
    uniform vec3 uFireGlow;

    varying vec2 vUv;
    varying float vLife;

    void main() {
      vec2 center = vUv - 0.5;
      float dist = length(center);

      float n = fbmFast(center * 5.0 + vec2(uTime * 0.15, vLife * 1.5));
      float smokeMask = smoothstep(0.48, 0.08, dist + n * 0.22);

      float glowFactor = smoothstep(0.35, 0.0, vLife);
      vec3 ashTone = mix(uAshDark, uAshHighlight, smoothstep(-0.2, 0.4, n));
      vec3 smokeColor = mix(ashTone, uFireGlow * 1.8, glowFactor * 0.85);

      float alpha = smokeMask * smoothstep(0.0, 0.08, vLife) * smoothstep(1.0, 0.55, vLife) * 0.95;

      if (alpha < 0.01) discard;

      gl_FragColor = vec4(smokeColor, alpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.NormalBlending,
  fog: false
});

const smokeInstancedGeo = new THREE.InstancedBufferGeometry();
smokeInstancedGeo.instanceCount = smokeCount;
smokeInstancedGeo.setAttribute('position', smokeGeo.getAttribute('position'));
smokeInstancedGeo.setAttribute('uv', smokeGeo.getAttribute('uv'));
smokeInstancedGeo.setIndex(smokeGeo.getIndex());

const phases = new Float32Array(smokeCount);
const offsets = new Float32Array(smokeCount * 3);

for (let i = 0; i < smokeCount; i++) {
  phases[i] = Math.random();
  const rad = Math.random() * 1.6;
  const th = Math.random() * Math.PI * 2;
  offsets[i * 3 + 0] = Math.cos(th) * rad;
  offsets[i * 3 + 1] = 6.8 + Math.random() * 0.5;
  offsets[i * 3 + 2] = Math.sin(th) * rad;
}

smokeInstancedGeo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));
smokeInstancedGeo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));

const smokeParticles = new THREE.Mesh(smokeInstancedGeo, smokeMaterial);
smokeParticles.frustumCulled = false;
smokeParticles.renderOrder = 10;
scene.add(smokeParticles);

// 8. Continuous Erupting Magma Fountain & Parabolic Lava Bombs
const eruptCount = 500;
const eruptGeo = new THREE.BufferGeometry();
const eruptPositions = new Float32Array(eruptCount * 3);
const eruptVelocities = new Float32Array(eruptCount * 3);
const eruptPhases = new Float32Array(eruptCount);
const eruptSizes = new Float32Array(eruptCount);

for (let i = 0; i < eruptCount; i++) {
  // Launch origin clustered inside caldera crater
  const r = Math.random() * 1.2;
  const theta = Math.random() * Math.PI * 2;
  eruptPositions[i * 3 + 0] = Math.cos(theta) * r;
  eruptPositions[i * 3 + 1] = 6.8;
  eruptPositions[i * 3 + 2] = Math.sin(theta) * r;

  // Outward explosive fountain arc
  const spreadAngle = Math.random() * Math.PI * 2;
  const horizSpeed = 1.5 + Math.random() * 5.5;
  eruptVelocities[i * 3 + 0] = Math.cos(spreadAngle) * horizSpeed;
  eruptVelocities[i * 3 + 1] = 7.0 + Math.random() * 9.0; // Upward blast velocity
  eruptVelocities[i * 3 + 2] = Math.sin(spreadAngle) * horizSpeed;

  eruptPhases[i] = Math.random();
  eruptSizes[i] = 20.0 + Math.random() * 25.0;
}

eruptGeo.setAttribute('position', new THREE.BufferAttribute(eruptPositions, 3));
eruptGeo.setAttribute('aVel', new THREE.BufferAttribute(eruptVelocities, 3));
eruptGeo.setAttribute('aPhase', new THREE.BufferAttribute(eruptPhases, 1));
eruptGeo.setAttribute('aSize', new THREE.BufferAttribute(eruptSizes, 1));

const eruptMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uSpeed: { value: 1.0 },
    uLavaGlow: { value: new THREE.Color(0xff3700) },
    uLavaCore: { value: new THREE.Color(0xffea66) }
  },
  vertexShader: `
    uniform float uTime;
    uniform float uSpeed;
    attribute vec3 aVel;
    attribute float aPhase;
    attribute float aSize;

    varying float vLife;
    varying float vAlpha;

    void main() {
      float t = fract(uTime * 0.35 * uSpeed + aPhase);
      vLife = t;

      // Parabolic ballistic trajectory: p(t) = p0 + v*t - 0.5*g*t^2
      vec3 pos = position + aVel * (t * 2.2);
      pos.y -= 0.5 * 19.6 * (t * t * 1.2); // Realistic volcanic gravity pull

      vAlpha = smoothstep(0.0, 0.05, t) * smoothstep(1.0, 0.75, t);

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = (aSize / -mvPosition.z) * (1.0 - t * 0.35);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform vec3 uLavaGlow;
    uniform vec3 uLavaCore;
    varying float vLife;
    varying float vAlpha;

    void main() {
      vec2 coord = gl_PointCoord - vec2(0.5);
      float d = length(coord);
      if (d > 0.5) discard;

      float spark = smoothstep(0.5, 0.0, d);
      // Magma cools from incandescent white/gold into deep molten red as it arcs through air
      vec3 col = mix(uLavaCore * 2.8, uLavaGlow * 1.8, vLife * 0.9);

      gl_FragColor = vec4(col, spark * vAlpha);
    }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

const magmaFountain = new THREE.Points(eruptGeo, eruptMaterial);
magmaFountain.frustumCulled = false;
scene.add(magmaFountain);

// 9. Interactive 3D Mouse Tracking (Pointer Raycast on Terrain Plane)
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(-100, -100);
const terrainGroundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const rayHitPoint = new THREE.Vector3();

window.addEventListener('mousemove', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.ray.intersectPlane(terrainGroundPlane, rayHitPoint);
  if (hits) {
    terrainUniforms.uMouseWorld.value.lerp(rayHitPoint, 0.15);
    terrainUniforms.uMouseActive.value = THREE.MathUtils.lerp(terrainUniforms.uMouseActive.value, 1.0, 0.1);
  }
});

window.addEventListener('mouseleave', () => {
  terrainUniforms.uMouseActive.value = 0.0;
});

// 10. Post-Processing: Multi-stage Bloom & ACES OutputPass
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.72,
  0.45,
  0.88
);
composer.addPass(bloomPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

// 11. Interactive UI Controls (Uniform Tweaking & Live Feedback)
function createInteractiveUI() {
  const panel = document.createElement('div');
  panel.id = 'volcano-panel';
  panel.innerHTML = `
    <div class="panel-header">
      <span class="panel-title">GLSL PRODUCTION CONTROLS</span>
      <span class="panel-status">ONLINE</span>
    </div>
    <div class="panel-desc">Move your cursor over the mountain to trigger real-time thermal crack displacement!</div>
    <div class="panel-control">
      <div class="control-label">
        <span>Lava Flow Velocity</span>
        <span id="speed-val">1.0x</span>
      </div>
      <input type="range" id="speed-slider" min="20" max="300" value="100" step="10">
    </div>
    <div class="panel-control">
      <div class="control-label">
        <span>Bloom Glow Intensity</span>
        <span id="bloom-val">0.72</span>
      </div>
      <input type="range" id="bloom-slider" min="10" max="200" value="72" step="5">
    </div>
    <div class="panel-buttons">
      <button id="btn-eruption" class="volcano-btn">SURGE ERUPTION</button>
      <button id="btn-color" class="volcano-btn">SWAP MAGMA PALETTE</button>
    </div>
  `;
  document.body.appendChild(panel);

  const style = document.createElement('style');
  style.textContent = `
    #volcano-panel {
      position: absolute;
      bottom: 24px;
      right: 24px;
      width: 320px;
      background: rgba(14, 10, 16, 0.85);
      border: 1px solid rgba(255, 75, 0, 0.45);
      border-radius: 12px;
      padding: 18px 20px;
      backdrop-filter: blur(14px);
      box-shadow: 0 0 25px rgba(255, 69, 0, 0.18), inset 0 0 15px rgba(255, 69, 0, 0.06);
      color: #f7ebe6;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      z-index: 100;
      user-select: none;
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      border-bottom: 1px solid rgba(255, 75, 0, 0.25);
      padding-bottom: 6px;
    }
    .panel-title {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 1px;
      color: #ff5e00;
    }
    .panel-status {
      font-size: 10px;
      color: #00ffaa;
      font-weight: 600;
      letter-spacing: 1px;
    }
    .panel-desc {
      font-size: 11px;
      color: #c9af9f;
      line-height: 1.4;
      margin-bottom: 14px;
    }
    .panel-control {
      margin-bottom: 12px;
    }
    .control-label {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      margin-bottom: 5px;
      color: #e3c4b5;
    }
    input[type=range] {
      -webkit-appearance: none;
      width: 100%;
      height: 5px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.15);
      outline: none;
    }
    input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 15px;
      height: 15px;
      border-radius: 50%;
      background: #ff5500;
      cursor: pointer;
      box-shadow: 0 0 8px #ff4500;
    }
    .panel-buttons {
      display: flex;
      gap: 10px;
      margin-top: 14px;
    }
    .volcano-btn {
      flex: 1;
      padding: 8px 10px;
      background: rgba(255, 69, 0, 0.15);
      border: 1px solid rgba(255, 69, 0, 0.45);
      color: #ff7733;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.6px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .volcano-btn:hover {
      background: rgba(255, 69, 0, 0.35);
      box-shadow: 0 0 12px rgba(255, 69, 0, 0.45);
      transform: translateY(-1px);
    }
  `;
  document.head.appendChild(style);

  // Speed slider
  const speedSlider = document.getElementById('speed-slider');
  const speedVal = document.getElementById('speed-val');
  speedSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) / 100;
    terrainUniforms.uLavaSpeed.value = val;
    speedVal.textContent = val.toFixed(1) + 'x';
  });

  // Bloom slider
  const bloomSlider = document.getElementById('bloom-slider');
  const bloomVal = document.getElementById('bloom-val');
  bloomSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) / 100;
    bloomPass.strength = val;
    bloomVal.textContent = val.toFixed(2);
  });

  // Eruption surge trigger
  let surge = false;
  const eruptionBtn = document.getElementById('btn-eruption');
  eruptionBtn.addEventListener('click', () => {
    surge = !surge;
    eruptionBtn.textContent = surge ? 'RESET ERUPTION' : 'SURGE ERUPTION';
    terrainUniforms.uLavaSpeed.value = surge ? 2.5 : 1.0;
    speedSlider.value = surge ? 250 : 100;
    speedVal.textContent = (surge ? 2.5 : 1.0).toFixed(1) + 'x';
    bloomPass.strength = surge ? 1.25 : 0.72;
    bloomSlider.value = surge ? 125 : 72;
    bloomVal.textContent = (surge ? 1.25 : 0.72).toFixed(2);
  });

  // Color palette swap
  let paletteIndex = 0;
  const palettes = [
    { glow: 0xff4500, core: 0xffea75 }, // Natural Molten Orange
    { glow: 0x00f0ff, core: 0xc4ffff }, // Cryo / Plasma Blue
    { glow: 0xaa00ff, core: 0xff88ff }  // Void / Nether Violet
  ];
  const colorBtn = document.getElementById('btn-color');
  colorBtn.addEventListener('click', () => {
    paletteIndex = (paletteIndex + 1) % palettes.length;
    const p = palettes[paletteIndex];
    terrainUniforms.uLavaGlowColor.value.setHex(p.glow);
    terrainUniforms.uLavaCoreColor.value.setHex(p.core);
    eruptMaterial.uniforms.uLavaGlow.value.setHex(p.glow);
    eruptMaterial.uniforms.uLavaCore.value.setHex(p.core);
    craterLight.color.setHex(p.glow);
    rimLight.color.setHex(p.core);
  });
}

createInteractiveUI();

// 12. Responsive Window Resizing
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  composer.setSize(window.innerWidth, window.innerHeight);
});

// 13. Animation Loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const elapsedTime = clock.getElapsedTime();

  // Point light flickers simulating convective heat
  const flicker = Math.sin(elapsedTime * 9.0) * 0.2 + Math.cos(elapsedTime * 17.0) * 0.15;
  craterLight.intensity = 18.0 + flicker * 4.0;
  rimLight.intensity = 6.0 + flicker * 2.0;

  // Real-time uniform updates across all materials
  terrainUniforms.uTime.value = elapsedTime;
  magmaUniforms.uTime.value = elapsedTime;
  smokeUniforms.uTime.value = elapsedTime;
  eruptMaterial.uniforms.uTime.value = elapsedTime;
  rockModelMaterial.uniforms.uTime.value = elapsedTime;

  controls.update();
  composer.render();
}

animate();
