type Listener = (...args: any[]) => void;

export class EventEmitter {
  private events: Record<string, Listener[]> = {};

  public on(event: string, listener: Listener): this {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return this;
  }

  public off(event: string, listener: Listener): this {
    if (!this.events[event]) return this;
    this.events[event] = this.events[event].filter((l) => l !== listener);
    return this;
  }

  public emit(event: string, ...args: any[]): boolean {
    if (!this.events[event]) return false;
    this.events[event].forEach((listener) => {
      try {
        listener(...args);
      } catch (err) {
        console.error(`Error in event listener for "${event}":`, err);
      }
    });
    return true;
  }

  public destroy(): void {
    this.events = {};
  }
}

