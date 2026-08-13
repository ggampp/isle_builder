import * as THREE from 'three';
import type { InputManager } from './input.ts';
import { fromWorld3, screenToLogicalGround, toWorld3 } from './world3d.ts';

const MIN_DISTANCE = 80;
const MAX_DISTANCE = 520;
const DEFAULT_DISTANCE = 220;
const DEFAULT_PITCH = 0.95;
const DEFAULT_YAW = Math.PI * 0.22;

/**
 * Câmera perspectiva orbital no Isle Builder 3D.
 * Mantém API lógica (x/y = centro do look-at no plano do mapa; zoom ≈ distância).
 */
export class IsleCamera {
  readonly three: THREE.PerspectiveCamera;

  /** Centro do look-at em coordenadas lógicas (x leste, y norte). */
  x = 0;
  y = 0;

  /** Compat: “zoom” maior ≈ mais perto (inverso da distância). */
  zoom = 1;

  private yaw = DEFAULT_YAW;
  private pitch = DEFAULT_PITCH;
  private distance = DEFAULT_DISTANCE;
  private desiredDistance = DEFAULT_DISTANCE;
  private viewportWidth = 1;
  private viewportHeight = 1;

  constructor(width: number, height: number) {
    this.three = new THREE.PerspectiveCamera(45, 1, 0.5, 4000);
    this.resize(width, height);
    this.apply();
  }

  resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.three.aspect = width / Math.max(1, height);
    this.three.updateProjectionMatrix();
  }

  /** Aproximação da meia-largura visível no chão (para oceano/minimap). */
  get halfViewWidth(): number {
    const vFov = THREE.MathUtils.degToRad(this.three.fov);
    const halfH = Math.tan(vFov * 0.5) * this.distance;
    return halfH * this.three.aspect * 1.15;
  }

  get halfViewHeight(): number {
    const vFov = THREE.MathUtils.degToRad(this.three.fov);
    return Math.tan(vFov * 0.5) * this.distance * 1.15;
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return (
      screenToLogicalGround(this.three, screenX, screenY, this.viewportWidth, this.viewportHeight) ?? {
        x: this.x,
        y: this.y,
      }
    );
  }

  update(dt: number, input: InputManager): void {
    const wheelDelta = input.consumeWheelDelta();
    if (wheelDelta !== 0) {
      this.desiredDistance = THREE.MathUtils.clamp(
        this.desiredDistance * Math.exp(wheelDelta * 0.0015),
        MIN_DISTANCE,
        MAX_DISTANCE,
      );
    }
    this.distance += (this.desiredDistance - this.distance) * Math.min(1, dt * 10);
    this.zoom = DEFAULT_DISTANCE / this.distance;

    // Middle-button / Space+drag pan already comes as drag delta from InputManager.
    const drag = input.consumeDragDelta();
    if (drag) {
      this.panScreen(drag.x, drag.y);
    }

    // Right-drag orbit when not used for prop erase elsewhere — use Alt+left as orbit.
    // Keep middle-mouse pan; add Q/E yaw for comfort.
    const panSpeed = this.distance * 0.85 * dt;
    const fwd = new THREE.Vector2(-Math.sin(this.yaw), -Math.cos(this.yaw));
    const right = new THREE.Vector2(-fwd.y, fwd.x);
    if (input.isKeyDown('KeyW') || input.isKeyDown('ArrowUp')) this.moveLogical(fwd, panSpeed);
    if (input.isKeyDown('KeyS') || input.isKeyDown('ArrowDown')) this.moveLogical(fwd, -panSpeed);
    if (input.isKeyDown('KeyD') || input.isKeyDown('ArrowRight')) this.moveLogical(right, panSpeed);
    if (input.isKeyDown('KeyA') || input.isKeyDown('ArrowLeft')) this.moveLogical(right, -panSpeed);
    if (input.isKeyDown('KeyQ')) this.yaw += 1.2 * dt;
    if (input.isKeyDown('KeyE')) this.yaw -= 1.2 * dt;

    this.apply();
  }

  private panScreen(dx: number, dy: number): void {
    const scale = this.distance * 0.0018;
    const fwd = new THREE.Vector2(-Math.sin(this.yaw), -Math.cos(this.yaw));
    const right = new THREE.Vector2(-fwd.y, fwd.x);
    this.moveLogical(right, -dx * scale);
    this.moveLogical(fwd, dy * scale);
  }

  private moveLogical(dir: THREE.Vector2, amount: number): void {
    this.x += dir.x * amount;
    this.y += dir.y * amount;
  }

  private apply(): void {
    const target = toWorld3(this.x, this.y, 0);
    const horiz = this.distance * Math.cos(this.pitch);
    this.three.position.set(
      target.x + Math.sin(this.yaw) * horiz,
      target.y + this.distance * Math.sin(this.pitch),
      target.z + Math.cos(this.yaw) * horiz,
    );
    this.three.lookAt(target);
    // Keep public zoom in sync for debug overlay.
    this.zoom = DEFAULT_DISTANCE / this.distance;
    void fromWorld3;
  }
}
