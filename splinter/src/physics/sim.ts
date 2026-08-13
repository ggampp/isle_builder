import RAPIER from '@dimforge/rapier3d-compat';
import { MATERIALS, VOXEL_SIZE, worldCenter, DOOR_GROUPS } from '../voxels/types.ts';
import type { DoorGroup, Voxel, VoxelGroup } from '../voxels/types.ts';
import { VoxelGrid } from '../voxels/grid.ts';
import { connectedComponents, isSupported } from '../voxels/connectivity.ts';
import { GAZEBO } from '../voxels/saloon.ts';

type RigidBody = InstanceType<typeof RAPIER.RigidBody>;
type ImpulseJoint = InstanceType<typeof RAPIER.ImpulseJoint>;

interface Pose {
  x: number; y: number; z: number;
  qx: number; qy: number; qz: number; qw: number;
}

interface Binding {
  body: RigidBody;
  voxels: Voxel[];
  local: Map<number, { x: number; y: number; z: number }>;
}

interface Debris {
  body: RigidBody;
  mat: Voxel['mat'];
  born: number;
}

interface Bomb {
  body: RigidBody;
  born: number;
}

const HALF = VOXEL_SIZE * 0.5;
const FIXED_DT = 1 / 60;
const DEBRIS_CAP = 280;
const DEBRIS_LIFE = 14;

const COL_WORLD = 0x0001;
const COL_CHAIN = 0x0002;
const COL_DEBRIS = 0x0004;
const COL_BOMB = 0x0008;
const COL_GROUND = 0x0010;

function colGroups(membership: number, filter: number): number {
  return ((membership & 0xffff) << 16) | (filter & 0xffff);
}

function rotate(q: { x: number; y: number; z: number; w: number }, v: { x: number; y: number; z: number }) {
  const ix = q.w * v.x + q.y * v.z - q.z * v.y;
  const iy = q.w * v.y + q.z * v.x - q.x * v.z;
  const iz = q.w * v.z + q.x * v.y - q.y * v.x;
  const iw = -q.x * v.x - q.y * v.y - q.z * v.z;
  return {
    x: ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y,
    y: iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z,
    z: iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x,
  };
}

function comOf(voxels: Voxel[]): { x: number; y: number; z: number } {
  let x = 0, y = 0, z = 0;
  for (const v of voxels) {
    const c = worldCenter(v.ix, v.iy, v.iz);
    x += c.x; y += c.y; z += c.z;
  }
  const n = Math.max(1, voxels.length);
  return { x: x / n, y: y / n, z: z / n };
}

export class PhysicsSim {
  readonly world: InstanceType<typeof RAPIER.World>;
  private accumulator = 0;
  private bindings: Binding[] = [];
  private voxelToBinding = new Map<number, Binding>();
  private joints: ImpulseJoint[] = [];
  private debris: Debris[] = [];
  private bombs: Bomb[] = [];
  private ground: RigidBody;
  private now = 0;

