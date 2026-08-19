import { GameAudio } from '../audio/audio.ts';
import { Input } from '../core/input.ts';
import { GameLoop } from '../core/loop.ts';
import { WorldView, type Camera } from '../render/worldview.ts';
import { MAP_H, MAP_W } from '../sim/config.ts';
import { buildingAt, footprintClear } from '../sim/map.ts';
import type { World } from '../sim/types.ts';
import { FOOTPRINT } from '../sim/config.ts';
import {
  createWorld,
  heroAttack,
  heroMagic,
  orderRepair,
  tick,
  tryPlace,
} from '../sim/world.ts';
import { Hud } from '../ui/hud.ts';

export class Game {
  private world: World;
  private view: WorldView;
  private hud: Hud;
  private input: Input;
  private audio = new GameAudio();
  private loop: GameLoop;
  private cam: Camera = { x: 0, y: 0, zoom: 1.05 };
  private lastTower = 0;

  constructor(root: HTMLElement) {
    this.world = createWorld();
    this.cam.x = this.world.hero.x;
    this.cam.y = this.world.hero.y;
    this.view = new WorldView();
    this.hud = new Hud(root, {
      onMute: () => this.audio.setMuted(!this.audio.muted),
      onReset: () => this.reset(),
      onAttack: () => { this.audio.unlock(); this.swing(); },
      onMagic: () => { this.audio.unlock(); this.cast(); },
      onBuild: (kind) => {
        this.world.selected = this.world.selected === kind ? null : kind;
      },
      onStick: (x, y) => {
        this.input.stickX = x;
        this.input.stickY = y;
      },
      onFlipPet: () => undefined,
    }, this.view.sprites);
    this.input = new Input(this.hud.canvas);
    this.fit();
    window.addEventListener('resize', () => this.fit());
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyR') this.reset();
    });
    this.hud.canvas.addEventListener('pointerdown', () => this.audio.unlock());
    this.loop = new GameLoop((dt) => this.frame(dt));
    this.loop.start();
  }

  private fit(): void {
    const canvas = this.hud.canvas;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
  }

  private reset(): void {
    this.world = createWorld();
    this.cam.x = this.world.hero.x;
    this.cam.y = this.world.hero.y;
  }

  private swing(): void {
    const did = heroAttack(this.world);
    if (did === 'mine' || did === 'melee') this.audio.pickaxe();
  }

  private cast(): void {
    if (heroMagic(this.world)) this.audio.magic();
  }

  private frame(dt: number): void {
    const canvas = this.hud.canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pick = this.input.consumeBuild();
    if (pick) this.world.selected = this.world.selected === pick ? null : pick;
    this.input.consumeZoom(this.cam);

    const axis = this.input.axis();
    const under = this.input.worldUnder(this.cam, canvas);
    const gx = Math.floor(under.x);
    const gy = Math.floor(under.y);
    let clickMove: { x: number; y: number } | null = null;

    if (this.input.consumeRepair()) {
      if (orderRepair(this.world, gx, gy)) this.audio.repair();
    } else if (this.input.consumeAttack()) {
      if (this.world.selected) {
        const kind = this.world.selected;
        const foot = FOOTPRINT[kind];
        if (footprintClear(this.world, gx, gy, foot.w, foot.h)) {
          const placed = tryPlace(this.world, kind, gx, gy);
          if (placed) this.audio.repair();
        }
      } else {
        const b = buildingAt(this.world, gx, gy);
        const close = Math.hypot(under.x - this.world.hero.x, under.y - this.world.hero.y) < 1.4;
        if (close) this.swing();
        else if (!b) clickMove = { x: under.x, y: under.y };
      }
    }
    if (this.input.consumeMagic()) this.cast();

    const events = tick(this.world, dt, { moveX: axis.x, moveY: axis.y, clickMove });
    if (events.leveled) {
      this.audio.levelUp();
      this.hud.flashLevelUp();
    }
    if (events.wave) this.audio.wave();
    if (events.died) this.audio.death();
    if (this.world.projectiles.length > this.lastTower) this.audio.tower();
    this.lastTower = this.world.projectiles.length;

    this.cam.x += (this.world.hero.x - this.cam.x) * Math.min(1, dt * 6);
    this.cam.y += (this.world.hero.y - this.cam.y) * Math.min(1, dt * 6);
    this.cam.x = Math.max(4, Math.min(MAP_W - 4, this.cam.x));
    this.cam.y = Math.max(4, Math.min(MAP_H - 4, this.cam.y));

    this.view.render(ctx, this.world, this.cam, this.world.selected ? { gx, gy } : null);
    this.hud.sync(this.world, this.world.selected);
  }
}
