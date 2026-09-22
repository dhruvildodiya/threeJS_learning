import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ============================================================================
// 1. SCENE, CAMERA, RENDERER SETUP
// ============================================================================
const canvas = document.querySelector('#webgl-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060814);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 6.0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

// Orbit Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 1.2, 0);
controls.minDistance = 2.0;
controls.maxDistance = 16.0;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.7;
controls.update();

window.addEventListener('contextmenu', (e) => e.preventDefault());

// Subtle Grid Floor for Spatial Reference
const gridHelper = new THREE.GridHelper(30, 30, 0xa855f7, 0x1e1b4b);
gridHelper.position.y = -0.05;
scene.add(gridHelper);

// ============================================================================
// 2. PROCEDURAL PERLIN/SIMPLEX NOISE TEXTURE GENERATOR
// ============================================================================
function getSecureRandom() {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] / 4294967296;
}

function createNoiseTexture(size = 256) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(size, size);

    // Generate smooth 2D value noise
    const grid = [];
    const gridSize = 16;
    for (let i = 0; i <= gridSize; i++) {
        grid[i] = [];
        for (let j = 0; j <= gridSize; j++) {
            grid[i][j] = getSecureRandom();
        }
    }

    function smoothstep(t) {
        return t * t * (3.0 - 2.0 * t);
    }

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const gx = (x / size) * gridSize;
            const gy = (y / size) * gridSize;
            const x0 = Math.floor(gx);
            const y0 = Math.floor(gy);
            const x1 = Math.min(x0 + 1, gridSize);
            const y1 = Math.min(y0 + 1, gridSize);
            const tx = smoothstep(gx - x0);
            const ty = smoothstep(gy - y0);

            const top = grid[x0][y0] * (1 - tx) + grid[x1][y0] * tx;
            const bottom = grid[x0][y1] * (1 - tx) + grid[x1][y1] * tx;
            const noise = top * (1 - ty) + bottom * ty;

            const idx = (y * size + x) * 4;
            const c = Math.floor(noise * 255);
            imgData.data[idx] = c;
            imgData.data[idx + 1] = c;
            imgData.data[idx + 2] = c;
            imgData.data[idx + 3] = 255;
        }
    }

    ctx.putImageData(imgData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

const noiseTexture = createNoiseTexture(256);

// ============================================================================
// 3. THE 4 CUSTOM GLSL SHADER MATERIALS
// ============================================================================

// ----------------------------------------------------------------------------
// SHADER 1: 🌊 Animated Water Waves (Vertex Displacement + Fresnel Refraction)
// ----------------------------------------------------------------------------
const wavesMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 1.0 },
        uWaveHeight: { value: 0.18 },
        uWaveFreq: { value: 4.0 },
        uDeepColor: { value: new THREE.Color(0x0f3d63) },
        uShallowColor: { value: new THREE.Color(0x38bdf8) },
        uFoamColor: { value: new THREE.Color(0xffffff) }
    },
    vertexShader: `
        uniform float uTime;
        uniform float uSpeed;
        uniform float uWaveHeight;
        uniform float uWaveFreq;

        varying vec2 vUv;
        varying float vElevation;
        varying vec3 vNormalVec;

        void main() {
            vUv = uv;
            vec3 pos = position;

            // Combined harmonic sine wave displacement
            float wave1 = sin(pos.x * uWaveFreq + uTime * uSpeed * 2.0) * cos(pos.z * uWaveFreq + uTime * uSpeed * 1.5);
            float wave2 = sin(pos.x * uWaveFreq * 1.8 - uTime * uSpeed) * 0.5;
            float elevation = (wave1 + wave2) * uWaveHeight;

            pos.y += elevation;
            vElevation = elevation;
            vNormalVec = normal;

            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 uDeepColor;
        uniform vec3 uShallowColor;
        uniform vec3 uFoamColor;
        uniform float uWaveHeight;

        varying vec2 vUv;
        varying float vElevation;
        varying vec3 vNormalVec;

        void main() {
            // Normalize wave height between 0.0 and 1.0 for depth mix
            float mixStrength = (vElevation + uWaveHeight) / (uWaveHeight * 2.0);
            mixStrength = clamp(mixStrength, 0.0, 1.0);

            vec3 waterColor = mix(uDeepColor, uShallowColor, mixStrength);

            // Crest foam at the highest wave peaks
            float foam = smoothstep(0.65, 0.95, mixStrength);
            vec3 finalColor = mix(waterColor, uFoamColor, foam * 0.7);

            gl_FragColor = vec4(finalColor, 0.95);
        }
    `,
    wireframe: false,
    transparent: true,
    side: THREE.DoubleSide
});

