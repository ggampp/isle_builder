import { Minimap } from './minimap.ts';
import { PIECE_SPECS, PIECE_KINDS } from '../rail/geometry.ts';
import type { PieceKind } from '../rail/geometry.ts';
import { BUILDING_SPECS, BUILDING_KINDS } from '../world/buildings.ts';
import type { BuildingKind } from '../world/buildings.ts';
import { TOWNS } from '../world/towns.ts';
import type { EconomySnapshot } from '../game/economy.ts';
import type { Contract } from '../game/contracts.ts';
import './styles.css';

export type Selection =
  | { type: 'track'; kind: PieceKind }
  | { type: 'building'; kind: BuildingKind }
  | null;

export interface HudCallbacks {
  onSelect: (selection: Selection) => void;
  onUndo: () => void;
  onAddWagon: () => void;
  onRepair: () => void;
  onAcceptContract: (id: string) => void;
  onSave: () => void;
  onToggleFollow: () => void;
  onHelp: () => void;
}

export interface HudState {
  economy: EconomySnapshot;
  train: {
    name: string;
    speedMph: number;
    logs: number;
    logsMax: number;
    condition: number;
    wagons: number;
    cargo: number;
    cargoCapacity: number;
    status: string;
    route: string;
    repairCost: number;
    wagonCost: number;
  };
  objective: { title: string; detail: string; progress: number; reward: number };
  contracts: { offers: Contract[]; accepted: Contract[] };
  connectedTowns: string[];
  trackPieces: number;
  following: boolean;
}

type PanelId = 'trains' | 'network' | 'contracts' | 'shop';

const BUILD_ORDER: BuildingKind[] = [
  'cottage', 'house', 'manor', 'cabin', 'watertower', 'windmill', 'shed', 'lamp', 'bench',
];

export class Hud {
  readonly minimap: Minimap;
  private callbacks: HudCallbacks;
  private root: HTMLElement;
  private toastsEl: HTMLElement;
  private hintEl: HTMLElement;
  private openPanel: PanelId | null = null;
  private selection: Selection = null;
  private lastState: HudState | null = null;

  constructor(parent: HTMLElement, callbacks: HudCallbacks) {
    this.callbacks = callbacks;
    const hud = document.createElement('div');
    hud.id = 'hud';
    hud.innerHTML = TEMPLATE;
    parent.appendChild(hud);
    this.root = hud;

    this.toastsEl = this.query('#toasts');
    this.hintEl = this.query('#build .hint');
    this.minimap = new Minimap(this.query('#minimap canvas') as HTMLCanvasElement);

    this.buildPalette();
    this.wireButtons();
  }

  private query(selector: string): HTMLElement {
    const el = this.root.querySelector(selector);
    if (!el) throw new Error(`elemento ausente na HUD: ${selector}`);
    return el as HTMLElement;
  }

  private buildPalette(): void {
    const grid = this.query('#build .grid');
    const addItem = (
      key: string, icon: string, price: number, label: string, perk: string,
      select: () => Selection,
    ): void => {
      const el = document.createElement('button');
      el.className = 'build-item clickable';
      el.dataset.key = key;
      el.innerHTML = `<span class="glyph">${icon}</span>${price > 0 ? `<span class="price">${price}</span>` : ''}`;
      el.addEventListener('mouseenter', () => {
        this.hintEl.innerHTML = `<b>${label}</b>${price > 0 ? ` — ${price} moedas` : ''}<br><span class="perk">${perk}</span>`;
      });
      el.addEventListener('click', () => this.select(select()));
      grid.appendChild(el);
    };

    for (const kind of PIECE_KINDS) {
      const spec = PIECE_SPECS[kind];
      addItem(`track:${kind}`, spec.icon, spec.cost, spec.label,
        'Estende a linha a partir da ponta brilhante',
        () => ({ type: 'track', kind }));
    }
    for (const kind of BUILD_ORDER) {
      const spec = BUILDING_SPECS[kind];
      addItem(`building:${kind}`, spec.icon, spec.cost, spec.label, spec.perk,
        () => ({ type: 'building', kind }));
    }
    void BUILDING_KINDS;
  }