  private constructor(world: InstanceType<typeof RAPIER.World>) {
    this.world = world;
    this.ground = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.25, 0));
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(48, 0.25, 48)
        .setFriction(0.9)
        .setCollisionGroups(colGroups(COL_GROUND, 0xffff)),
      this.ground,
    );
    const deck = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0.09, 0));
    world.createCollider(
      RAPIER.ColliderDesc.cylinder(0.09, 3.5)
        .setFriction(0.85)
        .setCollisionGroups(colGroups(COL_GROUND, 0xffff)),
      deck,
    );
    const plaza = world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(GAZEBO.x, 0.09, GAZEBO.z),
    );
    world.createCollider(
      RAPIER.ColliderDesc.cylinder(0.09, GAZEBO.radius)
        .setFriction(0.85)
        .setCollisionGroups(colGroups(COL_GROUND, 0xffff)),
      plaza,
    );
  }

  static async create(): Promise<PhysicsSim> {
    await RAPIER.init();
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    world.timestep = FIXED_DT;
    world.numSolverIterations = 8;
    return new PhysicsSim(world);
  }

  get timestep(): number {
    return FIXED_DT;
  }

  rebuild(grid: VoxelGrid): void {
    this.clearBindings();
    const byGroup = new Map<VoxelGroup, Voxel[]>();
    for (const v of grid.values()) {
      const list = byGroup.get(v.group) ?? [];
      list.push(v);
      byGroup.set(v.group, list);
    }

    const structure = byGroup.get('structure') ?? [];
    const comps = this.structureComponents(structure);
    for (const comp of comps) {
      const dynamic = !isSupported(comp);
      this.makeBinding(comp, dynamic, 'solid');
    }

    for (const group of DOOR_GROUPS) {
      const voxels = byGroup.get(group) ?? [];
      if (voxels.length === 0) continue;
      this.makeBinding(voxels, true, 'solid');
    }

    for (let i = 0; i < 4; i++) {
      const chain = byGroup.get(`chain-${i}` as VoxelGroup) ?? [];
      chain.sort((a, b) => b.iy - a.iy);
      for (const link of chain) this.makeBinding([link], true, 'chain');
      const lantern = byGroup.get(`lantern-${i}` as VoxelGroup) ?? [];
      if (lantern.length > 0) this.makeBinding(lantern, true, 'chain');
    }

    this.attachJoints(grid, byGroup);
  }

  private structureComponents(voxels: Voxel[]): Voxel[][] {
    const g = new VoxelGrid();
    for (const v of voxels) {
      const added = g.add(v.ix, v.iy, v.iz, v.mat, v.group);
      if (added) {
        added.id = v.id;
        added.hp = v.hp;
      }
    }
    // connectedComponents uses voxel objects inside g, not the originals.
    // Map back by coordinates.
    const orig = new Map<string, Voxel>();
    for (const v of voxels) orig.set(`${v.ix},${v.iy},${v.iz}`, v);
    return connectedComponents(g).map((comp) =>
      comp.map((v) => orig.get(`${v.ix},${v.iy},${v.iz}`)!).filter(Boolean),
    );
  }

  private makeBinding(voxels: Voxel[], dynamic: boolean, kind: 'solid' | 'chain'): Binding {
    const com = comOf(voxels);
    const chain = kind === 'chain';
    const desc = dynamic
      ? RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(com.x, com.y, com.z)
          .setLinearDamping(chain ? 4.8 : 0.85)
          .setAngularDamping(chain ? 6.5 : 1.6)
          .setCcdEnabled(false)
          .setCanSleep(true)
      : RAPIER.RigidBodyDesc.fixed().setTranslation(com.x, com.y, com.z);
    const body = this.world.createRigidBody(desc);
    const membership = chain ? COL_CHAIN : COL_WORLD;
    const filter = chain ? COL_GROUND | COL_DEBRIS | COL_BOMB : 0xffff;
    const local = new Map<number, { x: number; y: number; z: number }>();
    for (const v of voxels) {
      const c = worldCenter(v.ix, v.iy, v.iz);
      const lx = c.x - com.x;
      const ly = c.y - com.y;
      const lz = c.z - com.z;
      local.set(v.id, { x: lx, y: ly, z: lz });
      const col = RAPIER.ColliderDesc.cuboid(HALF * 0.98, HALF * 0.98, HALF * 0.98)
        .setTranslation(lx, ly, lz)
        .setDensity(MATERIALS[v.mat].density)
        .setFriction(0.7)
        .setRestitution(0)
        .setCollisionGroups(colGroups(membership, filter));
      this.world.createCollider(col, body);
    }
    const binding: Binding = { body, voxels, local };
    this.bindings.push(binding);
    for (const v of voxels) this.voxelToBinding.set(v.id, binding);
    return binding;
  }

  private attachJoints(grid: VoxelGrid, byGroup: Map<VoxelGroup, Voxel[]>): void {
    this.hingeDoor(grid, 'door-l');
    this.hingeDoor(grid, 'door-r');
    this.hingeDoor(grid, 'door-o');

    for (let i = 0; i < 4; i++) {
      const chain = (byGroup.get(`chain-${i}` as VoxelGroup) ?? []).slice().sort((a, b) => b.iy - a.iy);
      if (chain.length === 0) continue;
      const first = chain[0];
      let parentVoxel: Voxel | undefined;
      for (let dy = 1; dy <= 3; dy++) {
        const n = grid.get(first.ix, first.iy + dy, first.iz);
        if (n && n.group === 'structure') {
          parentVoxel = n;
          break;
        }
      }
      const parent = parentVoxel ? this.voxelToBinding.get(parentVoxel.id) : undefined;
      if (!parent) continue;
      let prev: Binding | undefined = parent;
      let prevVoxel: Voxel | undefined = parentVoxel;
      for (const link of chain) {
        const cur = this.voxelToBinding.get(link.id);
        if (cur && prev) {
          const a = prevVoxel
            ? worldCenter(prevVoxel.ix, prevVoxel.iy, prevVoxel.iz)
            : worldCenter(link.ix, link.iy + 1, link.iz);
          const b = worldCenter(link.ix, link.iy, link.iz);
          this.spherical(prev.body, cur.body, a, b);
        }
        prev = cur;
        prevVoxel = link;
      }
      const lantern = byGroup.get(`lantern-${i}` as VoxelGroup) ?? [];
      if (lantern.length > 0 && prev && prevVoxel) {
        const lanternBind = this.voxelToBinding.get(lantern[0].id);
        if (lanternBind) {
          const last = chain[chain.length - 1];
          const a = worldCenter(last.ix, last.iy, last.iz);
          const b = comOf(lantern);
          this.spherical(prev.body, lanternBind.body, a, b);
        }
      }
    }
  }

  private hingeDoor(grid: VoxelGrid, group: DoorGroup): void {
    const door = this.bindings.find((b) => b.voxels.some((v) => v.group === group));
    if (!door) return;
    const hinges = door.voxels.filter((v) => v.mat === 'hinge');
    if (hinges.length === 0) return;
    const mid = hinges[Math.floor(hinges.length / 2)];
    let pillar: Voxel | undefined;
    for (const [dx, dy, dz] of [[-1, 0, 0], [1, 0, 0], [0, 0, -1], [0, 0, 1], [0, -1, 0], [0, 1, 0]] as const) {
      const n = grid.get(mid.ix + dx, mid.iy + dy, mid.iz + dz);
      if (n && n.group === 'structure') {
        pillar = n;
        break;
      }
    }
    const parent = pillar ? this.voxelToBinding.get(pillar.id) : undefined;
    if (!parent) return;
    const p = worldCenter(mid.ix, mid.iy, mid.iz);
    const a1 = this.worldToLocal(parent, p);
    const a2 = this.worldToLocal(door, p);
    const data = RAPIER.JointData.revolute(a1, a2, { x: 0, y: 1, z: 0 });
    const joint = this.world.createImpulseJoint(data, parent.body, door.body, true);
    joint.setContactsEnabled(false);
    const limits = joint as ImpulseJoint & { setLimits?: (min: number, max: number) => void };
    limits.setLimits?.(-2.4, 2.4);
    this.joints.push(joint);
  }

  private spherical(a: RigidBody, b: RigidBody, wa: { x: number; y: number; z: number }, wb: { x: number; y: number; z: number }): void {
    const ba = this.bodyWorldToLocal(a, wa);
    const bb = this.bodyWorldToLocal(b, wb);
    const joint = this.world.createImpulseJoint(RAPIER.JointData.spherical(ba, bb), a, b, true);
    joint.setContactsEnabled(false);
    this.joints.push(joint);
  }

  private worldToLocal(binding: Binding, p: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
    const t = binding.body.translation();
    const r = binding.body.rotation();
    const qInv = { x: -r.x, y: -r.y, z: -r.z, w: r.w };
    return rotate(qInv, { x: p.x - t.x, y: p.y - t.y, z: p.z - t.z });
  }

  private bodyWorldToLocal(body: RigidBody, p: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
    const t = body.translation();
    const r = body.rotation();
    const qInv = { x: -r.x, y: -r.y, z: -r.z, w: r.w };
    return rotate(qInv, { x: p.x - t.x, y: p.y - t.y, z: p.z - t.z });
  }

  private clearBindings(): void {
    for (const j of this.joints) this.world.removeImpulseJoint(j, true);
    this.joints = [];
    for (const b of this.bindings) this.world.removeRigidBody(b.body);
    this.bindings = [];
    this.voxelToBinding.clear();
  }

  poseOf(voxel: Voxel): Pose | null {
    const bind = this.voxelToBinding.get(voxel.id);
    if (!bind) return null;
    const local = bind.local.get(voxel.id);
    if (!local) return null;
    const t = bind.body.translation();
    const r = bind.body.rotation();
    const rotated = rotate(r, local);
    return {
      x: t.x + rotated.x,
      y: t.y + rotated.y,
      z: t.z + rotated.z,
      qx: r.x, qy: r.y, qz: r.z, qw: r.w,
    };
  }

  applyImpulse(voxel: Voxel, dir: { x: number; y: number; z: number }, mag: number, point: { x: number; y: number; z: number }): void {
    const bind = this.voxelToBinding.get(voxel.id);
    if (!bind) return;
    if (!bind.body.isDynamic()) {
      bind.body.wakeUp();
      return;
    }
    const len = Math.hypot(dir.x, dir.y, dir.z) || 1;
    bind.body.applyImpulseAtPoint(
      { x: (dir.x / len) * mag, y: (dir.y / len) * mag, z: (dir.z / len) * mag },
      point,
      true,
    );
  }

  spawnDebris(voxel: Voxel, dir: { x: number; y: number; z: number }, mag: number): void {
    while (this.debris.length >= DEBRIS_CAP) {
      const old = this.debris.shift();
      if (old) this.world.removeRigidBody(old.body);
    }
    const c = this.poseOf(voxel) ?? { ...worldCenter(voxel.ix, voxel.iy, voxel.iz), qx: 0, qy: 0, qz: 0, qw: 1 };
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(c.x, c.y, c.z)
        .setCcdEnabled(true)
        .setLinvel(dir.x * mag * 0.35, dir.y * mag * 0.35 + 1.4, dir.z * mag * 0.35),
    );
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(HALF * 0.92, HALF * 0.92, HALF * 0.92)
        .setDensity(MATERIALS[voxel.mat].density)
        .setRestitution(0.12)
        .setFriction(0.6)
        .setCollisionGroups(colGroups(COL_DEBRIS, 0xffff)),
      body,
    );
    this.debris.push({ body, mat: voxel.mat, born: this.now });
  }

  spawnBomb(origin: { x: number; y: number; z: number }, vel: { x: number; y: number; z: number }): void {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(origin.x, origin.y, origin.z)
        .setLinvel(vel.x, vel.y, vel.z)
        .setAngvel({ x: 6.5, y: 11, z: -4.5 })
        .setCcdEnabled(true),
    );
    this.world.createCollider(
      RAPIER.ColliderDesc.ball(0.12)
        .setDensity(2.2)
        .setRestitution(0.12)
        .setFriction(0.8)
        .setCollisionGroups(colGroups(COL_BOMB, 0xffff)),
      body,
    );
    this.bombs.push({ body, born: this.now });
  }

  step(dt: number): { exploded: { x: number; y: number; z: number }[] } {
    this.now += dt;
    this.accumulator += Math.min(dt, 0.1);
    while (this.accumulator >= FIXED_DT) {
      this.world.step();
      this.accumulator -= FIXED_DT;
    }
    const exploded: { x: number; y: number; z: number }[] = [];
    this.bombs = this.bombs.filter((bomb) => {
      const t = bomb.body.translation();
      const age = this.now - bomb.born;
      if (age > 1.55 || t.y < 0.12) {
        exploded.push({ x: t.x, y: t.y, z: t.z });
        this.world.removeRigidBody(bomb.body);
        return false;
      }
      return true;
    });
    this.debris = this.debris.filter((d) => {
      if (this.now - d.born < DEBRIS_LIFE) return true;
      this.world.removeRigidBody(d.body);
      return false;
    });
    return { exploded };
  }

  debrisPoses(): { mat: Voxel['mat']; x: number; y: number; z: number; qx: number; qy: number; qz: number; qw: number }[] {
    return this.debris.map((d) => {
      const t = d.body.translation();
      const r = d.body.rotation();
      return { mat: d.mat, x: t.x, y: t.y, z: t.z, qx: r.x, qy: r.y, qz: r.z, qw: r.w };
    });
  }

  bombPoses(): { x: number; y: number; z: number; qx: number; qy: number; qz: number; qw: number }[] {
    return this.bombs.map((b) => {
      const t = b.body.translation();
      const r = b.body.rotation();
      return { x: t.x, y: t.y, z: t.z, qx: r.x, qy: r.y, qz: r.z, qw: r.w };
    });
  }

  detonateWhere(hit: (x: number, y: number, z: number) => boolean): { x: number; y: number; z: number }[] {
    const exploded: { x: number; y: number; z: number }[] = [];
    this.bombs = this.bombs.filter((bomb) => {
      const t = bomb.body.translation();
      if (!hit(t.x, t.y, t.z)) return true;
      exploded.push({ x: t.x, y: t.y, z: t.z });
      this.world.removeRigidBody(bomb.body);
      return false;
    });
    return exploded;
  }

  diagnostics(): { engine: string; timestep: number; bodies: number; colliders: number; joints: number; ccd: number } {
    let ccd = 0;
    let bodies = 0;
    let colliders = 0;
    this.world.forEachRigidBody((b) => {
      bodies += 1;
      if (b.isCcdEnabled()) ccd += 1;
    });
    this.world.forEachCollider(() => {
      colliders += 1;
    });
    return {
      engine: 'rapier',
      timestep: FIXED_DT,
      bodies,
      colliders,
      joints: this.joints.length,
      ccd,
    };
  }
}
