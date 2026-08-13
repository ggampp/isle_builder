import * as THREE from 'three';
import { GameLoop } from '../core/loop.ts';
import { Input } from '../core/input.ts';
import { PhysicsSim } from '../physics/sim.ts';
import { VoxelGrid } from '../voxels/grid.ts';
import { buildSaloon } from '../voxels/saloon.ts';
import { damageAt, voxelRaycastWorld } from '../voxels/connectivity.ts';
import { VOXEL_SIZE } from '../voxels/types.ts';
import type { Voxel } from '../voxels/types.ts';
import { weaponById, weaponBySlot, spreadDirection } from '../weapons/catalog.ts';
import type { WeaponDef, WeaponId } from '../weapons/catalog.ts';
import { loadWorldTextures } from '../render/textures.ts';
import { createLighting, createRenderer, createWorldKit } from '../render/scene.ts';
import { VoxelView } from '../render/voxels.ts';
import { Viewmodel } from '../render/viewmodel.ts';
import { Hud } from '../ui/hud.ts';
import { GameAudio } from '../audio/audio.ts';

const EYE = 1.55;
const SPEED = 4.6;
const SENS = 0.0022;
const lanternTarget = new THREE.Vector3();

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private input: Input;
  private hud: Hud;
  private audio = new GameAudio();
  private physics!: PhysicsSim;
  private grid: VoxelGrid;
  private voxels!: VoxelView;
  private viewmodel = new Viewmodel();
  private lanterns: THREE.PointLight[] = [];
  private lanternSmooth: THREE.Vector3[] = [];
  private muzzle: THREE.PointLight;
  private bombTemplate: THREE.Object3D | null = null;
  private bombVisuals: THREE.Object3D[] = [];
  private laserBeam: THREE.Mesh;
  private yaw = 0;
  private pitch = 0;
  private pos = new THREE.Vector3(0, EYE, 7.8);
  private weapon: WeaponDef = weaponById('shotgun');
  private cooldown = 0;
  private score = 0;
  private initialStructure: number;
  private paused = false;
  private loop: GameLoop;
  private forward = new THREE.Vector3();
  private right = new THREE.Vector3();
  private up = new THREE.Vector3(0, 1, 0);

  constructor(root: HTMLElement, physics: PhysicsSim) {
    this.physics = physics;
    this.grid = buildSaloon();
    this.initialStructure = this.countStructure();
    physics.rebuild(this.grid);

    this.hud = new Hud(root, {
      onSelect: (id) => this.setWeapon(id),
      onReset: () => this.reset(),
      onMute: () => {
        this.audio.setMuted(!this.audio.muted);
        this.syncHud();
      },
      onFire: (down) => this.input.setFiring(down),
    });

    this.renderer = createRenderer(this.hud.canvas);
    this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 90);
    this.camera.add(this.viewmodel.group);
    this.scene.add(this.camera);

    const textures = loadWorldTextures();
    createWorldKit(this.scene, textures);
    const lights = createLighting(this.scene);
    this.lanterns = lights.lanterns;
    this.muzzle = lights.muzzle;

    this.voxels = new VoxelView(textures);
    this.scene.add(this.voxels.group);

    this.laserBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 1, 6),
      new THREE.MeshBasicMaterial({ color: 0x4ec4ff }),
    );
    this.laserBeam.visible = false;
    this.scene.add(this.laserBeam);

    this.input = new Input(this.hud.canvas);
    this.hud.canvas.addEventListener('click', () => {
      this.audio.unlock();
      this.input.requestLock();
    });
    window.addEventListener('keydown', (e) => this.onKey(e));
    window.addEventListener('resize', () => this.resize());

    this.viewmodel.setWeapon(this.weapon.id);
    this.voxels.sync(this.grid, this.physics);
    this.syncHud();

    this.loop = new GameLoop((dt) => this.update(dt));
    this.loop.start();

    const game = this;
    (window as unknown as { __THREE_GAME_DIAGNOSTICS__: unknown }).__THREE_GAME_DIAGNOSTICS__ = {
      renderer: this.renderer.info,
      get state() {
        return {
          weapon: game.weapon.id,
          score: game.score,
          voxels: game.grid.size,
          physics: game.physics.diagnostics(),
        };
      },
    };
  }

  static async boot(root: HTMLElement): Promise<Game> {
    const physics = await PhysicsSim.create();
    const game = new Game(root, physics);
    await game.viewmodel.loadGenerated();
    game.bombTemplate = game.viewmodel.cloneForWorld('bomb');
    return game;
  }

  private countStructure(): number {
    let n = 0;
    for (const v of this.grid.values()) if (v.group === 'structure') n += 1;
    return n;
  }

  private integrity(): number {
    const n = this.countStructure();
    return this.initialStructure === 0 ? 0 : n / this.initialStructure;
  }

  private setWeapon(id: WeaponId): void {
    this.weapon = weaponById(id);
    this.viewmodel.setWeapon(id);
    this.audio.play('click', 0.5);
    this.syncHud();
  }

  private onKey(e: KeyboardEvent): void {
    if (e.code === 'Escape') {
      this.paused = !this.paused;
      this.syncHud();
      return;
    }
    if (e.code === 'KeyR') this.reset();
    if (e.code === 'KeyM') {
      this.audio.setMuted(!this.audio.muted);
      this.syncHud();
    }
    const slot = Number(e.key);
    const w = weaponBySlot(slot);
    if (w) this.setWeapon(w.id);
  }

  private reset(): void {
    this.grid = buildSaloon();
    this.initialStructure = this.countStructure();
    this.physics.rebuild(this.grid);
    this.score = 0;
    this.pos.set(0, EYE, 7.8);
    this.yaw = 0;
    this.pitch = 0;
    this.lanternSmooth = [];
    this.syncHud();
  }

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private update(dt: number): void {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.muzzle.intensity = Math.max(0, this.muzzle.intensity - dt * 28);
    this.viewmodel.update(dt);

    const look = this.input.consumeLook();
    this.yaw -= look.dx * SENS;
    this.pitch -= look.dy * SENS;
    this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch));

    this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    this.camera.getWorldDirection(this.forward);
    this.right.crossVectors(this.forward, this.up).normalize();

    if (!this.paused) {
      let mx = 0;
      let mz = 0;
      if (this.input.keys.has('KeyW')) mz += 1;
      if (this.input.keys.has('KeyS')) mz -= 1;
      if (this.input.keys.has('KeyD')) mx += 1;
      if (this.input.keys.has('KeyA')) mx -= 1;
      if (mx !== 0 || mz !== 0) {
        const len = Math.hypot(mx, mz);
        mx /= len; mz /= len;
        this.pos.addScaledVector(this.forward, mz * SPEED * dt);
        this.pos.addScaledVector(this.right, mx * SPEED * dt);
        this.pos.y = EYE;
        this.pos.x = Math.max(-20, Math.min(20, this.pos.x));
        this.pos.z = Math.max(-20, Math.min(20, this.pos.z));
      }
    }

    this.camera.position.copy(this.pos);
    this.muzzle.position.copy(this.pos).addScaledVector(this.forward, 0.6);

    if (!this.paused && this.input.isHolding()) this.tryFire();
    else if (!this.weapon.beam || !this.input.firing) this.laserBeam.visible = false;

    const { exploded } = this.physics.step(dt);
    const contacts = this.physics.detonateWhere((x, y, z) => this.bombHitsVoxel(x, y, z));
    for (const p of exploded) this.explode(p.x, p.y, p.z);
    for (const p of contacts) this.explode(p.x, p.y, p.z);

    this.voxels.sync(this.grid, this.physics);
    this.syncLanterns(dt);
    this.syncBombs();
    this.syncHud();
    this.renderer.render(this.scene, this.camera);
  }

  private tryFire(): void {
    if (this.cooldown > 0) return;
    if (!this.input.isHolding()) return;
    this.input.consumeQueued();
    const w = this.weapon;
    this.cooldown = w.cooldown;
    this.viewmodel.fireKick();
    this.muzzle.intensity = w.id === 'laser' ? 2.2 : 6;
    this.audio.play(w.id === 'bullet' ? 'bullet' : w.id === 'rifle' ? 'rifle' : w.id === 'bomb' ? 'bomb' : w.id === 'laser' ? 'laser' : 'shotgun');

    const origin = this.camera.position.clone().addScaledVector(this.forward, 0.55);
    if (w.throw) {
      this.physics.spawnBomb(
        { x: origin.x, y: origin.y, z: origin.z },
        { x: this.forward.x * 9.2, y: this.forward.y * 9.2 + 3.1, z: this.forward.z * 9.2 },
      );
      return;
    }

    this.laserBeam.visible = w.beam;
    let beamEnd = origin.clone().addScaledVector(this.forward, w.range);
    const destroyed = new Map<number, Voxel>();
    const poseOf = (v: Voxel) => {
      const p = this.physics.poseOf(v);
      return p ? { x: p.x, y: p.y, z: p.z } : null;
    };
    for (let i = 0; i < w.pellets; i++) {
      const dir = spreadDirection(
        { x: this.forward.x, y: this.forward.y, z: this.forward.z },
        w.spread,
      );
      const hit = voxelRaycastWorld(this.grid, origin, dir, w.range, VOXEL_SIZE, poseOf);
      if (!hit) continue;
      beamEnd.set(hit.point.x, hit.point.y, hit.point.z);
      this.physics.applyImpulse(hit.voxel, dir, w.impulse, hit.point);
      for (const v of damageAt(this.grid, hit.point.x, hit.point.y, hit.point.z, w.radius, w.damage, VOXEL_SIZE, hit.voxel)) {
        destroyed.set(v.id, v);
      }
    }
    this.commitDestroyed(destroyed, { x: this.forward.x, y: this.forward.y, z: this.forward.z }, w.impulse);
    if (w.beam) this.placeBeam(origin, beamEnd);
    else this.laserBeam.visible = false;
  }

  private placeBeam(from: THREE.Vector3, to: THREE.Vector3): void {
    const mid = from.clone().lerp(to, 0.5);
    const dist = from.distanceTo(to);
    this.laserBeam.position.copy(mid);
    this.laserBeam.scale.set(1, dist, 1);
    this.laserBeam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    this.laserBeam.visible = true;
  }

  private explode(x: number, y: number, z: number): void {
    const w = weaponById('bomb');
    this.audio.play('bomb', 1);
    const destroyed = new Map<number, Voxel>();
    for (const v of damageAt(this.grid, x, y, z, w.radius, w.damage, VOXEL_SIZE)) {
      destroyed.set(v.id, v);
    }
    this.commitDestroyed(destroyed, { x: 0, y: 1, z: 0 }, w.impulse);
  }

  private commitDestroyed(
    destroyed: Map<number, Voxel>,
    dir: { x: number; y: number; z: number },
    impulse: number,
  ): void {
    if (destroyed.size === 0) return;
    this.audio.playBreak();
    for (const v of destroyed.values()) {
      this.physics.spawnDebris(v, dir, impulse);
      this.grid.remove(v);
      this.score += 1;
    }
    this.physics.rebuild(this.grid);
  }

  private syncLanterns(dt: number): void {
    const pts: { x: number; y: number; z: number }[] = [];
    for (const v of this.grid.values()) {
      if (v.mat !== 'lantern') continue;
      const p = this.physics.poseOf(v);
      if (p) pts.push(p);
    }
    const follow = 1 - Math.exp(-10 * dt);
    for (let i = 0; i < this.lanterns.length; i++) {
      const light = this.lanterns[i];
      if (i >= pts.length) {
        light.visible = false;
        continue;
      }
      light.visible = true;
      const t = pts[i];
      let smooth = this.lanternSmooth[i];
      if (!smooth) {
        smooth = new THREE.Vector3(t.x, t.y, t.z);
        this.lanternSmooth[i] = smooth;
      }
      const jump = Math.hypot(t.x - smooth.x, t.y - smooth.y, t.z - smooth.z);
      if (jump > 1.4) smooth.set(t.x, t.y, t.z);
      else {
        lanternTarget.set(t.x, t.y, t.z);
        smooth.lerp(lanternTarget, follow);
      }
      light.position.copy(smooth);
    }
  }

  private bombHitsVoxel(x: number, y: number, z: number): boolean {
    const ix = Math.round(x / VOXEL_SIZE);
    const iy = Math.floor(y / VOXEL_SIZE);
    const iz = Math.round(z / VOXEL_SIZE);
    return !!(
      this.grid.get(ix, iy, iz)
      || this.grid.get(ix, iy - 1, iz)
      || this.grid.get(ix + 1, iy, iz)
      || this.grid.get(ix - 1, iy, iz)
      || this.grid.get(ix, iy, iz + 1)
      || this.grid.get(ix, iy, iz - 1)
    );
  }

  private syncBombs(): void {
    const bombs = this.physics.bombPoses();
    while (this.bombVisuals.length < bombs.length) {
      const src = this.bombTemplate ?? this.viewmodel.cloneForWorld('bomb');
      if (!src) break;
      const clone = src.clone(true);
      clone.visible = true;
      this.scene.add(clone);
      this.bombVisuals.push(clone);
      if (!this.bombTemplate) this.bombTemplate = src;
    }
    for (let i = 0; i < this.bombVisuals.length; i++) {
      const mesh = this.bombVisuals[i];
      if (i >= bombs.length) {
        mesh.visible = false;
        continue;
      }
      const p = bombs[i];
      mesh.visible = true;
      mesh.position.set(p.x, p.y, p.z);
      mesh.quaternion.set(p.qx, p.qy, p.qz, p.qw);
    }
  }

  private syncHud(): void {
    this.hud.render({
      weapon: this.weapon,
      integrity: this.integrity(),
      score: this.score,
      paused: this.paused,
      locked: this.input.locked,
      collapsed: this.integrity() < 0.2,
      muted: this.audio.muted,
    });
  }
}
