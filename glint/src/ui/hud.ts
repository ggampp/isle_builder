import './styles.css';
import { xpToNext } from '../sim/stats.ts';
import type { Hero } from '../sim/hero.ts';

export interface HudHandlers {
  onMute: () => void;
  onReset: () => void;
  onAttack: () => void;
  onStick: (x: number, z: number) => void;
}

export class Hud {
  readonly canvas: HTMLCanvasElement;
  private root: HTMLElement;
  private levelEl: HTMLElement;
  private hpFill: HTMLElement;
  private mpFill: HTMLElement;
  private xpFill: HTMLElement;
  private hpText: HTMLElement;
  private mpText: HTMLElement;
  private banner: HTMLElement;
  private overlay: HTMLElement;
  private overlayText: HTMLElement;
  private floatLayer: HTMLElement;
  private hint: HTMLElement;
  private muted = false;

  constructor(parent: HTMLElement, handlers: HudHandlers) {
    parent.innerHTML = TEMPLATE;
    this.root = parent;
    this.canvas = this.q('#view') as HTMLCanvasElement;
    this.levelEl = this.q('#level');
    this.hpFill = this.q('#hp-fill');
    this.mpFill = this.q('#mp-fill');
    this.xpFill = this.q('#xp-fill');
    this.hpText = this.q('#hp-text');
    this.mpText = this.q('#mp-text');
    this.banner = this.q('#banner');
    this.overlay = this.q('#overlay');
    this.overlayText = this.q('#overlay-text');
    this.floatLayer = this.q('#floaters');
    this.hint = this.q('#hint');

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
    this.q('#cast').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handlers.onAttack();
    });

    this.bindStick(this.q('#stick'), handlers);
  }

  sync(hero: Hero, killed: number, golemDown: boolean): void {
    this.levelEl.textContent = `Lv.${hero.level}`;
    this.hpFill.style.width = `${(hero.hp / Math.max(1, hero.maxHp)) * 100}%`;
    this.mpFill.style.width = `${(hero.mp / Math.max(1, hero.maxMp)) * 100}%`;
    const need = xpToNext(hero.level);
    this.xpFill.style.width = `${(hero.xp / Math.max(1, need)) * 100}%`;
    this.hpText.textContent = `${hero.hp}/${hero.maxHp}`;
    this.mpText.textContent = `${hero.mp}/${hero.maxMp}`;
    this.hint.textContent = golemDown
      ? `O golém caiu · ${killed} abatidos · cristais restauram HP/MP`
      : `Slimes e o golém do menir · ${killed} abatidos`;
  }

  flashLevelUp(): void {
    this.banner.hidden = false;
    this.banner.classList.remove('pop');
    void this.banner.offsetWidth;
    this.banner.classList.add('pop');
    window.setTimeout(() => { this.banner.hidden = true; }, 1800);
  }

  setDead(dead: boolean): void {
    this.overlay.hidden = !dead;
    this.overlayText.textContent = dead ? 'Você caiu. R para recomeçar.' : '';
  }

  floater(text: string, kind: 'dmg' | 'heal' | 'xp', sx: number, sy: number): void {
    const el = document.createElement('div');
    el.className = `floater ${kind}`;
    el.textContent = text;
    el.style.left = `${sx}px`;
    el.style.top = `${sy}px`;
    this.floatLayer.appendChild(el);
    window.setTimeout(() => el.remove(), 900);
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

const TEMPLATE = `
<canvas id="view"></canvas>
<div class="vignette" aria-hidden="true"></div>
<div class="meters">
  <div id="level">Lv.1</div>
  <div class="row">
    <span class="lab">HP</span>
    <div class="bar hp"><i id="hp-fill"></i></div>
    <span id="hp-text">10/10</span>
  </div>
  <div class="row">
    <span class="lab">MP</span>
    <div class="bar mp"><i id="mp-fill"></i></div>
    <span id="mp-text">10/10</span>
  </div>
  <div class="xp"><i id="xp-fill"></i></div>
</div>
<div id="hint" class="hint">WASD para andar · espaço ou clique para magia</div>
<div id="banner" class="banner" hidden>Level Up !</div>
<div id="floaters"></div>
<div class="tools">
  <button type="button" id="btn-help">Ajuda</button>
  <button type="button" id="btn-mute">Som</button>
  <button type="button" id="btn-reset">Reinicia</button>
</div>
<div id="stick" class="stick" aria-label="mover"><span class="knob"></span></div>
<button type="button" id="cast" class="cast">✦</button>
<div id="overlay" class="overlay" hidden>
  <p id="overlay-text"></p>
</div>
<div id="help" class="help" hidden>
  <div class="card">
    <h2>Glint</h2>
    <p>Um vale de brinquedo. Gaste <b>MP</b> num círculo mágico; sem mana, o cutelo ainda funciona. Subir de nível deixa a magia mais forte — slimes que pediam dois golpes passam a cair num.</p>
    <ul>
      <li><b>WASD / setas / stick</b> — andar</li>
      <li><b>Espaço, clique ou ✦</b> — magia</li>
      <li><b>Cristais azuis</b> — +10 HP e MP cheio</li>
      <li><b>R</b> — recomeçar</li>
    </ul>
    <button type="button" id="help-close">Fechar</button>
  </div>
</div>
`;
