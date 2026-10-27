uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uBeat;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying float vWaveHeight;
varying float vCrestFoam;
varying float vDistance;

// 4 Gerstner Wave definition: direction.xy, steepness, wavelength
// We dynamically modulate amplitude & steepness with uBass, direction with uMid
struct Wave {
  vec2 dir;
  float steepness;
  float wavelength;
};

void evaluateGerstner(
  Wave w,
  vec2 pos,
  float time,
  float bassScale,
  inout vec3 displaced,
  inout vec3 tangent,
  inout vec3 binormal
) {
  float k = 2.0 * 3.14159265 / w.wavelength;
  float c = sqrt(9.8 / k);
  vec2 d = normalize(w.dir);
  float f = k * (dot(d, pos) - c * time);
  
  // Modulate steepness and amplitude by audio bass
  float a = (w.steepness / k) * (1.0 + bassScale * 1.5);
  float q = clamp(w.steepness * (1.0 + bassScale * 0.8), 0.0, 0.75);

  float cosF = cos(f);
  float sinF = sin(f);

  displaced.x += d.x * (a * q * cosF);
  displaced.z += d.y * (a * q * cosF);
  displaced.y += a * sinF;

  // Partial derivatives for exact normals
  float wa = k * a;
  tangent.x -= d.x * d.x * (q * wa * sinF);
  tangent.y += d.x * (wa * cosF);
  tangent.z -= d.x * d.y * (q * wa * sinF);

  binormal.x -= d.x * d.y * (q * wa * sinF);
  binormal.y += d.y * (wa * cosF);
  binormal.z -= d.y * d.y * (q * wa * sinF);
}

void main() {
  vec3 pos = position;
  vec3 displaced = vec3(0.0);
  vec3 tangent = vec3(1.0, 0.0, 0.0);
  vec3 binormal = vec3(0.0, 0.0, 1.0);

  // Time scaled by audio energy
  float t = uTime * (0.85 + uBass * 0.35);

  // Rotate secondary wave directions with mid frequencies
  float midAngle = uMid * 0.4;
  mat2 midRot = mat2(cos(midAngle), -sin(midAngle), sin(midAngle), cos(midAngle));

  // 4 Coordinated Gerstner waves of varying scale
  Wave w1 = Wave(vec2(1.0, 0.4), 0.30, 28.0);
  Wave w2 = Wave(midRot * vec2(-0.7, 0.8), 0.22, 16.0);
  Wave w3 = Wave(vec2(-0.3, -0.9), 0.18, 9.5);
  Wave w4 = Wave(midRot * vec2(0.8, -0.5), 0.14, 5.0);

  evaluateGerstner(w1, pos.xy, t * 1.0, uBass, displaced, tangent, binormal);
  evaluateGerstner(w2, pos.xy, t * 1.25, uBass, displaced, tangent, binormal);
  evaluateGerstner(w3, pos.xy, t * 1.5, uBass, displaced, tangent, binormal);
  evaluateGerstner(w4, pos.xy, t * 1.8, uBass, displaced, tangent, binormal);

  // High-frequency treble micro ripples
  float trebleRipple = sin(pos.x * 2.5 + t * 4.0) * cos(pos.y * 2.5 + t * 3.5) * (0.05 + uTreble * 0.12);
  displaced.y += trebleRipple;

  // Radial shockwave ripple triggered from island center on beat
  float distToCenter = length(pos.xy);
  float ripplePhase = distToCenter * 0.9 - uTime * 6.5;
  float radialRipple = sin(ripplePhase) * exp(-distToCenter * 0.065) * uBeat * 0.55;
  displaced.y += radialRipple;

  // Apply displacements to vertex position (geometry was rotated -90 deg around X, so pos.z is world -Y or pos.y is Z)
  vec3 finalPos = position + vec3(displaced.x, displaced.y, displaced.z);

  // Compute final normal from tangent and binormal
  vec3 normalComputed = normalize(cross(binormal, tangent));

  // Transform to world space
  vec4 worldPos = modelMatrix * vec4(finalPos, 1.0);
  vWorldPosition = worldPos.xyz;
  
  // Normal in world space
  vNormal = normalize(mat3(modelMatrix) * normalComputed);
  vWaveHeight = displaced.y;
  
  // Crest curvature metric: sharp peaks occur when tangent/binormal slope is steep
  vCrestFoam = clamp((displaced.y * 0.6 + uBass * 0.4) - 0.2, 0.0, 1.0);

  // Camera distance for fog & level of detail
  vDistance = length(cameraPosition - worldPos.xyz);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
