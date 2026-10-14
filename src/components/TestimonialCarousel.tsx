'use client';

import { useEffect, useRef, useState } from 'react';

type Testimonial = {
  quote: string;
  citation: string;
};

export default function TestimonialCarousel({ testimonials }: { testimonials: Testimonial[] }) {
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (!pausedRef.current) setActive((p) => (p + 1) % testimonials.length);
    }, 6000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [testimonials.length]);

  if (!testimonials.length) return null;

  const current = testimonials[active];

  return (
    <div
      className="mt-2"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
    >
      <blockquote>
        <p className="text-sm italic leading-5 text-ink-muted line-clamp-3 min-h-[3.75rem] m-0">{current.quote}</p>
        <p className="mt-1 text-sm font-semibold text-ink-muted line-clamp-2 min-h-[2.5rem] m-0">{current.citation}</p>
      </blockquote>

      <div className="mt-4 flex justify-center gap-2">
        {testimonials.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Témoignage ${i + 1} sur ${testimonials.length}`}
            onClick={() => setActive(i)}
            className={`h-2.5 w-2.5 rounded-full transition-all ${
              i === active ? 'bg-paddy scale-110' : 'bg-line hover:bg-paddy'
            }`}
          />
        ))}
      </div>
    </div>
  );
}