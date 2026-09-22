import * as THREE from 'three';
import { WATCH_CONFIG } from '../config/watchConfig.js';

export class WatchStrap {
    constructor(materials) {
        this.materials = materials;
        this.radius = WATCH_CONFIG.dimensions.caseRadius;
        this.linkCount = WATCH_CONFIG.dimensions.strapLinks;

        this.topGroup = new THREE.Group();
        this.bottomGroup = new THREE.Group();

        this._buildStraps();
    }

    _buildStrapSegment(index, total) {
        const t = index / (total - 1);
        const width = THREE.MathUtils.lerp(this.radius * 1.05, this.radius * 0.85, t);
        const segmentGeo = new THREE.BoxGeometry(width, 0.15, 0.045);
        const mesh = new THREE.Mesh(segmentGeo, this.materials.strap);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const stitchGeo = new THREE.BoxGeometry(width * 0.90, 0.01, 0.002);
        const stitch = new THREE.Mesh(stitchGeo, this.materials.stitching);
        stitch.position.z = 0.024;
        mesh.add(stitch);

        return mesh;
    }

    _buildStraps() {
        for (let i = 0; i < this.linkCount; i++) {
            const top = this._buildStrapSegment(i, this.linkCount);
            top.position.y = this.radius + 0.08 + i * 0.145;
            top.position.z = -0.01 - i * 0.035;
            top.rotation.x = -0.08 * (i + 1);
            this.topGroup.add(top);

            const bottom = this._buildStrapSegment(i, this.linkCount);
            bottom.position.y = -(this.radius + 0.08 + i * 0.145);
            bottom.position.z = -0.01 - i * 0.035;
            bottom.rotation.x = 0.08 * (i + 1);
            this.bottomGroup.add(bottom);
        }
    }
}
