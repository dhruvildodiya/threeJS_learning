import * as THREE from 'three';
import { experienceConfig, type ExperienceConfig } from '../config/experience.config';
import { Time } from './Time';
import { Scene } from './Scene';
import { Renderer } from './Renderer';
import { Postprocessing } from './Postprocessing';
import { CameraRig } from '../camera/CameraRig';
import { AudioEngine } from '../audio/AudioEngine';
import { FeatureBus } from '../audio/FeatureBus';
import { Environment } from '../world/Environment';
import { Sky } from '../world/Sky';
import { Ocean } from '../world/Ocean';
import { Clouds } from '../world/Clouds';
import { Island } from '../world/Island';
import { Particles } from '../world/Particles';
import { Debug } from '../utils/Debug';
import { Performance } from '../utils/Performance';

export type QualityLevel = 'low' | 'medium' | 'high';

/**
 * Experience coordinates the entire 3D ecosystem, audio analysis bus,
 * custom shaders, 3D assets, camera rig, and post-processing.
 */
export class Experience {
  public static instance: Experience | null = null;

  public readonly canvas: HTMLCanvasElement;
  public readonly config: ExperienceConfig;
  public readonly time: Time;
  public readonly scene: Scene;
  public readonly cameraRig: CameraRig;
  public readonly renderer: Renderer;
  public readonly postprocessing: Postprocessing;
  public readonly debug: Debug;
  public readonly performance: Performance;

  // Audio subsystem
  public readonly audioEngine: AudioEngine;
  public readonly featureBus: FeatureBus;

  // World Elements
  public readonly environment: Environment;
  public readonly sky: Sky;
  public readonly ocean: Ocean;
  public readonly clouds: Clouds;
  public readonly island: Island;
  public readonly particles: Particles;

  public quality: QualityLevel = 'high';

  private boundResize: () => void;
  private unsubscribeTick: () => void;

  constructor(canvas: HTMLCanvasElement) {
    Experience.instance = this;

    this.canvas = canvas;
    this.config = experienceConfig;

    // 1. Debug & Timing
    this.debug = new Debug(this.config.debug);
    this.time = new Time();
    this.scene = new Scene();

    // 2. Audio Pipeline
    this.audioEngine = new AudioEngine();
    this.featureBus = new FeatureBus(this.audioEngine);

    const width = window.innerWidth;
    const height = window.innerHeight;

    // 3. Camera & Rendering
    this.cameraRig = new CameraRig(this.canvas, width, height, this.featureBus.uniforms, this.debug);
    this.renderer = new Renderer(this.canvas, width, height, this.config.renderer);
    this.postprocessing = new Postprocessing(
      this.renderer.instance,
      this.scene.instance,
      this.cameraRig.camera,
      width,
      height,
      this.featureBus.uniforms,
      this.debug
    );
    this.performance = new Performance(this.renderer.instance, this.debug);

    // 4. World Construction
    this.environment = new Environment(this.scene.instance, undefined, this.debug);
    this.sky = new Sky(
      this.scene.instance,
      this.featureBus.uniforms,
      this.environment.settings.sunPosition,
      this.debug
    );
    this.ocean = new Ocean(
      this.scene.instance,
      this.featureBus.uniforms,
      undefined,
      this.debug
    );
    // Link ocean sun & fog uniforms to environment
    this.ocean.setSun(this.environment.settings.sunPosition, new THREE.Color(this.environment.settings.sunColor));
    this.ocean.setFog(
      new THREE.Color(this.environment.settings.fogColor),
      this.environment.settings.fogNear,
      this.environment.settings.fogFar
    );

    this.clouds = new Clouds(this.scene.instance, this.featureBus.uniforms, this.debug);
    this.island = new Island(this.scene.instance, this.featureBus.uniforms, this.debug);
    this.particles = new Particles(this.scene.instance, this.featureBus.uniforms, this.debug);

    // 5. Setup Quality control in debug
    this.setupQualityDebug();

    // 6. Event Bindings
    this.boundResize = this.resize.bind(this);
    window.addEventListener('resize', this.boundResize);

    // 7. Start RAF loop
    this.unsubscribeTick = this.time.onTick((delta, elapsed) => this.update(delta, elapsed));
    this.time.startLoop();
  }

  /**
   * Set visual quality level dynamically (adjusts pixel ratio, shadows, bloom).
   */
  public setQuality(quality: QualityLevel): void {
    this.quality = quality;
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (quality === 'low') {
      this.renderer.instance.setPixelRatio(1.0);
      this.renderer.instance.shadowMap.enabled = false;
      this.postprocessing.setBloom(false);
    } else if (quality === 'medium') {
      this.renderer.instance.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      this.renderer.instance.shadowMap.enabled = true;
      this.postprocessing.setBloom(true);
      this.postprocessing.bloomPass.strength = 0.55;
    } else { // high
      this.renderer.instance.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
      this.renderer.instance.shadowMap.enabled = true;
      this.postprocessing.setBloom(true);
      this.postprocessing.bloomPass.strength = 0.85;
    }

    this.renderer.resize(width, height);
    this.postprocessing.resize(width, height);
  }

  private setupQualityDebug(): void {
    if (!this.debug.active) return;
    const folder = this.debug.addFolder('Quality Presets');
    if (!folder) return;

    folder
      .add(this, 'quality', ['low', 'medium', 'high'])
      .name('Preset')
      .onChange((val: QualityLevel) => this.setQuality(val));
  }

  /**
   * Handle viewport resize.
   */
  public resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.cameraRig.resize(width, height);
    this.renderer.resize(width, height);
    this.postprocessing.resize(width, height);
  }

  /**
   * Main per-frame update loop.
   */
  public update(delta: number, elapsed: number): void {
    // 1. Audio analysis update
    this.featureBus.update(delta, elapsed);

    // 2. Camera rig update
    this.cameraRig.update(delta, elapsed);

    // 3. Atmosphere and lighting reactivity
    this.environment.update(this.featureBus.bands.energy);

    // 4. World elements update
    this.sky.update(delta, elapsed, this.cameraRig.camera.position);
    this.ocean.update(delta, elapsed, this.cameraRig.camera.position);
    this.clouds.update(delta, elapsed);
    this.island.update(delta, elapsed);
    this.particles.update(delta, elapsed);

    // 5. Postprocessing render
    this.postprocessing.render(delta);

    // 6. Performance tracking
    this.performance.update();
  }

  public destroy(): void {
    window.removeEventListener('resize', this.boundResize);
    this.unsubscribeTick();
    this.time.destroy();

    this.particles.destroy();
    this.island.destroy();
    this.clouds.destroy();
    this.ocean.destroy();
    this.sky.destroy();
    this.environment.destroy();

    this.postprocessing.destroy();
    this.renderer.destroy();
    this.cameraRig.destroy();
    this.scene.destroy();

    this.featureBus.destroy();
    this.audioEngine.destroy();
    this.debug.destroy();

    Experience.instance = null;
  }
}
