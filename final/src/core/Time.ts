import { EventEmitter } from '../utils/EventEmitter';

export class Time extends EventEmitter {
  public start: number;
  public current: number;
  public elapsed: number;
  public delta: number;
  private reqId: number | null = null;

  constructor() {
    super();

    this.start = performance.now();
    this.current = this.start;
    this.elapsed = 0;
    this.delta = 16;

    this.tick();
  }

  private tick = (): void => {
    const currentTime = performance.now();
    this.delta = currentTime - this.current;
    this.current = currentTime;
    this.elapsed = (currentTime - this.start) / 1000;

    this.emit('tick', {
      delta: this.delta / 1000,
      elapsed: this.elapsed,
    });

    this.reqId = window.requestAnimationFrame(this.tick);
  };

  public destroy(): void {
    if (this.reqId !== null) {
      window.cancelAnimationFrame(this.reqId);
    }
    super.destroy();
  }
}

