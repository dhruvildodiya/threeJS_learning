import * as THREE from 'three';

export class WatchScene {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x18181c);
        this.scene.fog = new THREE.FogExp2(0x18181c, 0.02);
    }

    add(object) {
        this.scene.add(object);
    }
}
