import { Minimap } from './minimap.ts';
import './styles.css';

interface BuildItem {
  icon: string;
  name: string;
  price: number;
}

const BUILD_ITEMS: BuildItem[] = [
  { icon: '📍', name: 'Marcador de estação', price: 0 },
  { icon: '🛤️', name: 'Trilho reto — 15 m', price: 50 },
  { icon: '↩️', name: 'Curva suave', price: 65 },
  { icon: '↪️', name: 'Curva fechada', price: 80 },
  { icon: '🗼', name: 'Torre d’água', price: 300 },
  { icon: '🏠', name: 'Casa', price: 180 },
  { icon: '🏚️', name: 'Casinha', price: 120 },
  { icon: '🏡', name: 'Casa grande', price: 450 },
  { icon: '🛖', name: 'Cabana de madeira', price: 220 },
  { icon: '🌀', name: 'Moinho de vento', price: 380 },
  { icon: '🪑', name: 'Banco de praça', price: 90 },
  { icon: '💡', name: 'Poste de luz', price: 60 },
];

/** Shell da HUD no padrão visual do vídeo. Números são placeholders da S01. */
export class Hud {
  readonly minimap: Minimap;
  private speedEl: HTMLElement;
  private hintEl: HTMLElement;
  private toastsEl: HTMLElement;

  constructor(parent: HTMLElement) {
    const hud = document.createElement('div');
    hud.id = 'hud';
    hud.innerHTML = `
      <div id="title-chip"><span class="logo">🚂</span>Canyon Rails</div>

      <div id="stats">
        <div class="stat card"><span class="icon">🪙</span>
          <span><div class="label">Moedas</div><div class="value">5.960</div></span></div>
        <div class="stat card"><span class="icon">⭐</span>
          <span><div class="label">Pontos</div><div class="value">1.250</div></span></div>
        <div class="stat card"><span class="level-badge">1</span>
          <span><div class="label">Nível 1</div><div class="bar"><div style="width:35%"></div></div></span></div>
      </div>

      <div id="sysbtns">
        <button class="sysbtn clickable" data-soon="Tema">☀️</button>
        <button class="sysbtn clickable" data-soon="Ajuda">❓</button>
        <button class="sysbtn clickable" data-soon="Salvar">💾</button>
        <button class="sysbtn clickable" data-soon="Menu">☰</button>
      </div>

      <div id="objective" class="card">
        <div class="tab">📋 Objetivo</div>
        <div class="body"><span class="icon">🛤️</span>
          <span>Escolha uma peça de trilho e clique na ponta brilhante da linha
          para estendê-la.</span></div>
        <div class="progress"><div></div></div>
        <div class="footer"><span>Fatia vertical — S01</span><span>🪙 400</span></div>
      </div>

      <div id="build" class="card">
        <div class="header">Construir</div>
        <div class="grid"></div>
        <div class="hint">Passe o mouse sobre um item. Construção chega na Sprint 02–04.</div>
      </div>

      <div id="train-panel" class="card">
        <div class="header">Workhorse 1915</div>
        <div class="portrait">🚂🚃🚃</div>
        <div class="row"><span class="name">⏱️ Vel.</span>
          <span class="bar"><div id="speed-bar" style="width:30%;background:linear-gradient(#5a9df0,#2f66c4)"></div></span>
          <span class="val" id="speed-val">0 mph</span></div>
        <div class="row"><span class="name">🪵 Lenha</span>
          <span class="bar"><div style="width:100%;background:linear-gradient(#e8bb56,#cf9a2f)"></div></span>
          <span class="val">56 / 56</span></div>
        <div class="row"><span class="name">🔧 Estado</span>
          <span class="bar"><div style="width:95%;background:linear-gradient(#79c96f,#52a848)"></div></span>
          <span class="val">95%</span></div>
        <div class="row"><span class="name">🚃 Vagões</span><span class="bar" style="visibility:hidden"></span>
          <span class="val">4</span></div>
        <div class="route">🛤️ Circuito da Mesa</div>
        <div class="status">● Circulando pelo desfiladeiro</div>
        <div class="actions">
          <button class="wagon clickable" data-soon="+ Vagão">+ Vagão<br>🪙 1.250</button>
          <button class="repair clickable" data-soon="Reparar">Reparar<br>🪙 98</button>
        </div>
      </div>

      <div id="nav">
        <button class="navbtn trains clickable" data-soon="Trens"><span class="icon">🚆</span>Trens</button>
        <button class="navbtn network clickable" data-soon="Rede"><span class="icon">🌉</span>Rede</button>
        <button class="navbtn contracts clickable" data-soon="Contratos"><span class="icon">📋</span>Contratos</button>
        <button class="navbtn shop clickable" data-soon="Loja"><span class="icon">🛒</span>Loja</button>
      </div>

      <div id="overview" class="card clickable" data-soon="Visão geral">📷 Visão geral</div>
      <div id="hint">WASD move · arrastar move · botão direito gira · roda aproxima</div>

      <div id="minimap" class="card"><canvas></canvas></div>
      <div id="toasts"></div>
    `;
    parent.appendChild(hud);

    const grid = hud.querySelector('#build .grid') as HTMLElement;
    const buildHint = hud.querySelector('#build .hint') as HTMLElement;
    for (const item of BUILD_ITEMS) {
      const el = document.createElement('button');
      el.className = 'build-item clickable';
      el.innerHTML = `${item.icon}${item.price > 0 ? `<span class="price">${item.price}</span>` : ''}`;
      el.addEventListener('mouseenter', () => {
        buildHint.textContent = `${item.name}${item.price > 0 ? ` — ${item.price} moedas` : ''}`;
      });
      el.addEventListener('click', () => this.toast(`${item.name}: construção chega na Sprint 02–04`));
      grid.appendChild(el);
    }

    hud.querySelectorAll<HTMLElement>('[data-soon]').forEach((el) => {
      el.addEventListener('click', () => this.toast(`${el.dataset.soon}: em breve (sprints seguintes)`));
    });

    this.speedEl = hud.querySelector('#speed-val') as HTMLElement;
    this.hintEl = hud.querySelector('#build .hint') as HTMLElement;
    this.toastsEl = hud.querySelector('#toasts') as HTMLElement;
    void this.hintEl;
    this.minimap = new Minimap(hud.querySelector('#minimap canvas') as HTMLCanvasElement);
  }

  setSpeed(mph: number): void {
    this.speedEl.textContent = `${mph} mph`;
    const bar = document.getElementById('speed-bar');
    if (bar) bar.style.width = `${Math.min(100, (mph / 60) * 100)}%`;
  }

  toast(message: string): void {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    this.toastsEl.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; }, 2200);
    setTimeout(() => el.remove(), 2700);
  }
}
