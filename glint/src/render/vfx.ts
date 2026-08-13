import * as THREE from 'three';

interface Ring {
  mesh: THREE.Mesh;
  age: number;
  life: number;
}

interface Spark {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  life: number;
}

export class Vfx {
  private rings: Ring[] = [];
  private sparks: Spark[] = [];
  private ringGeo = new THREE.RingGeometry(0.55, 0.92, 28);
  private sparkGeo = new THREE.SphereGeometry(0.07, 6, 4);
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.ringGeo.rotateX(-Math.PI / 2);
  }

  burst(x: number, y: number, z: number, magic: boolean): void {
    const mat = new THREE.MeshBasicMaterial({
      color: magic ? 0xfff2a0 : 0xe8d8c0,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.ringGeo, mat);
    mesh.position.set(x, y + 0.05, z);
    mesh.scale.setScalar(0.55);
    this.scene.add(mesh);
    this.rings.push({ mesh, age: 0, life: magic ? 0.45 : 0.28 });

    const n = magic ? 14 : 6;
    for (let i = 0; i < n; i++) {
      const sm = new THREE.MeshBasicMaterial({
        color: magic ? (i % 2 ? 0xfffce0 : 0xffd36a) : 0xf0e6d0,
        transparent: true,
        opacity: 1,
        depthWrite: false,
      });
      const s = new THREE.Mesh(this.sparkGeo, sm);
      s.position.set(x, y + 0.35, z);
      this.scene.add(s);
      const a = (i / n) * Math.PI * 2;
      this.sparks.push({
        mesh: s,
        vx: Math.cos(a) * (magic ? 2.4 : 1.4),
        vy: 1.8 + Math.random() * 1.6,
        vz: Math.sin(a) * (magic ? 2.4 : 1.4),
        age: 0,
        life: 0.4 + Math.random() * 0.2,
      });
    }
  }

  levelGlow(x: number, y: number, z: number): void {
    this.burst(x, y, z, true);
    this.burst(x, y + 0.2, z, true);
  }

  update(dt: number): void {
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.age += dt;
      const t = r.age / r.life;
      r.mesh.scale.setScalar(0.55 + t * 1.8);
      const mat = r.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 1 - t;
      if (t >= 1) {
        this.scene.remove(r.mesh);
        mat.dispose();
        this.rings.splice(i, 1);
      }
    }
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.age += dt;
      s.vy -= 6 * dt;
      s.mesh.position.x += s.vx * dt;
      s.mesh.position.y += s.vy * dt;
      s.mesh.position.z += s.vz * dt;
      const mat = s.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 1 - s.age / s.life;
      if (s.age >= s.life) {
        this.scene.remove(s.mesh);
        mat.dispose();
        this.sparks.splice(i, 1);
      }
    }
  }
}
