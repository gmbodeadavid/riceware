export type Ease = (t: number) => number;

export const easings = {
  linear: (t: number) => t,
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t: number) => {
    const c1 = 1.2;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

export type Tween = {
  start: number;
  duration: number;
  ease: Ease;
  update: (t: number) => void;
  done?: () => void;
};

type TweenOptions = {
  duration: number;
  ease?: Ease;
  delay?: number;
  update: (t: number) => void;
  done?: () => void;
};

// Minimal tween runner driven by the viewer's render loop. With reduced motion every tween is instant.
export class Tweens {
  private items = new Set<Tween>();
  private reduced: boolean;

  constructor(reduced: boolean) {
    this.reduced = reduced;
  }

  add(options: TweenOptions): Tween {
    const tween: Tween = {
      start: performance.now() + (this.reduced ? 0 : (options.delay ?? 0)),
      duration: this.reduced ? 0 : options.duration,
      ease: options.ease ?? easings.inOutCubic,
      update: options.update,
      done: options.done,
    };
    this.items.add(tween);
    return tween;
  }

  cancel(tween: Tween | null) {
    if (tween) this.items.delete(tween);
  }

  run(now: number) {
    for (const tween of this.items) {
      if (now < tween.start) continue;
      const t = tween.duration <= 0 ? 1 : Math.min((now - tween.start) / tween.duration, 1);
      tween.update(tween.ease(t));
      if (t >= 1) {
        this.items.delete(tween);
        tween.done?.();
      }
    }
  }

  clear() {
    this.items.clear();
  }
}
