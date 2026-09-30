import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DirectionalLight,
  FrontSide,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { Material, Side } from 'three';

export type PaddyPart = 'grain' | 'bran' | 'husk';

export type PaddyScene = {
  setPlaying: (playing: boolean) => void;
  dispose: () => void;
};

const TAU = Math.PI * 2;

// Half-lengths of each layer, in world units. The husk wraps the bran, which wraps the grain.
const GRAIN = { halfLength: 1.05, halfWidth: 0.4 };
const BRAN = { halfLength: 1.1, halfWidth: 0.44 };
const HUSK = { halfLength: 1.3, halfWidth: 0.54 };

// One calm loop: the closed paddy rests, the husk opens, the bran lifts off,
// the white grain slides out, everything holds for the reader, then it closes again.
const LOOP_SECONDS = 20;
const HUSK_OPENS: [number, number] = [1.6, 4.6];
const BRAN_LIFTS: [number, number] = [4.4, 7];
const GRAIN_SLIDES: [number, number] = [4.8, 7.4];
const CLOSES: [number, number] = [16, 19];
const REVEALED_TIME = 10;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const smoothstep = (a: number, b: number, v: number) => {
  const p = clamp01((v - a) / (b - a));
  return p * p * (3 - 2 * p);
};
const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const segment = (t: number, [start, end]: [number, number]) => easeInOut(clamp01((t - start) / (end - start)));

// Small deterministic generator so the scene looks the same on every load.
function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

type ShellOptions = {
  halfLength: number;
  halfWidth: number;
  // Portion of the revolution covered, in radians. Full turn when omitted.
  arcStart?: number;
  arc?: number;
  // Superellipse exponents: higher `power` keeps the body full, lower `taper` rounds the ends.
  power: number;
  taper: number;
  // Stretches the top end into a pointed beak.
  tip?: number;
  // Raised lengthwise nerves, as on a rice husk.
  ribs?: { count: number; depth: number };
  // Sideways curve of the whole body, and a dent near the base where the germ sat.
  bend?: number;
  notch?: number;
  // Brightness multiplier per vertex, to break up flat colour.
  shade?: (t: number, theta: number) => number;
};

// A rice-shaped surface of revolution with a slightly flattened cross-section.
function buildShell(o: ShellOptions): BufferGeometry {
  const rings = 56;
  const arc = o.arc ?? TAU;
  const closed = arc >= TAU - 1e-6;
  const segments = Math.max(16, Math.round((72 * arc) / TAU));
  const columns = closed ? segments : segments + 1;

  const positions = new Float32Array((rings + 1) * columns * 3);
  const colors = new Float32Array((rings + 1) * columns * 3);

  for (let i = 0; i <= rings; i++) {
    const t = -1 + (2 * i) / rings;
    const body = Math.pow(Math.max(1 - Math.pow(Math.abs(t), o.power), 0), o.taper);
    const y = o.halfLength * (t + (o.tip ?? 0) * smoothstep(0.6, 1, t));

    for (let j = 0; j < columns; j++) {
      const theta = (o.arcStart ?? 0) + (arc * j) / segments;
      let radius = o.halfWidth * body;
      if (o.ribs) {
        radius *= 1 + o.ribs.depth * Math.pow(Math.abs(Math.cos((o.ribs.count * theta) / 2)), 10);
      }
      if (o.notch) {
        const towardNotch = Math.max(Math.cos(theta - Math.PI), 0);
        radius *= 1 - o.notch * Math.pow(towardNotch, 3) * smoothstep(-0.45, -0.9, t);
      }

      const index = (i * columns + j) * 3;
      positions[index] = radius * Math.cos(theta) + (o.bend ?? 0) * (1 - t * t);
      positions[index + 1] = y;
      positions[index + 2] = radius * Math.sin(theta) * 0.8;

      const shade = o.shade ? o.shade(t, theta) : 1;
      colors[index] = shade;
      colors[index + 1] = shade;
      colors[index + 2] = shade;
    }
  }

  const indices: number[] = [];
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segments; j++) {
      const next = closed ? (j + 1) % columns : j + 1;
      const a = i * columns + j;
      const b = i * columns + next;
      const c = (i + 1) * columns + j;
      const d = (i + 1) * columns + next;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// Soft blurred ellipse used as a contact shadow under each floating part.
function buildShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(70, 58, 24, 0.32)');
    gradient.addColorStop(0.55, 'rgba(70, 58, 24, 0.11)');
    gradient.addColorStop(1, 'rgba(70, 58, 24, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
  }
  return new CanvasTexture(canvas);
}

