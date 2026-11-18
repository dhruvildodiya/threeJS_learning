import { Sizes } from './Sizes';
import { Time } from './Time';
import { Scene } from './Scene';
import { Camera } from './Camera';
import { Renderer } from './Renderer';
import { World } from '../world/World';
import { DebugGUI } from '../ui/DebugGUI';
import type { IslandModelCallbacks } from '../world/IslandModel';

export class Experience {
  public static instance: Experience | null = null;

  public readonly canvas!: HTMLCanvasElement;
  public readonly sizes!: Sizes;
  public readonly time!: Time;
  public readonly scene!: Scene;
  public readonly camera!: Camera;
  public readonly renderer!: Renderer;
  public readonly world!: World;
  public readonly debugGUI!: DebugGUI;

  constructor(canvas: HTMLCanvasElement, callbacks?: IslandModelCallbacks) {
    if (Experience.instance) {
      return Experience.instance;
    }
    Experience.instance = this;

    this.canvas = canvas;

    // Core systems
    this.sizes = new Sizes();
    this.time = new Time();
    this.scene = new Scene();
    this.camera = new Camera(this.scene, this.sizes, this.canvas);
    this.renderer = new Renderer(this.canvas, this.sizes, this.scene, this.camera);

    // World systems
    this.world = new World(this.scene, callbacks);

    // UI & Controls
    this.debugGUI = new DebugGUI(this.world, this.camera, this.scene);

    // Events
    this.sizes.on('resize', this.onResize);
    this.time.on('tick', this.onTick);
  }

  private onResize = (): void => {
    this.camera.resize();
    this.renderer.resize();
  };

  private onTick = (event: { delta: number; elapsed: number }): void => {
    this.camera.update();
    this.world.update(event.delta, event.elapsed);
    this.renderer.update();
  };

  public destroy(): void {
    this.sizes.off('resize', this.onResize);
    this.time.off('tick', this.onTick);

    this.sizes.destroy();
    this.time.destroy();
    this.debugGUI.destroy();
    this.world.destroy();
    this.camera.destroy();
    this.renderer.destroy();
    this.scene.destroy();

    Experience.instance = null;
  }
}
