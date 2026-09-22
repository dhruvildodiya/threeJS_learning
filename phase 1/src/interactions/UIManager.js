export class UIManager {
    constructor({ onToggleExplode, onToggleTurntable }) {
        this.onToggleExplode = onToggleExplode;
        this.onToggleTurntable = onToggleTurntable;

        this.explodeBtn = document.querySelector('#btn-explode');
        this.turntableBtn = document.querySelector('#btn-turntable');

        this._setupListeners();
    }

    _setupListeners() {
        if (this.explodeBtn) {
            this.explodeBtn.addEventListener('click', () => {
                if (this.onToggleExplode) {
                    const isExploded = this.onToggleExplode();
                    this.explodeBtn.classList.toggle('active', isExploded);
                }
            });
        }

        if (this.turntableBtn) {
            this.turntableBtn.addEventListener('click', () => {
                if (this.onToggleTurntable) {
                    const isTurntableActive = this.onToggleTurntable();
                    this.turntableBtn.classList.toggle('active', isTurntableActive);
                }
            });
        }
    }
}
