import * as THREE from 'three';

/**
 * ============================================================================
 * SHADER ANIMATION & INTERACTION
 * ============================================================================
 * Topics Practiced:
 *  1. Colors: Passing THREE.Color as vec3 uniforms
 *  2. Gradients: Blending coordinates across UV space
 *  3. mix(): Linear interpolation between colors & values (a * (1 - t) + b * t)
 *  4. smoothstep(): Hermite interpolation with smooth edges (threshold transitions)
 *  5. Time (uTime): Continuous animation loop driving waves and color shifts
 *  6. Mouse interaction (uMouse): Screen-space normalized coords passed to GLSL
 * ============================================================================
 */

// 1. Scene, Camera, Renderer Setup
const canvas = document.getElementById('canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e17);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 2.8);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// 2. Uniforms: Bridge between JavaScript & GLSL Shaders
const uniforms = {
  uTime: { value: 0.0 },
  uMouse: { value: new THREE.Vector2(0.5, 0.5) }, // Normalized UV space [0, 1]
  uColorA: { value: new THREE.Color('#38bdf8') },  // Sky blue
  uColorB: { value: new THREE.Color('#818cf8') },  // Indigo
  uColorC: { value: new THREE.Color('#f43f5e') }   // Vibrant rose
};

// 3. Custom Shader Material
const material = new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  uniforms: uniforms,

  // --- VERTEX SHADER ---
  vertexShader: `
    uniform float uTime;
    uniform vec2 uMouse;
    varying vec2 vUv;
    varying float vWave;

    void main() {
      vUv = uv;

      vec3 newPosition = position;

      // 1. Time-driven wave
      float wave = sin(newPosition.x * 3.5 + uTime * 2.0) * 0.12;
      wave += cos(newPosition.y * 3.0 + uTime * 1.5) * 0.08;

      // 2. Mouse distance interaction: push surface up near cursor
      float distToMouse = distance(uv, uMouse);
      float mouseImpact = smoothstep(0.45, 0.0, distToMouse) * 0.25;

      newPosition.z += wave + mouseImpact;

      // Pass wave height to fragment shader for responsive color changes
      vWave = wave + mouseImpact;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
  `,

  // --- FRAGMENT SHADER ---
  fragmentShader: `
    uniform float uTime;
    uniform vec2 uMouse;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform vec3 uColorC;

    varying vec2 vUv;
    varying float vWave;

    void main() {
      // 1. COLORS CHANGING OVER TIME
      // Use sin(uTime) to oscillate color tones gently
      vec3 animatedColorA = uColorA + sin(uTime * 0.8) * 0.1;
      vec3 animatedColorB = uColorB + cos(uTime * 0.6) * 0.1;

      // 2. GRADIENTS using mix()
      // Base gradient along the diagonal of UV
      float gradientPosition = vUv.x * 0.6 + vUv.y * 0.4;
      vec3 baseGradient = mix(animatedColorA, animatedColorB, gradientPosition);

      // 3. MOUSE INTERACTION & smoothstep()
      // Calculate distance from fragment to mouse position (in UV [0, 1] space)
      float mouseDist = distance(vUv, uMouse);

      // smoothstep(edge0, edge1, x): creates a smooth falloff circle around the mouse
      // Inside radius (0.0 to 0.35) glows with uColorC
      float mouseGlow = smoothstep(0.35, 0.0, mouseDist);

      // 4. GRADIENTS RESPONDING TO INTERACTION & WAVE
      // Mix the accent color into the base gradient based on mouse proximity + wave height
      vec3 finalColor = mix(baseGradient, uColorC, mouseGlow);

      // Highlight the wave crests smoothly using smoothstep
      float crestGlow = smoothstep(0.08, 0.22, vWave);
      finalColor = mix(finalColor, vec3(1.0), crestGlow * 0.4);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
});

// 4. Mesh with Subdivided Plane (for smooth vertex waves)
const geometry = new THREE.PlaneGeometry(2.8, 2.8, 64, 64);
const mesh = new THREE.Mesh(geometry, material);
mesh.rotation.x = -0.4; // Tilted slightly to show depth
scene.add(mesh);

// 5. Mouse Interaction Tracking
// Convert mouse pixel coordinates to UV space [0, 1]
const targetMouse = new THREE.Vector2(0.5, 0.5);

window.addEventListener('mousemove', (event) => {
  targetMouse.x = event.clientX / window.innerWidth;
  targetMouse.y = 1.0 - (event.clientY / window.innerHeight); // Flip Y to match GLSL UV coordinates
});

// 6. Window Resize Handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// 7. Animation Loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const elapsedTime = clock.getElapsedTime();

  // JavaScript -> GLSL Uniforms updates
  // 1. Time uniform
  uniforms.uTime.value = elapsedTime;

  // 2. Mouse uniform with smooth interpolation (lerp)
  uniforms.uMouse.value.lerp(targetMouse, 0.08);

  // Subtle rotation
  mesh.rotation.z = Math.sin(elapsedTime * 0.2) * 0.05;

  renderer.render(scene, camera);
}

animate();
