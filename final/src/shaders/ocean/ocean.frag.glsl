uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uEnergy;
uniform float uBeat;

uniform vec3 uSunPosition;
uniform vec3 uSunColor;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uFoamColor;
uniform vec3 uSkyColor;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying float vWaveHeight;
varying float vCrestFoam;
varying float vDistance;

// Pseudo-random hash for noise
float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

// 2D Value noise
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorldPosition);
  vec3 L = normalize(uSunPosition - vWorldPosition);
  vec3 H = normalize(L + V);

  // 1. Fresnel factor (Schlick approximation)
  float NdotV = max(dot(N, V), 0.0);
  float F0 = 0.04; // water IOR ~ 1.333
  float fresnel = F0 + (1.0 - F0) * pow(1.0 - NdotV, 4.0);

  // 2. Base Water Color Gradient (Deep indigo to Shallow turquoise/cyan)
  float heightNorm = clamp((vWaveHeight + 0.6) / 2.2, 0.0, 1.0);
  // Slopes facing light catch extra subsurface glow
  float NdotL = max(dot(N, L), 0.0);
  float subsurface = pow(heightNorm, 1.4) * (0.4 + 0.6 * NdotL);
  vec3 waterColor = mix(uDeepColor, uShallowColor, subsurface);

  // Extra audio bass crest glow (emissive cyan punch)
  vec3 crestGlowColor = vec3(0.08, 0.95, 0.88);
  waterColor += crestGlowColor * (uBass * 0.45 + uBeat * 0.35) * pow(heightNorm, 2.5);

  // 3. Sun Specular Glint (Golden sun reflection path)
  float NdotH = max(dot(N, H), 0.0);
  float specularHard = pow(NdotH, 120.0);
  float specularSoft = pow(NdotH, 24.0);
  vec3 specular = uSunColor * (specularHard * 2.2 + specularSoft * 0.6) * (1.0 + uEnergy * 0.5);

  // 4. Sky Reflection (Golden-peach sunset sky near horizon, deep twilight above)
  vec3 reflectedDir = reflect(-V, N);
  float skyGradient = clamp(reflectedDir.y * 1.5 + 0.2, 0.0, 1.0);
  vec3 skyReflection = mix(uSkyColor, vec3(0.12, 0.18, 0.35), skyGradient);

  // Combine water color with sky reflection via Fresnel
  vec3 finalColor = mix(waterColor, skyReflection, fresnel * 0.75) + specular;

  // 5. White Crest Foam & Shoreline Foam
  // Procedural noise pattern for organic foam look
  vec2 foamUv = vWorldPosition.xz * 1.8 + vec2(uTime * 0.2);
  float foamNoise = noise(foamUv) * 0.5 + noise(foamUv * 2.8) * 0.5;

  // Crest foam triggered by Gerstner wave compression and bass
  float crestThreshold = 0.42 - (uBass * 0.2);
  float crestFoam = smoothstep(crestThreshold, crestThreshold + 0.3, vCrestFoam * foamNoise);

  // Island shoreline contact foam ring (Blender Island waterline radius ~16.0m)
  float distToIsland = length(vWorldPosition.xz);
  float shoreBand = abs(distToIsland - 16.0);
  float shoreFoam = smoothstep(2.4, 0.0, shoreBand) * (0.65 + 0.35 * sin(uTime * 2.5 - distToIsland * 2.0));

  float totalFoam = clamp(crestFoam + shoreFoam * 0.75, 0.0, 1.0);
  finalColor = mix(finalColor, uFoamColor, totalFoam * 0.88);

  // 6. Exponential Atmospheric Fog
  float fogFactor = clamp((vDistance - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
  fogFactor = pow(fogFactor, 1.3); // smooth exponential falloff
  finalColor = mix(finalColor, uFogColor, fogFactor);

  gl_FragColor = vec4(finalColor, 0.95);
}
