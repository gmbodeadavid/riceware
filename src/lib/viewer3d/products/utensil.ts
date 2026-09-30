import * as THREE from 'three';
import { biocompositeMaterial } from '../textures';
import { clamp01, ss } from '../shapes';
import type { BuildContext, ProductModel } from '../types';

// Axes (metres): X = length (head towards +X), Y = up, Z = width. Profile coordinates `x` are relative to the
// original design; SHIFT recentres the 160 mm utensil on X = 0.
export const SHIFT = 0.031;
export const X_END = -0.111 + SHIFT;
export const X_TIP = 0.049 + SHIFT;
const HALF_THICKNESS = 0.0025 / 2;
export const UTENSIL_TILE = 0.1;

// Handle shared by the fork and the spoon: 11 → 9 mm wide, round end.
export function handleW(x: number) {
  if (x >= -0.1065) {
    const t = clamp01(-x / 0.1065);
    return 0.0055 - 0.001 * t * t;
  }
  const d = x + 0.1065;
  return Math.sqrt(Math.max(0, 0.0045 * 0.0045 - d * d));
}

// The handle rises 8 mm towards its end.
export const handleCurve = (x: number) => (x < 0.02 ? Math.pow((0.02 - x) / 0.131, 2) * 0.008 : 0);

// Reinforcing rib under the handle.
export const handleRib = (X: number, Z: number) => {
  const x = X - SHIFT;
  return 0.0008 * ss(0.005, -0.01, x) * ss(-0.098, -0.085, x) * ss(0.002, 0, Math.abs(Z));
};

export const halfThickness = (width: (X: number) => number) => (X: number) => Math.min(HALF_THICKNESS, width(X));

type SweepOptions = {
  x0: number;
  x1: number;
  rows: number;
  // Points along the flat faces and along each rounded edge.
  nT: number;
  nA: number;
  halfWidth: (X: number) => number;
  centerY: (X: number, Z: number) => number;
  halfThick: (X: number) => number;
  rib?: (X: number, Z: number) => number;
  zc?: number;
  spacing?: 'both' | 'end';
};

// A "stadium" cross-section (flat top, half-round edges) swept along X: gives a soft, moulded solid.
export function sweepGeometry(o: SweepOptions) {
  const { x0, x1, rows, nT, nA, halfWidth, centerY, halfThick, rib, zc = 0, spacing = 'both' } = o;
  const cols = 2 * nT + 2 * nA;
  const positions = new Float32Array(rows * cols * 3);
  const uvs = new Float32Array(rows * cols * 2);
  const indices: number[] = [];

  for (let r = 0; r < rows; r++) {
    const s = r / (rows - 1);
    const f = spacing === 'both' ? 0.5 - 0.5 * Math.cos(Math.PI * s) : Math.sin((Math.PI / 2) * s);
    const X = x0 + (x1 - x0) * f;
    const w = halfWidth(X);
    const h = Math.min(halfThick(X), w);
    const F = Math.max(w - h, 0);
    for (let k = 0; k < cols; k++) {
      let z: number;
      let off: number;
      if (k < nT) {
        z = -F + (2 * F * k) / nT;
        off = h;
      } else if (k < nT + nA) {
        const a = Math.PI / 2 - (Math.PI * (k - nT)) / nA;
        z = F + h * Math.cos(a);
        off = h * Math.sin(a);
      } else if (k < 2 * nT + nA) {
        const i = k - nT - nA;
        z = F - (2 * F * i) / nT;
        off = -h;
      } else {
        const i = k - 2 * nT - nA;
        const a = -Math.PI / 2 - (Math.PI * i) / nA;
        z = -F + h * Math.cos(a);
        off = h * Math.sin(a);
      }
      const Z = zc + z;
      let y = centerY(X, Z) + off;
      if (rib && off < 0 && h > 0) y -= rib(X, Z) * (-off / h);
      const v = r * cols + k;
      positions[v * 3] = X;
      positions[v * 3 + 1] = y;
      positions[v * 3 + 2] = Z;
      uvs[v * 2] = X / UTENSIL_TILE;
      uvs[v * 2 + 1] = Z / UTENSIL_TILE;
    }
  }

  for (let r = 0; r < rows - 1; r++) {
    for (let k = 0; k < cols; k++) {
      const a = r * cols + k;
      const b = r * cols + ((k + 1) % cols);
      const c = (r + 1) * cols + k;
      const d = (r + 1) * cols + ((k + 1) % cols);
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// Resting pose: lower convex hull of the profile, balanced on the edge that sits under the centre of mass.
function restPose(geometries: THREE.BufferGeometry[], density: (X: number) => number) {
  const points: [number, number][] = [];
  for (const geometry of geometries) {
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) points.push([p.getX(i), p.getY(i)]);
  }
  points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const hull: [number, number][] = [];
  for (const point of points) {
    while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], point) <= 0) hull.pop();
    hull.push(point);
  }

  let weight = 0;
  let moment = 0;
  for (let i = 0; i <= 400; i++) {
    const X = X_END + ((X_TIP - X_END) * i) / 400;
    const d = density(X);
    weight += d;
    moment += X * d;
  }
  const centerX = moment / weight;

  let p1 = hull[0];
  let p2 = hull[hull.length - 1];
  for (let i = 0; i < hull.length - 1; i++) {
    if (hull[i][0] <= centerX && hull[i + 1][0] >= centerX) {
      p1 = hull[i];
      p2 = hull[i + 1];
      break;
    }
  }
  const tilt = -Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
  const cs = Math.cos(tilt);
  const sn = Math.sin(tilt);
  let minY = Infinity;
  for (const [x, y] of points) minY = Math.min(minY, x * sn + y * cs);
  return { tilt, restY: -minY };
}

type UtensilConfig = {
  initialDir: THREE.Vector3;
  target: THREE.Vector3;
  radius: number;
};

// A 160 mm utensil on a wide stage: framed by its half-length and half-height rather than by a sphere.
const UTENSIL_HALF = { x: 0.088, y: 0.03 };

// A single utensil lying on the table. Options only move the camera (perspective, top, profile, bottom).
export function createUtensilModel(
  context: BuildContext,
  geometries: THREE.BufferGeometry[],
  density: (X: number) => number,
  config: UtensilConfig,
): ProductModel {
  const material = biocompositeMaterial(context.maps, { normalScale: 0.45, doubleSided: true });
  const pose = restPose(geometries, density);

  const group = new THREE.Group();
  const rest = new THREE.Group();
  group.add(rest);
  for (const geometry of geometries) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = mesh.receiveShadow = true;
    rest.add(mesh);
  }
  rest.rotation.z = pose.tilt;
  rest.position.y = pose.restY;

  const views: Record<string, THREE.Vector3> = {
    perspective: config.initialDir,
    top: new THREE.Vector3(0, 1, 0.02).normalize(),
    profile: new THREE.Vector3(0, 0.12, 1).normalize(),
    bottom: new THREE.Vector3(0, -1, 0.02).normalize(),
  };

  return {
    group,
    initialDir: config.initialDir,
    maxPolarAngle: Math.PI,
    shadow: { width: 0.19, depth: 0.04 },
    frame: () => ({ target: config.target.clone(), radius: config.radius, half: UTENSIL_HALF }),
    view: (option) => views[option] ?? null,
    apply() {},
    dispose() {
      geometries.forEach((geometry) => geometry.dispose());
      material.dispose();
    },
  };
}
