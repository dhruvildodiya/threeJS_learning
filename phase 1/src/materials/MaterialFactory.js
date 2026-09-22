import * as THREE from 'three';
import { ProceduralTextures } from './ProceduralTextures.js';
import { WATCH_CONFIG } from '../config/watchConfig.js';

export class MaterialFactory {
    constructor() {
        this.textures = {
            dial: ProceduralTextures.createDialTexture(),
            leatherBump: ProceduralTextures.createLeatherBump(),
            leatherColor: ProceduralTextures.createLeatherColorTexture(),
            metalRoughness: ProceduralTextures.createBrushedMetalTexture(),
            cornerShadow: ProceduralTextures.createCornerShadowTexture(),
        };

        this.materials = this._createMaterials();
    }

    _createMaterials() {
        const { steel } = WATCH_CONFIG.colorways;

        return {
            case: new THREE.MeshPhysicalMaterial({
                color: steel.case,
                metalness: 0.98,
                roughness: 0.18,
                roughnessMap: this.textures.metalRoughness,
                clearcoat: 0.4,
                clearcoatRoughness: 0.15,
                envMapIntensity: 1.8,
            }),
            bezel: new THREE.MeshPhysicalMaterial({
                color: steel.bezel,
                metalness: 1,
                roughness: 0,
                roughnessMap: this.textures.metalRoughness,
                clearcoat: 0.6,
                clearcoatRoughness: 0.08,
                envMapIntensity: 2.0,
            }),
            crown: new THREE.MeshPhysicalMaterial({
                color: steel.crown,
                metalness: 0.98,
                roughness: 0.15,
                roughnessMap: this.textures.metalRoughness,
                envMapIntensity: 1.8,
            }),
            crystal: new THREE.MeshPhysicalMaterial({
                color: 0xffffff,
                roughness: 0.02,
                metalness: 0,
                transparent: true,
                opacity: 0.1,
                depthWrite: false,
                clearcoat: 1,
                clearcoatRoughness: 0.04,
                envMapIntensity: 1.2,
            }),
            dial: new THREE.MeshStandardMaterial({
                map: this.textures.dial,
                roughness: 0.4,
                metalness: 0.2,
                side: THREE.DoubleSide,
            }),
            hand: new THREE.MeshStandardMaterial({
                color: 0xf8f8fc,
                roughness: 0.2,
                metalness: 0.85,
            }),
            secondHand: new THREE.MeshStandardMaterial({
                color: 0xe0564f,
                roughness: 0.3,
                metalness: 0.3,
            }),
            strap: new THREE.MeshStandardMaterial({
                color: steel.strap,
                roughness: 0.85,
                metalness: 0.05,
                map: this.textures.leatherColor,
                bumpMap: this.textures.leatherBump,
                bumpScale: 0.01,
            }),
            stitching: new THREE.MeshStandardMaterial({
                color: 0xd8c49a,
                roughness: 0.8,
            }),
            movement: new THREE.MeshStandardMaterial({
                color: 0xd4af37,
                roughness: 0.25,
                metalness: 0.95,
                envMapIntensity: 1.5,
            }),
        };
    }

    setColorway(colorwayKey) {
        const palette = WATCH_CONFIG.colorways[colorwayKey];
        if (!palette) return;

        this.materials.case.color.setHex(palette.case);
        this.materials.bezel.color.setHex(palette.bezel);
        this.materials.crown.color.setHex(palette.crown);
        this.materials.strap.color.setHex(palette.strap);
    }
}