  private wireButtons(): void {
    this.query('#btn-undo').addEventListener('click', () => this.callbacks.onUndo());
    this.query('#btn-wagon').addEventListener('click', () => this.callbacks.onAddWagon());
    this.query('#btn-repair').addEventListener('click', () => this.callbacks.onRepair());
    this.query('#btn-save').addEventListener('click', () => this.callbacks.onSave());
    this.query('#btn-help').addEventListener('click', () => this.callbacks.onHelp());
    this.query('#btn-follow').addEventListener('click', () => this.callbacks.onToggleFollow());
    this.query('#btn-theme').addEventListener('click', () => this.toast('O sol do desfiladeiro não se põe hoje ☀️'));
    this.query('#btn-menu').addEventListener('click', () => this.togglePanel('trains'));

    const panels: PanelId[] = ['trains', 'network', 'contracts', 'shop'];
    for (const id of panels) {
      this.query(`#nav-${id}`).addEventListener('click', () => this.togglePanel(id));
    }
    this.query('#panel-close').addEventListener('click', () => this.togglePanel(null));

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') this.select(null);
    });
  }

  /** Seleção externa (ex.: cancelada pelo jogo) sem disparar callback. */
  setSelection(selection: Selection): void {
    this.selection = selection;
    this.refreshSelectionUi();
  }

  private select(selection: Selection): void {
    const same = JSON.stringify(selection) === JSON.stringify(this.selection);
    this.selection = same ? null : selection;
    this.refreshSelectionUi();
    this.callbacks.onSelect(this.selection);
  }

  private refreshSelectionUi(): void {
    const key = this.selection ? `${this.selection.type}:${this.selection.kind}` : '';
    this.root.querySelectorAll<HTMLElement>('.build-item').forEach((el) => {
      el.classList.toggle('active', el.dataset.key === key);
    });
  }

  private togglePanel(id: PanelId | null): void {
    this.openPanel = this.openPanel === id ? null : id;
    const panel = this.query('#panel');
    panel.style.display = this.openPanel ? 'block' : 'none';
    this.root.querySelectorAll<HTMLElement>('.navbtn').forEach((el) => {
      el.classList.toggle('active', el.id === `nav-${this.openPanel}`);
    });
    if (this.lastState) this.renderPanel(this.lastState);
  }

  update(state: HudState): void {
    this.lastState = state;
    const { economy, train } = state;

    this.query('#coins').textContent = economy.coins.toLocaleString('pt-BR');
    this.query('#score').textContent = economy.score.toLocaleString('pt-BR');
    this.query('#level-badge').textContent = String(economy.level);
    this.query('#level-label').textContent = `Nível ${economy.level}`;
    this.query('#level-text').textContent =
      `${economy.xpIntoLevel} / ${economy.xpForNextLevel}`;
    this.query('#level-bar').style.width =
      `${Math.min(100, (economy.xpIntoLevel / Math.max(1, economy.xpForNextLevel)) * 100)}%`;

    this.query('#train-name').textContent = train.name;
    this.query('#speed-val').textContent = `${train.speedMph} mph`;
    this.query('#speed-bar').style.width = `${Math.min(100, (train.speedMph / 60) * 100)}%`;
    this.query('#logs-val').textContent = `${Math.round(train.logs)} / ${train.logsMax}`;
    this.query('#logs-bar').style.width = `${(train.logs / train.logsMax) * 100}%`;
    this.query('#cond-val').textContent = `${Math.round(train.condition)}%`;
    this.query('#cond-bar').style.width = `${train.condition}%`;
    this.query('#cargo-val').textContent = `${Math.round(train.cargo)} / ${train.cargoCapacity}`;
    this.query('#cargo-bar').style.width =
      `${(train.cargo / Math.max(1, train.cargoCapacity)) * 100}%`;
    this.query('#wagons-val').textContent = String(train.wagons);
    this.query('#route').textContent = `🛤️ ${train.route}`;
    this.query('#status').textContent = `● ${train.status}`;
    this.query('#btn-wagon').innerHTML = `+ Vagão<br>🪙 ${train.wagonCost.toLocaleString('pt-BR')}`;
    this.query('#btn-repair').innerHTML = `Reparar<br>🪙 ${train.repairCost}`;

    this.query('#obj-title').textContent = state.objective.title;
    this.query('#obj-detail').textContent = state.objective.detail;
    this.query('#obj-bar').style.width = `${Math.min(100, state.objective.progress * 100)}%`;
    this.query('#obj-reward').textContent = `🪙 ${state.objective.reward}`;
    this.query('#btn-follow').textContent = state.following ? '📷 Soltar câmera' : '📷 Seguir trem';
    this.query('#track-count').textContent = `${state.trackPieces} peças`;

    const badge = this.query('#contract-badge');
    badge.textContent = String(state.contracts.accepted.length);
    badge.style.display = state.contracts.accepted.length > 0 ? 'flex' : 'none';

    if (this.openPanel) this.renderPanel(state);
  }

  private renderPanel(state: HudState): void {
    const title = this.query('#panel-title');
    const body = this.query('#panel-body');
    switch (this.openPanel) {
      case 'contracts': {
        title.textContent = 'Contratos';
        const active = state.contracts.accepted.map((c) => `
          <div class="contract active">
            <div class="head"><span>${c.resourceIcon} ${c.resource} → ${c.townName}</span>
              <span class="timer">${formatTime(c.timeLeft)}</span></div>
            <div class="bar"><div style="width:${(c.delivered / c.amount) * 100}%"></div></div>
            <div class="foot"><span>${Math.floor(c.delivered)} / ${c.amount}</span>
              <span>🪙 ${c.reward.toLocaleString('pt-BR')}</span></div>
          </div>`).join('');
        const offers = state.contracts.offers.map((c) => `
          <div class="contract">
            <div class="head"><span>${c.resourceIcon} ${c.amount} de ${c.resource} → ${c.townName}</span></div>
            <div class="foot"><span>⏱️ ${formatTime(c.timeLeft)} · ⭐ ${c.score}</span>
              <button class="accept clickable" data-contract="${c.id}">Aceitar 🪙 ${c.reward.toLocaleString('pt-BR')}</button></div>
          </div>`).join('');
        body.innerHTML = `
          ${active ? `<h4>Em andamento</h4>${active}` : ''}
          <h4>Disponíveis</h4>
          ${offers || '<p class="empty">Conecte a linha a uma cidade para receber contratos.</p>'}`;
        body.querySelectorAll<HTMLElement>('[data-contract]').forEach((el) => {
          el.addEventListener('click', () => this.callbacks.onAcceptContract(el.dataset.contract ?? ''));
        });
        break;
      }
      case 'network': {
        title.textContent = 'Rede';
        const rows = TOWNS.map((t) => {
          const linked = state.connectedTowns.includes(t.id);
          return `<div class="row-town">
            <span>${linked ? '🟢' : '⚪'} <b>${t.name}</b> — exporta ${t.resourceIcon} ${t.resource}</span>
            <span>${linked ? 'conectada' : t.acrossRiver ? 'exige ponte sobre o rio' : 'sem linha'}</span>
          </div>`;
        }).join('');
        body.innerHTML = `${rows}
          <p class="empty">A linha tem ${state.trackPieces} peças. Estenda-a até uma cidade
          (raio de 26 m) para conectá-la e liberar contratos.</p>`;
        break;
      }
      case 'trains': {
        title.textContent = 'Trens';
        body.innerHTML = `
          <div class="row-town"><span><b>${state.train.name}</b></span><span>${state.train.status}</span></div>
          <div class="row-town"><span>Vagões</span><span>${state.train.wagons} (capacidade ${state.train.cargoCapacity})</span></div>
          <div class="row-town"><span>Lenha</span><span>${Math.round(state.train.logs)} / ${state.train.logsMax}</span></div>
          <div class="row-town"><span>Condição</span><span>${Math.round(state.train.condition)}%</span></div>
          <p class="empty">O trem reabastece sozinho ao parar numa cidade e carrega o que
          houver para entregar. Sem lenha ele segue a 40% da velocidade.</p>`;
        break;
      }
      case 'shop': {
        title.textContent = 'Loja';
        body.innerHTML = `
          <div class="row-town"><span>🚃 <b>Vagão extra</b> — +14 de capacidade</span>
            <span>🪙 ${state.train.wagonCost.toLocaleString('pt-BR')}</span></div>
          <div class="row-town"><span>🔧 <b>Reparo completo</b> — condição a 100%</span>
            <span>🪙 ${state.train.repairCost}</span></div>
          <p class="empty">Compras rápidas ficam no painel do trem, à direita.
          Construções e trilhos saem do painel Construir, à esquerda.</p>`;
        break;
      }
      case null:
        break;
    }
  }

  setBuildHint(html: string): void {
    this.hintEl.innerHTML = html;
  }

  toast(message: string): void {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    this.toastsEl.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; }, 2400);
    setTimeout(() => el.remove(), 2900);
  }
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const TEMPLATE = `
  <div id="title-chip"><span class="logo">🚂</span>Canyon Rails</div>

  <div id="stats">
    <div class="stat card"><span class="icon">🪙</span>
      <span><div class="label">Moedas</div><div class="value" id="coins">0</div></span></div>
    <div class="stat card"><span class="icon">⭐</span>
      <span><div class="label">Pontos</div><div class="value" id="score">0</div></span></div>
    <div class="stat card"><span class="level-badge" id="level-badge">1</span>
      <span><div class="label" id="level-label">Nível 1</div>
        <div class="bar"><div id="level-bar" style="width:0%"></div>
          <span class="bar-text" id="level-text"></span></div></span></div>
  </div>

  <div id="sysbtns">
    <button class="sysbtn clickable" id="btn-theme">☀️</button>
    <button class="sysbtn clickable" id="btn-help">❓</button>
    <button class="sysbtn clickable" id="btn-save">💾</button>
    <button class="sysbtn clickable" id="btn-menu">☰</button>
  </div>

  <div id="objective" class="card">
    <div class="tab">📋 Objetivo</div>
    <div class="body"><span class="icon">🛤️</span>
      <span><b id="obj-title">Construa a linha</b><br><span id="obj-detail"></span></span></div>
    <div class="progress"><div id="obj-bar"></div></div>
    <div class="footer"><span id="track-count">0 peças</span><span id="obj-reward">🪙 0</span></div>
  </div>

  <div id="build" class="card">
    <div class="header">Construir</div>
    <div class="grid"></div>
    <div class="hint">Escolha uma peça de trilho e clique no terreno para assentá-la na ponta brilhante da linha.</div>
    <button id="btn-undo" class="wide-btn clickable">↩️ Desfazer última peça</button>
  </div>

  <div id="train-panel" class="card">
    <div class="header" id="train-name">Workhorse 1915</div>
    <div class="portrait">🚂🚃🚃🚃</div>
    <div class="row"><span class="name">⏱️ Vel.</span>
      <span class="bar"><div id="speed-bar" style="background:linear-gradient(#5a9df0,#2f66c4)"></div></span>
      <span class="val" id="speed-val">0 mph</span></div>
    <div class="row"><span class="name">🪵 Lenha</span>
      <span class="bar"><div id="logs-bar" style="background:linear-gradient(#e8bb56,#cf9a2f)"></div></span>
      <span class="val" id="logs-val">0</span></div>
    <div class="row"><span class="name">🔧 Estado</span>
      <span class="bar"><div id="cond-bar" style="background:linear-gradient(#79c96f,#52a848)"></div></span>
      <span class="val" id="cond-val">0%</span></div>
    <div class="row"><span class="name">📦 Carga</span>
      <span class="bar"><div id="cargo-bar" style="background:linear-gradient(#c79a6a,#9a6f45)"></div></span>
      <span class="val" id="cargo-val">0</span></div>
    <div class="row"><span class="name">🚃 Vagões</span><span class="bar" style="visibility:hidden"></span>
      <span class="val" id="wagons-val">4</span></div>
    <div class="route" id="route">🛤️ —</div>
    <div class="status" id="status">● —</div>
    <div class="actions">
      <button class="wagon clickable" id="btn-wagon">+ Vagão</button>
      <button class="repair clickable" id="btn-repair">Reparar</button>
    </div>
  </div>

  <div id="panel" class="card">
    <div class="panel-head"><b id="panel-title">Painel</b>
      <button id="panel-close" class="clickable">✕</button></div>
    <div id="panel-body"></div>
  </div>

  <div id="nav">
    <button class="navbtn trains clickable" id="nav-trains"><span class="icon">🚆</span>Trens</button>
    <button class="navbtn network clickable" id="nav-network"><span class="icon">🌉</span>Rede</button>
    <button class="navbtn contracts clickable" id="nav-contracts"><span class="icon">📋</span>Contratos
      <span class="badge" id="contract-badge">0</span></button>
    <button class="navbtn shop clickable" id="nav-shop"><span class="icon">🛒</span>Loja</button>
  </div>

  <button id="btn-follow" class="card clickable">📷 Seguir trem</button>
  <div id="hint">WASD move · arrastar move · botão direito gira · roda aproxima · clique assenta · Espaço repete · Z desfaz · Esc cancela</div>

  <div id="minimap" class="card"><canvas></canvas></div>
  <div id="toasts"></div>
`;
