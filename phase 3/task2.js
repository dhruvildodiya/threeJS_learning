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
 * v3 — Performance pass (+ two correctness fixes):
 *  - Tide edge (waterBorder) computed per-vertex instead of per-pixel
 *  - All water shading (caustics, chop, fresnel, foam) skipped on dry sand pixels
 *  - True 2x2 cellular noise with a sin-free hash
 *  - Pixel ratio capped at 1.5
 *  - Shadow map is static (rendered once after assets load), tighter frustum
 *  - FIX: water normal was in local space vs world-space view/light vectors
 *         (Fresnel + glints never fired). Now world-space.
 *  - FIX: sand normal map was tangent-space vs world-space light. Now world-space.
 *  - Ground can't sample the shadow map (custom ShaderMaterial), so soft
 *    analytic contact shadows are drawn under trees/rocks instead.
 * ============================================================================
 */

const MAX_DPR = 1.5;
const getDPR = () => Math.min(window.devicePixelRatio, MAX_DPR);

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
renderer.setPixelRatio(getDPR());
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// Nothing that casts shadows moves, so render the shadow map once after load
// (see loadingManager.onLoad below) instead of every frame.
renderer.shadowMap.autoUpdate = false;

// Fog to soften the ocean/sky seam and add atmospheric depth toward the horizon
scene.fog = new THREE.FogExp2(0x8ea8be, 0.012);

// Shared loading manager: fires once every model/texture referenced by the
// GLTF loaders has finished, then bakes the static shadow map a single time.
const loadingManager = new THREE.LoadingManager();
loadingManager.onLoad = () => {
  renderer.shadowMap.needsUpdate = true;
};

// Load HDR Environment (Aristea Wreck Pure Sky)
const rgbeLoader = new RGBELoader();
rgbeLoader.load('./environment/aristea_wreck_puresky_2k.hdr', (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = texture;
  scene.environment = texture;
});

// 1b. Procedural Incandescent Sun in the Sky
const sunPosition = new THREE.Vector3(4.2, 6.8, -30.0);

const sunMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uSunCoreColor: { value: new THREE.Color('#ffffff') },
    uSunGlowColor: { value: new THREE.Color('#ffdf9e') },
    uSunCoronaColor: { value: new THREE.Color('#ffa64d') }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uSunCoreColor;
    uniform vec3 uSunGlowColor;
    uniform vec3 uSunCoronaColor;
    varying vec2 vUv;

    void main() {
      vec2 center = vUv - vec2(0.5);
      float dist = length(center) * 2.0; // 0.0 at center, 1.0 at edge
      if (dist > 1.0) discard;

      // Radiant dazzling solar core
      float disc = smoothstep(0.32, 0.18, dist);

      // Symmetrical 360-degree radial sunburst rays streaming in all directions
      float angle = atan(center.y, center.x);
      float rays1 = sin(angle * 12.0 + uTime * 0.25) * 0.5 + 0.5;
      float rays2 = sin(angle * 8.0 - uTime * 0.18) * 0.5 + 0.5;
      float raysCombined = pow(rays1 * rays2, 2.2);

      // Atmospheric glowing corona halo + light shafts
      float corona = pow(clamp(1.0 - dist, 0.0, 1.0), 2.2);
      corona += raysCombined * pow(clamp(1.0 - dist, 0.0, 1.0), 1.3) * 0.35;

      // HDR color blend for natural solar glow
      vec3 col = mix(uSunCoronaColor * 1.5, uSunGlowColor * 2.8, pow(corona, 1.4));
      col = mix(col, uSunCoreColor * 4.5, disc);

      float alpha = clamp(disc * 1.0 + corona * 0.85, 0.0, 1.0);
      gl_FragColor = vec4(col, alpha);
    }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

const sunGeo = new THREE.PlaneGeometry(10.5, 10.5);
const sunMesh = new THREE.Mesh(sunGeo, sunMaterial);
sunMesh.position.copy(sunPosition);
sunMesh.lookAt(camera.position);
scene.add(sunMesh);

