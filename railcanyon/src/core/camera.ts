import * as THREE from 'three';
import type { InputManager } from './input.ts';

/**
 * Rig orbital do vídeo: WASD pan · left-drag pan · right-drag turn · wheel zoom.
 * A câmera orbita um alvo no plano do chão com pitch limitado.
 */
export class CanyonCamera {
  readonly camera: THREE.PerspectiveCamera;
  private target = new THREE.Vector3(10, 6, -40);
  private yaw = Math.PI * 0.25;
  private pitch = 0.85;
  private distance = 150;
  private desiredDistance = 150;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.5, 1200);
    this.apply();
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /** Recentra a câmera num ponto do mundo (seguir trem, focar cidade). */
  focusOn(x: number, z: number, distance?: number): void {
    this.target.x = x;
    this.target.z = z;
    if (distance !== undefined) {
      this.desiredDistance = THREE.MathUtils.clamp(distance, 18, 320);
    }
  }

  get targetPosition(): THREE.Vector3 {
    return this.target.clone();
  }

  update(dt: number, input: InputManager): void {
    const { dx, dy, wheel } = input.consumeFrameDeltas();

    if (wheel !== 0) {
      this.desiredDistance = THREE.MathUtils.clamp(
        this.desiredDistance * Math.exp(wheel * 0.0012), 18, 320);
    }
    this.distance += (this.desiredDistance - this.distance) * Math.min(1, dt * 10);

    if (input.isButtonDown(2)) {
      this.yaw -= dx * 0.005;
      this.pitch = THREE.MathUtils.clamp(this.pitch + dy * 0.004, 0.5, 1.35);
    } else if (input.isButtonDown(0)) {
      this.panScreen(dx, dy);
    }

    const panSpeed = this.distance * 0.9 * dt;
    const fwd = new THREE.Vector2(-Math.sin(this.yaw), -Math.cos(this.yaw));
    const right = new THREE.Vector2(-fwd.y, fwd.x);
    if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) this.moveGround(fwd, panSpeed);
    if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) this.moveGround(fwd, -panSpeed);
    if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) this.moveGround(right, panSpeed);
    if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) this.moveGround(right, -panSpeed);

    const limit = 260;
    this.target.x = THREE.MathUtils.clamp(this.target.x, -limit, limit);
    this.target.z = THREE.MathUtils.clamp(this.target.z, -limit, limit);
    this.apply();
  }

  private panScreen(dx: number, dy: number): void {
    const scale = this.distance * 0.0016;
    const fwd = new THREE.Vector2(-Math.sin(this.yaw), -Math.cos(this.yaw));
    const right = new THREE.Vector2(-fwd.y, fwd.x);
    this.moveGround(right, -dx * scale);
    this.moveGround(fwd, dy * scale);
  }

  private moveGround(dir: THREE.Vector2, amount: number): void {
    this.target.x += dir.x * amount;
    this.target.z += dir.y * amount;
  }

  private apply(): void {
    const horiz = this.distance * Math.cos(this.pitch);
    this.camera.position.set(
      this.target.x + Math.sin(this.yaw) * horiz,
      this.target.y + this.distance * Math.sin(this.pitch),
      this.target.z + Math.cos(this.yaw) * horiz,
    );
    this.camera.lookAt(this.target);
  }
}
