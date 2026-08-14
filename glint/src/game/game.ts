import * as THREE from 'three';
import { GameAudio } from '../audio/audio.ts';
import { Input } from '../core/input.ts';
import { GameLoop } from '../core/loop.ts';
import { grantXp, hitHero, inRadius, restoreAtCrystal, tryAttack } from '../sim/combat.ts';
import { createEnemies, hurtEnemy, tickEnemy, touching } from '../sim/enemies.ts';
import type { Enemy } from '../sim/enemies.ts';
import { createHero, tickHero } from '../sim/hero.ts';
import type { Hero } from '../sim/hero.ts';
import {
  CONTACT_COOLDOWN,
  PLAYER_SPEED,
  enemyTouch,
  enemyXp,
} from '../sim/stats.ts';
import {
  CRYSTALS,
  PLAYER_START,
  enemySpawns,
  moveOnTerrain,
  surfaceY,
} from '../sim/world.ts';
import { bobCrystals, placeLandmarks } from '../render/landmarks.ts';
import { createLighting, createRenderer, resizeRenderer } from '../render/scene.ts';
import {
  createGolemModel,
  createHeroModel,
  createSlimeModel,
  type CharacterView,
} from '../render/characters.ts';
import { buildTerrain } from '../render/terrain.ts';
import { Vfx } from '../render/vfx.ts';
import { createWater } from '../render/water.ts';
import { Hud } from '../ui/hud.ts';

