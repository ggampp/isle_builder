import * as THREE from 'three';
import { MATERIALS, MAT_IDS, VOXEL_SIZE } from '../voxels/types.ts';
import type { MatId } from '../voxels/types.ts';
import type { PhysicsSim } from '../physics/sim.ts';
import type { VoxelGrid } from '../voxels/grid.ts';

const CAP = 2400;
const dummy = new THREE.Object3D();
const quat = new THREE.Quaternion();
const scale = new THREE.Vector3(1, 1, 1);
const pos = new THREE.Vector3();

function tint(id: number): THREE.Color {
  const n = ((id * 1103515245 + 12345) >>> 0) % 1000;
  const k = (n / 1000 - 0.5) * 0.16;
  return new THREE.Color(1 + k, 1 + k * 0.8, 1 + k * 0.5);
}

export class VoxelView {
  readonly group = new THREE.Group();
  private meshes = new Map<MatId, THREE.InstancedMesh>();
  private debrisMeshes = new Map<MatId, THREE.InstancedMesh>();

  constructor(textures: Record<string, THREE.Texture>) {
    this.group.name = 'voxels';
    const geo = new THREE.BoxGeometry(VOXEL_SIZE * 0.98, VOXEL_SIZE * 0.98, VOXEL_SIZE * 0.98);
    for (const id of MAT_IDS) {
      const def = MATERIALS[id];
      const map = id === 'wood' || id === 'plank' ? textures.wood
        : id === 'adobe' || id === 'rock' ? textures.adobe
          : id === 'steel' || id === 'hinge' ? textures.steel
            : undefined;
      const mat = new THREE.MeshStandardMaterial({
        color: def.color,
        map: map ?? null,
        roughness: def.roughness,
        metalness: def.metalness,
        emissive: def.emissive,
        emissiveIntensity: def.emissiveIntensity,
      });
      const mesh = new THREE.InstancedMesh(geo, mat, CAP);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.count = 0;
      mesh.name = `vox-${id}`;
      this.meshes.set(id, mesh);
      this.group.add(mesh);

      const debris = new THREE.InstancedMesh(geo, mat, 360);
      debris.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      debris.castShadow = true;
      debris.count = 0;
      debris.name = `debris-${id}`;
      this.debrisMeshes.set(id, debris);
      this.group.add(debris);
    }
  }

  sync(grid: VoxelGrid, physics: PhysicsSim): void {
    const counts = new Map<MatId, number>();
    for (const id of MAT_IDS) counts.set(id, 0);

    for (const v of grid.values()) {
      const mesh = this.meshes.get(v.mat);
      if (!mesh) continue;
      const i = counts.get(v.mat) ?? 0;
      if (i >= CAP) continue;
      const pose = physics.poseOf(v);
      if (pose) {
        pos.set(pose.x, pose.y, pose.z);
        quat.set(pose.qx, pose.qy, pose.qz, pose.qw);
      } else {
        pos.set(v.ix * VOXEL_SIZE, v.iy * VOXEL_SIZE + VOXEL_SIZE * 0.5, v.iz * VOXEL_SIZE);
        quat.identity();
      }
      dummy.position.copy(pos);
      dummy.quaternion.copy(quat);
      dummy.scale.copy(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, tint(v.id));
      counts.set(v.mat, i + 1);
    }

    for (const id of MAT_IDS) {
      const mesh = this.meshes.get(id)!;
      mesh.count = counts.get(id) ?? 0;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    const dCounts = new Map<MatId, number>();
    for (const id of MAT_IDS) dCounts.set(id, 0);
    for (const d of physics.debrisPoses()) {
      const mesh = this.debrisMeshes.get(d.mat);
      if (!mesh) continue;
      const i = dCounts.get(d.mat) ?? 0;
      if (i >= 360) continue;
      dummy.position.set(d.x, d.y, d.z);
      dummy.quaternion.set(d.qx, d.qy, d.qz, d.qw);
      dummy.scale.setScalar(0.92);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      dCounts.set(d.mat, i + 1);
    }
    for (const id of MAT_IDS) {
      const mesh = this.debrisMeshes.get(id)!;
      mesh.count = dCounts.get(id) ?? 0;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
}

