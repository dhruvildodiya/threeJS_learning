uniform float uTime;
uniform float uEnergy;
uniform float uMid;
uniform float uTreble;
uniform vec3 uSunPosition;

varying vec3 vWorldPosition;
varying vec3 vPosition;

// Pseudo random
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec3 dir = normalize(vPosition);
  vec3 sunDir = normalize(uSunPosition);

  // 1. Vertical Gradient (Sunset Golden Hour)
  // Horizon is y=0, Zenith is y=1.0
  float y = clamp(dir.y, 0.0, 1.0);
  
  // Palette stops
  vec3 horizonColor = vec3(1.0, 0.48, 0.22);  // Rich sunset amber-gold
  vec3 midSkyColor   = vec3(0.58, 0.26, 0.48);  // Rose twilight
  vec3 zenithColor   = vec3(0.03, 0.06, 0.14);  // Deep twilight indigo

  vec3 skyColor;
  if (y < 0.25) {
    skyColor = mix(horizonColor, midSkyColor, y / 0.25);
  } else {
    skyColor = mix(midSkyColor, zenithColor, (y - 0.25) / 0.75);
  }

  // Energy intensifies the sunset warmth and saturation
  skyColor = mix(skyColor, skyColor * vec3(1.2, 1.05, 0.8), uEnergy * 0.4);

  // 2. Sun Disc and Atmospheric Halo
  float sunDot = max(dot(dir, sunDir), 0.0);

  // Sharp sun disc
  float sunDisc = smoothstep(0.9982, 0.9995, sunDot);
  vec3 sunDiscColor = vec3(1.2, 1.1, 0.95);

  // Soft glowing corona / atmospheric haze around sun
  float sunGlow = pow(sunDot, 12.0) * (0.8 + uEnergy * 0.5);
  vec3 sunGlowColor = vec3(1.0, 0.65, 0.35) * sunGlow;

  // Broad horizon sun flare
  float broadFlare = pow(sunDot, 3.5) * max(1.0 - y * 2.0, 0.0) * 0.45;
  vec3 flareColor = vec3(1.0, 0.5, 0.2) * broadFlare;

  skyColor += sunDisc * sunDiscColor * 2.5 + sunGlowColor + flareColor;

  // 3. Audio-reactive Celestial Aurora ribbon (appears above mid-sky driven by uMid)
  if (y > 0.25 && y < 0.75) {
    float auroraBand = sin(dir.x * 6.0 + dir.z * 4.0 + uTime * 0.6) * 0.5 + 0.5;
    float auroraMask = smoothstep(0.25, 0.45, y) * smoothstep(0.75, 0.55, y);
    vec3 auroraColor = vec3(0.12, 0.85, 0.65) * auroraBand * auroraMask * (uMid * 0.6);
    skyColor += auroraColor;
  }

  // 4. Night Stars in upper hemisphere
  if (y > 0.18) {
    // Star grid
    vec2 starUv = dir.xz / (dir.y + 0.1) * 35.0;
    vec2 gridId = floor(starUv);
    float starRand = hash21(gridId);

    if (starRand > 0.975) {
      // Star position jitter within cell
      vec2 starPos = gridId + vec2(hash21(gridId + 1.0), hash21(gridId + 2.0));
      float distToStar = length(starUv - starPos);
      float starIntensity = smoothstep(0.08, 0.0, distToStar);

      // Twinkle animation
      float twinkle = sin(uTime * 3.0 + starRand * 6.28) * 0.5 + 0.5;
      float starBrightness = starIntensity * (0.4 + 0.6 * twinkle) * smoothstep(0.18, 0.45, y);

      skyColor += vec3(0.9, 0.95, 1.0) * starBrightness * (1.0 + uTreble * 0.5);
    }
  }

  gl_FragColor = vec4(skyColor, 1.0);
}
