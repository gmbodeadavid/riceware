import * as THREE from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { biocompositeMaterial } from '../textures';
import { easings } from '../tween';
import { lerp, scaleUV } from '../shapes';
import type { BuildContext, ProductModel } from '../types';

// Metres.
const W = 0.23;
const D = 0.15;
const H = 0.07;
const T = 0.0025; // wall thickness
const R = 0.018; // corner radius
const HL = 0.02; // lid height
const FOOT = 0.0015;
const HB = H - HL - FOOT; // base height
const FL = 0.004; // rim width
const TAPER = 0.93; // wall draft
const OPEN = THREE.MathUtils.degToRad(110);
const TILE = 0.14;

function roundedRect(w: number, d: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -d / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + d - r);
  s.absarc(x + w - r, y + d - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + d);
  s.absarc(x + r, y + d - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

function extrudeUp(shapes: THREE.Shape | THREE.Shape[], height: number, bevel: number) {
  const geometry = new THREE.ExtrudeGeometry(shapes, {
    depth: height,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 24,
  });
  geometry.rotateX(-Math.PI / 2); // extrude towards +Y
  return geometry;
}

function ringGeometry(w: number, d: number, r: number, t: number, height: number, bevel = 0.0006) {
  const shape = roundedRect(w, d, r);
  shape.holes.push(roundedRect(w - 2 * t, d - 2 * t, Math.max(r - t, 0.001)));
  return extrudeUp(shape, height, bevel);
}

const slabGeometry = (w: number, d: number, r: number, height: number, bevel = 0.0006) =>
  extrudeUp(roundedRect(w, d, r), height, bevel);

// Narrows the shape from `s0` at y0 to `s1` at y1: gives the walls their draft.
function taper(geometry: THREE.BufferGeometry, y0: number, y1: number, s0: number, s1: number) {
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = THREE.MathUtils.clamp((p.getY(i) - y0) / (y1 - y0), 0, 1);
    const s = s0 + (s1 - s0) * t;
    p.setX(i, p.getX(i) * s);
    p.setZ(i, p.getZ(i) * s);
  }
  return geometry;
}

// Smooth shading and a texture scale that does not depend on the shape's size.
function smooth(geometry: THREE.BufferGeometry) {
  scaleUV(geometry, 1 / TILE);
  return toCreasedNormals(geometry, THREE.MathUtils.degToRad(35));
}

export function createTray(context: BuildContext): ProductModel {
  const material = biocompositeMaterial(context.maps, { normalScale: 0.5 });
  const geometries: THREE.BufferGeometry[] = [];
  const group = new THREE.Group();
  const tray = new THREE.Group();
  tray.position.y = FOOT;
  group.add(tray);

  const add = (geometry: THREE.BufferGeometry, parent: THREE.Object3D) => {
    geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // Base: drafted walls, floor, rim and foot ring.
  add(smooth(taper(ringGeometry(W, D, R, T, HB), 0, HB, TAPER, 1)), tray);
  add(smooth(taper(slabGeometry(W, D, R, T), 0, HB, TAPER, 1)), tray);
  let g = ringGeometry(W + 2 * FL, D + 2 * FL, R + FL, FL + T, 0.0016, 0.0005);
  g.translate(0, HB - 0.0016, 0);
  add(smooth(g), tray);
  g = ringGeometry(W * TAPER * 0.9, D * TAPER * 0.88, R * 0.8, 0.003, FOOT, 0.0004);
  g.translate(0, -FOOT + 0.0004, 0);
  add(smooth(g), tray);

  // Integrated hinge.
  const hinge = new THREE.CylinderGeometry(0.0019, 0.0019, W * 0.78, 24);
  hinge.rotateZ(Math.PI / 2);
  scaleUV(hinge, 1 / TILE);
  add(hinge, tray).position.set(0, HB + 0.0004, -(D / 2 + FL) - 0.0006);

  // Lid, pivoting on the back edge.
  const LW = W + 2 * FL;
  const LD = D + 2 * FL;
  const LR = R + FL;
  const pivot = new THREE.Group();
  pivot.position.set(0, HB, -(D / 2 + FL));
  tray.add(pivot);
  const lid = new THREE.Group();
  lid.position.z = LD / 2;
  pivot.add(lid);
  add(smooth(taper(ringGeometry(LW, LD, LR, T, HL), 0, HL, 1, 0.965)), lid);
  g = slabGeometry(LW, LD, LR, T);
  g.translate(0, HL - T, 0);
  add(smooth(taper(g, 0, HL, 1, 0.965)), lid);
  g = slabGeometry(LW * 0.965 - 0.026, LD * 0.965 - 0.026, R * 0.7, 0.0008, 0.0003);
  g.translate(0, HL, 0);
  add(smooth(g), lid);
  // Closing tab.
  g = slabGeometry(0.024, 0.0022, 0.0009, 0.01, 0.0004);
  g.translate(0, -0.0065, LD / 2 + 0.0011);
  add(smooth(g), lid);

  let running: ReturnType<typeof context.tweens.add> | null = null;

  return {
    group,
    initialDir: new THREE.Vector3(0.55, 0.42, 0.72).normalize(),
    maxPolarAngle: THREE.MathUtils.degToRad(84),
    shadow: { width: W * 1.45, depth: D * 1.6 },
    frame: (option) =>
      option === 'open'
        ? { target: new THREE.Vector3(0, 0.085, 0), radius: 0.17 }
        : { target: new THREE.Vector3(0, H * 0.45, 0), radius: 0.155 },
    apply(option, animate) {
      const to = option === 'open' ? -OPEN : 0;
      context.tweens.cancel(running);
      if (!animate) {
        pivot.rotation.x = to;
        return;
      }
      const from = pivot.rotation.x;
      running = context.tweens.add({
        duration: 700,
        ease: option === 'open' ? easings.outBack : easings.inOutCubic,
        update: (t) => {
          pivot.rotation.x = lerp(from, to, t);
        },
      });
    },
    dispose() {
      context.tweens.cancel(running);
      geometries.forEach((geometry) => geometry.dispose());
      material.dispose();
    },
  };
}
