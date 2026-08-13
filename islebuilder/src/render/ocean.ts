import * as THREE from 'three';
import { toWorld3 } from '../core/world3d.ts';

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vWorldPos;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    // Lógico: x = world.x, y = -world.z
    vWorldPos = vec2(worldPosition.x, -worldPosition.z);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  varying vec2 vWorldPos;

  uniform float uTime;
  uniform vec3 uColorBase;
  uniform vec3 uColorDeep;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  void main() {
    vec2 p = vWorldPos * 0.012;

    float n1 = valueNoise(p * 1.3 + vec2(uTime * 0.015, uTime * 0.008));
    float n2 = valueNoise(p * 3.1 - vec2(uTime * 0.02, -uTime * 0.011));
    float waves = n1 * 0.65 + n2 * 0.35;
    float wavesSoft = 0.25 + waves * 0.5;

    float angle = radians(-25.0);
    float diag = vWorldPos.x * cos(angle) - vWorldPos.y * sin(angle);
    float stripePhase = fract(diag * 0.01 - uTime * 0.03);
    float stripe = smoothstep(0.92, 0.995, stripePhase) * 0.05;

    vec3 color = mix(uColorDeep, uColorBase, wavesSoft);
    color += stripe;

    gl_FragColor = vec4(color, 1.0);
  }
`;

/**
 * Oceano no plano XZ (Y = -0.05), segue o look-at lógico da câmera.
 */
export class Ocean {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;
  private time = 0;

  constructor() {
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.rotateX(-Math.PI / 2);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uColorBase: { value: new THREE.Color('#4fb8c9') },
        uColorDeep: { value: new THREE.Color('#1f7a95') },
      },
      depthWrite: false,
      depthTest: true,
    });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.y = -0.05;
    this.mesh.renderOrder = -1;
    this.mesh.receiveShadow = true;
  }

  update(dt: number, cameraX: number, cameraY: number, halfViewWidth: number, halfViewHeight: number): void {
    this.time += dt;
    this.material.uniforms['uTime'].value = this.time;

    const coverageMargin = 2.2;
    const size = Math.max(halfViewWidth, halfViewHeight) * 2 * coverageMargin;
    this.mesh.scale.set(size, 1, size);
    const p = toWorld3(cameraX, cameraY, -0.05);
    this.mesh.position.set(p.x, p.y, p.z);
  }
}
