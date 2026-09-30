import type * as THREE from 'three';

export const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Smoothstep between two edges.
export const ss = (e0: number, e1: number, v: number) => {
  const t = clamp01((v - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

// Smooth maximum: blends two profiles without a visible crease.
export const smax = (a: number, b: number, k: number) => {
  const h = clamp01(0.5 + (0.5 * (a - b)) / k);
  return b + (a - b) * h + k * h * (1 - h);
};

// Rescales UV coordinates so one texture tile always covers the same real-world size.
export function scaleUV(geometry: THREE.BufferGeometry, factor: number) {
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * factor, uv.getY(i) * factor);
  return geometry;
}
