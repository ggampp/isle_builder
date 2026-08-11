export type UpdateFn = (dt: number) => void;
export type RenderFn = () => void;

const MAX_DELTA_SECONDS = 0.1;

/** Loop de jogo com passo variável e delta clampado (evita saltos ao trocar de aba). */
export class GameLoop {
  private rafId: number | null = null;
  private lastTime = 0;
  private readonly update: UpdateFn;
  private readonly render: RenderFn;

  constructor(update: UpdateFn, render: RenderFn) {
    this.update = update;
    this.render = render;
  }

  start(): void {
    if (this.rafId !== null) return;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (this.rafId === null) return;
    cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  private readonly tick = (now: number): void => {
    const dt = Math.min((now - this.lastTime) / 1000, MAX_DELTA_SECONDS);
    this.lastTime = now;
    this.update(dt);
    this.render();
    this.rafId = requestAnimationFrame(this.tick);
  };
}
