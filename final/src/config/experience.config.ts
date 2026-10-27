import * as THREE from 'three';

export interface CameraConfig {
  fov: number;
  near: number;
  far: number;
  initialPosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  orbitControls: {
    enableDamping: boolean;
    dampingFactor: number;
    autoRotate: boolean;
    autoRotateSpeed: number;
    maxPolarAngle: number;
    minDistance: number;
    maxDistance: number;
  };
}

export interface RendererConfig {
  maxPixelRatio: number;
  toneMapping: THREE.ToneMapping;
  toneMappingExposure: number;
  shadowMapType: THREE.ShadowMapType;
}

export interface EnvironmentConfig {
  clearColor: number;
  fogColor: number;
  fogNear: number;
  fogFar: number;
  sunColor: number;
  sunIntensity: number;
  sunPosition: THREE.Vector3;
  ambientColor: number;
  ambientIntensity: number;
  hemisphereSkyColor: number;
  hemisphereGroundColor: number;
  hemisphereIntensity: number;
}

export interface OceanPlaceholderConfig {
  width: number;
  height: number;
  widthSegments: number;
  heightSegments: number;
  color: number;
  roughness: number;
  metalness: number;
  transparent: boolean;
  opacity: number;
}

export interface ExperienceConfig {
  debug: boolean;
  camera: CameraConfig;
  renderer: RendererConfig;
  environment: EnvironmentConfig;
  ocean: OceanPlaceholderConfig;
}

export const experienceConfig: ExperienceConfig = {
  // Enabled by default in dev or when hash has '#debug'
  debug: window.location.hash.includes('debug') || window.location.hostname === 'localhost',

  camera: {
    fov: 45,
    near: 0.1,
    far: 1000,
    initialPosition: new THREE.Vector3(0, 14, 28),
    targetPosition: new THREE.Vector3(0, 2, 0),
    orbitControls: {
      enableDamping: true,
      dampingFactor: 0.05,
      autoRotate: true,
      autoRotateSpeed: 0.35,
      maxPolarAngle: Math.PI / 2 - 0.04, // Avoid camera dipping below ocean surface
      minDistance: 8,
      maxDistance: 90,
    },
  },

  renderer: {
    maxPixelRatio: 2,
    toneMapping: THREE.ACESFilmicToneMapping,
    toneMappingExposure: 1.1,
    shadowMapType: THREE.PCFSoftShadowMap,
  },

  environment: {
    clearColor: 0x07111e,
    fogColor: 0x0c1e34,
    fogNear: 25,
    fogFar: 140,
    sunColor: 0xfff3d6,
    sunIntensity: 2.2,
    sunPosition: new THREE.Vector3(24, 32, 18),
    ambientColor: 0x1b3552,
    ambientIntensity: 0.6,
    hemisphereSkyColor: 0x4a85b6,
    hemisphereGroundColor: 0x06111e,
    hemisphereIntensity: 0.8,
  },

  ocean: {
    width: 240,
    height: 240,
    widthSegments: 64,
    heightSegments: 64,
    color: 0x0d3b66,
    roughness: 0.15,
    metalness: 0.85,
    transparent: true,
    opacity: 0.92,
  },
};
