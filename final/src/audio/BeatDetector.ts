export type BeatCallback = (strength: number) => void;

/**
 * BeatDetector detects musical transients primarily in the low-frequency / bass spectrum.
 * It tracks rolling energy history, calculates a dynamic threshold, applies refractory cooldown,
 * and maintains an impulse value that decays smoothly from 1 to 0.
 */
export class BeatDetector {
  private history: number[] = [];
  private historySize = 45; // ~0.75s at 60fps
  private thresholdMultiplier = 1.35;
  private minThreshold = 0.22;
  private cooldownMs = 240; // minimum ms between detected beats
  private lastBeatTime = 0;

  public beatImpulse = 0;
  public beatConfidence = 0;
  private decayRate = 4.5; // per second

  private listeners: Set<BeatCallback> = new Set();

  constructor(thresholdMultiplier = 1.35, cooldownMs = 240) {
    this.thresholdMultiplier = thresholdMultiplier;
    this.cooldownMs = cooldownMs;
  }

  public onBeat(callback: BeatCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Process a frame's bass energy and update beat state.
   * @param bassEnergy Current normalized bass energy (0-1)
   * @param delta Delta time in seconds
   * @param now Current timestamp in ms
   */
  public update(bassEnergy: number, delta: number, now: number = performance.now()): void {
    // Decay current impulse smoothly
    this.beatImpulse = Math.max(0, this.beatImpulse - delta * this.decayRate);

    // Maintain rolling history
    this.history.push(bassEnergy);
    if (this.history.length > this.historySize) {
      this.history.shift();
    }

    if (this.history.length < 10) return;

    // Calculate rolling average and variance
    let sum = 0;
    for (let i = 0; i < this.history.length; i++) {
      sum += this.history[i];
    }
    const average = sum / this.history.length;

    let varianceSum = 0;
    for (let i = 0; i < this.history.length; i++) {
      const diff = this.history[i] - average;
      varianceSum += diff * diff;
    }
    const variance = varianceSum / this.history.length;

    // Dynamic threshold adapts to dynamic range of song
    const dynamicThreshold = Math.max(
      this.minThreshold,
      average * this.thresholdMultiplier + Math.sqrt(variance) * 0.5
    );

    const timeSinceLastBeat = now - this.lastBeatTime;

    if (bassEnergy > dynamicThreshold && timeSinceLastBeat >= this.cooldownMs) {
      // Detected a beat!
      this.lastBeatTime = now;
      const strength = Math.min(1.0, (bassEnergy - dynamicThreshold) * 2.5 + 0.6);
      this.beatImpulse = 1.0;
      this.beatConfidence = strength;

      for (const listener of this.listeners) {
        listener(strength);
      }
    }
  }

  public reset(): void {
    this.history = [];
    this.beatImpulse = 0;
    this.beatConfidence = 0;
    this.lastBeatTime = 0;
  }
}
