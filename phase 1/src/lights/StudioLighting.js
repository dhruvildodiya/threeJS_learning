import * as THREE from 'three';
import { WATCH_CONFIG } from '../config/watchConfig.js';
import { clamp, lerp } from '../utils/math.js';

export class StudioLighting {
    constructor(scene) {
        this.scene = scene;
        this.baseLights = WATCH_CONFIG.baseLights;

        this._setupLights();
    }

    _setupLights() {
        this.ambientLight = new THREE.AmbientLight(0xffffff, this.baseLights.ambient);
        this.scene.add(this.ambientLight);

        this.keyLight = new THREE.DirectionalLight(0xffffff, this.baseLights.key);
        this.keyLight.position.set(2.5, 3.5, 3);
        this.keyLight.castShadow = true;
        this.keyLight.shadow.mapSize.set(2048, 2048);
        this.keyLight.shadow.camera.near = 0.5;
        this.keyLight.shadow.camera.far = 25;
        this.keyLight.shadow.camera.left = -3;
        this.keyLight.shadow.camera.right = 3;
        this.keyLight.shadow.camera.top = 3;
        this.keyLight.shadow.camera.bottom = -3;
        this.keyLight.shadow.bias = -0.0002;
        this.scene.add(this.keyLight);

        this.fillLight = new THREE.DirectionalLight(0xdfe8ff, this.baseLights.fill);
        this.fillLight.position.set(-3, 1.5, 1.5);
        this.scene.add(this.fillLight);

        this.rimLight = new THREE.DirectionalLight(0xffffff, this.baseLights.rim);
        this.rimLight.position.set(0, 2.5, -3);
        this.scene.add(this.rimLight);

        this.topSpotLight = new THREE.SpotLight(0xffffff, this.baseLights.spot);
        this.topSpotLight.position.set(0, 4.5, 0.8);
        this.topSpotLight.target.position.set(0, 0, 0);
        this.topSpotLight.angle = Math.PI / 5;
        this.topSpotLight.penumbra = 0.6;
        this.topSpotLight.decay = 1.0;
        this.topSpotLight.distance = 25;
        this.topSpotLight.castShadow = true;
        this.topSpotLight.shadow.mapSize.set(2048, 2048);
        this.topSpotLight.shadow.bias = -0.0001;
        this.scene.add(this.topSpotLight);
        this.scene.add(this.topSpotLight.target);
    }

    /**
     * Dynamically compensate lighting and fog as camera distance changes
     */
    update(camera, fog) {
        const camDist = camera.position.length();
        const distFactor = clamp((camDist - 4.0) / 16.0, 0, 1);
        const lightMultiplier = 1.0 + distFactor * 1.8;

        this.ambientLight.intensity = this.baseLights.ambient * lightMultiplier;
        this.keyLight.intensity = this.baseLights.key * lightMultiplier;
        this.fillLight.intensity = this.baseLights.fill * lightMultiplier;
        this.rimLight.intensity = this.baseLights.rim * lightMultiplier;
        this.topSpotLight.intensity = this.baseLights.spot * (1.0 + distFactor * 2.2);

        if (fog) {
            fog.density = lerp(0.02, 0.005, distFactor);
        }
    }
}