// 1c. Sun Light — directional light aligned with the visible sun in the sky
const sunLight = new THREE.DirectionalLight(0xfff4e0, 1.35);
sunLight.position.set(4.2, 14.0, 2.0);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
// Tightened frustum: all shadow casters live within roughly x ±7, z -7..2,
// so ±9 gives sharper shadows than ±20 at the same map resolution.
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 40;
sunLight.shadow.camera.left = -9;
sunLight.shadow.camera.right = 9;
sunLight.shadow.camera.top = 9;
sunLight.shadow.camera.bottom = -9;
sunLight.shadow.bias = -0.0015;
sunLight.shadow.radius = 4; // soft shadow edges
scene.add(sunLight);

sunLight.target.position.set(0, 0, -6);
scene.add(sunLight.target);

const ambient = new THREE.AmbientLight(0xd9ebff, 0.32);
scene.add(ambient);

// Debug helper for the shadow camera frustum — press 'h' to toggle.
const shadowCameraHelper = new THREE.CameraHelper(sunLight.shadow.camera);
shadowCameraHelper.visible = false;
scene.add(shadowCameraHelper);

const lightHelper = new THREE.DirectionalLightHelper(sunLight, 2);
lightHelper.visible = false;
scene.add(lightHelper);

// 2. GLSL 2D Simplex Noise, Cellular/Worley Noise & Multi-octave fBm
const noiseShaderChunk = /* glsl */ `
  vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
  vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

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

  // Cheap sin-free 2D hash (Dave Hoskins)
  vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
  }

  // True 2x2 cellular (Worley) noise for organic foam bubbles.
  // Jitter is narrowed to [0.125, 0.875] so the 2x2 neighbourhood is always
  // enough to find the nearest feature point.
  float cellular2x2(vec2 P) {
    vec2 Pi = floor(P - 0.5);
    vec2 Pf = P - Pi;
    float d = 1.0;
    for (int y = 0; y <= 1; y++) {
      for (int x = 0; x <= 1; x++) {
        vec2 g = vec2(float(x), float(y));
        vec2 r = g + hash22(Pi + g) * 0.75 + 0.125 - Pf;
        d = min(d, dot(r, r));
      }
    }
    return sqrt(d);
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
const maxAniso = renderer.capabilities.getMaxAnisotropy();

const sandDiffTexture = textureLoader.load('./textures/beach/textures/aerial_beach_01_diff_2k.jpg');
sandDiffTexture.wrapS = THREE.RepeatWrapping;
sandDiffTexture.wrapT = THREE.RepeatWrapping;
sandDiffTexture.colorSpace = THREE.SRGBColorSpace;
sandDiffTexture.anisotropy = maxAniso; // kills sand shimmer at grazing angles

const sandNormalTexture = textureLoader.load('./textures/beach/textures/aerial_beach_01_nor_gl_2k.jpg');
sandNormalTexture.wrapS = THREE.RepeatWrapping;
sandNormalTexture.wrapT = THREE.RepeatWrapping;
sandNormalTexture.anisotropy = maxAniso;

// 3. Shader Material Uniforms (Calibrated Natural Coastal Palette + Sun Vector)
const sunLightDir = sunPosition.clone().sub(new THREE.Vector3(0, 0, -6)).normalize();

// Soft analytic contact shadows on the sand (x, z, radius). The ground is a
// custom ShaderMaterial and can't sample the shadow map, so these fake the
// shadow each tree/rock casts. Keep in sync with the setup* calls below.
const contactShadows = [
  new THREE.Vector3(-3.8, 0.1, 1.2),   // hero tree
  new THREE.Vector3(-5.1, -1.6, 0.9),  // background tree
  new THREE.Vector3(-2.7, 1.1, 1.0),   // foreground tree
  new THREE.Vector3(-3.2, 0.2, 0.55),  // left rocks
  new THREE.Vector3(-0.6, 1.6, 0.35),  // foreground pebbles
  new THREE.Vector3(3.6, -1.8, 0.6)    // right shoreline rocks
];

const uniforms = {
  uTime: { value: 0 },
  uMouse: { value: new THREE.Vector2(0.5, 0.5) },
  uSandTexture: { value: sandDiffTexture },
  uSandNormal: { value: sandNormalTexture },
  // Natural realistic ocean tones (subtle, non-electric):
  uShallowTurquoise: { value: new THREE.Color('#1f7070') }, // muted clear teal shallows
  uMidOceanColor: { value: new THREE.Color('#155169') },    // realistic coastal deep-blue
  uDeepOceanColor: { value: new THREE.Color('#0b2a3a') },   // dark navy depth
  uFoamColor: { value: new THREE.Color('#f0f5fa') },
  uSunColor: { value: new THREE.Color('#fff4e0') },
  uSkyColor: { value: new THREE.Color('#6f9fc5') },         // sky reflection tone from Aristea sky HDR
  uHorizonColor: { value: new THREE.Color('#8ea8be') },
  uLightDir: { value: sunLightDir },
  uContactShadows: { value: contactShadows },
  uContactStrength: { value: 0.32 }                         // 0 disables contact shadows
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
    varying float vShoreCoord;
    varying float vWaterBorder;
    varying vec3 vWorldPosition;

    void main() {
      vUv = uv;
      vec3 newPosition = position;

      float shoreCoord = (uv.x * 0.50) + (uv.y * 0.55);
      vShoreCoord = shoreCoord;

      // Organic shoreline tide edge. Low-frequency and depends only on uv + time,
      // so it's evaluated per-vertex and interpolated (was per-pixel).
      float tide = sin(uTime * 0.85) * 0.055 + 0.445;
      float wobbleCoarse = fbm(vec2(uv.x * 5.0 - uv.y * 3.5, uTime * 0.12)) * 0.048;
      float wobbleFine   = fbm2(vec2(uv.x * 24.0 - uv.y * 18.0, uTime * 0.3)) * 0.014;
      vWaterBorder = tide + wobbleCoarse + wobbleFine;

      float waterMask = smoothstep(0.42, 0.70, shoreCoord);

      float waveAngle = (uv.x * 0.5 + uv.y * 0.5) * 36.0 - uTime * 2.2;
      float swell = sin(waveAngle + sin(uv.x * 12.0) * 0.5) * 0.14;

      float ripples = snoise(uv * 50.0 + vec2(uTime * 0.6, uTime * 0.1)) * 0.04;

      float distToMouse = distance(uv, uMouse);
      float mouseImpact = sin(distToMouse * 30.0 - uTime * 4.0) * smoothstep(0.25, 0.0, distToMouse) * 0.08;

      float elevation = (swell + ripples + mouseImpact) * waterMask;
      newPosition.z += elevation;

      vElevation = elevation;

      vec4 worldPos = modelMatrix * vec4(newPosition, 1.0);
      vWorldPosition = worldPos.xyz;

      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,

  // --- FRAGMENT SHADER ---
  fragmentShader: `
    ${noiseShaderChunk}

    uniform float uTime;
    uniform sampler2D uSandTexture;
    uniform sampler2D uSandNormal;
    uniform vec3 uShallowTurquoise;
    uniform vec3 uMidOceanColor;
    uniform vec3 uDeepOceanColor;
    uniform vec3 uFoamColor;
    uniform vec3 uSunColor;
    uniform vec3 uSkyColor;
    uniform vec3 uHorizonColor;
    uniform vec3 uLightDir;
    uniform vec3 uContactShadows[6];
    uniform float uContactStrength;

    varying vec2 vUv;
    varying float vElevation;
    varying float vShoreCoord;
    varying float vWaterBorder;
    varying vec3 vWorldPosition;

    void main() {
      float coord = vShoreCoord;
      float waterBorder = vWaterBorder;

      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      vec3 halfDir = normalize(uLightDir + viewDir);

      // 1. SAND BED SHADING (Bright Dry Sand vs. Dark Wet Intertidal Sand)
      vec2 sandUv = vUv * 8.0;
      vec3 sandSample = texture2D(uSandTexture, sandUv).rgb;

      // Sand normal map -> WORLD space. The plane is rotated -90deg about X, so
      // tangent (x, y, z) maps to world (x, z, -y).
      vec3 sn = texture2D(uSandNormal, sandUv).rgb * 2.0 - 1.0;
      vec3 sandNormal = normalize(vec3(sn.x * 0.65, 1.0, -sn.y * 0.65));
      float sandDiffuse = clamp(dot(sandNormal, uLightDir), 0.25, 1.0);

      // Bright, warm sun-kissed golden dry sand
      vec3 drySand = pow(sandSample, vec3(0.85)) * vec3(1.38, 1.28, 1.06) + vec3(0.06, 0.05, 0.02);
      drySand *= mix(0.88, 1.15, sandDiffuse);

      // Saturated, darkened damp sand where the wave recedes
      vec3 wetSand = drySand * vec3(0.48, 0.40, 0.32);

      // Wet wash zone: starts near the wave reach and blends up to the water border
      float wetZoneReach = waterBorder - 0.12;
      float wetBlend = smoothstep(wetZoneReach, waterBorder, coord);
      vec3 sand = mix(drySand, wetSand, wetBlend);

      // Soft contact shadows under trees/rocks, cast away from the sun
      vec2 shadowDir = -normalize(uLightDir.xz);
      float contact = 0.0;
      for (int i = 0; i < 6; i++) {
        vec3 c = uContactShadows[i];
        vec2 center = c.xy + shadowDir * c.z * 0.45;
        float d = length(vWorldPosition.xz - center);
        contact = max(contact, smoothstep(c.z, c.z * 0.15, d));
      }
      sand *= 1.0 - contact * uContactStrength;

      // 2. WATER MASK — everything water-related below is skipped on dry sand
      float isWater = smoothstep(waterBorder - 0.005, waterBorder + 0.012, coord);
      vec3 sceneColor = sand;

      if (isWater > 0.0) {
        // Water thickness increases smoothly away from shore
        float waterDepth = clamp((coord - waterBorder) / 0.38, 0.0, 1.0);
        waterDepth = smoothstep(0.0, 1.0, waterDepth);

        // Deep water color progression
        vec3 waterBodyColor = mix(uShallowTurquoise, uMidOceanColor, smoothstep(0.05, 0.50, waterDepth));
        waterBodyColor = mix(waterBodyColor, uDeepOceanColor, smoothstep(0.45, 0.95, waterDepth));

        // Submerged sand bed: sand is clearly visible through shallows
        vec3 submergedBed = wetSand * vec3(0.85, 0.92, 0.96);

        // Shallows caustics (fade out by waterDepth 0.35, so skip beyond that)
        if (waterDepth < 0.35) {
          vec2 causticUv = vUv * 48.0 + vec2(sin(uTime * 0.9), cos(uTime * 0.7)) * 0.35;
          float caustics = fbm2(causticUv);
          float causticShimmer = smoothstep(0.16, 0.38, caustics) * (1.0 - smoothstep(0.03, 0.35, waterDepth));
          submergedBed += uSunColor * causticShimmer * 0.25;
        }

        // Optical absorption: sand visible in shallows, fades into deep blue
        float waterOpacity = smoothstep(0.0, 0.32, waterDepth);
        vec3 internalWater = mix(submergedBed, waterBodyColor, waterOpacity);

        // 3. FRESNEL SKY REFLECTION — surface normal in WORLD space (up = +Y)
        vec2 chopUv = vUv * 35.0 + vec2(uTime * 0.4, -uTime * 0.3);
        float chopX = snoise(chopUv) * 0.15;
        float chopZ = snoise(chopUv + 43.1) * 0.15;
        vec3 surfaceNormal = normalize(vec3(chopX, 1.0, chopZ));

        // Schlick Fresnel approximation for water (F0 ~ 0.02)
        float cosTheta = clamp(dot(surfaceNormal, viewDir), 0.0, 1.0);
        float fresnel = 0.02 + 0.98 * pow(1.0 - cosTheta, 4.0);
        vec3 waterSurface = mix(internalWater, uSkyColor, fresnel * 0.72);

        // 4. RESTRAINED SHORE FOAM — cheap masks first, noise only where visible
        float shoreFoamBand = smoothstep(waterBorder, waterBorder + 0.010, coord) *
                              smoothstep(waterBorder + 0.035, waterBorder + 0.006, coord);

        float capMask = smoothstep(0.065, 0.12, vElevation) * smoothstep(0.52, 0.90, coord);

        vec2 rockPos1 = vec2(3.6, -1.8);
        float rockSkirt1 = smoothstep(0.8, 0.25, length(vWorldPosition.xz - rockPos1)) *
                           smoothstep(waterBorder + 0.01, waterBorder + 0.25, coord);
        vec2 rockPos2 = vec2(5.6, -5.8);
        float rockSkirt2 = smoothstep(1.2, 0.4, length(vWorldPosition.xz - rockPos2)) *
                           smoothstep(waterBorder + 0.01, waterBorder + 0.25, coord);
        float rockMask = rockSkirt1 * 0.35 + rockSkirt2 * 0.3;

        float totalFoam = 0.0;
        if (shoreFoamBand + capMask + rockMask > 0.0) {
          vec2 bubbleUv = vUv * vec2(110.0, 95.0) + vec2(uTime * 0.25, -uTime * 0.15);
          float lace = smoothstep(0.30, 0.70, cellular2x2(bubbleUv));
          float clumps = smoothstep(-0.05, 0.40, fbm2(vUv * 30.0 + vec2(uTime * 0.15, -uTime * 0.08)));
          totalFoam = clamp(
            shoreFoamBand * lace * clumps * 0.65 +
            capMask * lace * 0.45 +
            rockMask * lace,
            0.0, 0.60
          );
        }

        // 5. BLEND DRY SHORE WITH WATER, then foam overlay
        sceneColor = mix(sand, waterSurface, isWater);
        sceneColor = mix(sceneColor, uFoamColor, totalFoam * isWater);

        // 6. SPECULAR SUN GLINTS ON WATER (Blinn-Phong)
        float waterSpecular = pow(max(dot(surfaceNormal, halfDir), 0.0), 64.0);
        sceneColor += uSunColor * waterSpecular * isWater * 0.75;
      }

      // Wet-sand sheen (only where sand is actually visible)
      float sandSpecular = pow(max(dot(sandNormal, halfDir), 0.0), 32.0);
      sceneColor += uSunColor * sandSpecular * wetBlend * (1.0 - isWater) * 0.20;

      // 7. SEAMLESS HORIZON ATMOSPHERIC DISSOLVE
      float backEdgeFade = smoothstep(0.72, 0.99, vUv.y);
      float oceanDistance = smoothstep(0.60, 0.99, coord);
      float horizonDissolve = max(backEdgeFade, oceanDistance);
      sceneColor = mix(sceneColor, uHorizonColor, horizonDissolve * 0.70);

      gl_FragColor = vec4(sceneColor, 1.0);
    }
  `
});

// 5. Expansive Ground Plane seamlessly meeting the sky dome horizon.
// Keep 220x220 segments: the tide edge is now evaluated per-vertex, and its
// fine wobble needs this vertex density to stay smooth.
const geometry = new THREE.PlaneGeometry(45.0, 45.0, 220, 220);
const mesh = new THREE.Mesh(geometry, beachMaterial);
mesh.rotation.x = -Math.PI / 2;
mesh.position.set(0, -0.05, -6.0);
// (receiveShadow omitted: a custom ShaderMaterial can't sample the shadow map;
// contact shadows are handled analytically in the fragment shader instead.)
scene.add(mesh);

// 6. Load Coastal 3D Rock & Tree Models with Promise.all
const gltfLoader = new GLTFLoader();

function loadGLTF(url) {
  return new Promise((resolve, reject) => {
    gltfLoader.load(url, resolve, undefined, reject);
  });
}

// isWet: rocks partly submerged/near the waterline get a lower roughness (sheen),
// dry beach rocks keep a higher, chalkier roughness.
function setupRock(rock, scale, pos, rotY, isWet = false) {
  rock.scale.set(scale, scale, scale);
  rock.position.set(pos.x, pos.y, pos.z);
  rock.rotation.y = rotY;

  rock.traverse((child) => {
    if (child.isMesh && child.material) {
      if (child.material.map) {
        child.material.map.colorSpace = THREE.SRGBColorSpace;
      }
      child.material.roughness = isWet ? 0.35 : 0.85;
      child.material.metalness = isWet ? 0.08 : 0.0;
      child.material.envMapIntensity = isWet ? 1.2 : 0.55;
      child.castShadow = true;
      child.receiveShadow = true;
      child.frustumCulled = false;
    }
  });
  scene.add(rock);
}

// Helper for Island Trees (Palm/Coastal Tree with realistic shadows)
function setupTree(tree, scale, pos, rotY, rotZ = 0) {
  tree.scale.set(scale, scale, scale);
  tree.position.set(pos.x, pos.y, pos.z);
  tree.rotation.y = rotY;
  tree.rotation.z = rotZ;

  tree.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.frustumCulled = false;
      if (child.material) {
        child.material.shadowSide = THREE.DoubleSide;
        if (child.material.map) {
          child.material.map.colorSpace = THREE.SRGBColorSpace;
        }

        const matName = (child.material.name || '').toLowerCase();

        // Leaves: Rich, vibrant lush tropical foliage
        if (child.material.transparent || matName.includes('leaf') || matName.includes('leaves')) {
          child.material.side = THREE.DoubleSide;
          child.material.alphaTest = 0.40;
          child.material.depthWrite = true;
          child.material.transparent = false;
          child.material.color.set('#48b330'); // Rich deep tropical green
          child.material.roughness = 0.55;
          child.material.envMapIntensity = 0.30;
        } else {
          // Trunk & Branches: Rich dark weathered tropical bark
          child.material.color.set('#836f61'); // Saturated deep brown timber
          child.material.roughness = 0.85;
          child.material.envMapIntensity = 0.20;
        }
      }
    }
  });
  scene.add(tree);
}

// Load all models in parallel with Promise.all
Promise.all([
  loadGLTF('./models/coast_rocks_05/coast_rocks_05_1k.gltf'),
  loadGLTF('./models/coast_land_rocks_03/coast_land_rocks_03_1k.gltf'),
  loadGLTF('./models/coast_land_rocks_02/coast_land_rocks_02_1k.gltf'),
  loadGLTF('./models/coast_land_rocks_04/coast_land_rocks_04_1k.gltf'),
  loadGLTF('./models/sand_rocks_small_01/sand_rocks_small_01_1k.gltf'),
  loadGLTF('./models/island_tree_03/island_tree_03_1k.gltf')
]).then(([rock1, rock2, rock3, rock4, rock5, treeGltf]) => {
  // 1. Distant sea stack
  setupRock(rock1.scene, 0.85, { x: 5.6, y: -0.08, z: -5.8 }, -Math.PI * 0.35, true);

  // 2. Right shoreline cluster
  setupRock(rock2.scene, 0.42, { x: 3.6, y: -0.28, z: -1.8 }, Math.PI * 0.2, true);

  // 3. Low rocks on left shoreline
  setupRock(rock3.scene, 0.38, { x: -3.2, y: -0.21, z: 0.2 }, Math.PI * 0.35, false);

  // 4. Distant headland ridge
  setupRock(rock4.scene, 0.58, { x: -5.0, y: -0.20, z: -3.8 }, Math.PI * 0.7, true);

  // 5. Foreground pebbles
  setupRock(rock5.scene, 0.26, { x: -0.6, y: -0.06, z: 1.6 }, Math.PI * 0.15, false);

  // 6. Island Trees
  setupTree(treeGltf.scene, 0.72, { x: -3.8, y: -0.08, z: 0.1 }, 0.85, 0.06);

  const tree2 = treeGltf.scene.clone();
  setupTree(tree2, 0.52, { x: -5.1, y: -0.08, z: -1.6 }, -1.4, -0.04);

  const tree3 = treeGltf.scene.clone();
  setupTree(tree3, 0.60, { x: -2.7, y: -0.08, z: 1.1 }, 2.2, -0.07);

  renderer.shadowMap.needsUpdate = true;
}).catch((err) => {
  console.error("Failed to load models via Promise.all:", err);
});

// ============================================================================
// 6. PROCEDURAL ANIMATED SEAGULL FLOCK (High over open ocean horizon)
// ============================================================================
const birdCount = 8;
const birdGeo = new THREE.BufferGeometry();
// Low-poly bird wings: Beak, Left Wing Tip, Tail, Right Wing Tip
const birdPositions = new Float32Array([
  // Left Wing Triangle
  0.0, 0.0, 0.22,
  -0.70, 0.08, -0.06,
  0.0, -0.02, -0.26,
  // Right Wing Triangle
  0.0, 0.0, 0.22,
  0.0, -0.02, -0.26,
  0.70, 0.08, -0.06
]);
birdGeo.setAttribute('position', new THREE.BufferAttribute(birdPositions, 3));
birdGeo.computeVertexNormals();

const birdMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uFlapSpeed: { value: 5.5 },
    uBirdColor: { value: new THREE.Color('#1e242b') },     // deep black / dark slate plumage
    uWingTipColor: { value: new THREE.Color('#0a0d12') }  // pitch black wing tips
  },
  vertexShader: `
    uniform float uTime;
    uniform float uFlapSpeed;
    varying float vWing;

    void main() {
      vec3 pos = position;

      // Realistic avian wing flap kinematics
      float wingDist = abs(pos.x);
      float flap = sin(uTime * uFlapSpeed);
      pos.y += flap * wingDist * 0.45;
      pos.z += abs(flap) * wingDist * 0.10;

      vWing = wingDist;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform vec3 uBirdColor;
    uniform vec3 uWingTipColor;
    varying float vWing;

    void main() {
      vec3 col = mix(uBirdColor, uWingTipColor, smoothstep(0.40, 0.70, vWing));
      gl_FragColor = vec4(col, 1.0);
    }
  `,
  side: THREE.DoubleSide
});

const birds = [];
const birdGroup = new THREE.Group();

for (let i = 0; i < birdCount; i++) {
  const customBirdMat = birdMaterial.clone();
  const bird = new THREE.Mesh(birdGeo, customBirdMat);
  const phase = (i / birdCount) * Math.PI * 2;
  const speed = 0.22 + (i % 3) * 0.06;
  const radiusX = 10.0 + (i % 4) * 3.0;
  const radiusZ = 6.0 + (i % 3) * 2.5;
  const centerX = 2.5 + (Math.sin(i * 1.5)) * 4.0;
  const centerZ = -24.0 - (i % 3) * 4.0; // Strictly far out over the ocean
  const height = 4.8 + (i % 4) * 0.7;
  const scale = 0.28 + (i % 3) * 0.08;

  bird.scale.set(scale, scale, scale);
  birdGroup.add(bird);

  birds.push({
    mesh: bird,
    mat: customBirdMat,
    phase,
    speed,
    radiusX,
    radiusZ,
    centerX,
    centerZ,
    height
  });
}
scene.add(birdGroup);

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
  renderer.setPixelRatio(getDPR());
  composer.setPixelRatio(getDPR());
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

  sunMaterial.uniforms.uTime.value = elapsedTime;
  sunMesh.lookAt(camera.position);

  // Animate Seagulls circling and soaring gracefully above the ocean
  birds.forEach((b) => {
    b.mat.uniforms.uTime.value = elapsedTime;
    const angle = elapsedTime * b.speed + b.phase;
    const x = b.centerX + Math.cos(angle) * b.radiusX;
    const z = b.centerZ + Math.sin(angle) * b.radiusZ;
    const y = b.height + Math.sin(elapsedTime * 1.1 + b.phase) * 0.35;

    // Look ahead along flight curve
    const nextX = b.centerX + Math.cos(angle + 0.04) * b.radiusX;
    const nextZ = b.centerZ + Math.sin(angle + 0.04) * b.radiusZ;

    b.mesh.position.set(x, y, z);
    b.mesh.lookAt(nextX, y, nextZ);
    b.mesh.rotation.z = Math.sin(angle) * 0.22; // Aerodynamic banking
  });

  composer.render();
}

animate();