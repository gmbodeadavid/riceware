'use client';

import { useEffect, useRef, useState } from 'react';
import type { PaddyPart, PaddyScene } from '@/lib/paddyScene';

const PARTS: { key: PaddyPart; percent: string; name: string; desc: string }[] = [
  { key: 'grain', percent: '70 %', name: 'Grain', desc: 'Alimentation humaine · intact' },
  { key: 'bran', percent: '10 %', name: 'Son', desc: 'Intact' },
  { key: 'husk', percent: '20 %', name: 'Coque', desc: 'Non comestible' },
];

const PERCENT_TONE: Record<PaddyPart, string> = {
  grain: 'text-ink',
  bran: 'text-bran',
  husk: 'text-husk-text',
};

function PartLabel({ part }: { part: (typeof PARTS)[number] }) {
  const isHusk = part.key === 'husk';

  return (
    <>
      <p className={`${PERCENT_TONE[part.key]} font-display font-bold text-[clamp(28px,4.2vw,56px)] leading-none tracking-[-0.02em] tabular-nums`}>
        {part.percent}
      </p>
      <p className={`font-mono-brand text-xs leading-4 tracking-[0.08em] uppercase mt-2 ${isHusk ? 'inline-block bg-husk text-ink px-2.5 py-[3px] rounded-full' : ''}`}>
        {part.name}
      </p>
      <p className={`hidden sm:block text-sm leading-5 mt-0.5 ${isHusk ? 'text-husk-text font-semibold' : 'text-ink-muted'}`}>
        {part.desc}
      </p>
    </>
  );
}

export default function PaddyAnatomy() {
  const stageRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<Partial<Record<PaddyPart, HTMLDivElement | null>>>({});
  const sceneRef = useRef<PaddyScene | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let cancelled = false;

    // three.js is only downloaded once the stage is about to scroll into view.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        import('@/lib/paddyScene')
          .then(({ createPaddyScene }) => {
            const { grain, bran, husk } = labelRefs.current;
            if (cancelled || !grain || !bran || !husk) return;
            const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            sceneRef.current = createPaddyScene(stage, { grain, bran, husk }, reducedMotion);
            setReady(true);
          })
          .catch(() => {
            // No WebGL (or the chunk failed to load): the static summary below stays on screen.
          });
      },
      { rootMargin: '400px' },
    );
    observer.observe(stage);

    return () => {
      cancelled = true;
      observer.disconnect();
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  const togglePlaying = () => {
    sceneRef.current?.setPlaying(!playing);
    setPlaying(!playing);
  };

  return (
    <figure className="m-0">
      <div ref={stageRef} className="relative w-full aspect-[4/5] sm:aspect-video lg:aspect-[21/9] min-h-[320px] overflow-hidden rounded-[20px] bg-ground">
        {/* Static summary: shown until the 3D scene is ready, and kept if it cannot start. */}
        {!ready && (
          <div aria-hidden="true" className="absolute inset-0 grid grid-cols-3 items-center gap-2 px-4 text-center">
            {PARTS.map((part) => (
              <div key={part.key}>
                <PartLabel part={part} />
              </div>
            ))}
          </div>
        )}

        {/* Labels positioned by the scene, each under its part. */}
        {PARTS.map((part) => (
          <div
            key={part.key}
            ref={(element) => {
              labelRefs.current[part.key] = element;
            }}
            aria-hidden="true"
            className="absolute left-0 top-0 text-center opacity-0 pointer-events-none whitespace-nowrap will-change-[transform,opacity]"
          >
            <PartLabel part={part} />
          </div>
        ))}

        {ready && (
          <button
            type="button"
            onClick={togglePlaying}
            className="motion-reduce:hidden absolute right-4 bottom-4 font-mono-brand text-xs tracking-[0.06em] uppercase bg-surface/90 text-ink border border-line rounded-full px-3.5 py-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-husk-deep focus-visible:outline-offset-2"
          >
            {playing ? 'Pause' : 'Lecture'}
          </button>
        )}
      </div>
      <figcaption className="sr-only">
        Anatomie d’un grain de paddy : 70 % de grain destiné à l’alimentation humaine, laissé intact ; 10 % de son, laissé intact ; 20 % de coque, non comestible, la seule partie utilisée par RiceWare.
      </figcaption>
    </figure>
  );
}
