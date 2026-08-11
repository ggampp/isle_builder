const FPS_SAMPLE_SECONDS = 0.5;

/** Overlay de FPS; só cria DOM/listeners quando `enabled` (gated por modo dev). */
export class DebugOverlay {
  private readonly el: HTMLDivElement | null;
  private frames = 0;
  private accumSeconds = 0;
  private fpsText = 'FPS: --';
  private zoomText = 'ZOOM: --';

  constructor(enabled: boolean) {
    if (!enabled) {
      this.el = null;
      return;
    }
    this.el = document.createElement('div');
    this.el.style.cssText =
      'position:fixed;top:8px;left:8px;padding:4px 8px;' +
      'background:rgba(0,0,0,.55);color:#7CFC9A;font:12px monospace;' +
      'border-radius:4px;z-index:9999;pointer-events:none;white-space:pre;';
    this.el.textContent = `${this.fpsText}\n${this.zoomText}`;
    document.body.appendChild(this.el);
  }

  update(dt: number, zoom?: number): void {
    if (!this.el) return;
    if (zoom !== undefined) {
      this.zoomText = `ZOOM: ${zoom.toFixed(2)}x`;
    }
    this.frames += 1;
    this.accumSeconds += dt;
    if (this.accumSeconds >= FPS_SAMPLE_SECONDS) {
      const fps = Math.round(this.frames / this.accumSeconds);
      this.fpsText = `FPS: ${fps}`;
      this.frames = 0;
      this.accumSeconds = 0;
    }
    this.el.textContent = `${this.fpsText}\n${this.zoomText}`;
  }
}
