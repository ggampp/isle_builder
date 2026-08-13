import * as THREE from 'three';

function paint(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d');
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function heroFrame(dir: 's' | 'n' | 'e' | 'w'): THREE.CanvasTexture {
  return paint(16, 24, (ctx) => {
    ctx.clearRect(0, 0, 16, 24);
    const flip = dir === 'e';
    const hair = '#e8c45a';
    const hairDark = '#c9a040';
    const skin = '#f0c9a0';
    const tunic = '#3a2a22';
    const gold = '#d4b14a';
    const boot = '#2a1c14';
    const side = dir === 'e' || dir === 'w';

    px(ctx, 6, 20, 4, 3, boot);
    px(ctx, 5, 12, 6, 8, tunic);
    px(ctx, 6, 14, 4, 2, gold);
    px(ctx, 5, 5, 6, 7, skin);
    px(ctx, 4, 3, 8, 6, hair);
    px(ctx, 5, 1, 6, 3, hair);
    if (dir === 's') {
      px(ctx, 11, 2, 3, 8, hair);
      px(ctx, 12, 8, 2, 5, hairDark);
      px(ctx, 6, 8, 1, 1, '#2a2018');
      px(ctx, 9, 8, 1, 1, '#2a2018');
      px(ctx, 7, 10, 2, 1, '#c07070');
    } else if (dir === 'n') {
      px(ctx, 11, 2, 3, 9, hair);
      px(ctx, 4, 2, 8, 5, hair);
    } else {
      px(ctx, flip ? 2 : 11, 3, 3, 9, hair);
      px(ctx, flip ? 3 : 11, 8, 2, 6, hairDark);
      px(ctx, flip ? 9 : 6, 8, 1, 1, '#2a2018');
    }
    if (side) {
      px(ctx, flip ? 10 : 5, 13, 2, 5, '#4a3428');
    }
  });
}

function slimeTex(color: string, eye = '#1a1a18'): THREE.CanvasTexture {
  return paint(16, 16, (ctx) => {
    ctx.clearRect(0, 0, 16, 16);
    px(ctx, 3, 6, 10, 8, color);
    px(ctx, 4, 4, 8, 3, color);
    px(ctx, 5, 3, 6, 2, color);
    px(ctx, 5, 7, 2, 2, eye);
    px(ctx, 9, 7, 2, 2, eye);
    px(ctx, 5, 7, 1, 1, '#f4f4f0');
    px(ctx, 9, 7, 1, 1, '#f4f4f0');
    px(ctx, 6, 4, 3, 2, 'rgba(255,255,255,0.45)');
  });
}

function golemTex(): THREE.CanvasTexture {
  return paint(20, 26, (ctx) => {
    ctx.clearRect(0, 0, 20, 26);
    px(ctx, 5, 14, 10, 10, '#6b5340');
    px(ctx, 4, 6, 12, 10, '#7a5e44');
    px(ctx, 6, 2, 8, 6, '#8a6a4c');
    px(ctx, 5, 8, 3, 2, '#3a2a18');
    px(ctx, 12, 8, 3, 2, '#3a2a18');
    px(ctx, 8, 12, 4, 2, '#c8a040');
    px(ctx, 3, 16, 3, 6, '#5a8a3a');
    px(ctx, 14, 15, 3, 5, '#4e7a32');
  });
}

export type Facing = 's' | 'n' | 'e' | 'w';

export class SpriteKit {
  readonly hero = {
    s: makeSprite(heroFrame('s'), 0.95, 1.42),
    n: makeSprite(heroFrame('n'), 0.95, 1.42),
    e: makeSprite(heroFrame('e'), 0.95, 1.42),
    w: makeSprite(heroFrame('w'), 0.95, 1.42),
  };
  readonly slime = makeSprite(slimeTex('#7ad65a'), 0.95, 0.95);
  readonly ghost = makeSprite(slimeTex('#9ae0d8'), 0.95, 0.95);
  readonly golem = makeSprite(golemTex(), 1.28, 1.62);

  facingFrom(dx: number, dz: number): Facing {
    if (Math.abs(dx) > Math.abs(dz)) return dx >= 0 ? 'e' : 'w';
    return dz >= 0 ? 's' : 'n';
  }
}

function makeSprite(map: THREE.Texture, w: number, h: number): THREE.Sprite {
  const mat = new THREE.SpriteMaterial({
    map,
    transparent: true,
    depthWrite: false,
    alphaTest: 0.15,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(w, h, 1);
  sprite.center.set(0.5, 0);
  sprite.castShadow = false;
  return sprite;
}

export function cloneSprite(src: THREE.Sprite): THREE.Sprite {
  const sprite = new THREE.Sprite((src.material as THREE.SpriteMaterial).clone());
  sprite.scale.copy(src.scale);
  sprite.center.copy(src.center);
  return sprite;
}
