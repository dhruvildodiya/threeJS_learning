import * as THREE from 'three';
import { WATCH_CONFIG } from '../config/watchConfig.js';

export class WatchCase {
    constructor(materials) {
        this.materials = materials;
        this.radius = WATCH_CONFIG.dimensions.caseRadius;
        this.depth = WATCH_CONFIG.dimensions.caseDepth;

        this.group = new THREE.Group();
        this.caseBackGroup = new THREE.Group();
        this.bezelGroup = new THREE.Group();
        this.crownGroup = new THREE.Group();

        this._buildCaseBody();
        this._buildCaseBack();
        this._buildBezelAndCrystal();
        this._buildCrown();
        this._buildLugsAndBars();
    }

    _buildCaseBody() {
        const caseBody = new THREE.Mesh(
            new THREE.CylinderGeometry(this.radius, this.radius * 0.96, this.depth, 64, 1, true),
            this.materials.case
        );
        caseBody.rotation.x = Math.PI / 2;
        caseBody.castShadow = true;
        caseBody.receiveShadow = true;
        this.group.add(caseBody);
    }

    _buildCaseBack() {
        const caseBack = new THREE.Mesh(
            new THREE.CylinderGeometry(this.radius * 0.96, this.radius * 0.94, 0.03, 64),
            this.materials.case
        );
        caseBack.rotation.x = Math.PI / 2;
        caseBack.position.z = -this.depth / 2 - 0.015;
        caseBack.castShadow = true;
        this.caseBackGroup.add(caseBack);
        this.group.add(this.caseBackGroup);
    }

    _buildBezelAndCrystal() {
        const bezel = new THREE.Mesh(
            new THREE.TorusGeometry(this.radius * 0.98, this.radius * 0.08, 24, 64),
            this.materials.bezel
        );
        bezel.position.z = this.depth / 2;
        bezel.castShadow = true;
        this.bezelGroup.add(bezel);

        // Domed crystal
        const crystal = new THREE.Mesh(
            new THREE.SphereGeometry(this.radius * 1.92, 48, 24, 0, Math.PI * 2, 0, Math.PI / 6),
            this.materials.crystal
        );
        crystal.rotation.x = Math.PI / 2;
        crystal.position.z = -0.90;
        crystal.castShadow = false;
        this.bezelGroup.add(crystal);

        this.group.add(this.bezelGroup);
    }

    _buildCrown() {
        const crown = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.06, 0.1, 20, 1, false),
            this.materials.crown
        );
        crown.rotation.z = Math.PI / 2;
        crown.position.set(this.radius + 0.03, -0.02, 0);
        crown.castShadow = true;
        this.crownGroup.add(crown);

        for (let i = -1; i <= 1; i++) {
            const groove = new THREE.Mesh(
                new THREE.TorusGeometry(0.061, 0.004, 8, 20),
                this.materials.bezel
            );
            groove.rotation.y = Math.PI / 2;
            groove.position.set(this.radius + 0.03 + i * 0.025, -0.02, 0);
            this.crownGroup.add(groove);
        }
        this.group.add(this.crownGroup);
    }

    _buildLugsAndBars() {
        const lugGeo = new THREE.BoxGeometry(0.08, 0.29, this.depth * 0.6);
        const lugPositions = [
            [-this.radius * 0.58, this.radius, 0],
            [this.radius * 0.58, this.radius, 0],
            [-this.radius * 0.58, -this.radius, 0],
            [this.radius * 0.58, -this.radius, 0],
        ];

        lugPositions.forEach(([x, y, z]) => {
            const lug = new THREE.Mesh(lugGeo, this.materials.case);
            lug.position.set(x, y, z);
            lug.rotation.z = (x > 0 ? -1 : 1) * (y > 0 ? 0.12 : -0.12);
            lug.rotation.x = y > 0 ? -0.1 : 0.1;
            lug.castShadow = true;
            lug.receiveShadow = true;
            this.group.add(lug);
        });

        // Spring bars
        const barGeo = new THREE.CylinderGeometry(0.02, 0.02, this.radius * 1.16, 16);
        const topBar = new THREE.Mesh(barGeo, this.materials.crown);
        topBar.rotation.z = Math.PI / 2;
        topBar.position.set(0, this.radius + 0.1, -0.01);
        this.group.add(topBar);

        const bottomBar = new THREE.Mesh(barGeo, this.materials.crown);
        bottomBar.rotation.z = Math.PI / 2;
        bottomBar.position.set(0, -(this.radius + 0.1), -0.01);
        this.group.add(bottomBar);
    }
}