// ----------------------------------------------------------------------------
// SHADER 2: 🔥 Procedural Noise Dissolve with Fiery Burn Edge
// ----------------------------------------------------------------------------
const dissolveMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0.45 },
        uEdgeWidth: { value: 0.06 },
        uNoiseMap: { value: noiseTexture },
        uBaseColor: { value: new THREE.Color(0x1e293b) },
        uFireColor: { value: new THREE.Color(0xff4500) },
        uCoreBurn: { value: new THREE.Color(0xffcc00) }
    },
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;

        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float uProgress;
        uniform float uEdgeWidth;
        uniform sampler2D uNoiseMap;
        uniform vec3 uBaseColor;
        uniform vec3 uFireColor;
        uniform vec3 uCoreBurn;

        varying vec2 vUv;
        varying vec3 vNormal;

        void main() {
            // Sample noise threshold
            float noise = texture2D(uNoiseMap, vUv).r;

            // Discard pixels where noise is below the dissolve progress
            if (noise < uProgress) {
                discard;
            }

            // Burn edge calculation
            float edgeDist = noise - uProgress;
            float edgeFactor = 1.0 - smoothstep(0.0, uEdgeWidth, edgeDist);

            // Mix burning edge: Fire Orange into Hot White-Yellow Core
            vec3 edgeColor = mix(uFireColor * 3.0, uCoreBurn * 5.0, edgeFactor * 0.8);

            // Subtle Lambert lighting on the intact surface
            float diff = max(dot(vNormal, vec3(0.5, 0.8, 0.5)), 0.25);
            vec3 surfaceColor = uBaseColor * diff;

            vec3 finalColor = mix(surfaceColor, edgeColor, edgeFactor);

            gl_FragColor = vec4(finalColor, 1.0);
        }
    `,
    side: THREE.DoubleSide
});

// ----------------------------------------------------------------------------
// SHADER 3: 🛡️ Sci-Fi Hologram Forcefield (Fresnel Glow + Animated Scanlines)
// ----------------------------------------------------------------------------
const shieldMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uShieldColor: { value: new THREE.Color(0x00f3ff) },
        uFresnelPower: { value: 2.5 },
        uScanSpeed: { value: 2.0 },
        uScanDensity: { value: 30.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormalVec;
        varying vec3 vViewVec;

        void main() {
            vUv = uv;
            vNormalVec = normalize(normalMatrix * normal);

            // Vector from vertex to eye/camera in view space
            vec4 viewPos = modelViewMatrix * vec4(position, 1.0);
            vViewVec = normalize(-viewPos.xyz);

            gl_Position = projectionMatrix * viewPos;
        }
    `,
    fragmentShader: `
        uniform float uTime;
        uniform vec3 uShieldColor;
        uniform float uFresnelPower;
        uniform float uScanSpeed;
        uniform float uScanDensity;

        varying vec2 vUv;
        varying vec3 vNormalVec;
        varying vec3 vViewVec;

        void main() {
            // 1. Optical Fresnel rim effect
            float fresnel = 1.0 - max(dot(vNormalVec, vViewVec), 0.0);
            fresnel = pow(fresnel, uFresnelPower);

            // 2. Animated horizontal holographic scanlines
            float scanline = sin(vUv.y * uScanDensity - uTime * uScanSpeed) * 0.5 + 0.5;
            scanline = pow(scanline, 2.0);

            // 3. Procedural hexagon-like energy pulse
            float hexPulse = sin(vUv.x * 20.0 + uTime) * cos(vUv.y * 20.0 + uTime) * 0.15;

            float alpha = clamp(fresnel * 1.5 + scanline * 0.25 + hexPulse, 0.1, 0.95);
            vec3 glow = uShieldColor * (1.2 + fresnel * 2.0);

            gl_FragColor = vec4(glow, alpha);
        }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
});

// ----------------------------------------------------------------------------
// SHADER 4: 🌈 Liquid Plasma Gradient (Procedural Multi-Color Morphing)
// ----------------------------------------------------------------------------
const gradientMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 1.0 },
        uColorA: { value: new THREE.Color(0xa855f7) }, // Purple
        uColorB: { value: new THREE.Color(0xec4899) }, // Pink
        uColorC: { value: new THREE.Color(0x06b6d4) }, // Cyan
        uScale: { value: 3.5 }
    },
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vPos;

        void main() {
            vUv = uv;
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float uTime;
        uniform float uSpeed;
        uniform float uScale;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform vec3 uColorC;

        varying vec2 vUv;
        varying vec3 vPos;

        void main() {
            float t = uTime * uSpeed * 0.6;
            
            // Multi-harmonic 2D plasma distortion
            float v1 = sin(vPos.x * uScale + t);
            float v2 = sin(vPos.y * uScale + t * 1.2);
            float v3 = sin((vPos.x + vPos.y) * uScale + t * 0.8);
            float v4 = sin(length(vPos.xy) * uScale * 1.4 - t * 1.5);

            float pattern = (v1 + v2 + v3 + v4) * 0.25 + 0.5;

            // Smooth 3-color ramp interpolation
            vec3 col1 = mix(uColorA, uColorB, smoothstep(0.0, 0.5, pattern));
            vec3 finalColor = mix(col1, uColorC, smoothstep(0.5, 1.0, pattern));

            gl_FragColor = vec4(finalColor, 1.0);
        }
    `,
    side: THREE.DoubleSide
});

