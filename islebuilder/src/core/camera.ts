import * as THREE from 'three';
import type { InputManager } from './input.ts';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;
/** Quanto maior, mais rápido o zoom converge ao alvo (por segundo). */
const ZOOM_EASE_RATE = 12;
/** Sensibilidade do wheel: fator multiplicativo de zoom por unidade de deltaY. */
const ZOOM_WHEEL_STEP = 0.0015;
const ZOOM_SNAP_EPSILON = 0.0005;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Câmera ortográfica 2D em coordenadas de mundo (+x direita, +y cima).
 * Zoom contínuo com easing, sempre ancorado no ponto do mundo sob o cursor
 * no momento do scroll — inclusive durante os frames de interpolação.
 */
export class IsleCamera {
  readonly three: THREE.OrthographicCamera;

  x = 0;
  y = 0;
  zoom = 1;

  private targetZoom = 1;
  private viewportWidth = 1;
  private viewportHeight = 1;
  private zoomAnchorWorld: { x: number; y: number } | null = null;
  private zoomAnchorScreen: { x: number; y: number } | null = null;

  constructor(width: number, height: number) {
    this.three = new THREE.OrthographicCamera(-1, 1, 1, -1, -1000, 1000);
    this.resize(width, height);
  }

  resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.applyProjection();
  }

  /** Meia-largura/altura do viewport atual, em unidades de mundo. */
  get halfViewWidth(): number {
    return this.viewportWidth / 2 / this.zoom;
  }

  get halfViewHeight(): number {
    return this.viewportHeight / 2 / this.zoom;
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const ndcX = (screenX / this.viewportWidth) * 2 - 1;
    const ndcY = -((screenY / this.viewportHeight) * 2 - 1);
    return {
      x: this.x + ndcX * this.halfViewWidth,
      y: this.y + ndcY * this.halfViewHeight,
    };
  }

  update(dt: number, input: InputManager): void {
    const wheelDelta = input.consumeWheelDelta();
    if (wheelDelta !== 0) {
      this.applyWheel(wheelDelta, input.pointer.x, input.pointer.y);
    }

    const drag = input.consumeDragDelta();
    if (drag) {
      this.pan(drag.x, drag.y);
    }

    this.approachTargetZoom(dt);
    this.applyProjection();
  }

  private applyWheel(deltaY: number, screenX: number, screenY: number): void {
    const worldBeforeZoom = this.screenToWorld(screenX, screenY);
    const factor = Math.exp(-deltaY * ZOOM_WHEEL_STEP);
    this.targetZoom = clamp(this.targetZoom * factor, MIN_ZOOM, MAX_ZOOM);
    this.zoomAnchorWorld = worldBeforeZoom;
    this.zoomAnchorScreen = { x: screenX, y: screenY };
  }

  private pan(dxScreen: number, dyScreen: number): void {
    // Arrasto solta a âncora de zoom: o usuário assumiu controle manual da câmera.
    this.zoomAnchorWorld = null;
    this.zoomAnchorScreen = null;
    this.x -= dxScreen / this.zoom;
    this.y += dyScreen / this.zoom;
  }

  private approachTargetZoom(dt: number): void {
    if (this.zoom === this.targetZoom) {
      this.zoomAnchorWorld = null;
      this.zoomAnchorScreen = null;
      return;
    }

    const t = 1 - Math.exp(-ZOOM_EASE_RATE * dt);
    this.zoom = lerp(this.zoom, this.targetZoom, t);
    if (Math.abs(this.zoom - this.targetZoom) < ZOOM_SNAP_EPSILON) {
      this.zoom = this.targetZoom;
    }

    if (this.zoomAnchorWorld && this.zoomAnchorScreen) {
      const ndcX = (this.zoomAnchorScreen.x / this.viewportWidth) * 2 - 1;
      const ndcY = -((this.zoomAnchorScreen.y / this.viewportHeight) * 2 - 1);
      this.x = this.zoomAnchorWorld.x - ndcX * this.halfViewWidth;
      this.y = this.zoomAnchorWorld.y - ndcY * this.halfViewHeight;
    }
  }

  private applyProjection(): void {
    this.three.left = -this.halfViewWidth;
    this.three.right = this.halfViewWidth;
    this.three.top = this.halfViewHeight;
    this.three.bottom = -this.halfViewHeight;
    this.three.position.set(this.x, this.y, 100);
    this.three.updateProjectionMatrix();
  }
}
