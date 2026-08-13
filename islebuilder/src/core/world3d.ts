import * as THREE from 'three';

/** Chão lógico do Isle Builder em 3D: Y = altura, Z = −Y lógico (Norte). */
export const GROUND_Y = 0;

/** Converte coordenadas lógicas 2D (x leste, y norte) → Vector3 mundo. */
export function toWorld3(x: number, y: number, height = GROUND_Y): THREE.Vector3 {
  return new THREE.Vector3(x, height, -y);
}

/** Converte ponto 3D de volta ao plano lógico (ignora altura). */
export function fromWorld3(v: { x: number; y: number; z: number }): { x: number; y: number } {
  return { x: v.x, y: -v.z };
}

const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -GROUND_Y);
const _raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _hit = new THREE.Vector3();

/**
 * Raycast do ponteiro (CSS px) no plano do chão Y=0.
 * Retorna coordenadas lógicas, ou null se o raio não intersecta.
 */
export function screenToLogicalGround(
  camera: THREE.Camera,
  screenX: number,
  screenY: number,
  viewportWidth: number,
  viewportHeight: number,
): { x: number; y: number } | null {
  _ndc.x = (screenX / viewportWidth) * 2 - 1;
  _ndc.y = -((screenY / viewportHeight) * 2 - 1);
  _raycaster.setFromCamera(_ndc, camera);
  const hit = _raycaster.ray.intersectPlane(_groundPlane, _hit);
  if (!hit) return null;
  return fromWorld3(hit);
}
