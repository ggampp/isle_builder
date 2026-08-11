import { createIconImg, type UiIconId } from './uiIcons.ts';

export interface SystemButtonCallbacks {
  onSettings: () => void;
  onPause: (paused: boolean) => void;
  onToggleUI: () => void;
  onScreenshot: () => void;
}

export class SystemButtons {
  private paused = false;
  private readonly pauseBtn: HTMLButtonElement;
  private pauseIconWrap: HTMLDivElement;

  constructor(parent: HTMLElement, callbacks: SystemButtonCallbacks) {
    const root = document.createElement('div');
    root.style.cssText =
      'position:fixed;top:16px;right:310px;' +
      'display:flex;gap:8px;z-index:9999;';

    const btnSettings = this.createButton('settings', 'Settings', () => callbacks.onSettings());

    this.pauseBtn = this.createButton('pause', 'Pause Simulation', () => {
      this.paused = !this.paused;
      this.updatePauseIcon();
      this.pauseBtn.title = this.paused ? 'Resume Simulation' : 'Pause Simulation';
      this.pauseBtn.classList.toggle('active', this.paused);
      callbacks.onPause(this.paused);
    });
    this.pauseIconWrap = this.pauseBtn.firstElementChild as HTMLDivElement;

    const btnToggleUI = this.createButton('eye', 'Toggle UI (Tab)', () => callbacks.onToggleUI());
    const btnScreenshot = this.createButton('camera', 'Screenshot Map', () => callbacks.onScreenshot());

    root.append(btnSettings, this.pauseBtn, btnToggleUI, btnScreenshot);
    parent.appendChild(root);
  }

  get isPaused(): boolean {
    return this.paused;
  }

  private updatePauseIcon(): void {
    this.pauseIconWrap.replaceChildren(createIconImg(this.paused ? 'play' : 'pause', 22));
  }

  private createButton(iconId: UiIconId, title: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'icon-btn';
    btn.title = title;
    const wrap = document.createElement('div');
    wrap.appendChild(createIconImg(iconId, 22));
    btn.appendChild(wrap);
    btn.addEventListener('click', onClick);
    return btn;
  }
}
