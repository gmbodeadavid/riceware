import * as THREE from 'three';
import { smax, ss } from '../shapes';
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

const BOWL = { x: 0.025, rx: 0.024, rz: 0.014, depth: 0.006 };

// Elliptical bowl blended into the handle.
function spoonWidth(X: number) {
  const x = X - SHIFT;
  const eb = (x - BOWL.x) / BOWL.rx;
  const wb = Math.abs(eb) < 1 ? BOWL.rz * Math.sqrt(1 - eb * eb) : 0;
  const wh = x <= 0.02 ? handleW(x) * (1 - ss(0.008, 0.02, x)) : 0;
  return x > -0.012 && x < 0.018 ? smax(wb, wh, 0.004) : Math.max(wb, wh);
}

// Centre line: the handle rises and the bowl is hollowed out.
function centerY(X: number, Z: number) {
  const x = X - SHIFT;
  let c = handleCurve(x);
  const dx = (x - BOWL.x) / BOWL.rx;
  const dz = Z / BOWL.rz;
  const d2 = dx * dx + dz * dz;
  if (d2 < 1) c -= BOWL.depth * Math.pow(1 - d2, 1.4);
  return c;
}

export function createSpoon(context: BuildContext): ProductModel {
  const geometry = sweepGeometry({
    x0: X_END,
    x1: X_TIP,
    rows: 300,
    nT: 44,
    nA: 12,
    halfWidth: spoonWidth,
    centerY,
    halfThick: halfThickness(spoonWidth),
    rib: handleRib,
  });

  return createUtensilModel(context, [geometry], spoonWidth, {
    initialDir: new THREE.Vector3(0.35, 0.55, 0.75).normalize(),
    target: new THREE.Vector3(0, 0.007, 0),
    radius: 0.088,
  });
}
