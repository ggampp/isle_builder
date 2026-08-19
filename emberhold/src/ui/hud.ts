import './styles.css';
import { COSTS, xpToNext } from '../sim/config.ts';
import { population } from '../sim/world.ts';
import type { BuildKind, World } from '../sim/types.ts';
import type { SpriteBank } from '../render/sprites.ts';

export interface HudHandlers {
  onMute: () => void;
  onReset: () => void;
  onAttack: () => void;
  onMagic: () => void;
  onBuild: (kind: BuildKind | null) => void;
  onStick: (x: number, y: number) => void;
  onFlipPet: () => void;
}

export class Hud {
  readonly canvas: HTMLCanvasElement;
  private root: HTMLElement;
  private muted = false;
  private sprites: SpriteBank;
  petFlipped = false;

  constructor(parent: HTMLElement, handlers: HudHandlers, sprites: SpriteBank) {
    parent.innerHTML = TEMPLATE;
    this.root = parent;
    this.sprites = sprites;
    this.canvas = this.q('#view') as HTMLCanvasElement;

    this.q('#btn-mute').addEventListener('click', (e) => {
      e.stopPropagation();
      this.muted = !this.muted;
      this.q('#btn-mute').textContent = this.muted ? 'Som off' : 'Som';
      handlers.onMute();
    });
    this.q('#btn-reset').addEventListener('click', (e) => {
      e.stopPropagation();
      handlers.onReset();
    });
    this.q('#btn-help').addEventListener('click', (e) => {
      e.stopPropagation();
      this.q('#help').hidden = false;
    });
    this.q('#help-close').addEventListener('click', () => { this.q('#help').hidden = true; });
    this.q('#help').addEventListener('click', (e) => {
      if (e.target === this.q('#help')) this.q('#help').hidden = true;
    });
    this.q('#skill-mine').addEventListener('click', (e) => { e.stopPropagation(); handlers.onAttack(); });
    this.q('#skill-magic').addEventListener('click', (e) => { e.stopPropagation(); handlers.onMagic(); });
    this.q('#cast').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handlers.onAttack();
    });
    this.q('#flip-pet').addEventListener('click', (e) => {
      e.stopPropagation();
      this.petFlipped = !this.petFlipped;
      this.q('#pet-card').classList.toggle('flipped', this.petFlipped);
      handlers.onFlipPet();
    });
    for (const kind of ['wall', 'tower', 'house', 'fortress'] as BuildKind[]) {
      this.q(`#build-${kind}`).addEventListener('click', (e) => {
        e.stopPropagation();
        handlers.onBuild(kind);
      });
    }
    this.bindStick(this.q('#stick'), handlers);

    const petCanvas = this.q('#pet-art') as HTMLCanvasElement;
    const pctx = petCanvas.getContext('2d');
    if (pctx) {
      const frame = sprites.unit('pet', 'se', 'idle', 0);
      petCanvas.width = frame.width;
      petCanvas.height = frame.height;
      pctx.imageSmoothingEnabled = false;
      pctx.drawImage(frame, 0, 0);
    }
  }

  sync(world: World, selected: BuildKind | null): void {
    this.q('#wood').textContent = String(world.stock.wood);
    this.q('#stone').textContent = String(world.stock.stone);
    this.q('#gold').textContent = String(world.stock.gold);
    this.q('#food').textContent = String(world.stock.food);
    this.q('#pop').textContent = `${population(world)}/${world.popCap}`;
    this.q('#wave').textContent = world.wave === 0
      ? `onda em ${Math.max(0, Math.ceil(world.waveIn))}s`
      : `onda ${world.wave} · ${Math.max(0, Math.ceil(world.waveIn))}s`;
    this.q('#clock').textContent = clock(world.time);

    const hpRatio = world.hero.hp / Math.max(1, world.hero.maxHp);
    const mpRatio = world.hero.mp / Math.max(1, world.hero.maxMp);
    this.q('#hp-fill').style.height = `${hpRatio * 100}%`;
    this.q('#mp-fill').style.height = `${mpRatio * 100}%`;
    this.q('#hp-text').textContent = `${Math.ceil(world.hero.hp)}/${world.hero.maxHp}`;
    this.q('#mp-text').textContent = `${Math.ceil(world.hero.mp)}/${world.hero.maxMp}`;
    const need = xpToNext(world.hero.level);
    this.q('#xp-fill').style.width = `${(world.hero.xp / Math.max(1, need)) * 100}%`;
    this.q('#xp-label').textContent = `Lv ${world.hero.level} — ${world.hero.xp} / ${need} XP`;

    this.q('#log').innerHTML = world.logs.map((l) => `<div>${escapeHtml(l)}</div>`).join('');
    this.q('#hint').textContent = world.selected
      ? `Construir ${label(world.selected)} · ${COSTS[world.selected].wood} madeira · ${COSTS[world.selected].stone} pedra`
      : isUnder(world)
        ? 'A base está sob ataque — trabalhadores reparam, patrulha defende'
        : 'Clique para andar · espaço pica · F magia · direito repara · 1–4 constrói';

    this.q('#pet-hp').textContent = `${Math.ceil(world.pet.hp)}/${world.pet.maxHp}`;
    const petCanvas = this.q('#pet-art') as HTMLCanvasElement;
    const pctx = petCanvas.getContext('2d');
    if (pctx) {
      const frame = this.sprites.unit('pet', world.pet.facing, world.pet.anim, world.pet.animT);
      pctx.clearRect(0, 0, petCanvas.width, petCanvas.height);
      pctx.drawImage(frame, 0, 0);
    }
    this.q('#skill-magic').toggleAttribute('disabled', world.hero.mp < 6);

    for (const kind of ['wall', 'tower', 'house', 'fortress'] as BuildKind[]) {
      this.q(`#build-${kind}`).classList.toggle('active', selected === kind);
    }

    this.q('#overlay').hidden = world.hero.hp > 0 && !world.won;
    this.q('#overlay-text').textContent = world.won
      ? 'O keep aguentou seis ondas. R para um novo mapa.'
      : world.hero.hp <= 0
        ? 'Você caiu. R para recomeçar.'
        : '';
  }

  flashLevelUp(): void {
    const banner = this.q('#banner');
    banner.hidden = false;
    banner.classList.remove('pop');
    void banner.offsetWidth;
    banner.classList.add('pop');
    window.setTimeout(() => { banner.hidden = true; }, 1800);
  }

  private q(sel: string): HTMLElement {
    const el = this.root.querySelector(sel);
    if (!(el instanceof HTMLElement)) throw new Error(sel);
    return el;
  }

  private bindStick(root: HTMLElement, handlers: HudHandlers): void {
    let pid: number | null = null;
    const origin = { x: 0, y: 0 };
    const knob = root.querySelector('.knob');
    if (!(knob instanceof HTMLElement)) return;
    const set = (x: number, y: number): void => {
      const dx = x - origin.x;
      const dy = y - origin.y;
      const len = Math.hypot(dx, dy);
      const max = 38;
      const nx = len > max ? (dx / len) * max : dx;
      const ny = len > max ? (dy / len) * max : dy;
      knob.style.transform = `translate(${nx}px, ${ny}px)`;
      handlers.onStick(nx / max, ny / max);
    };
    root.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      pid = e.pointerId;
      root.setPointerCapture(pid);
      const r = root.getBoundingClientRect();
      origin.x = r.left + r.width / 2;
      origin.y = r.top + r.height / 2;
      set(e.clientX, e.clientY);
    });
    root.addEventListener('pointermove', (e) => {
      if (pid !== e.pointerId) return;
      set(e.clientX, e.clientY);
    });
    const end = (e: PointerEvent): void => {
      if (pid !== e.pointerId) return;
      pid = null;
      knob.style.transform = 'translate(0,0)';
      handlers.onStick(0, 0);
    };
    root.addEventListener('pointerup', end);
    root.addEventListener('pointercancel', end);
  }
}

