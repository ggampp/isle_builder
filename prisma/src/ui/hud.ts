import { ALL_COLORS, colorHex, colorName, recipeOf } from '../puzzle/colors.ts';
import { DIFFICULTIES } from '../puzzle/generate.ts';
import type { Puzzle } from '../puzzle/grid.ts';
import type { Simulation } from '../puzzle/simulate.ts';
import { assetUrl } from '../render/materials.ts';
import './styles.css';

export interface HudCallbacks {
  onClear: () => void;
  onNewPuzzle: () => void;
  onDifficulty: (id: string) => void;
  onHelp: (open: boolean) => void;
  onMute: (muted: boolean) => void;
}

export interface HudState {
  dateKey: string;
  difficultyId: string;
  difficultyLabel: string;
  isDaily: boolean;
  mirrorsUsed: number;
  mirrorBudget: number;
  targetsLit: number;
  targetsTotal: number;
  message: string;
  solved: boolean;
}

export class Hud {
  readonly canvas: HTMLCanvasElement;
  private root: HTMLElement;
  private callbacks: HudCallbacks;
  private muted = false;

  constructor(mount: HTMLElement, callbacks: HudCallbacks) {
    this.callbacks = callbacks;
    mount.innerHTML = TEMPLATE;
    this.root = mount;
    this.canvas = this.query('#board') as HTMLCanvasElement;

    const logo = this.query('#logo') as HTMLImageElement;
    logo.src = assetUrl('assets/ui/logo.png');
    logo.addEventListener('error', () => { logo.hidden = true; });

    this.query('#btn-clear').addEventListener('click', () => this.callbacks.onClear());
    this.query('#btn-new').addEventListener('click', () => this.callbacks.onNewPuzzle());
    this.query('#btn-help').addEventListener('click', () => this.callbacks.onHelp(true));
    this.query('#btn-help-close').addEventListener('click', () => this.callbacks.onHelp(false));
    this.query('#help').addEventListener('click', (e) => {
      if (e.target === this.query('#help')) this.callbacks.onHelp(false);
    });
    this.query('#btn-mute').addEventListener('click', () => {
      this.muted = !this.muted;
      this.query('#btn-mute').textContent = this.muted ? 'Som off' : 'Som';
      this.callbacks.onMute(this.muted);
    });

    const picker = this.query('#difficulties');
    for (const spec of DIFFICULTIES) {
      const button = document.createElement('button');
      button.textContent = spec.label;
      button.dataset.id = spec.id;
      button.addEventListener('click', () => this.callbacks.onDifficulty(spec.id));
      picker.appendChild(button);
    }

    this.renderMixes();
  }

  private query(selector: string): HTMLElement {
    const el = this.root.querySelector(selector);
    if (!el) throw new Error(`elemento ausente na HUD: ${selector}`);
    return el as HTMLElement;
  }

  private renderMixes(): void {
    const list = this.query('#mixes');
    for (const mask of ALL_COLORS) {
      if (mask === 1 || mask === 2 || mask === 4) continue;
      const li = document.createElement('li');
      li.innerHTML =
        `<span class="swatch" style="background:${colorHex(mask)}"></span>` +
        `<span>${recipeOf(mask)} = <b>${colorName(mask)}</b></span>`;
      list.appendChild(li);
    }
  }

  setHelpOpen(open: boolean): void {
    this.query('#help').hidden = !open;
  }

  setLoading(open: boolean, label = 'Montando o ateliê óptico…'): void {
    const el = this.query('#loading');
    el.hidden = !open;
    this.query('#loading-label').textContent = label;
  }

