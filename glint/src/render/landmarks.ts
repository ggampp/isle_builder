import * as THREE from 'three';
import { CRYSTALS, FLOWERS, SIZE, STONE, surfaceY } from '../sim/world.ts';

export function placeLandmarks(scene: THREE.Scene): THREE.PointLight[] {
  const lights: THREE.PointLight[] = [];

  const stone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.32, 1.7, 6),
    new THREE.MeshLambertMaterial({ color: 0x4a4a52 }),
  );
  stone.position.set(STONE.x, surfaceY(STONE.x, STONE.z) + 0.85, STONE.z);
  stone.castShadow = true;
  scene.add(stone);

  const crystalGeo = new THREE.OctahedronGeometry(0.38, 0);
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x6ec8ff,
    emissive: 0x3aa0ff,
    emissiveIntensity: 1.4,
    roughness: 0.25,
    metalness: 0.15,
    transparent: true,
    opacity: 0.92,
  });

  for (const c of CRYSTALS) {
    const mesh = new THREE.Mesh(crystalGeo, crystalMat);
    const y = surfaceY(c.x, c.z) + 0.85;
    mesh.position.set(c.x, y, c.z);
    mesh.name = `crystal-${c.x}`;
    scene.add(mesh);
    const glow = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.85, 24),
      new THREE.MeshBasicMaterial({
        color: 0xe8f4ff,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(c.x, surfaceY(c.x, c.z) + 0.06, c.z);
    scene.add(glow);
    const light = new THREE.PointLight(0x7ec8ff, 1.6, 7, 2);
    light.position.set(c.x, y, c.z);
    scene.add(light);
    lights.push(light);
  }

  const flowerGeo = new THREE.SphereGeometry(0.08, 6, 4);
  const flowerMat = new THREE.MeshBasicMaterial({ color: 0xf4f0ff });
  for (const f of FLOWERS) {
    const y = surfaceY(f.x, f.z) + 0.12;
    for (let i = 0; i < 4; i++) {
      const bloom = new THREE.Mesh(flowerGeo, flowerMat);
      bloom.position.set(f.x + (i % 2) * 0.18 - 0.08, y, f.z + Math.floor(i / 2) * 0.18 - 0.08);
      scene.add(bloom);
    }
  }

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(80, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xa8cce8, side: THREE.BackSide, fog: false }),
  );
  sky.position.set(SIZE / 2, 0, SIZE / 2);
  scene.add(sky);

  return lights;
}

export function bobCrystals(scene: THREE.Scene, time: number): void {
  for (const child of scene.children) {
    if (child.name.startsWith('crystal-') && child instanceof THREE.Mesh) {
      const base = Number.parseFloat(child.name.slice('crystal-'.length));
      child.position.y = surfaceY(child.position.x, child.position.z) + 0.85 + Math.sin(time * 2 + base) * 0.12;
      child.rotation.y = time * 0.8;
    }
  }
}
