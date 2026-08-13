import * as THREE from 'three';

const loader = new THREE.TextureLoader();

function canvasFallback(kind: 'wood' | 'adobe' | 'sand' | 'steel' | 'sky'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  if (kind === 'sky') {
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#8eb7d8');
    g.addColorStop(0.55, '#c5d8ea');
    g.addColorStop(1, '#efe6d2');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  } else if (kind === 'wood') {
    ctx.fillStyle = '#8d5a32';
    ctx.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 16) {
      ctx.fillStyle = y % 32 === 0 ? '#7a4a28' : '#a06a3c';
      ctx.fillRect(0, y, 128, 14);
      ctx.fillStyle = 'rgba(40,20,8,0.25)';
      ctx.fillRect(0, y + 13, 128, 2);
    }
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = `rgba(30,12,4,${Math.random() * 0.18})`;
      ctx.fillRect(Math.random() * 128, Math.random() * 128, 3, 1);
    }
  } else if (kind === 'adobe') {
    ctx.fillStyle = '#c8a57a';
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 220; i++) {
      ctx.fillStyle = `rgba(${180 + Math.random() * 40},${140 + Math.random() * 30},${90 + Math.random() * 20},${0.15 + Math.random() * 0.2})`;
      ctx.fillRect(Math.random() * 128, Math.random() * 128, 4, 4);
    }
  } else if (kind === 'sand') {
    ctx.fillStyle = '#d2b48c';
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = `rgba(90,60,30,${Math.random() * 0.2})`;
      ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
    }
  } else {
    ctx.fillStyle = '#4e545c';
    ctx.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 3) {
      ctx.fillStyle = `rgba(255,255,255,${0.03 + (y % 6) * 0.01})`;
      ctx.fillRect(0, y, 128, 1);
    }
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = 'rgba(20,20,24,0.25)';
      ctx.beginPath();
      ctx.moveTo(Math.random() * 128, Math.random() * 128);
      ctx.lineTo(Math.random() * 128, Math.random() * 128);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function loadOrFallback(file: string, kind: 'wood' | 'adobe' | 'sand' | 'steel' | 'sky'): THREE.Texture {
  const fallback = canvasFallback(kind);
  const url = `${import.meta.env.BASE_URL}assets/textures/${file}`;
  const tex = loader.load(
    url,
    (t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
    },
    undefined,
    () => {
      tex.image = fallback.image;
      tex.needsUpdate = true;
    },
  );
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function loadWorldTextures(): Record<'wood' | 'adobe' | 'sand' | 'steel' | 'sky', THREE.Texture> {
  return {
    wood: loadOrFallback('wood.png', 'wood'),
    adobe: loadOrFallback('adobe.png', 'adobe'),
    sand: loadOrFallback('sand.png', 'sand'),
    steel: loadOrFallback('steel.png', 'steel'),
    sky: loadOrFallback('sky.png', 'sky'),
  };
}
