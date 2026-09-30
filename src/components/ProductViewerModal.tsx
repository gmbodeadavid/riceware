'use client';

import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { VIEWER_PRODUCTS } from '@/lib/viewer3d/catalog';
import type { OptionIcon, ProductId } from '@/lib/viewer3d/catalog';
import type { Viewer } from '@/lib/viewer3d/viewer';

type Status = 'loading' | 'ready' | 'error';

const ICON_PATHS: Record<OptionIcon, ReactNode> = {
  perspective: <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 12l8-4.5M12 12v9M12 12L4 7.5" />,
  top: (
    <>
      <path d="M12 3v6m-3-3l3 3 3-3" />
      <rect x="5" y="13" width="14" height="6" rx="2" />
    </>
  ),
  bottom: (
    <>
      <rect x="5" y="5" width="14" height="6" rx="2" />
      <path d="M12 21v-6m-3 3l3-3 3 3" />
    </>
  ),
  profile: <path d="M4 17h16M6 17c0-4.5 3-7 6-7s6 2.5 6 7" />,
  closed: (
    <>
      <rect x="4" y="12" width="16" height="7" rx="2" />
      <rect x="4" y="8" width="16" height="4" rx="1.5" />
    </>
  ),
  open: (
    <>
      <rect x="4" y="14" width="16" height="6" rx="2" />
      <path d="M6 11l2.5-7h10L16 11z" />
    </>
  ),
  stack: (
    <>
      <path d="M12 4l8 4-8 4-8-4 8-4z" />
      <path d="M4 12l8 4 8-4M4 16l8 4 8-4" />
    </>
  ),
  single: <path d="M12 7l8 4-8 4-8-4 8-4z" />,
};

function Icon({ name }: { name: OptionIcon }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON_PATHS[name]}
    </svg>
  );
}

const ROUND_BUTTON =
  'flex items-center justify-center rounded-full bg-surface text-ink shadow-[0_2px_8px_rgb(28_42_32/0.14)] transition-[box-shadow,transform] hover:shadow-[0_4px_14px_rgb(28_42_32/0.2)] active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-paddy focus-visible:outline-offset-2';

