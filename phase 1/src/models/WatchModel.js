import * as THREE from 'three';
import { WatchCase } from './WatchCase.js';
import { WatchDial } from './WatchDial.js';
import { WatchStrap } from './WatchStrap.js';
import { WATCH_CONFIG } from '../config/watchConfig.js';

export class WatchModel {
    constructor(materials) {
        this.materials = materials;

        this.root = new THREE.Group();
        this.root.rotation.x = 0.05;

        // Subcomponents
        this.watchCase = new WatchCase(this.materials);
        this.watchDial = new WatchDial(this.materials);
        this.watchStrap = new WatchStrap(this.materials);

        // Assembly
        this.root.add(this.watchCase.group);
        this.root.add(this.watchDial.group);
        this.root.add(this.watchDial.movementGroup);
        this.root.add(this.watchStrap.topGroup);
        this.root.add(this.watchStrap.bottomGroup);

        this.exploded = false;
        this.explodeProgress = 0;
        this.offsets = WATCH_CONFIG.explodedOffsets;
    }

    setExploded(isExploded) {
        this.exploded = isExploded;
    }

    toggleExploded() {
        this.exploded = !this.exploded;
        return this.exploded;
    }

    update(now = new Date()) {
        // 1. Clock hands update
        this.watchDial.updateTime(now);

        // 2. Exploded view interpolation
        const target = this.exploded ? 1 : 0;
        this.explodeProgress += (target - this.explodeProgress) * 0.08;

        const { rest, exploded } = this.offsets;

        this.watchCase.caseBackGroup.position.lerpVectors(rest.caseBack, exploded.caseBack, this.explodeProgress);
        this.watchCase.bezelGroup.position.lerpVectors(rest.bezel, exploded.bezel, this.explodeProgress);
        this.watchDial.group.position.lerpVectors(rest.dial, exploded.dial, this.explodeProgress);
        this.watchDial.movementGroup.position.lerpVectors(rest.movement, exploded.movement, this.explodeProgress);
        this.watchCase.crownGroup.position.lerpVectors(rest.crown, exploded.crown, this.explodeProgress);
        this.watchStrap.topGroup.position.lerpVectors(rest.strapTop, exploded.strapTop, this.explodeProgress);
        this.watchStrap.bottomGroup.position.lerpVectors(rest.strapBottom, exploded.strapBottom, this.explodeProgress);
    }
}