type Layout = {
  grain: [number, number];
  bran: [number, number];
  husk: [number, number];
  // Gap between the two husk halves once open, and overall size of the parts.
  split: number;
  scale: number;
  // World-space rectangle the camera must keep in view (it includes room for the labels).
  frame: { centerY: number; width: number; height: number };
};

const LANDSCAPE: Layout = {
  grain: [-3.35, 0.45],
  bran: [0, 0.45],
  husk: [3.35, 0.45],
  split: 0.62,
  scale: 1,
  frame: { centerY: -0.42, width: 10.6, height: 5.1 },
};

const PORTRAIT: Layout = {
  grain: [-1.15, 2.2],
  bran: [1.15, 2.2],
  husk: [0, -1.55],
  split: 0.55,
  scale: 0.86,
  frame: { centerY: -0.35, width: 4.9, height: 8.1 },
};

export function createPaddyScene(
  stage: HTMLElement,
  labels: Record<PaddyPart, HTMLElement>,
  reducedMotion: boolean,
): PaddyScene {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;

  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  stage.prepend(canvas);

  const scene = new Scene();
  const camera = new PerspectiveCamera(28, 16 / 9, 0.1, 100);

  // Soft daylight: a warm dome, one key light for the modelling, a fill so nothing goes black.
  scene.add(new HemisphereLight(0xfffaf0, 0xcdbf95, 1.9));
  const key = new DirectionalLight(0xffffff, 2.3);
  key.position.set(-3.5, 5, 6);
  scene.add(key);
  const fill = new DirectionalLight(0xffe9c4, 0.7);
  fill.position.set(5, 1, 3);
  scene.add(fill);

  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T) => {
    disposables.push(item);
    return item;
  };
  // A material below full opacity does not write depth, so what sits inside it still shows through.
  const standard = (color: number, roughness: number, side: Side, opacity = 1) =>
    track(
      new MeshStandardMaterial({
        color,
        roughness,
        metalness: 0,
        vertexColors: true,
        side,
        opacity,
        transparent: opacity < 1,
        depthWrite: opacity >= 1,
      }),
    );

  /* White grain: smooth, slightly glossy, with the dent left by the germ. */
  const grainGeometry = track(buildShell({ ...GRAIN, power: 2.5, taper: 0.62, bend: 0.05, notch: 0.22 }));
  const grainMaterial = track(
    new MeshPhysicalMaterial({
      color: 0xf8f2e3,
      roughness: 0.36,
      metalness: 0,
      clearcoat: 0.35,
      clearcoatRoughness: 0.45,
      vertexColors: true,
    }),
  );
  const grain = new Mesh(grainGeometry, grainMaterial);

  /* Bran: a thin brown skin, open on one side so it reads as a peel. */
  const branGeometry = track(
    buildShell({
      ...BRAN,
      arcStart: Math.PI * 1.64,
      arc: Math.PI * 1.72,
      power: 2.5,
      taper: 0.62,
      bend: 0.05,
      shade: (t, theta) => 1 + 0.07 * Math.sin(theta * 9 + t * 7) * Math.sin(t * 13),
    }),
  );
  // The skin is translucent, like the real membrane: the inner face is drawn first, then the outer one.
  const bran = new Group();
  const branInside = new Mesh(branGeometry, standard(0xd6b481, 0.85, BackSide, 0.42));
  const branOutside = new Mesh(branGeometry, standard(0xb98a50, 0.92, FrontSide, 0.6));
  branInside.renderOrder = 1;
  branOutside.renderOrder = 2;
  bran.add(branInside, branOutside);

  /* Husk: two ribbed halves (the larger lemma and the palea), golden outside, pale straw inside. */
  const huskShade = (t: number, theta: number) =>
    (1 - 0.2 * Math.pow(Math.abs(t), 3)) * (1 + 0.035 * Math.sin(theta * 46));
  const huskOuter = standard(0xe9b52d, 0.74, FrontSide);
  const huskInner = standard(0xecd699, 0.6, BackSide);
  const buildHuskHalf = (arcCenter: number, arc: number, ribs: number) => {
    const geometry = track(
      buildShell({
        ...HUSK,
        arcStart: arcCenter - arc / 2,
        arc,
        power: 2.2,
        taper: 0.7,
        tip: 0.1,
        ribs: { count: ribs, depth: 0.05 },
        shade: huskShade,
      }),
    );
    const half = new Group();
    half.add(new Mesh(geometry, huskOuter));
    half.add(new Mesh(geometry, huskInner));
    return half;
  };
  const lemma = buildHuskHalf(0, Math.PI * 1.12, 10);
  const palea = buildHuskHalf(Math.PI, Math.PI * 0.88, 10);

  // Each part sits in a pivot so placement and its own tilt stay independent.
  const pivot = (child: Mesh | Group) => {
    const group = new Group();
    group.add(child);
    scene.add(group);
    return group;
  };
  const pivots = { grain: pivot(grain), bran: pivot(bran), lemma: pivot(lemma), palea: pivot(palea) };

  /* Bran is a powder once milled: a small still heap of flakes under the peel. */
  const random = seededRandom(7);
  const flakeGeometry = track(new IcosahedronGeometry(0.03, 0));
  const flakeMaterial = track(new MeshStandardMaterial({ color: 0xa8814a, roughness: 0.95, flatShading: true }));
  const flakes = Array.from({ length: 16 }, () => {
    const flake = new Mesh(flakeGeometry, flakeMaterial);
    const spread = random() * 2 - 1;
    flake.userData = {
      x: spread * 0.55,
      y: -BRAN.halfLength - 0.2 + (1 - Math.abs(spread)) * 0.1 * random(),
      z: (random() - 0.5) * 0.3,
      size: 0.6 + random() * 0.9,
    };
    flake.rotation.set(random() * TAU, random() * TAU, 0);
    scene.add(flake);
    return flake;
  });

  /* Contact shadows */
  const shadowTexture = track(buildShadowTexture());
  const shadowGeometry = track(new PlaneGeometry(1, 1));
  const shadow = () => {
    const material = track(new MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }));
    const mesh = new Mesh(shadowGeometry, material);
    scene.add(mesh);
    return { mesh, material };
  };
  const shadows = { grain: shadow(), bran: shadow(), husk: shadow() };

  let layout = LANDSCAPE;
  const resize = () => {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (!width || !height) return;

    renderer.setSize(width, height, false);
    const aspect = width / height;
    layout = aspect < 1 ? PORTRAIT : LANDSCAPE;

    // Pull the camera back just enough to fit the layout's frame in both directions.
    const visibleHeight = Math.max(layout.frame.height, layout.frame.width / aspect);
    const distance = visibleHeight / 2 / Math.tan((camera.fov * Math.PI) / 360);
    camera.aspect = aspect;
    camera.position.set(0, layout.frame.centerY, distance);
    camera.lookAt(0, layout.frame.centerY, 0);
    camera.updateProjectionMatrix();
  };

  const projected = new Vector3();
  const placeLabel = (element: HTMLElement, x: number, y: number, opacity: number) => {
    projected.set(x, y, 0).project(camera);
    const left = (projected.x * 0.5 + 0.5) * stage.clientWidth;
    const top = (-projected.y * 0.5 + 0.5) * stage.clientHeight;
    element.style.transform = `translate(${left}px, ${top}px) translate(-50%, 0) translateY(${(1 - opacity) * 8}px)`;
    element.style.opacity = String(opacity);
  };
  const placeShadow = (target: { mesh: Mesh; material: Material }, x: number, y: number, width: number, opacity: number) => {
    target.mesh.position.set(x, y, -0.7);
    target.mesh.scale.set(width, 0.26 * layout.scale, 1);
    target.material.opacity = opacity;
  };

  // `loopTime` drives the open/close sequence, `clock` the idle sway; `appear` scales the grain in once.
  const render = (loopTime: number, clock: number, appear: number) => {
    const closing = 1 - segment(loopTime, CLOSES);
    const huskOpen = Math.min(segment(loopTime, HUSK_OPENS), closing);
    const branOff = Math.min(segment(loopTime, BRAN_LIFTS), closing);
    const grainOut = Math.min(segment(loopTime, GRAIN_SLIDES), closing);

    // While closed, the paddy sits larger in the middle of the stage; it settles to its
    // working size and height as the husk opens and the other parts need the room.
    const size = layout.scale * lerp(0.6, 1, appear) * lerp(1.3, 1, huskOpen);
    const home: [number, number] = [layout.bran[0], lerp(layout.frame.centerY + 0.15, layout.bran[1], huskOpen)];
    // A slow sway instead of a spin: every part stays readable at all times.
    const sway = (phase: number) => 0.24 * Math.sin(clock * 0.45 + phase);
    const bob = (phase: number) => 0.035 * Math.sin(clock * 0.8 + phase);
    const tilt = -0.2;

    const grainX = lerp(home[0], layout.grain[0], grainOut);
    const grainY = lerp(home[1], layout.grain[1], grainOut) + bob(0.5) * grainOut;
    pivots.grain.position.set(grainX, grainY, 0);
    pivots.grain.scale.setScalar(size);
    pivots.grain.rotation.set(0.12, sway(0) + 0.5 * grainOut, tilt);

    // The peel starts with its opening turned away, then turns to show it is hollow.
    const branX = home[0];
    const branY = home[1] + bob(1.7) * branOff;
    pivots.bran.position.set(branX, branY, 0);
    pivots.bran.scale.setScalar(size);
    pivots.bran.rotation.set(0.12, sway(0.9 * branOff) + 2.1 * branOff, tilt);

    const huskX = lerp(home[0], layout.husk[0], huskOpen);
    const huskY = lerp(home[1], layout.husk[1], huskOpen) + bob(2.9) * huskOpen;
    // The halves part sideways like an opened shell: the lemma turns its pale inside towards
    // the viewer, the palea its golden ribbed outside, so both faces of the husk can be seen.
    ([['lemma', 1, 0.95], ['palea', -1, 0.85]] as const).forEach(([name, direction, turn]) => {
      const half = pivots[name];
      half.position.set(huskX + direction * layout.split * huskOpen, huskY, 0);
      half.scale.setScalar(size);
      half.rotation.set(0.12, sway(1.6 * huskOpen) + turn * huskOpen, tilt - direction * 0.1 * huskOpen);
    });

    flakes.forEach((flake) => {
      const data = flake.userData as { x: number; y: number; z: number; size: number };
      flake.position.set(branX + data.x * size, home[1] + data.y * size, data.z);
      flake.scale.set(1.8 * data.size * size * branOff, 0.6 * data.size * size * branOff, data.size * size * branOff);
    });

    const floor = (halfLength: number) => -halfLength * size - 0.12;
    placeShadow(shadows.husk, huskX, huskY + floor(HUSK.halfLength), lerp(1.5, 2.7, huskOpen) * size, appear);
    placeShadow(shadows.bran, branX, branY + floor(BRAN.halfLength) - 0.1, 1.5 * size, smoothstep(0.3, 0.9, huskOpen));
    placeShadow(shadows.grain, grainX, grainY + floor(GRAIN.halfLength) - 0.1, 1.35 * size, smoothstep(0.35, 0.9, grainOut));

    // Labels fade in once their part has settled in place.
    const labelDrop = HUSK.halfLength * layout.scale + 0.42;
    placeLabel(labels.grain, grainX, layout.grain[1] - labelDrop, smoothstep(0.75, 1, grainOut));
    placeLabel(labels.bran, branX, layout.bran[1] - labelDrop, smoothstep(0.75, 1, branOff));
    placeLabel(labels.husk, huskX, layout.husk[1] - labelDrop, smoothstep(0.75, 1, huskOpen));

    renderer.render(scene, camera);
  };

  let playing = true;
  let visible = false;
  let frameId = 0;
  let last = 0;
  let loopTime = 0;
  let clock = 0;

  const drawCurrent = () => {
    if (reducedMotion) render(REVEALED_TIME, 0, 1);
    else render(loopTime, clock, segment(clock, [0, 1.4]));
  };

  const tick = (now: number) => {
    // Capped so a stalled tab does not jump ahead, but loose enough to keep pace on slow devices.
    const delta = Math.min((now - last) / 1000, 0.1);
    last = now;
    loopTime = (loopTime + delta) % LOOP_SECONDS;
    clock += delta;
    drawCurrent();
    frameId = requestAnimationFrame(tick);
  };

  // The loop only runs while the stage is on screen and not paused.
  const updateLoop = () => {
    cancelAnimationFrame(frameId);
    if (reducedMotion || !playing || !visible) return;
    last = performance.now();
    frameId = requestAnimationFrame(tick);
  };

  const resizeObserver = new ResizeObserver(() => {
    resize();
    drawCurrent();
  });
  resizeObserver.observe(stage);

  const visibilityObserver = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      updateLoop();
    },
    { threshold: 0.15 },
  );
  visibilityObserver.observe(stage);

  resize();
  drawCurrent();

  return {
    setPlaying(next) {
      playing = next;
      updateLoop();
    },
    dispose() {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      disposables.forEach((item) => item.dispose());
      renderer.dispose();
      canvas.remove();
    },
  };
}
