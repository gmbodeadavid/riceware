import * as THREE from 'three';

// Small deterministic generator: the material looks the same on every load.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Draws a seamless rice-husk composite: marbling, specks, straw fibres and dark flecks, plus its height map.
function drawBiocomposite(size: number) {
  const rnd = mulberry32(2025);
  const color = document.createElement('canvas');
  const height = document.createElement('canvas');
  color.width = color.height = height.width = height.height = size;
  const c = color.getContext('2d');
  const h = height.getContext('2d');
  if (!c || !h) throw new Error('Canvas 2D unavailable');

  c.fillStyle = '#D9B77A';
  c.fillRect(0, 0, size, size);
  h.fillStyle = '#7f7f7f';
  h.fillRect(0, 0, size, size);

  // Every mark is also drawn shifted by one tile so the texture repeats without seams.
  const wrap = (x: number, y: number, margin: number, draw: (X: number, Y: number) => void) => {
    for (const dx of [-size, 0, size]) {
      for (const dy of [-size, 0, size]) {
        const X = x + dx;
        const Y = y + dy;
        if (X > -margin && X < size + margin && Y > -margin && Y < size + margin) draw(X, Y);
      }
    }
  };

  for (let i = 0; i < 70; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 50 + rnd() * 140;
    const light = rnd() > 0.5;
    wrap(x, y, r, (X, Y) => {
      const g = c.createRadialGradient(X, Y, 0, X, Y, r);
      // Soft marbling: kept subtle so it does not read as dirty patches on a large surface.
      g.addColorStop(0, light ? 'rgba(238,210,155,.14)' : 'rgba(170,130,75,.11)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect(X - r, Y - r, r * 2, r * 2);
    });
  }

  for (let i = 0; i < 6000; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 0.3 + rnd() * 1.2;
    const light = rnd() > 0.5;
    wrap(x, y, 3, (X, Y) => {
      c.fillStyle = light ? '#E8C98A' : '#C09A63';
      c.beginPath();
      c.arc(X, Y, r, 0, Math.PI * 2);
      c.fill();
      h.fillStyle = light ? '#9a9a9a' : '#666';
      h.beginPath();
      h.arc(X, Y, r, 0, Math.PI * 2);
      h.fill();
    });
  }

  c.lineCap = 'round';
  h.lineCap = 'round';
  for (let i = 0; i < 800; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const length = 5 + rnd() * 18;
    const angle = rnd() * Math.PI * 2;
    const width = 1 + rnd() * 2.5;
    const light = rnd() > 0.5;
    const ex = Math.cos(angle) * length;
    const ey = Math.sin(angle) * length;
    wrap(x, y, length + 4, (X, Y) => {
      c.globalAlpha = 0.85;
      c.strokeStyle = light ? '#E8C98A' : '#B8914F';
      c.lineWidth = width;
      c.beginPath();
      c.moveTo(X, Y);
      c.lineTo(X + ex, Y + ey);
      c.stroke();
      c.globalAlpha = 1;
      h.strokeStyle = light ? '#d0d0d0' : '#b0b0b0';
      h.lineWidth = width;
      h.beginPath();
      h.moveTo(X, Y);
      h.lineTo(X + ex, Y + ey);
      h.stroke();
    });
  }

  for (let i = 0; i < 300; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const rx = 0.8 + rnd() * 2;
    const ry = 0.5 + rnd();
    const angle = rnd() * Math.PI;
    wrap(x, y, 5, (X, Y) => {
      c.fillStyle = '#6B4E2A';
      c.beginPath();
      c.ellipse(X, Y, rx, ry, angle, 0, Math.PI * 2);
      c.fill();
      h.fillStyle = '#4a4a4a';
      h.beginPath();
      h.ellipse(X, Y, rx, ry, angle, 0, Math.PI * 2);
      h.fill();
    });
  }

  return { color, height };
}

// Turns a height map into a tangent-space normal map (the grain you see under raking light).
function heightToNormal(source: HTMLCanvasElement, strength: number) {
  const size = source.width;
  const context = source.getContext('2d');
  if (!context) throw new Error('Canvas 2D unavailable');
  const pixels = context.getImageData(0, 0, size, size).data;
  const heights = new Float32Array(size * size);
  for (let i = 0; i < size * size; i++) heights[i] = pixels[i * 4] / 255;

  const out = document.createElement('canvas');
  out.width = out.height = size;
  const outContext = out.getContext('2d');
  if (!outContext) throw new Error('Canvas 2D unavailable');
  const image = outContext.createImageData(size, size);
  const data = image.data;

  for (let y = 0; y < size; y++) {
    const up = ((y - 1 + size) % size) * size;
    const down = ((y + 1) % size) * size;
    const row = y * size;
    for (let x = 0; x < size; x++) {
      const left = (x - 1 + size) % size;
      const right = (x + 1) % size;
      const dx = (heights[row + right] - heights[row + left]) * strength;
      const dy = (heights[down + x] - heights[up + x]) * strength;
      const inv = 1 / Math.hypot(dx, dy, 1);
      const i = (row + x) * 4;
      data[i] = (-dx * inv * 0.5 + 0.5) * 255;
      data[i + 1] = (dy * inv * 0.5 + 0.5) * 255;
      data[i + 2] = (inv * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  outContext.putImageData(image, 0, 0);
  return out;
}

export type BiocompositeMaps = {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  dispose: () => void;
};

export function createBiocompositeMaps(anisotropy: number): BiocompositeMaps {
  const { color, height } = drawBiocomposite(1024);
  const setup = (texture: THREE.CanvasTexture, srgb: boolean) => {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = anisotropy;
    if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };
  const map = setup(new THREE.CanvasTexture(color), true);
  const normalMap = setup(new THREE.CanvasTexture(heightToNormal(height, 2.5)), false);
  return {
    map,
    normalMap,
    dispose() {
      map.dispose();
      normalMap.dispose();
    },
  };
}

export function biocompositeMaterial(
  maps: BiocompositeMaps,
  { normalScale = 0.45, doubleSided = false }: { normalScale?: number; doubleSided?: boolean } = {},
) {
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: maps.map,
    normalMap: maps.normalMap,
    normalScale: new THREE.Vector2(normalScale, normalScale),
    roughness: 0.92,
    metalness: 0,
    side: doubleSided ? THREE.DoubleSide : THREE.FrontSide,
  });
}
