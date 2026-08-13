import * as THREE from 'three';

export interface SceneDiagnostics {
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
  fps: number;
}

export class GameScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly canvas: HTMLCanvasElement;
  bloomStrength = 0.32;
  private frames = 0;
  private fps = 0;
  private fpsStamp = 0;

  yaw = 0.42;
  pitch = 0.78;
  distance = 11.5;
  readonly lookAt = new THREE.Vector3(0, 0.2, 0);
  private readonly minPitch = 0.38;
  private readonly maxPitch = 1.15;
  private readonly minDist = 7;
  private readonly maxDist = 18;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#070b14');
    this.scene.fog = new THREE.FogExp2('#070b14', 0.028);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
    this.resize();
    this.applyCamera();
  }

  resize(): void {
    const parent = this.canvas.parentElement ?? document.body;
    const w = Math.max(1, parent.clientWidth);
    const h = Math.max(1, parent.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  orbit(dx: number, dy: number): void {
    this.yaw -= dx * 0.005;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy * 0.004, this.minPitch, this.maxPitch);
  }

  zoom(delta: number): void {
    this.distance = THREE.MathUtils.clamp(this.distance + delta * 0.012, this.minDist, this.maxDist);
  }

  applyCamera(time = 0): void {
    const sway = Math.sin(time * 0.22) * 0.04;
    const yaw = this.yaw + sway;
    const pitch = this.pitch;
    const x = this.lookAt.x + Math.sin(yaw) * Math.cos(pitch) * this.distance;
    const y = this.lookAt.y + Math.sin(pitch) * this.distance;
    const z = this.lookAt.z + Math.cos(yaw) * Math.cos(pitch) * this.distance;
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.lookAt);
  }

  render(time: number): void {
    this.applyCamera(time);
    this.renderer.render(this.scene, this.camera);
    this.frames += 1;
    const now = performance.now();
    if (now - this.fpsStamp >= 500) {
      this.fps = (this.frames * 1000) / (now - this.fpsStamp);
      this.frames = 0;
      this.fpsStamp = now;
    }
  }

  diagnostics(): SceneDiagnostics {
    const info = this.renderer.info;
    return {
      calls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      fps: Math.round(this.fps),
    };
  }
}
