export interface TopbarCallbacks {
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
}

export class Topbar {
  constructor(parent: HTMLElement, callbacks: TopbarCallbacks) {
    const root = document.createElement('div');
    root.style.cssText =
      'position:fixed;top:16px;left:50%;transform:translateX(-50%);' +
      'display:flex;gap:12px;z-index:9999;';

    const btnUndo = this.createPill('Undo', 'blue', 'Ctrl+Z', () => callbacks.onUndo());
    const btnRedo = this.createPill('Redo', 'green', 'Ctrl+Y', () => callbacks.onRedo());
    const btnClear = this.createPill('Clear', 'red', 'Erase Map', () => callbacks.onClear());

    root.append(btnUndo, btnRedo, btnClear);
    parent.appendChild(root);
  }

  private createPill(text: string, colorClass: string, subtext: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = `pill-btn ${colorClass}`;
    btn.style.width = '100px';
    btn.style.marginTop = '0';
    btn.innerHTML = `${text}<small>${subtext}</small>`;
    btn.addEventListener('click', onClick);
    return btn;
  }
}
