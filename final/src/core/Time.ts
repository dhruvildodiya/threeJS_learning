export type TickCallback = (delta: number, elapsed: number) => void;

/**
 * Time manages the animation frame loop, delta time calculation,
 * and distributes frame updates to subscribers.
 */
export class Time {
  public start: number;
  public current: number;
  public elapsed: number = 0;
  public delta: number = 0.016;

  private rafId: number | null = null;
  private isRunning: boolean = false;
  private subscribers: Set<TickCallback> = new Set();

  constructor() {
    this.start = performance.now();
    this.current = this.start;
  }

  /**
   * Register a callback to execute each frame.
   */
  public onTick(callback: TickCallback): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Starts the internal RAF loop.
   */
  public startLoop(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.current = performance.now();
    this.tick = this.tick.bind(this);
    this.rafId = requestAnimationFrame(this.tick);
  }

  /**
   * Internal frame step.
   */
  private tick(now: number): void {
    if (!this.isRunning) return;

    // Delta in seconds, clamped to avoid frame skips after tab defocus
    const rawDelta = (now - this.current) / 1000;
    this.delta = Math.min(rawDelta, 0.1);
    this.current = now;
    this.elapsed = (now - this.start) / 1000;

    for (const callback of this.subscribers) {
      callback(this.delta, this.elapsed);
    }

    this.rafId = requestAnimationFrame(this.tick);
  }

  /**
   * Stops the RAF loop and cleans up.
   */
  public stopLoop(): void {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Dispose all subscribers and stop loop.
   */
  public destroy(): void {
    this.stopLoop();
    this.subscribers.clear();
  }
}
