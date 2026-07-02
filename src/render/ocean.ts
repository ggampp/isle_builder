import * as THREE from 'three';

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vWorldPos;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPosition.xy;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

// Ruído de valor (hash-based) barato o suficiente para 2 octaves por pixel;
// cria o "borbulhar" sutil da água profunda visto no vídeo de referência.
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

    // Listras diagonais de correnteza, bem sutis (referência: água profunda do vídeo).
    float angle = radians(-25.0);
    float diag = vWorldPos.x * cos(angle) - vWorldPos.y * sin(angle);
    float stripePhase = fract(diag * 0.01 - uTime * 0.03);
    float stripe = smoothstep(0.88, 0.99, stripePhase) * 0.12;

    vec3 color = mix(uColorDeep, uColorBase, wavesSoft);
    color += stripe;

    gl_FragColor = vec4(color, 1.0);
  }
`;

/**
 * Plano de oceano "infinito": reposicionado e redimensionado para sempre
 * cobrir o viewport atual, mas o shader avalia a cor em coordenadas de
 * mundo reais (vWorldPos) — o padrão permanece estável durante pan/zoom.
 */
export class Ocean {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;
  private time = 0;

  constructor() {
    const geometry = new THREE.PlaneGeometry(1, 1);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uColorBase: { value: new THREE.Color('#1c5c93') },
        uColorDeep: { value: new THREE.Color('#0d2b4a') },
      },
      depthWrite: false,
      depthTest: false,
    });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.z = -10;
    this.mesh.renderOrder = -1;
  }

  update(dt: number, cameraX: number, cameraY: number, halfViewWidth: number, halfViewHeight: number): void {
    this.time += dt;
    this.material.uniforms['uTime'].value = this.time;

    const coverageMargin = 1.5;
    this.mesh.scale.set(halfViewWidth * 2 * coverageMargin, halfViewHeight * 2 * coverageMargin, 1);
    this.mesh.position.x = cameraX;
    this.mesh.position.y = cameraY;
  }
}