export default function ProductViewerModal({ initialId, onClose }: { initialId: ProductId; onClose: (lastId: ProductId) => void }) {
  const [index, setIndex] = useState(() => Math.max(0, VIEWER_PRODUCTS.findIndex((p) => p.id === initialId)));
  const product = VIEWER_PRODUCTS[index];
  // null once the visitor has turned the model by hand: no option is then highlighted.
  const [option, setOption] = useState<string | null>(product.options[0].id);
  const [status, setStatus] = useState<Status>('loading');

  const dialogRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  // Always holds the latest values, for callbacks created once (viewer events) without stale closures.
  const latest = useRef({ index, kind: product.kind, onClose });
  useEffect(() => {
    latest.current = { index, kind: product.kind, onClose };
  });

  const close = () => latest.current.onClose(VIEWER_PRODUCTS[latest.current.index].id);

  // Load three.js only now, then start the viewer.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let cancelled = false;

    import('@/lib/viewer3d/viewer')
      .then(({ createViewer }) => {
        if (cancelled) return;
        try {
          viewerRef.current = createViewer(stage, {
            reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            onUserOrbit: () => {
              if (latest.current.kind === 'view') setOption(null);
            },
          });
          setStatus('ready');
        } catch {
          setStatus('error');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
      viewerRef.current?.dispose();
      viewerRef.current = null;
    };
  }, []);

  // Show the current product once the viewer exists, and whenever the visitor switches product.
  useEffect(() => {
    if (status === 'ready') viewerRef.current?.showProduct(VIEWER_PRODUCTS[index].id, VIEWER_PRODUCTS[index].options[0].id);
  }, [status, index]);

  // Page behind stays put while the window is open; focus returns to the trigger afterwards.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  const go = (next: number) => {
    const target = (next + VIEWER_PRODUCTS.length) % VIEWER_PRODUCTS.length;
    setIndex(target);
    setOption(VIEWER_PRODUCTS[target].options[0].id);
  };

  const pick = (id: string) => {
    viewerRef.current?.setOption(id);
    setOption(id);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'ArrowLeft') {
      go(index - 1);
    } else if (event.key === 'ArrowRight') {
      go(index + 1);
    } else if (event.key === 'Tab') {
      // Keep keyboard focus inside the window.
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button, a[href]');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  const selected = product.options.find((o) => o.id === option);

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${product.name} en 3D`}
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-[100] bg-ground text-ink"
    >
      {/* 3D stage: leaves room for the controls below it. */}
      <div
        ref={stageRef}
        role="img"
        aria-label={`Vue 3D interactive : ${product.name}. Glisser pour tourner, pincer ou molette pour zoomer.`}
        className="absolute inset-x-0 top-[96px] bottom-[250px] sm:top-0 sm:bottom-[150px] cursor-grab active:cursor-grabbing"
      >
        {status === 'loading' && (
          <p className="absolute inset-0 flex items-center justify-center font-mono-brand text-xs tracking-[0.08em] uppercase text-ink-muted m-0">
            Chargement du modèle 3D…
          </p>
        )}
        {status === 'error' && (
          <p className="absolute inset-0 flex items-center justify-center text-center px-8 text-ink-muted m-0">
            L’affichage 3D n’est pas disponible sur ce navigateur ou cet appareil.
          </p>
        )}
      </div>

      {/* Top left: which product, and what it measures. */}
      <div className="absolute top-5 left-5 sm:top-8 sm:left-8 right-24 pointer-events-none">
        <p className="font-mono-brand text-xs tracking-[0.08em] uppercase text-ink-muted m-0">
          {index + 1} / {VIEWER_PRODUCTS.length}
        </p>
        <h2 className="font-display text-2xl sm:text-3xl font-bold leading-tight m-0 mt-1">{product.name}</h2>
        <p className="font-mono-brand text-sm text-ink-muted m-0 mt-1">{product.specs}</p>
        <p className="inline-block font-mono-brand text-[11px] tracking-[0.06em] uppercase bg-husk-soft text-husk-text rounded-full px-2.5 py-1 m-0 mt-3">
          Rendu 3D conceptuel
        </p>
      </div>

      {/* Top right: close. */}
      <button
        ref={closeRef}
        type="button"
        onClick={close}
        aria-label="Fermer la vue 3D"
        className={`${ROUND_BUTTON} absolute top-4 right-4 sm:top-6 sm:right-6 w-12 h-12 sm:w-14 sm:h-14`}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      {/* Bottom: options (left), previous / next (centre), call to action (right). */}
      <div className="absolute inset-x-0 bottom-0 px-4 pb-5 sm:px-8 sm:pb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
        <div className="order-1 w-full sm:w-auto sm:flex-1 flex flex-col items-center sm:items-start gap-3">
          <div role="group" aria-label={product.optionsLabel} className="flex gap-3">
            {product.options.map((o) => {
              const active = o.id === option;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => pick(o.id)}
                  aria-label={o.label}
                  aria-pressed={active}
                  title={o.label}
                  className={`${ROUND_BUTTON} w-12 h-12 sm:w-14 sm:h-14 ${active ? 'ring-2 ring-ink ring-offset-2 ring-offset-ground' : ''}`}
                >
                  <Icon name={o.icon} />
                </button>
              );
            })}
          </div>
          <p aria-live="polite" className="text-sm text-ink-muted m-0">
            {product.optionsLabel} : {selected ? selected.label : 'libre'}
          </p>
        </div>

        <div className="order-2 flex flex-col items-center">
          {/* Two equal columns: each button sits exactly above its label. */}
          <div className="flex rounded-full bg-ink/6 p-1.5">
            <div className="w-[76px] flex justify-center">
              <button type="button" onClick={() => go(index - 1)} aria-label="Produit précédent" className={`${ROUND_BUTTON} w-12 h-12`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 5l-7 7 7 7" />
                </svg>
              </button>
            </div>
            <div className="w-[76px] flex justify-center">
              <button type="button" onClick={() => go(index + 1)} aria-label="Produit suivant" className={`${ROUND_BUTTON} w-12 h-12`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex px-1.5 mt-1.5 text-sm text-ink-muted" aria-hidden="true">
            <span className="w-[76px] text-center">Précédent</span>
            <span className="w-[76px] text-center">Suivant</span>
          </div>
        </div>

      </div>
    </div>,
    document.body,
  );
}
