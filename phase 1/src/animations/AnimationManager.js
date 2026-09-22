import * as THREE from 'three';

export class AnimationManager {
    constructor() {
        this.clock = new THREE.Clock();
        this.turntableActive = true;
        this.updatables = [];
    }

    add(updatable) {
        this.updatables.push(updatable);
    }

    toggleTurntable() {
        this.turntableActive = !this.turntableActive;
        return this.turntableActive;
    }

    update(interactionManager) {
        const delta = this.clock.getDelta();
        const elapsed = this.clock.getElapsedTime();
        const now = new Date();

        if (this.turntableActive && interactionManager) {
            interactionManager.addRotationY(0.005);
        }

        for (const item of this.updatables) {
            if (typeof item.update === 'function') {
                item.update(now, elapsed, delta);
            }
        }

        return { elapsed, delta, now };
    }
}
