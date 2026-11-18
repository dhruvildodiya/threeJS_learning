import * as THREE from 'three';
import type { Scene } from '../core/Scene';

export class Water {
  public readonly mesh: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;

  constructor(private readonly scene: Scene) {
    const geometry = new THREE.PlaneGeometry(300, 300, 128, 128);
    geometry.rotateX(-Math.PI / 2);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDeepColor: { value: new THREE.Color(0x0a1e3f) },
        uSurfaceColor: { value: new THREE.Color(0x19638b) },
        uFoamColor: { value: new THREE.Color(0x93c5fd) },
        uSunDirection: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
      },
      vertexShader: `
        uniform float uTime;
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        varying float vWaveHeight;

        void main() {
          vec3 pos = position;
          
          // Gentle wave superposition
          float wave1 = sin(pos.x * 0.12 + uTime * 1.5) * cos(pos.z * 0.12 + uTime * 1.2) * 0.22;
          float wave2 = sin(pos.x * 0.28 - uTime * 1.8 + pos.z * 0.15) * 0.12;
          float wave3 = cos(pos.x * 0.45 + pos.z * 0.35 + uTime * 2.2) * 0.05;
          
          pos.y += wave1 + wave2 + wave3;
          vWaveHeight = pos.y;

          // Normal estimation
          vec3 tangentX = vec3(1.0, 0.12 * cos(pos.x * 0.12 + uTime * 1.5), 0.0);
          vec3 tangentZ = vec3(0.0, 0.12 * -sin(pos.z * 0.12 + uTime * 1.2), 1.0);
          vNormal = normalize(cross(tangentZ, tangentX));

          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uDeepColor;
        uniform vec3 uSurfaceColor;
        uniform vec3 uFoamColor;
        uniform vec3 uSunDirection;
        
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        varying float vWaveHeight;

        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);
          vec3 normal = normalize(vNormal);

          // Fresnel calculation
          float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);

          // Base water depth gradient
          vec3 waterColor = mix(uDeepColor, uSurfaceColor, clamp(vWaveHeight * 2.0 + 0.5, 0.0, 1.0));
          
          // Sun Specular reflection
          vec3 halfVector = normalize(uSunDirection + viewDir);
          float spec = pow(max(dot(normal, halfVector), 0.0), 64.0) * 1.2;

          // Wave crest foam
          float foamFactor = smoothstep(0.2, 0.38, vWaveHeight);
          vec3 finalColor = mix(waterColor, uFoamColor, foamFactor * 0.65);
          finalColor += spec * vec3(1.0, 0.95, 0.85);
          finalColor = mix(finalColor, vec3(0.35, 0.55, 0.75), fresnel * 0.4);

          gl_FragColor = vec4(finalColor, 0.92);
        }
      `,
      transparent: true,
      depthWrite: true,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.y = 0.0;
    this.mesh.receiveShadow = true;

    this.scene.instance.add(this.mesh);
  }

  public update(elapsed: number): void {
    this.material.uniforms.uTime.value = elapsed;
  }

  public destroy(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.scene.instance.remove(this.mesh);
  }
}

