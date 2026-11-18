import { EventEmitter } from '../utils/EventEmitter';

export class Sizes extends EventEmitter {
  public width = 0;
  public height = 0;
  public pixelRatio = 1;

  constructor() {
    super();

    this.update();

    window.addEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    this.update();
    this.emit('resize');
  };

  private update(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.pixelRatio = Math.min(window.devicePixelRatio, 2);
  }

  public destroy(): void {
    window.removeEventListener('resize', this.onResize);
    super.destroy();
  }
}

