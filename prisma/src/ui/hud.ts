import { ALL_COLORS, colorHex, colorName, recipeOf } from '../puzzle/colors.ts';
import { DIFFICULTIES } from '../puzzle/generate.ts';
import type { Puzzle } from '../puzzle/grid.ts';
import type { Simulation } from '../puzzle/simulate.ts';
import './styles.css';

export interface HudCallbacks {
  onClear: () => void;
  onNewPuzzle: () => void;
  onDifficulty: (id: string) => void;
  onHelp: (open: boolean) => void;
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

/** Painéis e textos ao redor do tabuleiro. */
export class Hud {
  readonly canvas: HTMLCanvasElement;
  private root: HTMLElement;
  private callbacks: HudCallbacks;

  constructor(mount: HTMLElement, callbacks: HudCallbacks) {
    this.callbacks = callbacks;
    mount.innerHTML = TEMPLATE;
    this.root = mount;
    this.canvas = this.query('#board') as HTMLCanvasElement;

    this.query('#btn-clear').addEventListener('click', () => this.callbacks.onClear());
    this.query('#btn-new').addEventListener('click', () => this.callbacks.onNewPuzzle());
    this.query('#btn-help').addEventListener('click', () => this.callbacks.onHelp(true));
    this.query('#btn-help-close').addEventListener('click', () => this.callbacks.onHelp(false));
    this.query('#help').addEventListener('click', (e) => {
      if (e.target === this.query('#help')) this.callbacks.onHelp(false);
    });

    const picker = this.query('#difficulties');
    for (const spec of DIFFICULTIES) {
      const button = document.createElement('button');
      button.textContent = spec.label;
      button.dataset.id = spec.id;
      button.addEventListener('click', () => this.callbacks.onDifficulty(spec.id));
      picker.appendChild(button);
    }

    this.renderRibbon();
    this.renderMixes();
  }

  private query(selector: string): HTMLElement {
    const el = this.root.querySelector(selector);
    if (!el) throw new Error(`elemento ausente na HUD: ${selector}`);
    return el as HTMLElement;
  }

  private renderRibbon(): void {
    const rail = this.query('#ribbon-rail');
    const colors = [1, 4, 2, 3];
    colors.forEach((mask, i) => {
      const bar = document.createElement('span');
      bar.style.background = colorHex(mask);
      bar.style.top = `${i * 3}px`;
      bar.style.right = `${i * 14}px`;
      rail.appendChild(bar);
    });
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

  update(state: HudState, puzzle: Puzzle, sim: Simulation): void {
    this.query('#date').textContent = state.dateKey;
    this.query('#difficulty').textContent = state.difficultyLabel.toUpperCase();
    this.query('#mirrors').textContent = `${state.mirrorsUsed}/${state.mirrorBudget}`;
    this.query('#targets').textContent = `${state.targetsLit}/${state.targetsTotal}`;
    this.query('#badge-daily').textContent = state.isDaily ? 'DESAFIO DO DIA' : 'TABULEIRO EXTRA';

    const message = this.query('#message');
    message.innerHTML = state.message;
    message.classList.toggle('win', state.solved);

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
  <header class="top">
    <div>
      <h1>Prisma</h1>
      <p class="subtitle">
        <span id="date">—</span> · <span id="difficulty">—</span> ·
        <button id="btn-help">como jogar</button>
      </p>
      <p class="subtitle" style="margin-top:6px"><span id="badge-daily">DESAFIO DO DIA</span></p>
    </div>
    <div class="stats">
      <div class="stat"><div class="label">Espelhos</div><div class="value" id="mirrors">0/0</div></div>
      <div class="stat"><div class="label">Alvos acesos</div><div class="value" id="targets">0/0</div></div>
    </div>
  </header>

  <div class="ribbon"><div class="rail" id="ribbon-rail"></div></div>

  <div class="board-wrap"><canvas id="board"></canvas></div>

  <ul class="legend" id="legend"></ul>
  <p class="message" id="message"></p>

  <div class="actions">
    <button class="action" id="btn-clear">Limpar tabuleiro</button>
    <button class="action primary" id="btn-new">Outro tabuleiro</button>
  </div>
  <div class="difficulties" id="difficulties"></div>

  <div class="overlay" id="help" hidden>
    <div class="sheet">
      <h2>Como jogar</h2>
      <p>
        Cada emissor lança um feixe na direção da seta. Sua tarefa é levar a luz
        até todos os alvos — e na cor exata que cada um pede.
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
        <li>Paredes cinzas bloqueiam a luz; emissores e alvos a absorvem.</li>
        <li>Você tem um número limitado de espelhos — o mesmo que a solução de referência usa.</li>
        <li>Um alvo com a cor errada mostra um pontinho da cor que chegou nele.</li>
      </ul>
      <button class="action close" id="btn-help-close">Entendi</button>
    </div>
  </div>

  <footer>
    <span>Prisma · puzzle diário de luz</span>
    <span>o tabuleiro do dia é o mesmo para todo mundo</span>
  </footer>
`;