const CAM_OFF = new THREE.Vector3(0, 12.2, 10.4);
const look = new THREE.Vector3();
const camWant = new THREE.Vector3();
const proj = new THREE.Vector3();

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private input: Input;
  private hud: Hud;
  private audio = new GameAudio();
  private loop: GameLoop;
  private hero: Hero;
  private enemies: Enemy[];
  private heroView: CharacterView;
  private enemyViews: CharacterView[] = [];
  private vfx: Vfx;
  private water: { mesh: THREE.Mesh; uniforms: { uTime: { value: number } } };
  private sun: THREE.DirectionalLight;
  private spark: THREE.PointLight;
  private sparkT = 0;
  private killed = 0;
  private golemDown = false;
  private bob = 0;
  private heroMoving = 0;

  constructor(root: HTMLElement) {
    this.hero = createHero(PLAYER_START.x, PLAYER_START.z);
    this.enemies = createEnemies(enemySpawns());

    this.hud = new Hud(root, {
      onMute: () => this.audio.setMuted(!this.audio.muted),
      onReset: () => this.reset(),
      onAttack: () => this.input.queueAttack(),
      onStick: (x, z) => {
        this.input.stickX = x;
        this.input.stickZ = z;
      },
    });

    this.renderer = createRenderer(this.hud.canvas);
    this.camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 90);
    const lights = createLighting(this.scene);
    this.sun = lights.sun;
    this.spark = lights.spark;

    buildTerrain(this.scene);
    this.water = createWater();
    this.scene.add(this.water.mesh);
    placeLandmarks(this.scene);
    this.vfx = new Vfx(this.scene);
    this.heroView = createHeroModel();
    this.scene.add(this.heroView.root);

    for (const enemy of this.enemies) {
      const view = enemy.kind === 'golem'
        ? createGolemModel()
        : createSlimeModel(enemy.id % 5 === 0);
      this.scene.add(view.root);
      this.enemyViews.push(view);
    }

    this.input = new Input(this.hud.canvas);
    window.addEventListener('resize', () => resizeRenderer(this.renderer, this.camera));
    window.addEventListener('keydown', (e) => {
      this.audio.unlock();
      if (e.code === 'KeyR') this.reset();
    });
    this.hud.canvas.addEventListener('pointerdown', () => this.audio.unlock());

    this.snapCamera();
    this.loop = new GameLoop((dt, time) => this.tick(dt, time));
    this.loop.start();
    this.publish();
  }

  private reset(): void {
    this.hero = createHero(PLAYER_START.x, PLAYER_START.z);
    this.enemies = createEnemies(enemySpawns());
    this.killed = 0;
    this.golemDown = false;
    this.hud.setDead(false);
    this.publish();
  }

  private tick(dt: number, time: number): void {
    tickHero(this.hero, dt);
    this.water.uniforms.uTime.value = time;
    bobCrystals(this.scene, time);
    this.vfx.update(dt);
    this.sparkT = Math.max(0, this.sparkT - dt);
    this.spark.intensity = this.sparkT > 0 ? 3.2 * (this.sparkT / 0.28) : 0;

    if (this.hero.alive) {
      const axis = this.input.axis();
      this.heroMoving = 0;
      if (axis.x !== 0 || axis.z !== 0) {
        this.heroMoving = 1;
        this.hero.facingX = axis.x;
        this.hero.facingZ = axis.z;
        const next = moveOnTerrain(
          this.hero.x,
          this.hero.z,
          axis.x * PLAYER_SPEED * dt,
          axis.z * PLAYER_SPEED * dt,
        );
        this.hero.x = next.x;
        this.hero.z = next.z;
        this.bob += dt * 10;
      }
      if (this.input.consumeAttack()) this.cast();
      this.tryCrystal();
      this.tryTouch();
    } else {
      this.input.consumeAttack();
    }

    for (const enemy of this.enemies) {
      tickEnemy(enemy, dt, this.hero.x, this.hero.z, this.hero.alive);
    }

    this.syncViews(time);
    this.followCamera(dt);
    this.sun.target.position.set(this.hero.x, 0, this.hero.z);
    this.sun.position.set(this.hero.x - 14, 22, this.hero.z - 8);
    this.spark.position.set(this.hero.x, surfaceY(this.hero.x, this.hero.z) + 1.1, this.hero.z);
    this.renderer.render(this.scene, this.camera);
    this.publish();
  }

  private cast(): void {
    const atk = tryAttack(this.hero);
    if (!atk) return;
    const y = surfaceY(this.hero.x, this.hero.z);
    this.vfx.burst(this.hero.x, y, this.hero.z, atk.kind === 'magic');
    this.sparkT = 0.28;
    if (atk.kind === 'magic') this.audio.magic();
    else this.audio.melee();

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (!inRadius(this.hero.x, this.hero.z, enemy.x, enemy.z, atk.radius)) continue;
      const dealt = hurtEnemy(enemy, atk.damage);
      if (dealt <= 0) continue;
      this.float(`-${dealt}`, 'dmg', enemy.x, surfaceY(enemy.x, enemy.z) + 1.1, enemy.z);
      if (!enemy.alive) {
        this.killed += 1;
        const up = grantXp(this.hero, enemyXp(enemy.kind));
        this.float(`+${enemyXp(enemy.kind)}`, 'xp', enemy.x, surfaceY(enemy.x, enemy.z) + 1.4, enemy.z);
        if (enemy.kind === 'golem') this.golemDown = true;
        if (up.leveled) {
          this.hud.flashLevelUp();
          this.audio.levelUp();
          this.vfx.levelGlow(this.hero.x, y, this.hero.z);
          this.float(`+${up.hpGained}`, 'heal', this.hero.x, y + 1.3, this.hero.z);
        }
      }
    }
  }

  private tryCrystal(): void {
    for (const c of CRYSTALS) {
      if (!inRadius(this.hero.x, this.hero.z, c.x, c.z, 1.45)) continue;
      const rest = restoreAtCrystal(this.hero);
      if (!rest) return;
      if (rest.hp > 0) this.float(`+${rest.hp}`, 'heal', this.hero.x, surfaceY(this.hero.x, this.hero.z) + 1.2, this.hero.z);
      this.audio.heal();
      return;
    }
  }

  private tryTouch(): void {
    if (this.hero.hurtCooldown > 0) return;
    for (const enemy of this.enemies) {
      if (!touching(enemy, this.hero.x, this.hero.z)) continue;
      const dealt = hitHero(this.hero, enemyTouch(enemy.kind));
      if (dealt <= 0) continue;
      this.hero.hurtCooldown = CONTACT_COOLDOWN;
      this.audio.hit();
      this.float(`-${dealt}`, 'dmg', this.hero.x, surfaceY(this.hero.x, this.hero.z) + 1.15, this.hero.z);
      if (!this.hero.alive) {
        this.audio.death();
        this.hud.setDead(true);
      }
      return;
    }
  }

  private syncViews(time: number): void {
    const hy = surfaceY(this.hero.x, this.hero.z);
    const bob = this.hero.alive ? Math.abs(Math.sin(this.bob)) * 0.04 : 0;
    this.heroView.root.visible = this.hero.alive;
    this.heroView.root.position.set(this.hero.x, hy + bob, this.hero.z);
    this.heroView.face(this.hero.facingX, this.hero.facingZ);
    this.heroView.animate(time, this.heroMoving);
    this.heroView.flash(this.hero.hurtCooldown > 0 && Math.sin(time * 28) > 0);
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      const view = this.enemyViews[i];
      view.root.visible = e.alive;
      if (!e.alive) continue;
      const y = surfaceY(e.x, e.z);
      const bounce = e.kind === 'golem' ? 0 : Math.sin(time * 4 + e.id) * 0.08;
      view.root.position.set(e.x, y + bounce, e.z);
      view.face(e.vx, e.vz);
      view.animate(time + e.id * 0.31, Math.hypot(e.vx, e.vz));
      view.flash(e.hurtT > 0);
    }
  }

  private followCamera(dt: number): void {
    const y = surfaceY(this.hero.x, this.hero.z);
    look.set(this.hero.x, y + 0.45, this.hero.z);
    camWant.copy(look).add(CAM_OFF);
    const k = 1 - Math.pow(0.0008, dt);
    this.camera.position.lerp(camWant, k);
    this.camera.lookAt(look);
  }

  private snapCamera(): void {
    const y = surfaceY(this.hero.x, this.hero.z);
    look.set(this.hero.x, y + 0.45, this.hero.z);
    this.camera.position.copy(look).add(CAM_OFF);
    this.camera.lookAt(look);
  }

  private float(text: string, kind: 'dmg' | 'heal' | 'xp', x: number, y: number, z: number): void {
    proj.set(x, y, z).project(this.camera);
    const sx = (proj.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-proj.y * 0.5 + 0.5) * window.innerHeight;
    this.hud.floater(text, kind, sx, sy);
  }

  private publish(): void {
    this.hud.sync(this.hero, this.killed, this.golemDown);
  }
}
