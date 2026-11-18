export class AnimationManager {
  constructor() {
    this.turntableActive = false;
    this.updatables = [];
  }

  add(updatable) {
    this.updatables.push(updatable);
  }

  toggleTurntable() {
    this.turntableActive = !this.turntableActive;
    return this.turntableActive;
  }

  update(watchModel) {
    if (watchModel && typeof watchModel.update === 'function') {
      watchModel.update();
    }

    for (const item of this.updatables) {
      if (typeof item.update === 'function') {
        item.update();
      }
    }
  }
}
