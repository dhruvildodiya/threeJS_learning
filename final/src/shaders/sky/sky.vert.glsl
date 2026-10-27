varying vec3 vWorldPosition;
varying vec3 vPosition;

void main() {
  vPosition = position;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
