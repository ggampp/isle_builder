import * as THREE from 'three';
import { SIZE, isWater } from '../sim/world.ts';

const VERT = `
  varying vec3 vWorld;
  void main() {
    vec4 world = vec4(position, 1.0);
    #ifdef USE_INSTANCING
      world = instanceMatrix * world;
    #endif
    world = modelMatrix * world;
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const FRAG = `
  uniform float uTime;
  varying vec3 vWorld;
  void main() {
    float waves = sin(vWorld.x * 3.4 + uTime * 1.5) * 0.5
      + sin(vWorld.z * 2.8 - uTime * 1.15) * 0.5;
    vec3 deep = vec3(0.22, 0.62, 0.82);
    vec3 shallow = vec3(0.62, 0.90, 0.96);
    vec3 col = mix(deep, shallow, waves * 0.35 + 0.55);
    float sparkle = pow(max(0.0, sin(vWorld.x * 11.0 + vWorld.z * 9.0 + uTime * 3.0)), 8.0);
    col += vec3(0.22, 0.28, 0.32) * sparkle;
    gl_FragColor = vec4(col, 0.82);
  }
`;

export function createWater(): { mesh: THREE.InstancedMesh; uniforms: { uTime: { value: number } } } {
  const cells: { x: number; z: number }[] = [];
  for (let z = 0; z < SIZE; z++) {
    for (let x = 0; x < SIZE; x++) {
      if (isWater(x, z)) cells.push({ x, z });
    }
  }
  const uniforms = { uTime: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
  });
  const geo = new THREE.PlaneGeometry(1.08, 1.08);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, cells.length));
  mesh.renderOrder = 2;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (!cell) continue;
    dummy.position.set(cell.x + 0.5, 0.34, cell.z + 0.5);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return { mesh, uniforms };
}
