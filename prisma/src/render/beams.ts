import * as THREE from 'three';
import { DIRECTIONS, DIR_VECTORS } from '../puzzle/grid.ts';
import type { Puzzle } from '../puzzle/grid.ts';
import type { Simulation } from '../puzzle/simulate.ts';
import { BEAM_Y, CELL, colorThree } from './materials.ts';
import type { MaterialLibrary } from './materials.ts';

const HALF = CELL * 0.46;
const THICK = 0.16;

export class BeamSystem {
  readonly group = new THREE.Group();
  private pool: THREE.Mesh[] = [];
  private crystals: THREE.Mesh[] = [];
  private used = 0;
  private geo = new THREE.BoxGeometry(1, 1, 1);
  private crystalGeo = new THREE.OctahedronGeometry(0.14, 0);
  private mats: MaterialLibrary;
  private beamMats = new Map<number, THREE.MeshBasicMaterial>();

  constructor(mats: MaterialLibrary) {
    this.mats = mats;
    this.group.name = 'beams';
  }

  private beamMat(mask: number): THREE.MeshBasicMaterial {
    let mat = this.beamMats.get(mask);
    if (!mat) {
      mat = this.mats.beam.clone();
      mat.color = colorThree(mask);
      this.beamMats.set(mask, mat);
    }
    return mat;
  }

  private take(): THREE.Mesh {
    let mesh = this.pool[this.used];
    if (!mesh) {
      mesh = new THREE.Mesh(this.geo, this.mats.beam);
      mesh.frustumCulled = false;
      this.pool.push(mesh);
      this.group.add(mesh);
    }
    this.used += 1;
    mesh.visible = true;
    return mesh;
  }

  private placeHalf(
    wx: number,
    wz: number,
    dir: number,
    towardCenter: boolean,
    mask: number,
  ): void {
    const v = DIR_VECTORS[dir as 0 | 1 | 2 | 3];
    const mesh = this.take();
    mesh.material = this.beamMat(mask);
    const alongX = Math.abs(v.dx) > 0;
    const len = HALF;
    mesh.scale.set(alongX ? len : THICK, THICK, alongX ? THICK : len);
    const sign = towardCenter ? 1 : -1;
    mesh.position.set(
      wx - v.dx * sign * (HALF * 0.5),
      BEAM_Y,
      wz - v.dy * sign * (HALF * 0.5),
    );
  }

  sync(puzzle: Puzzle, sim: Simulation, cellToWorld: (index: number) => { x: number; z: number }): void {
    this.used = 0;
    for (const c of this.crystals) c.visible = false;

    let crystalI = 0;
    puzzle.cells.forEach((cell, index) => {
      const { x: wx, z: wz } = cellToWorld(index);
      let incomingDirs = 0;
      for (const d of DIRECTIONS) {
        const inn = sim.incoming[index * 4 + d];
        const out = sim.outgoing[index * 4 + d];
        if (inn) {
          incomingDirs += 1;
          this.placeHalf(wx, wz, d, true, inn);
        }
        if (out) this.placeHalf(wx, wz, d, false, out);
      }
      const mixed = sim.atCell[index] !== 0 && incomingDirs >= 2 && cell.kind === 'empty';
      if (mixed) {
        let node = this.crystals[crystalI];
        if (!node) {
          node = new THREE.Mesh(this.crystalGeo, this.mats.glass);
          node.castShadow = true;
          this.crystals.push(node);
          this.group.add(node);
        }
        node.visible = true;
        node.position.set(wx, BEAM_Y - 0.08, wz);
        crystalI += 1;
      }
    });

    for (let i = this.used; i < this.pool.length; i++) this.pool[i].visible = false;
  }

  pulse(time: number): void {
    for (const node of this.crystals) {
      if (!node.visible) continue;
      const s = 1 + Math.sin(time * 4 + node.position.x) * 0.08;
      node.scale.setScalar(s);
      node.rotation.y = time * 0.8;
    }
  }
}