  update(state: HudState, puzzle: Puzzle, sim: Simulation): void {
    this.query('#date').textContent = state.dateKey;
    this.query('#difficulty').textContent = state.difficultyLabel.toUpperCase();
    this.query('#mirrors').textContent = `${state.mirrorsUsed}/${state.mirrorBudget}`;
    this.query('#targets').textContent = `${state.targetsLit}/${state.targetsTotal}`;
    this.query('#badge-daily').textContent = state.isDaily ? 'DESAFIO DO DIA' : 'TABULEIRO EXTRA';

    const mirrorFill = this.query('#meter-mirrors');
    const targetFill = this.query('#meter-targets');
    const mPct = state.mirrorBudget === 0 ? 0 : state.mirrorsUsed / state.mirrorBudget;
    const tPct = state.targetsTotal === 0 ? 0 : state.targetsLit / state.targetsTotal;
    mirrorFill.style.width = `${Math.min(1, mPct) * 100}%`;
    targetFill.style.width = `${Math.min(1, tPct) * 100}%`;

    const message = this.query('#message');
    message.innerHTML = state.message;
    message.classList.toggle('win', state.solved);
    this.root.classList.toggle('solved', state.solved);

    this.root.querySelectorAll<HTMLElement>('#difficulties button').forEach((el) => {
      el.classList.toggle('active', el.dataset.id === state.difficultyId);
    });

    const legend = this.query('#legend');
    legend.innerHTML = '';
    puzzle.cells.forEach((cell, index) => {
      if (cell.kind !== 'target') return;
      const done = sim.lit.has(index);
      const li = document.createElement('li');
      if (done) li.classList.add('done');
      li.innerHTML =
        `<span class="dot" style="background:${colorHex(cell.want)};color:${colorHex(cell.want)}"></span>` +
        `<span>${recipeOf(cell.want)}${done ? ' ✓' : ''}</span>`;
      legend.appendChild(li);
    });
  }
}

const TEMPLATE = `
  <div class="stage">
    <canvas id="board"></canvas>
    <div class="vignette" aria-hidden="true"></div>
  </div>

  <header class="hud-top">
    <div class="brand">
      <img id="logo" alt="" width="52" height="52" />
      <div>
        <h1>Prisma</h1>
        <p class="subtitle">
          <span id="date">—</span> · <span id="difficulty">—</span>
          <button type="button" id="btn-help">como jogar</button>
        </p>
        <p class="badge" id="badge-daily">DESAFIO DO DIA</p>
      </div>
    </div>
    <div class="meters">
      <div class="meter">
        <div class="meter-head"><span>Espelhos</span><b id="mirrors">0/0</b></div>
        <div class="meter-track"><i id="meter-mirrors"></i></div>
      </div>
      <div class="meter">
        <div class="meter-head"><span>Alvos</span><b id="targets">0/0</b></div>
        <div class="meter-track"><i id="meter-targets"></i></div>
      </div>
      <button type="button" class="icon-btn" id="btn-mute" title="Som">Som</button>
    </div>
  </header>

  <ul class="legend" id="legend"></ul>

  <div class="hud-bottom">
    <p class="message" id="message"></p>
    <div class="actions">
      <button class="action" id="btn-clear">Limpar</button>
      <button class="action primary" id="btn-new">Outro tabuleiro</button>
    </div>
    <div class="difficulties" id="difficulties"></div>
    <p class="hint-orbit">Arraste para orbitar · clique para pôr um espelho · scroll para zoom</p>
  </div>

  <div class="overlay" id="help" hidden>
    <div class="sheet">
      <h2>Como jogar</h2>
      <p>
        Cada emissor lança um feixe na direção da lente. Leve a luz até todos os
        alvos — na cor exata que cada um pede.
      </p>
      <h3>Espelhos</h3>
      <ul>
        <li>Clique numa célula vazia para colocar um espelho <b>/</b>.</li>
        <li>Clique de novo para virá-lo em <b>\\</b>, e mais uma vez para tirá-lo.</li>
        <li>O espelho desvia o feixe em 90°.</li>
      </ul>
      <h3>Misturar cores</h3>
      <p>
        Quando dois feixes se cruzam, eles <b>seguem misturados</b> a partir dali.
        É assim que se acende um alvo de cor secundária:
      </p>
      <ul class="mixes" id="mixes"></ul>
      <h3>Regras da casa</h3>
      <ul>
        <li>Paredes bloqueiam a luz; emissores e alvos a absorvem.</li>
        <li>Você tem um número limitado de espelhos — o mesmo que a solução de referência usa.</li>
        <li>Arraste o tabuleiro para orbitar a câmera; a roda aproxima. Clique põe ou vira o espelho.</li>
      </ul>
      <button class="action close" id="btn-help-close">Entendi</button>
    </div>
  </div>

  <div class="overlay loading" id="loading">
    <div class="sheet loading-sheet">
      <div class="prism-spin" aria-hidden="true"></div>
      <p id="loading-label">Montando o ateliê óptico…</p>
    </div>
  </div>
`;
