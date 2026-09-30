import * as THREE from 'three';
import { ss } from '../shapes';
import {
  SHIFT,
  X_END,
  X_TIP,
  createUtensilModel,
  handleCurve,
  handleRib,
  handleW,
  halfThickness,
  sweepGeometry,
} from './utensil';
import type { BuildContext, ProductModel } from '../types';

const X_ROOT = 0.024; // where the tines start (profile coordinates)
const TINES = [-0.010875, -0.003625, 0.003625, 0.010875]; // four 4.25 mm tines, 3 mm gaps

// Handle, then a palm that widens into the head.
function bodyWidth(X: number) {
  const x = X - SHIFT;
  if (x < 0) return handleW(x);
  if (x < X_ROOT) return 0.0055 + 0.0075 * ss(0, 0.017, x);
  const e = (x - X_ROOT) / 0.003;
  return e < 1 ? 0.013 * Math.sqrt(1 - e * e) : 0;
}

function tineWidth(X: number) {
  const x = X - SHIFT;
  const r = 0.00183;
  const c = 0.049 - r;
  if (x > c) return Math.sqrt(Math.max(0, r * r - (x - c) * (x - c))); // rounded tip
  return 0.002125 - 0.0003 * ss(0.024, 0.049, x);
}

// Centre line: the handle rises, the tines curve up by 4 mm and the head is slightly dished.
function centerY(X: number, Z: number) {
  const x = X - SHIFT;
  let c = handleCurve(x);
  if (x > 0.012) c += Math.pow(Math.min((x - 0.012) / 0.037, 1.2), 1.5) * 0.004;
  c += 0.0012 * Math.min((Z / 0.013) ** 2, 1.2) * ss(0.004, 0.02, x);
  return c;
}

// Thicknesses differ by 5 % where the palm and the tines overlap, which avoids flickering faces.
const bodyHalfThick = (X: number) =>
  Math.min(halfThickness(bodyWidth)(X) * (1 - 0.05 * ss(X_ROOT - 0.0025, X_ROOT - 0.001, X - SHIFT)), bodyWidth(X));
const tineHalfThick = (X: number) =>
  Math.min(halfThickness(tineWidth)(X) * (0.95 + 0.05 * ss(X_ROOT - 0.003, X_ROOT - 0.0015, X - SHIFT)), tineWidth(X));

export function createFork(context: BuildContext): ProductModel {
  const body = sweepGeometry({
    x0: X_END,
    x1: X_ROOT + 0.003 + SHIFT,
    rows: 280,
    nT: 40,
    nA: 12,
    halfWidth: bodyWidth,
    centerY,
    halfThick: bodyHalfThick,
    rib: handleRib,
  });
  const tines = TINES.map((zc) =>
    sweepGeometry({
      x0: 0.021 + SHIFT,
      x1: X_TIP,
      rows: 90,
      nT: 8,
      nA: 10,
      halfWidth: tineWidth,
      centerY,
      halfThick: tineHalfThick,
      zc,
      spacing: 'end',
    }),
  );

  const density = (X: number) => bodyWidth(X) + (X - SHIFT > X_ROOT ? 4 * tineWidth(X) : 0);

  return createUtensilModel(context, [body, ...tines], density, {
    initialDir: new THREE.Vector3(0.3, 0.6, 0.75).normalize(),
    target: new THREE.Vector3(0, 0.006, 0),
    radius: 0.09,
  });
}
