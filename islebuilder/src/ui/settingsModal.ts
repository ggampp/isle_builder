const STORAGE_VOLUME = 'isle-settings-volume';
const STORAGE_DPR = 'isle-settings-dpr';

export interface SettingsState {
  volume: number;
  dpr: number;
}

export interface SettingsCallbacks {
  onApply: (state: SettingsState) => void;
  onResetMap: () => void;
}

export function loadSettings(): SettingsState {
  const volume = Number(localStorage.getItem(STORAGE_VOLUME) ?? '80');
  const dpr = Number(localStorage.getItem(STORAGE_DPR) ?? '2');
  return {
    volume: Number.isFinite(volume) ? Math.min(100, Math.max(0, volume)) : 80,
    dpr: [1, 1.5, 2].includes(dpr) ? dpr : 2,
  };
}

export function saveSettings(state: SettingsState): void {
  localStorage.setItem(STORAGE_VOLUME, String(state.volume));
  localStorage.setItem(STORAGE_DPR, String(state.dpr));
}

export class SettingsModal {
  private overlay: HTMLDivElement;
  private volumeInput: HTMLInputElement;
  private dprSelect: HTMLSelectElement;
  private callbacks: SettingsCallbacks;

  constructor(callbacks: SettingsCallbacks) {
    this.callbacks = callbacks;
    const initial = loadSettings();

    this.overlay = document.createElement('div');
    this.overlay.className = 'settings-overlay';
    this.overlay.style.display = 'none';

    const panel = document.createElement('div');
    panel.className = 'settings-panel isle-panel';

    const title = document.createElement('h2');
    title.textContent = 'Configurações';
    title.style.cssText = 'margin:0 0 12px;font-size:18px;color:var(--accent);';

    const volLabel = document.createElement('label');
    volLabel.className = 'settings-row';
    volLabel.innerHTML = '<span>Volume</span>';
    this.volumeInput = document.createElement('input');
    this.volumeInput.type = 'range';
    this.volumeInput.min = '0';
    this.volumeInput.max = '100';
    this.volumeInput.value = String(initial.volume);
    volLabel.appendChild(this.volumeInput);

    const dprLabel = document.createElement('label');
    dprLabel.className = 'settings-row';
    dprLabel.innerHTML = '<span>Qualidade (DPR)</span>';
    this.dprSelect = document.createElement('select');
    for (const v of [1, 1.5, 2]) {
      const opt = document.createElement('option');
      opt.value = String(v);
      opt.textContent = v === 2 ? 'Alta (2×)' : v === 1.5 ? 'Média (1.5×)' : 'Baixa (1×)';
      if (v === initial.dpr) opt.selected = true;
      this.dprSelect.appendChild(opt);
    }
    dprLabel.appendChild(this.dprSelect);

    const hint = document.createElement('p');
    hint.className = 'settings-hint';
    hint.textContent = 'Volume será usado na Sprint 09 (áudio). DPR afeta nitidez e desempenho.';

    const btnRow = document.createElement('div');
    btnRow.className = 'settings-actions';

    const applyBtn = document.createElement('button');
    applyBtn.className = 'pill-btn blue';
    applyBtn.style.marginTop = '0';
    applyBtn.textContent = 'Aplicar';
    applyBtn.addEventListener('click', () => this.apply());

    const resetBtn = document.createElement('button');
    resetBtn.className = 'pill-btn red';
    resetBtn.style.marginTop = '0';
    resetBtn.textContent = 'Limpar mapa';
    resetBtn.addEventListener('click', () => {
      if (window.confirm('Apagar todo o mapa, props e histórico? Esta ação pode ser desfeita com Ctrl+Z.')) {
        this.callbacks.onResetMap();
        this.hide();
      }
    });

    const closeBtn = document.createElement('button');
    closeBtn.className = 'pill-btn';
    closeBtn.style.cssText = 'margin-top:0;background:var(--card-bg);color:var(--text);';
    closeBtn.textContent = 'Fechar';
    closeBtn.addEventListener('click', () => this.hide());

    btnRow.append(applyBtn, resetBtn, closeBtn);
    panel.append(title, volLabel, dprLabel, hint, btnRow);
    this.overlay.appendChild(panel);

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });

    document.body.appendChild(this.overlay);
  }

  show(): void {
    const s = loadSettings();
    this.volumeInput.value = String(s.volume);
    this.dprSelect.value = String(s.dpr);
    this.overlay.style.display = 'flex';
  }

  hide(): void {
    this.overlay.style.display = 'none';
  }

  private apply(): void {
    const state: SettingsState = {
      volume: Number(this.volumeInput.value),
      dpr: Number(this.dprSelect.value),
    };
    saveSettings(state);
    this.callbacks.onApply(state);
    this.hide();
  }
}
