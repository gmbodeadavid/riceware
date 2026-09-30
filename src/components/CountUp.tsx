'use client';

import { useEffect, useRef } from 'react';

const DURATION_MS = 1400;

// French formatting done by hand (thin no-break space, decimal comma) so the
// server and the browser always produce the exact same string.
function formatNumber(value: number, decimals: number) {
  const [integer, fraction] = value.toFixed(decimals).split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return fraction ? `${grouped},${fraction}` : grouped;
}

// Counts from 0 to `value` the first time the number scrolls into view.
// The final value is what gets server-rendered, so it stays readable without JS.
export default function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Hold the final width while counting so the unit next to the number does not jump around.
    el.style.minWidth = `${el.offsetWidth}px`;
    el.textContent = formatNumber(0, decimals);

    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();

      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / DURATION_MS, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = formatNumber(value * eased, decimals);
        if (progress < 1) {
          frame = requestAnimationFrame(tick);
        } else {
          el.style.minWidth = '';
        }
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    observer.observe(el);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      el.style.minWidth = '';
      el.textContent = formatNumber(value, decimals);
    };
  }, [value, decimals]);

  return (
    <span ref={ref} className="inline-block tabular-nums">
      {formatNumber(value, decimals)}
    </span>
  );
}
