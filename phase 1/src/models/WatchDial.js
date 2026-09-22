import * as THREE from 'three';
import { WATCH_CONFIG } from '../config/watchConfig.js';

export class WatchDial {
    constructor(materials) {
        this.materials = materials;
        this.radius = WATCH_CONFIG.dimensions.caseRadius;
        this.depth = WATCH_CONFIG.dimensions.caseDepth;

        this.group = new THREE.Group();
        this.group.position.z = this.depth / 2 - 0.03;

        this.movementGroup = new THREE.Group();
        this.movementGroup.position.z = -0.02;

        this._buildDial();
        this._buildHands();
        this._buildMovement();
    }

    _buildDial() {
        const dial = new THREE.Mesh(
            new THREE.CircleGeometry(this.radius * 0.92, 64),
            this.materials.dial
        );
        dial.receiveShadow = true;
        this.group.add(dial);
    }

    _buildHands() {
        const makeHand = (length, width, thickness, material, tailFraction = 0.15) => {
            const pivot = new THREE.Group();
            const geometry = new THREE.BoxGeometry(width, length, thickness);
            geometry.translate(0, length / 2 - length * tailFraction, 0);
            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            pivot.add(mesh);
            pivot.position.z = thickness;
            return pivot;
        };

        this.hourHand = makeHand(this.radius * 0.5, 0.045, 0.012, this.materials.hand);
        this.minuteHand = makeHand(this.radius * 0.72, 0.032, 0.01, this.materials.hand);
        this.secondHand = makeHand(this.radius * 0.78, 0.012, 0.008, this.materials.secondHand, 0.22);

        this.hourHand.position.z = 0.012;
        this.minuteHand.position.z = 0.02;
        this.secondHand.position.z = 0.028;

        this.group.add(this.hourHand, this.minuteHand, this.secondHand);

        const centerCap = new THREE.Mesh(
            new THREE.CylinderGeometry(0.022, 0.022, 0.03, 24),
            this.materials.hand
        );
        centerCap.rotation.x = Math.PI / 2;
        centerCap.position.z = 0.032;
        this.group.add(centerCap);
    }

    _buildMovement() {
        const movementPlate = new THREE.Mesh(
            new THREE.CylinderGeometry(this.radius * 0.8, this.radius * 0.8, 0.04, 48),
            this.materials.movement
        );
        movementPlate.rotation.x = Math.PI / 2;
        movementPlate.castShadow = true;
        this.movementGroup.add(movementPlate);

        const gearGeometry = new THREE.CylinderGeometry(0.09, 0.09, 0.02, 24);
        [[0.18, 0.12], [-0.15, 0.05], [0.05, -0.18]].forEach(([x, y]) => {
            const gear = new THREE.Mesh(gearGeometry, this.materials.bezel);
            gear.rotation.x = Math.PI / 2;
            gear.position.set(x, y, 0.025);
            this.movementGroup.add(gear);
        });
    }

    updateTime(now = new Date()) {
        const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
        const minutes = now.getMinutes() + seconds / 60;
        const hours = (now.getHours() % 12) + minutes / 60;

        if (this.secondHand) this.secondHand.rotation.z = -(seconds / 60) * Math.PI * 2;
        if (this.minuteHand) this.minuteHand.rotation.z = -(minutes / 60) * Math.PI * 2;
        if (this.hourHand) this.hourHand.rotation.z = -(hours / 12) * Math.PI * 2;
    }
}
