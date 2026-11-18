import type { Scene } from '../core/Scene';
import { Environment } from './Environment';
import { Water } from './Water';
import { IslandModel, type IslandModelCallbacks } from './IslandModel';

export class World {
  public environment: Environment;
  public water: Water;
  public island: IslandModel;

  constructor(scene: Scene, callbacks?: IslandModelCallbacks) {
    this.environment = new Environment(scene);
    this.water = new Water(scene);
    this.island = new IslandModel(scene, callbacks);
  }

  public update(delta: number, elapsed: number): void {
    this.water.update(elapsed);
    this.island.update(delta, elapsed);
  }

  public destroy(): void {
    this.environment.destroy();
    this.water.destroy();
    this.island.destroy();
  }
}

