import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createBiocompositeMaps } from './textures';
import { Tweens } from './tween';
import { createPlate } from './products/plate';
import { createCup } from './products/cup';
import { createTray } from './products/tray';
import { createFork } from './products/fork';
import { createSpoon } from './products/spoon';
import type { ProductId } from './catalog';
import type { BuildContext, ProductModel } from './types';

export type Viewer = {
  showProduct: (id: ProductId, option: string) => void;
  setOption: (option: string) => void;
  dispose: () => void;
};

type ViewerOptions = {
  reducedMotion: boolean;
  // Called once when the visitor starts dragging the model by hand.
  onUserOrbit: () => void;
};

type Framing = { radius: number; half?: { x: number; y: number } };

const FOV = 30;
const BUILDERS: Record<ProductId, (context: BuildContext) => ProductModel> = {
  barquette: createTray,
  assiette: createPlate,
  cuillere: createSpoon,
  fourchette: createFork,
  gobelet: createCup,
};

// Soft blob under each product, so it sits on the table instead of floating.
function contactShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(60,45,20,.5)');
    gradient.addColorStop(0.5, 'rgba(60,45,20,.2)');
    gradient.addColorStop(1, 'rgba(60,45,20,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createViewer(stage: HTMLElement, { reducedMotion, onUserOrbit }: ViewerOptions): Viewer {
  // Throws when WebGL is not available: the caller shows a fallback message.
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85; // a touch darker than neutral: the material reads as golden kraft, not pale cream
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const canvas = renderer.domElement;
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none;cursor:grab';
  stage.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.005, 10);
  const tweens = new Tweens(reducedMotion);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.enablePan = false;
  controls.minPolarAngle = 0;
  controls.autoRotateSpeed = 0.6;

  // Lighting: a soft room reflection, one key light that casts the shadows, a low rim light.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.environment = environment;
  scene.environmentIntensity = 0.55;
  scene.add(new THREE.HemisphereLight(0xfff8ec, 0xcdbb90, 0.55));

  const key = new THREE.DirectionalLight(0xfff6e6, 2.2);
  key.position.set(-0.35, 0.7, 0.35);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -0.3, right: 0.3, top: 0.3, bottom: -0.3, near: 0.1, far: 2 });
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.0004;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xfff5e6, 0.8);
  rim.position.set(0.5, 0.25, -0.45);
  scene.add(rim);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShadowMaterial({ opacity: 0.13 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const shadowTexture = contactShadowTexture();
  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.55 }),
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.0003;
  contactShadow.renderOrder = -1;
  scene.add(contactShadow);

  const maps = createBiocompositeMaps(renderer.capabilities.getMaxAnisotropy());
  const context: BuildContext = { maps, tweens };
  const models = new Map<ProductId, ProductModel>();
  let current: ProductModel | null = null;
  let cameraTween: ReturnType<Tweens['add']> | null = null;
  let swapTimer: number | undefined;
  let rotateTimer: number | undefined;
  let autoRotateAllowed = true;
  let currentFrame: Framing = { radius: 0.1 }; // what must stay in view

  // Distance at which the framed volume fits the stage, whatever its proportions.
  const fitDistance = (frame: Framing) => {
    const vertical = THREE.MathUtils.degToRad(FOV);
    if (frame.half) {
      const tanHalf = Math.tan(vertical / 2);
      return Math.max(frame.half.y / tanHalf, frame.half.x / (tanHalf * camera.aspect)) * 1.12;
    }
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect);
    return (frame.radius * 1.08) / Math.sin(Math.min(vertical, horizontal) / 2);
  };

  // The model slowly turns on its own, and resumes a few seconds after the visitor lets go.
  const scheduleRotate = (delay: number) => {
    window.clearTimeout(rotateTimer);
    controls.autoRotate = false;
    if (reducedMotion || !autoRotateAllowed) return;
    rotateTimer = window.setTimeout(() => {
      controls.autoRotate = true;
    }, delay);
  };

  const placeCamera = (target: THREE.Vector3, direction: THREE.Vector3, distance: number) => {
    controls.target.copy(target);
    camera.position.copy(direction).normalize().multiplyScalar(distance).add(target);
    controls.update();
  };

  // Moves along a spherical path so the camera never cuts through the product.
  const moveCamera = (target: THREE.Vector3, direction: THREE.Vector3 | null, distance: number, duration: number) => {
    tweens.cancel(cameraTween);
    const fromTarget = controls.target.clone();
    const from = new THREE.Spherical().setFromVector3(camera.position.clone().sub(fromTarget));
    const to = direction
      ? new THREE.Spherical().setFromVector3(direction.clone().normalize().multiplyScalar(distance))
      : new THREE.Spherical(distance, from.phi, from.theta);
    const dTheta = Math.atan2(Math.sin(to.theta - from.theta), Math.cos(to.theta - from.theta));
    const s = new THREE.Spherical();
    cameraTween = tweens.add({
      duration,
      update: (t) => {
        controls.target.lerpVectors(fromTarget, target, t);
        s.set(
          from.radius + (to.radius - from.radius) * t,
          from.phi + (to.phi - from.phi) * t,
          from.theta + dTheta * t,
        );
        s.makeSafe();
        camera.position.setFromSpherical(s).add(controls.target);
      },
    });
  };

  const resize = () => {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (current) controls.maxDistance = fitDistance(currentFrame) * 1.9;
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  resize();

  const swapTo = (id: ProductId, option: string) => {
    if (current) current.group.visible = false;
    let model = models.get(id);
    if (!model) {
      model = BUILDERS[id](context);
      scene.add(model.group);
      models.set(id, model);
    }
    model.group.visible = true;
    current = model;

    model.apply(option, false);
    const frame = model.frame(option);
    currentFrame = frame;
    const distance = fitDistance(frame);
    controls.maxPolarAngle = model.maxPolarAngle;
    controls.minDistance = frame.radius * 1.5;
    controls.maxDistance = distance * 1.9;
    placeCamera(frame.target, model.view?.(option) ?? model.initialDir, distance);

    contactShadow.scale.set(model.shadow.width, model.shadow.depth, 1);
    autoRotateAllowed = !model.view || option === 'perspective';
    scheduleRotate(2500);
  };

  // A pointer drag on the canvas counts as the visitor taking control of the view.
  let pointerDown = false;
  let orbitReported = false;
  const onPointerDown = () => {
    pointerDown = true;
  };
  const onPointerUp = () => {
    pointerDown = false;
    orbitReported = false;
  };
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);
  controls.addEventListener('start', () => {
    window.clearTimeout(rotateTimer);
    controls.autoRotate = false;
    tweens.cancel(cameraTween);
    cameraTween = null;
  });
  controls.addEventListener('end', () => scheduleRotate(6000));
  controls.addEventListener('change', () => {
    if (pointerDown && !orbitReported) {
      orbitReported = true;
      onUserOrbit();
    }
  });

  const loop = () => {
    tweens.run(performance.now());
    controls.update();
    renderer.render(scene, camera);
  };
  renderer.setAnimationLoop(loop);
  const onVisibility = () => renderer.setAnimationLoop(document.hidden ? null : loop);
  document.addEventListener('visibilitychange', onVisibility);

  return {
    showProduct(id, option) {
      window.clearTimeout(swapTimer);
      if (reducedMotion || !current) {
        swapTo(id, option);
        return;
      }
      // Brief fade so switching products never shows a hard cut.
      canvas.style.transition = 'opacity .16s';
      canvas.style.opacity = '0';
      swapTimer = window.setTimeout(() => {
        swapTo(id, option);
        canvas.style.opacity = '1';
      }, 170);
    },
    setOption(option) {
      if (!current) return;
      current.apply(option, true);
      const frame = current.frame(option);
      currentFrame = frame;
      moveCamera(frame.target, current.view?.(option) ?? null, fitDistance(frame), 800);
      autoRotateAllowed = !current.view || option === 'perspective';
      scheduleRotate(autoRotateAllowed ? 4000 : 0);
    },
    dispose() {
      window.clearTimeout(swapTimer);
      window.clearTimeout(rotateTimer);
      renderer.setAnimationLoop(null);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerdown', onPointerDown);
      resizeObserver.disconnect();
      tweens.clear();
      controls.dispose();
      models.forEach((model) => model.dispose());
      maps.dispose();
      shadowTexture.dispose();
      environment.dispose();
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
      contactShadow.geometry.dispose();
      (contactShadow.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
