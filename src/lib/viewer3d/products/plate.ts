import * as THREE from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { biocompositeMaterial } from '../textures';
import { lerp } from '../shapes';
import type { BuildContext, ProductModel } from '../types';

// Millimetres, converted to metres at the end of plateProfile().
const R_WELL = 85; // flat floor, Ø 170
const R_RIM = 100; // where the flared rim starts
const R_OUT = 115; // Ø 230
const H_TOTAL = 20;
const THICKNESS = 2.5;
const RIM_SLOPE = THREE.MathUtils.degToRad(8);
const H_FOOT = 2; // foot ring height
const R_FOOT = 70; // foot ring radius
const SEGMENTS = 160;
const TILE = 0.18; // real size covered by one texture tile (m)
const STACK_STEP = 0.006;
const FLIP_LIFT = 0.03;
const PIVOT = H_TOTAL / 2000; // the plate flips around its mid-height
const hiddenY = (k: number) => k * STACK_STEP + 0.12 + k * 0.05;

// One closed cross-section (top surface, rolled edge, underside with foot ring), revolved around the axis.
function plateProfile() {
  const V = (x: number, y: number) => new THREE.Vector2(x, y);
  const t8 = V(Math.cos(RIM_SLOPE), Math.sin(RIM_SLOPE));
  const rEnd = R_OUT - THICKNESS / 2;
  const yRimEnd = H_TOTAL;
  const yRimStart = H_TOTAL - (rEnd - R_RIM) * Math.tan(RIM_SLOPE);
  const yWell = H_FOOT + THICKNESS;

  const top: THREE.Vector2[] = [];
  for (let i = 0; i <= 24; i++) top.push(V((R_WELL * i) / 24, yWell));
  const b0 = V(R_WELL, yWell);
  const b1 = V(R_WELL + 6, yWell);
  const b3 = V(R_RIM, yRimStart);
  const b2 = b3.clone().sub(t8.clone().multiplyScalar(6));
  for (let i = 1; i <= 56; i++) {
    const t = i / 56;
    const u = 1 - t;
    top.push(
      V(
        u * u * u * b0.x + 3 * u * u * t * b1.x + 3 * u * t * t * b2.x + t * t * t * b3.x,
        u * u * u * b0.y + 3 * u * u * t * b1.y + 3 * u * t * t * b2.y + t * t * t * b3.y,
      ),
    );
  }
  for (let i = 1; i <= 24; i++) top.push(b3.clone().lerp(V(rEnd, yRimEnd), i / 24));

  const normals = top.map((_, i) => {
    const a = top[Math.max(i - 1, 0)];
    const b = top[Math.min(i + 1, top.length - 1)];
    const tangent = b.clone().sub(a).normalize();
    return V(-tangent.y, tangent.x);
  });

  const points = [...top];
  const pEnd = top[top.length - 1];
  const nEnd = normals[normals.length - 1];
  const tEnd = V(nEnd.y, -nEnd.x);
  const center = pEnd.clone().sub(nEnd.clone().multiplyScalar(THICKNESS / 2));
  for (let k = 1; k < 20; k++) {
    const theta = (Math.PI * k) / 20;
    points.push(
      center
        .clone()
        .add(nEnd.clone().multiplyScalar((Math.cos(theta) * THICKNESS) / 2))
        .add(tEnd.clone().multiplyScalar((Math.sin(theta) * THICKNESS) / 2)),
    );
  }
  for (let i = top.length - 1; i >= 25; i--) points.push(top[i].clone().sub(normals[i].clone().multiplyScalar(THICKNESS)));

  const foot = (r: number) => {
    const u = Math.abs(r - R_FOOT);
    if (u <= 0.9) return 1;
    if (u < 2.4) return 0.5 + 0.5 * Math.cos((Math.PI * (u - 0.9)) / 1.5);
    return 0;
  };
  const radii: number[] = [];
  for (let r = R_WELL - 1; r > 74; r -= 1) radii.push(r);
  for (let r = 74; r > 66; r -= 0.2) radii.push(r);
  for (let r = 66; r > 0.5; r -= 2) radii.push(r);
  radii.push(0);
  for (const r of radii) points.push(V(r, H_FOOT - H_FOOT * foot(r)));

  return points.map((p) => p.multiplyScalar(0.001));
}

export function createPlate(context: BuildContext): ProductModel {
  const geometry = toCreasedNormals(new THREE.LatheGeometry(plateProfile(), SEGMENTS), THREE.MathUtils.degToRad(40));
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i++) uv.setXY(i, position.getX(i) / TILE, position.getZ(i) / TILE);

  const material = biocompositeMaterial(context.maps, { normalScale: 0.45, doubleSided: true });

  const group = new THREE.Group();
  const flipGroup = new THREE.Group();
  flipGroup.position.y = PIVOT;
  group.add(flipGroup);
  const plate = new THREE.Mesh(geometry, material);
  plate.position.y = -PIVOT;
  plate.castShadow = plate.receiveShadow = true;
  flipGroup.add(plate);

  // Two more identical plates, hidden above the first one until the stack option is picked.
  const extras = [1, 2].map((k) => {
    const holder = new THREE.Group();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = mesh.receiveShadow = true;
    holder.add(mesh);
    holder.visible = false;
    holder.scale.setScalar(0.001);
    holder.position.y = hiddenY(k);
    group.add(holder);
    return holder;
  });

  const state = { flip: 0, stack: 0 };
  let running: ReturnType<typeof context.tweens.add> | null = null;

  const render = () => {
    const lift = FLIP_LIFT * Math.sin(Math.PI * state.flip);
    flipGroup.rotation.x = Math.PI * state.flip;
    flipGroup.position.y = PIVOT + lift;
    extras.forEach((holder, i) => {
      const k = i + 1;
      holder.position.y = lerp(hiddenY(k), k * STACK_STEP, state.stack);
      holder.scale.setScalar(Math.max(0.001, Math.min(1, state.stack * 2.5)));
      holder.visible = state.stack > 0.002;
    });
  };

  return {
    group,
    initialDir: new THREE.Vector3(
      Math.sin(THREE.MathUtils.degToRad(30)) * Math.cos(THREE.MathUtils.degToRad(35)),
      Math.sin(THREE.MathUtils.degToRad(35)),
      Math.cos(THREE.MathUtils.degToRad(30)) * Math.cos(THREE.MathUtils.degToRad(35)),
    ),
    maxPolarAngle: Math.PI,
    shadow: { width: 0.29, depth: 0.29 },
    frame: (option) => ({ target: new THREE.Vector3(0, option === 'stack' ? 0.012 : 0.008, 0), radius: 0.125 }),
    apply(option, animate) {
      const to = { flip: option === 'bottom' ? 1 : 0, stack: option === 'stack' ? 1 : 0 };
      context.tweens.cancel(running);
      if (!animate) {
        Object.assign(state, to);
        render();
        return;
      }
      const from = { ...state };
      running = context.tweens.add({
        duration: 900,
        update: (t) => {
          state.flip = lerp(from.flip, to.flip, t);
          state.stack = lerp(from.stack, to.stack, t);
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
