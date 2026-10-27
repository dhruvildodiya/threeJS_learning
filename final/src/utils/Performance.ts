import type * as THREE from 'three';
import type { Debug } from './Debug';

export interface PerformanceStats {
  fps: number;
  frameTimeMs: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
}

/**
 * Performance monitors runtime framerates, draw calls, and memory geometries.
 */
export class Performance {
  public stats: PerformanceStats = {
    fps: 60,
    frameTimeMs: 16.6,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
  };

  private frameCount = 0;
  private lastTime = performance.now();
  private debugControllers: Array<{ updateDisplay: () => void }> = [];

  constructor(private readonly renderer: THREE.WebGLRenderer, debug?: Debug) {
    if (debug?.active) {
      const folder = debug.addFolder('Performance');
      if (folder) {
        this.debugControllers.push(folder.add(this.stats, 'fps').name('FPS').listen().disable());
        this.debugControllers.push(folder.add(this.stats, 'frameTimeMs').name('Frame (ms)').listen().disable());
        this.debugControllers.push(folder.add(this.stats, 'drawCalls').name('Draw Calls').listen().disable());
        this.debugControllers.push(folder.add(this.stats, 'triangles').name('Triangles').listen().disable());
        this.debugControllers.push(folder.add(this.stats, 'geometries').name('Geometries').listen().disable());
      }
    }
  }

  public update(): void {
    this.frameCount++;
    const now = performance.now();

    if (now - this.lastTime >= 500) {
      const elapsed = (now - this.lastTime) / 1000;
      this.stats.fps = Math.round(this.frameCount / elapsed);
      this.stats.frameTimeMs = Number(((now - this.lastTime) / this.frameCount).toFixed(1));
      this.frameCount = 0;
      this.lastTime = now;

      this.stats.drawCalls = this.renderer.info.render.calls;
      this.stats.triangles = this.renderer.info.render.triangles;
      this.stats.geometries = this.renderer.info.memory.geometries;
      this.stats.textures = this.renderer.info.memory.textures;
    }
  }
}
