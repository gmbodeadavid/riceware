import * as THREE from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { biocompositeMaterial } from '../textures';
import { lerp } from '../shapes';
import type { BuildContext, ProductModel } from '../types';

// Metres.
const LIP_CENTER = new THREE.Vector2(0.0378, 0.0928); // rolled rim, Ø 80
const LIP_RADIUS = 0.0022;
const WALL_Y0 = 0.0015;
const WALL_R0 = 0.0275; // bottom of the wall, Ø 55
const WALL_SLOPE = (LIP_CENTER.x - WALL_R0) / (LIP_CENTER.y - LIP_RADIUS - WALL_Y0);
const outerRadius = (y: number) => WALL_R0 + WALL_SLOPE * (y - WALL_Y0);
const STACK_STEP = 0.023;
const TILE_U = 2;
const TILE_V = 0.11;
const TARGET_SINGLE = new THREE.Vector3(0, 0.047, 0);
const TARGET_STACK = new THREE.Vector3(0, 0.07, 0);
const hiddenY = (k: number) => k * STACK_STEP + 0.14 + k * 0.05;

// Outer base with a stacking ring, tapered wall, rolled lip, inner wall and filleted floor.
function cupProfile() {
  const points: THREE.Vector2[] = [];
  const v = (x: number, y: number) => points.push(new THREE.Vector2(x, y));
  v(0, 0.003);
  v(0.0215, 0.003);
  v(0.0232, 0.0026);
  v(0.0244, 0.0017);
  v(0.0251, 0.0006);
  v(0.0256, 0);
  v(0.0266, 0);
  v(0.0271, 0.0002);
  v(0.0274, 0.0007);
  v(WALL_R0, WALL_Y0);
  v(outerRadius(0.03), 0.03);
  v(outerRadius(0.06), 0.06);
  const steps = 22;
  for (let i = 0; i <= steps; i++) {
    const a = -Math.PI / 2 + (i / steps) * (Math.PI * 1.5);
    v(LIP_CENTER.x + LIP_RADIUS * Math.cos(a), LIP_CENTER.y + LIP_RADIUS * Math.sin(a));
  }
  v(0.031, 0.05);
  v(0.0262, 0.0075);
  v(0.0258, 0.0062);
  v(0.025, 0.0053);
  v(0.0238, 0.005);
  v(0, 0.005);
  return points;
}

function cupGeometry() {
  const points = cupProfile();
  const segments = 128;
  const geometry = new THREE.LatheGeometry(points, segments, Math.PI);
  // UVs follow the real arc length so the fibres have the same size everywhere.
  const cumulative = [0];
  for (let j = 1; j < points.length; j++) cumulative[j] = cumulative[j - 1] + points[j].distanceTo(points[j - 1]);
  const uv = geometry.attributes.uv;
  for (let i = 0; i <= segments; i++) {
    for (let j = 0; j < points.length; j++) uv.setXY(i * points.length + j, (i / segments) * TILE_U, cumulative[j] / TILE_V);
  }
  return toCreasedNormals(geometry, THREE.MathUtils.degToRad(40));
}

export function createCup(context: BuildContext): ProductModel {
  const geometry = cupGeometry();
  const material = biocompositeMaterial(context.maps, { normalScale: 0.5, doubleSided: true });

  const group = new THREE.Group();
  const cups = [0, 1, 2].map((k) => {
    const holder = new THREE.Group();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = mesh.receiveShadow = true;
    holder.add(mesh);
    if (k > 0) {
      holder.visible = false;
      holder.scale.setScalar(0.001);
      holder.position.y = hiddenY(k);
    }
    group.add(holder);
    return holder;
  });

  let stack = 0;
  let running: ReturnType<typeof context.tweens.add> | null = null;
  const render = () => {
    cups.forEach((holder, k) => {
      if (k === 0) return;
      holder.position.y = lerp(hiddenY(k), k * STACK_STEP, stack);
      holder.scale.setScalar(Math.max(0.001, Math.min(1, stack * 2.5)));
      holder.visible = stack > 0.002;
    });
  };

  return {
    group,
    initialDir: new THREE.Vector3(0.32, 0.3, 0.9).normalize(),
    maxPolarAngle: Math.PI / 2 + THREE.MathUtils.degToRad(10), // lets the stacking ring show
    shadow: { width: 0.1, depth: 0.1 },
    frame: (option) =>
      option === 'stack' ? { target: TARGET_STACK.clone(), radius: 0.1 } : { target: TARGET_SINGLE.clone(), radius: 0.08 },
    apply(option, animate) {
      const to = option === 'stack' ? 1 : 0;
      context.tweens.cancel(running);
      if (!animate) {
        stack = to;
        render();
        return;
      }
      const from = stack;
      running = context.tweens.add({
        duration: 800,
        update: (t) => {
          stack = lerp(from, to, t);
          render();
        },
      });
    },
    dispose() {
      context.tweens.cancel(running);
      geometry.dispose();
      material.dispose();
    },
  };
}