// ============================================================================
// 4. EXHIBITION MESHES SUSPENDED IN 3D SPACE
// ============================================================================
const shaderGroup = new THREE.Group();
scene.add(shaderGroup);

// Create 4 distinct shapes showcasing each custom shader:
// Spaced horizontally across X = [-2.55, -0.85, +0.85, +2.55]
const items = [
    { name: 'Water Waves', mat: wavesMaterial, geo: new THREE.PlaneGeometry(1.4, 1.4, 64, 64), pos: [-2.55, 1.2, 0], rotX: -Math.PI / 3.5 },
    { name: 'Noise Dissolve', mat: dissolveMaterial, geo: new THREE.TorusKnotGeometry(0.42, 0.14, 128, 32), pos: [-0.85, 1.2, 0], rotX: 0 },
    { name: 'Forcefield Shield', mat: shieldMaterial, geo: new THREE.IcosahedronGeometry(0.55, 3), pos: [0.85, 1.2, 0], rotX: 0 },
    { name: 'Liquid Plasma', mat: gradientMaterial, geo: new THREE.DodecahedronGeometry(0.52, 0), pos: [2.55, 1.2, 0], rotX: 0 }
];

const shaderMeshes = [];

items.forEach((item) => {
    const mesh = new THREE.Mesh(item.geo, item.mat);
    mesh.position.set(...item.pos);
    mesh.rotation.x = item.rotX;
    mesh.userData = { name: item.name, initialY: item.pos[1] };
    shaderGroup.add(mesh);
    shaderMeshes.push(mesh);
});

// Inner solid sphere inside the Forcefield Shield to emphasize transparency and rim glow
const shieldCore = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.24, 0),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.9 })
);
shieldCore.position.set(0.85, 1.2, 0);
shaderGroup.add(shieldCore);

// Ambient and Rim Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xa855f7, 2.0);
dirLight.position.set(4, 6, 4);
scene.add(dirLight);

// ============================================================================
// 7. ANIMATION RENDER LOOP (Uniform Time Updates)
// ============================================================================
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const time = clock.getElapsedTime();

    // 1. Update Uniform 'uTime' on all ShaderMaterials
    wavesMaterial.uniforms.uTime.value = time;
    dissolveMaterial.uniforms.uTime.value = time;
    shieldMaterial.uniforms.uTime.value = time;
    gradientMaterial.uniforms.uTime.value = time;

    // Auto-oscillate dissolve progress for demo visualization
    dissolveMaterial.uniforms.uProgress.value = Math.sin(time * 0.8) * 0.4 + 0.45;

    // 2. Gentle micro-rotations & floating hover
    shaderMeshes.forEach((mesh, idx) => {
        if (mesh.userData.name !== 'Water Waves') {
            mesh.rotation.y = time * 0.4 + idx * 0.5;
            mesh.rotation.x = Math.sin(time * 0.5 + idx) * 0.2;
        }
        mesh.position.y = mesh.userData.initialY + Math.sin(time * 1.5 + idx * 1.2) * 0.08;
    });

    if (shieldCore) {
        shieldCore.rotation.x = -time * 0.8;
        shieldCore.rotation.y = time * 0.6;
        shieldCore.position.y = 1.2 + Math.sin(time * 1.5 + 2 * 1.2) * 0.08;
    }

    controls.update();
    renderer.render(scene, camera);
}
animate();

// Resize handling
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