function clock(t: number): string {
  const total = Math.max(0, Math.floor(t));
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = 16 + Math.floor(total / 3600);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function label(kind: BuildKind): string {
  if (kind === 'wall') return 'parede';
  if (kind === 'tower') return 'torre';
  if (kind === 'house') return 'casa';
  return 'fortaleza';
}

function isUnder(world: World): boolean {
  return world.time < world.underAttackUntil;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] ?? ch));
}

const TEMPLATE = `
<canvas id="view"></canvas>
<div class="vignette" aria-hidden="true"></div>
<div class="topbar">
  <span class="res">🪵 <b id="wood">0</b></span>
  <span class="res">🪨 <b id="stone">0</b></span>
  <span class="res">🪙 <b id="gold">0</b></span>
  <span class="res">🍖 <b id="food">0</b></span>
  <span class="res">👥 <b id="pop">0/0</b></span>
  <span id="clock">16:00:00</span>
  <span class="wave" id="wave">onda</span>
</div>
<div id="hint" class="hint"></div>
<div class="tools">
  <button type="button" id="btn-help">Ajuda</button>
  <button type="button" id="btn-mute">Som</button>
  <button type="button" id="btn-reset">Reinicia</button>
</div>
<div class="pet-card" id="pet-card">
  <div class="pet-inner">
    <div class="pet-face front">
      <button type="button" class="flip-btn" id="flip-pet" title="Virar cartão">↻</button>
      <h3>Brasa</h3>
      <div class="pet-art"><canvas id="pet-art"></canvas></div>
      <p>Raposa de brasas. Segue o warden e morde o que chegar perto.</p>
      <p>HP <b id="pet-hp">0/0</b></p>
    </div>
    <div class="pet-face back">
      <h3>Detalhes</h3>
      <p>Espécie: raposa-ember</p>
      <p>Bônus: +6 dano de mordida</p>
      <p>Hábito: escolta · ataca em 3.4 tiles</p>
      <p>Notas: o verso do cartão ainda é rascunho — como no patch.</p>
    </div>
  </div>
</div>
<div id="log" class="log"></div>
<div class="build-dock">
  <button type="button" id="build-wall" title="Parede (1)">🪵</button>
  <button type="button" id="build-tower" title="Torre (2)">🗼</button>
  <button type="button" id="build-house" title="Casa (3)">🏠</button>
  <button type="button" id="build-fortress" title="Fortaleza (4)">🏰</button>
</div>
<div class="dock">
  <div class="globe hp"><i id="hp-fill"></i><span id="hp-text">80/80</span></div>
  <div class="hotbar">
    <div class="skills">
      <button type="button" id="skill-mine" title="Picareta">⛏️</button>
      <button type="button" id="skill-magic" title="Magia (F)">✨</button>
      <button type="button" title="Reparar (direito)">🔨</button>
      <button type="button" title="Patrulha">🛡️</button>
    </div>
    <div class="xp"><i id="xp-fill"></i></div>
    <div class="xp-label" id="xp-label">Lv 1</div>
  </div>
  <div class="globe mp"><i id="mp-fill"></i><span id="mp-text">40/40</span></div>
</div>
<div id="stick" class="stick" aria-label="mover"><span class="knob"></span></div>
<button type="button" id="cast" class="cast">⛏️</button>
<div id="banner" class="banner" hidden>Level Up !</div>
<div id="overlay" class="overlay" hidden>
  <p id="overlay-text"></p>
</div>
<div id="help" class="help" hidden>
  <div class="card">
    <h2>Emberhold</h2>
    <p>Um keep isométrico. Minere, ergue paredes e torres, treine trabalhadores. Se um prédio cai abaixo de <b>50% de vida</b>, eles largam o machado e reparam — mesmo sob ataque. A patrulha deixa a ronda e defende quando a cidade queima.</p>
    <ul>
      <li><b>WASD / clique no chão</b> — andar</li>
      <li><b>Espaço / clique próximo</b> — picar ou golpear</li>
      <li><b>F</b> — magia de âmbar</li>
      <li><b>Direito numa estrutura</b> — reparar</li>
      <li><b>1–4</b> — parede, torre, casa, fortaleza</li>
      <li><b>Roda</b> — zoom · <b>R</b> — recomeçar</li>
    </ul>
    <button type="button" id="help-close">Fechar</button>
  </div>
</div>
`;
