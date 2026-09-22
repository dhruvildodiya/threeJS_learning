export class InteractionManager {
    constructor(targetObject) {
        this.targetObject = targetObject;

        this.isDragging = false;
        this.previousPointerPosition = { x: 0, y: 0 };
        this.targetRotationY = 0;
        this.targetRotationX = 0.05;

        this._setupListeners();
    }

    _setupListeners() {
        window.addEventListener('pointerdown', (e) => {
            if (e.target.closest('#configurator-ui') || e.target.closest('.bottom-bar')) return;
            this.isDragging = true;
            this.previousPointerPosition = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener('pointermove', (e) => {
            if (!this.isDragging) return;
            const deltaX = e.clientX - this.previousPointerPosition.x;
            const deltaY = e.clientY - this.previousPointerPosition.y;

            this.targetRotationY += deltaX * 0.008;
            this.targetRotationX += deltaY * 0.008;

            // Clamp vertical tilt
            this.targetRotationX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.targetRotationX));

            this.previousPointerPosition = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener('pointerup', () => {
            this.isDragging = false;
        });
    }

    addRotationY(delta) {
        this.targetRotationY += delta;
    }

    update() {
        if (!this.targetObject) return;
        this.targetObject.rotation.y += (this.targetRotationY - this.targetObject.rotation.y) * 0.1;
        this.targetObject.rotation.x += (this.targetRotationX - this.targetObject.rotation.x) * 0.1;
    }
}
