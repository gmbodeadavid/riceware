import type * as THREE from 'three';
import type { BiocompositeMaps } from './textures';
import type { Tweens } from './tween';

export type BuildContext = { maps: BiocompositeMaps; tweens: Tweens };

// What the viewer needs to know about one product. No logo, marking or lettering is ever part of a model.
export type ProductModel = {
  group: THREE.Group;
  // Default camera direction (from the target towards the camera).
  initialDir: THREE.Vector3;
  maxPolarAngle: number;
  // Footprint of the soft contact shadow on the ground, in metres.
  shadow: { width: number; depth: number };
  // Point to look at and radius of the sphere that must stay in view, for a given option.
  // Long, thin products also give their half-extent on screen (x: along the width, y: along the height),
  // so they can be framed much tighter than a sphere would allow.
  frame: (option: string) => { target: THREE.Vector3; radius: number; half?: { x: number; y: number } };
  // Camera direction imposed by an option (view-type products only).
  view?: (option: string) => THREE.Vector3 | null;
  apply: (option: string, animate: boolean) => void;
  dispose: () => void;
};
